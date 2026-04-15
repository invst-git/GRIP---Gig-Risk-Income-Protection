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


async def get_open_meteo_reading(
    city: str,
    trigger_type: str,
) -> float | None:
    """
    Fetch current weather reading from Open-Meteo for the given city
    and trigger type. Used as a second source for oracle cross-validation
    of rainfall and heat triggers.

    Open-Meteo uses NOAA GFS model - a completely independent pipeline
    from OpenWeatherMap, making agreement between the two sources
    meaningful corroboration.

    Returns the relevant metric value or None if the call fails.
    Failure always returns None - never raises.

    Supported trigger types:
        rainfall: 24h rain accumulation in mm (hourly rain sum, 24 slots)
        heat:     daily maximum temperature in Celsius
    """
    if trigger_type not in ("rainfall", "heat"):
        return None

    coords = CITY_COORDS.get(city)
    if not coords:
        return None

    lat = coords["lat"]
    lon = coords["lon"]

    params: dict = {
        "latitude": lat,
        "longitude": lon,
        "timezone": "Asia/Kolkata",
    }

    if trigger_type == "rainfall":
        params["hourly"] = "rain"
        params["forecast_days"] = 1
    elif trigger_type == "heat":
        params["daily"] = "temperature_2m_max"
        params["forecast_days"] = 1

    try:
        async with httpx.AsyncClient(timeout=OPEN_METEO_TIMEOUT_SECONDS) as client:
            resp = await client.get(OPEN_METEO_BASE_URL, params=params)
            resp.raise_for_status()

        data = resp.json()

        if trigger_type == "rainfall":
            hourly_rain = data.get("hourly", {}).get("rain", [])
            if not hourly_rain:
                return None
            total_rain = round(
                sum(float(value) for value in hourly_rain if value is not None),
                2,
            )
            logger.info(
                f"[Layer3/OpenMeteo] {city} rainfall 24h accumulation: {total_rain}mm"
            )
            return total_rain

        if trigger_type == "heat":
            daily_max = data.get("daily", {}).get("temperature_2m_max", [])
            if not daily_max or daily_max[0] is None:
                return None
            temp_max = round(float(daily_max[0]), 2)
            logger.info(
                f"[Layer3/OpenMeteo] {city} temp_max today: {temp_max}°C"
            )
            return temp_max

    except Exception as e:
        logger.warning(
            f"[Layer3/OpenMeteo] Failed to fetch {trigger_type} for {city}: {e} "
            f"- oracle cross-validation will be skipped for this trigger"
        )
        return None

    return None


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
) -> dict:
    """
    Cross-validate OWM reading against CPCB reading.
    Compute historical percentile of raw_value for this city and trigger_type.
    Flag single-source breaches and statistical outliers.

    single_source_breach: OWM and CPCB disagree on whether threshold is breached
    statistical_outlier: raw_value is above ORACLE_OUTLIER_PERCENTILE of history
    oracle_confirmed: True only if OWM breaches AND not single_source_breach
    """
    threshold = TRIGGER_THRESHOLDS.get(trigger_type, 9999)
    owm_breach = raw_value >= threshold

    second_source_value: float | None = None

    if trigger_type == "aqi":
        second_source_value = cpcb_value
    elif trigger_type in ("rainfall", "heat"):
        second_source_value = await get_open_meteo_reading(city, trigger_type)
    elif trigger_type == "curfew":
        second_source_value = None

    second_source_breach = (
        second_source_value is not None
        and second_source_value >= threshold
    )

    single_source_breach = False
    if second_source_value is not None:
        single_source_breach = owm_breach != second_source_breach

    cpcb_value = second_source_value

    percentile = None
    outlier = False

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

        if len(historical_values) >= ORACLE_MIN_HISTORICAL_SAMPLES:
            below = sum(1 for value in historical_values if value <= raw_value)
            percentile = round((below / len(historical_values)) * 100, 1)
            outlier = percentile > ORACLE_OUTLIER_PERCENTILE

    except Exception as e:
        logger.error(f"[Layer3] Oracle historical check failed: {e}")

    oracle_confirmed = owm_breach and not single_source_breach

    logger.info(
        f"[Layer3] Oracle check {city} {trigger_type}: "
        f"raw={raw_value} cpcb={cpcb_value} "
        f"single_source={single_source_breach} "
        f"outlier={outlier} percentile={percentile} "
        f"confirmed={oracle_confirmed}"
    )

    return {
        "single_source_breach": single_source_breach,
        "statistical_outlier": outlier,
        "percentile": percentile,
        "cpcb_raw_value": cpcb_value,
        "oracle_confirmed": oracle_confirmed,
    }
