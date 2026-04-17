"""
Layer 3 - Adverse Selection and Oracle Integrity
Part A: Adverse selection gate at enrollment and plan change.
Part B: Oracle integrity check at trigger confirmation.
"""

import logging
import os
from datetime import datetime, timedelta

import httpx

from .. import trigger_config as _trigger_config
from ..trigger_config import (
    ADVERSE_SELECTION_ENROLLMENT_DAYS,
    ADVERSE_SELECTION_FORECAST_THRESHOLD,
    CITY_COORDS,
    ORACLE_HISTORY_DAYS,
    ORACLE_MIN_HISTORICAL_SAMPLES,
    ORACLE_OUTLIER_PERCENTILE,
    OWM_FORECAST_SLOTS,
    OWM_FORECAST_TIMEOUT_SECONDS,
    TRIGGER_THRESHOLDS,
)

logger = logging.getLogger(__name__)

OWM_API_KEY = os.getenv("OWM_API_KEY", "")
OPEN_METEO_TIMEOUT_SECONDS = getattr(_trigger_config, "OPEN_METEO_TIMEOUT_SECONDS", 8.0)
OPEN_METEO_BASE_URL = getattr(
    _trigger_config,
    "OPEN_METEO_BASE_URL",
    "https://api.open-meteo.com/v1/forecast",
)
GOOGLE_WEATHER_API_BASE = "https://weather.googleapis.com/v1"
GOOGLE_WEATHER_TIMEOUT = 5.0


async def get_open_meteo_rainfall(lat: float, lon: float) -> float | None:
    """Fetch rainfall from Open-Meteo ECMWF IFS for the provided coordinate."""
    try:
        async with httpx.AsyncClient(timeout=OPEN_METEO_TIMEOUT_SECONDS) as client:
            resp = await client.get(
                OPEN_METEO_BASE_URL,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "hourly": "rain",
                    "forecast_days": 1,
                    "timezone": "Asia/Kolkata",
                    "models": "ecmwf_ifs",
                },
            )
            resp.raise_for_status()

        data = resp.json()
        hourly_rain = data.get("hourly", {}).get("rain", [])
        if not hourly_rain:
            return None

        return round(sum(float(value) for value in hourly_rain if value is not None), 2)
    except Exception as e:
        logger.warning(f"[Layer3/OpenMeteo] Failed rainfall fetch for ({lat},{lon}): {e}")
        return None


async def get_open_meteo_temp(lat: float, lon: float) -> float | None:
    """Fetch daily max temperature from Open-Meteo ECMWF IFS for the coordinate."""
    try:
        async with httpx.AsyncClient(timeout=OPEN_METEO_TIMEOUT_SECONDS) as client:
            resp = await client.get(
                OPEN_METEO_BASE_URL,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "daily": "temperature_2m_max",
                    "forecast_days": 1,
                    "timezone": "Asia/Kolkata",
                    "models": "ecmwf_ifs",
                },
            )
            resp.raise_for_status()

        data = resp.json()
        daily_max = data.get("daily", {}).get("temperature_2m_max", [])
        if not daily_max or daily_max[0] is None:
            return None

        return round(float(daily_max[0]), 2)
    except Exception as e:
        logger.warning(f"[Layer3/OpenMeteo] Failed temperature fetch for ({lat},{lon}): {e}")
        return None


async def get_google_weather_rainfall(lat: float, lon: float) -> float | None:
    """
    Fetch current precipitation QPF from Google Maps Weather API.
    Uses MetNet model - independent from Open-Meteo ECMWF IFS.
    Used as third oracle cross-validation source for rainfall trigger.

    Returns None on any failure - oracle degrades gracefully.
    """
    api_key = os.getenv("GOOGLE_MAPS_API_KEY", "")
    if not api_key:
        logger.warning("[Layer3/GoogleWeather] GOOGLE_MAPS_API_KEY not set")
        return None

    try:
        async with httpx.AsyncClient(timeout=GOOGLE_WEATHER_TIMEOUT) as client:
            resp = await client.get(
                f"{GOOGLE_WEATHER_API_BASE}/currentConditions:lookup",
                params={
                    "key": api_key,
                    "location.latitude": lat,
                    "location.longitude": lon,
                },
            )
            resp.raise_for_status()

        data = resp.json()
        qpf = (
            data.get("currentConditions", {})
            .get("precipitation", {})
            .get("qpf", {})
            .get("quantity")
        )
        if qpf is not None:
            return float(qpf)
        return None

    except Exception as e:
        logger.warning(f"[Layer3/GoogleWeather] Failed for ({lat},{lon}): {e}")
        return None


async def get_google_weather_temp(lat: float, lon: float) -> float | None:
    """
    Fetch current temperature from Google Maps Weather API.
    Used as third oracle cross-validation source for heat trigger.
    Returns None on any failure.
    """
    api_key = os.getenv("GOOGLE_MAPS_API_KEY", "")
    if not api_key:
        return None

    try:
        async with httpx.AsyncClient(timeout=GOOGLE_WEATHER_TIMEOUT) as client:
            resp = await client.get(
                f"{GOOGLE_WEATHER_API_BASE}/currentConditions:lookup",
                params={
                    "key": api_key,
                    "location.latitude": lat,
                    "location.longitude": lon,
                },
            )
            resp.raise_for_status()

        data = resp.json()
        temp = data.get("currentConditions", {}).get("temperature", {}).get("degrees")
        if temp is not None:
            return float(temp)
        return None

    except Exception as e:
        logger.warning(f"[Layer3/GoogleWeather] Temp fetch failed for ({lat},{lon}): {e}")
        return None


async def compute_historical_percentile(
    city: str,
    trigger_type: str,
    raw_value: float,
    supabase,
) -> dict:
    """Compute historical percentile support for the current reading."""
    try:
        cutoff = (datetime.utcnow() - timedelta(days=ORACLE_HISTORY_DAYS)).isoformat()

        result = (
            supabase.table("trigger_events")
            .select("raw_value")
            .eq("city", city)
            .eq("trigger_type", trigger_type)
            .eq("confirmed", True)
            .gte("fired_at", cutoff)
            .execute()
        )

        historical_values = [
            row["raw_value"]
            for row in (result.data or [])
            if row.get("raw_value") is not None
        ]

        if len(historical_values) < ORACLE_MIN_HISTORICAL_SAMPLES:
            return {
                "has_history": False,
                "percentile": 0.0,
                "statistical_outlier": False,
            }

        below = sum(1 for value in historical_values if value <= raw_value)
        percentile = round((below / len(historical_values)) * 100, 1)
        return {
            "has_history": True,
            "percentile": percentile,
            "statistical_outlier": percentile >= max(95.0, ORACLE_OUTLIER_PERCENTILE),
        }
    except Exception as e:
        logger.error(f"[Layer3] Oracle historical check failed: {e}")
        return {
            "has_history": False,
            "percentile": 0.0,
            "statistical_outlier": False,
        }


async def check_adverse_selection_forecast(city: str) -> dict:
    """
    Call OWM 5-day forecast for the city.
    Compute breach probability for rainfall and heat triggers.
    Block if any breach probability exceeds ADVERSE_SELECTION_FORECAST_THRESHOLD.

    Returns:
        blocked (bool): True if forecast breach probability exceeds threshold
        probabilities (dict): per-trigger breach probability
        clearance_date (str | None): estimated date when lockout lifts
    """
    coords = CITY_COORDS.get(city)
    if not coords or not OWM_API_KEY:
        return {
            "blocked": False,
            "probabilities": {},
            "clearance_date": None,
            "daily_probabilities": {},
        }

    lat = coords["lat"]
    lon = coords["lon"]

    try:
        async with httpx.AsyncClient(timeout=OWM_FORECAST_TIMEOUT_SECONDS) as client:
            resp = await client.get(
                "https://api.openweathermap.org/data/2.5/forecast",
                params={
                    "lat": lat,
                    "lon": lon,
                    "appid": OWM_API_KEY,
                    "units": "metric",
                    "cnt": OWM_FORECAST_SLOTS,
                },
            )
            resp.raise_for_status()

        forecast = resp.json()

    except Exception as e:
        logger.error(f"[Layer3] OWM forecast failed for {city}: {e}")
        return {
            "blocked": False,
            "probabilities": {},
            "clearance_date": None,
            "daily_probabilities": {},
        }

    slots = forecast.get("list", [])

    days: dict[str, list] = {}
    for slot in slots:
        day = slot["dt_txt"][:10]
        days.setdefault(day, []).append(slot)

    breach_days: dict[str, int] = {"rainfall": 0, "heat": 0}
    total_days = len(days)

    for day_slots in days.values():
        daily_rain = sum(s.get("rain", {}).get("3h", 0.0) for s in day_slots)
        max_temp = max(s["main"].get("temp_max", 0.0) for s in day_slots)

        if daily_rain >= TRIGGER_THRESHOLDS["rainfall"]:
            breach_days["rainfall"] += 1
        if max_temp >= TRIGGER_THRESHOLDS["heat"]:
            breach_days["heat"] += 1

    probabilities = {
        trigger: round(count / max(total_days, 1), 3)
        for trigger, count in breach_days.items()
    }

    daily_probabilities = {}
    for day, day_slots in days.items():
        daily_rain = sum(s.get("rain", {}).get("3h", 0.0) for s in day_slots)
        max_temp = max(s["main"].get("temp_max", 0.0) for s in day_slots)

        rain_prob = min(round(daily_rain / TRIGGER_THRESHOLDS["rainfall"], 3), 1.0)
        heat_prob = min(
            round(max(0.0, max_temp - 38.0) / (TRIGGER_THRESHOLDS["heat"] - 38.0), 3),
            1.0,
        )

        daily_probabilities[day] = {
            "rainfall": rain_prob,
            "heat": heat_prob,
        }

    blocked = any(
        probability >= ADVERSE_SELECTION_FORECAST_THRESHOLD
        for probability in probabilities.values()
    )

    clearance_date = None
    if blocked:
        clearance_date = (
            datetime.utcnow() + timedelta(days=ADVERSE_SELECTION_ENROLLMENT_DAYS)
        ).strftime("%B %d, %Y")

    logger.info(
        f"[Layer3] Adverse selection check for {city}: "
        f"probabilities={probabilities} blocked={blocked}"
    )

    return {
        "blocked": blocked,
        "probabilities": probabilities,
        "clearance_date": clearance_date,
        "daily_probabilities": daily_probabilities,
    }


async def oracle_integrity_check(
    city: str,
    trigger_type: str,
    raw_value: float,
    cpcb_value: float | None,
    supabase,
    zone_lat: float | None = None,
    zone_lng: float | None = None,
) -> dict:
    """
    Cross-validate trigger value against multiple independent sources.
    Requires 2 of 3 sources to confirm breach before oracle_confirmed=True.

    Sources by trigger type:
    - Rainfall: Open-Meteo ECMWF IFS 9km (primary) +
                Google Maps Weather MetNet (secondary) +
                historical percentile check (tertiary)
    - Heat:     Open-Meteo ECMWF IFS 9km (primary) +
                Google Maps Weather MetNet (secondary) +
                historical percentile check (tertiary)
    - AQI:      CPCB (primary) + historical percentile (secondary)
    - Curfew:   Admin flag only - no oracle needed
    """
    coords = CITY_COORDS.get(city, {})
    lat = zone_lat if zone_lat is not None else coords.get("lat", 0.0)
    lon = zone_lng if zone_lng is not None else coords.get("lon", 0.0)
    threshold = TRIGGER_THRESHOLDS.get(trigger_type, 9999)

    sources_confirming = 0
    sources_checked = 0
    single_source_breach = raw_value >= threshold
    percentile = 0.0
    statistical_outlier = False
    gw_value = None

    if trigger_type == "rainfall":
        om_value = await get_open_meteo_rainfall(lat, lon)
        if om_value is not None:
            sources_checked += 1
            if om_value >= threshold:
                sources_confirming += 1
            logger.info(f"[Oracle] Source 1 Open-Meteo: {om_value} threshold={threshold}")

        gw_value = await get_google_weather_rainfall(lat, lon)
        if gw_value is not None:
            sources_checked += 1
            if gw_value >= threshold:
                sources_confirming += 1
            logger.info(f"[Oracle] Source 2 Google Weather: {gw_value} threshold={threshold}")

    elif trigger_type == "heat":
        om_value = await get_open_meteo_temp(lat, lon)
        if om_value is not None:
            sources_checked += 1
            if om_value >= threshold:
                sources_confirming += 1
            logger.info(f"[Oracle] Source 1 Open-Meteo: {om_value} threshold={threshold}")

        gw_value = await get_google_weather_temp(lat, lon)
        if gw_value is not None:
            sources_checked += 1
            if gw_value >= threshold:
                sources_confirming += 1
            logger.info(f"[Oracle] Source 2 Google Weather: {gw_value} threshold={threshold}")

    percentile_result = await compute_historical_percentile(
        city=city,
        trigger_type=trigger_type,
        raw_value=raw_value,
        supabase=supabase,
    )
    percentile = percentile_result.get("percentile", 0.0)
    statistical_outlier = percentile_result.get("statistical_outlier", False)

    if percentile_result.get("has_history"):
        sources_checked += 1
        if statistical_outlier:
            sources_confirming += 1
        logger.info(f"[Oracle] Source 3 Historical percentile: {percentile:.1f}%")

    if trigger_type == "aqi" and cpcb_value is not None:
        cpcb_confirmed = cpcb_value >= TRIGGER_THRESHOLDS["aqi"]
        oracle_confirmed = single_source_breach and cpcb_confirmed
    elif trigger_type == "curfew":
        oracle_confirmed = single_source_breach
    else:
        min_required = 2 if sources_checked >= 3 else 1 if sources_checked > 0 else 0
        oracle_confirmed = (
            single_source_breach
            and sources_checked > 0
            and sources_confirming >= min_required
        )

    logger.info(
        f"[Oracle] {city} {trigger_type}: "
        f"raw={raw_value} sources_checked={sources_checked} "
        f"sources_confirming={sources_confirming} "
        f"oracle_confirmed={oracle_confirmed}"
    )

    return {
        "oracle_confirmed": oracle_confirmed,
        "single_source_breach": single_source_breach,
        "statistical_outlier": statistical_outlier,
        "percentile": percentile,
        "cpcb_raw_value": cpcb_value if trigger_type == "aqi" else gw_value,
        "sources_checked": sources_checked,
        "sources_confirming": sources_confirming,
    }
