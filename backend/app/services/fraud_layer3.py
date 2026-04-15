"""
Layer 3 - Adverse Selection and Oracle Integrity
Part A: Adverse selection gate at enrollment and plan change.
Part B: Oracle integrity check at trigger confirmation.
"""

import logging
import os
from datetime import datetime, timedelta

import httpx

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
        return {"blocked": False, "probabilities": {}, "clearance_date": None}

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
        return {"blocked": False, "probabilities": {}, "clearance_date": None}

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

    cpcb_breach = cpcb_value is not None and cpcb_value >= threshold

    single_source_breach = False
    if cpcb_value is not None:
        single_source_breach = owm_breach != cpcb_breach

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
