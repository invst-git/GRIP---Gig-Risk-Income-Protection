import logging
import os
import random
from datetime import UTC, datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from .services.aqi_service import get_city_aqi
from .services.claim_service import create_claims_for_trigger, get_supabase
from .services.weather_service import get_current_weather
from .trigger_config import CITY_COORDS, TRIGGERS

logger = logging.getLogger(__name__)

_persistence: dict[str, dict] = {}


def _get_inserted_row(result):
    if isinstance(result.data, list):
        return result.data[0] if result.data else None
    return result.data


def _persistence_key(city: str, trigger_type: str) -> str:
    return f"{city}_{trigger_type}"


def _check_and_update_persistence(city: str, trigger_type: str, breached: bool) -> bool:
    """
    Returns True only when persistence threshold is met.
    For triggers requiring 2 consecutive days: returns True on the 2nd consecutive breach.
    For single-day triggers: returns True immediately on breach.
    """
    key = _persistence_key(city, trigger_type)
    required = TRIGGERS[trigger_type]["persistence_days"]
    today = datetime.now(UTC).date()
    entry = _persistence.get(key, {"count": 0, "last_date": None})

    if not breached:
        _persistence[key] = {"count": 0, "last_date": None}
        return False

    last_date = entry["last_date"]
    if last_date and (today - last_date).days == 1:
        entry["count"] += 1
    elif last_date == today:
        entry["count"] = max(entry["count"], 1)
    else:
        entry["count"] = 1

    entry["last_date"] = today
    _persistence[key] = entry
    return entry["count"] >= required


def _simulate_order_drop(city: str, trigger_type: str) -> float:
    """
    Simulates order volume drop for the AND-condition.
    In production: replace with real platform order API or Supabase zone metrics.
    Returns fraction dropped (0.0 to 1.0).
    """
    del city
    base_drops = {
        "heat": 0.35,
        "rainfall": 0.55,
        "aqi": 0.40,
        "curfew": 0.75,
    }
    base = base_drops.get(trigger_type, 0.30)
    jitter = random.uniform(-0.05, 0.05)
    return round(base + jitter, 3)


async def get_curfew_status(city: str, supabase) -> float:
    """Returns 1.0 if curfew active for city, 0.0 otherwise.
    Returns 0.0 safely if no row exists rather than raising."""
    try:
        result = (
            supabase.table("curfew_flags")
            .select("is_active, zone")
            .eq("city", city)
            .execute()
        )
        if result.data and len(result.data) > 0:
            return 1.0 if result.data[0].get("is_active") else 0.0
        return 0.0
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[TriggerEngine] Curfew check failed for {city}: {e}")
        return 0.0


async def evaluate_city(city: str):
    """
    Poll all data sources for a city and evaluate all applicable triggers.
    """
    supabase = get_supabase()

    weather = None
    aqi = None

    try:
        weather = await get_current_weather(city)
    except Exception as exc:  # noqa: BLE001
        logger.error("[TriggerEngine] Weather fetch failed for %s: %s", city, exc)

    try:
        aqi = await get_city_aqi(city)
    except Exception as exc:  # noqa: BLE001
        logger.error("[TriggerEngine] AQI fetch failed for %s: %s", city, exc)

    evaluations = []
    if weather:
        evaluations.extend(
            [
                ("heat", weather["temp_c"], TRIGGERS["heat"]["threshold"], weather["source"]),
                (
                    "rainfall",
                    weather["rain_mm_24h"],
                    TRIGGERS["rainfall"]["threshold"],
                    weather["source"],
                ),
            ],
        )

    if aqi:
        evaluations.append(("aqi", aqi["aqi"], TRIGGERS["aqi"]["threshold"], aqi["source"]))

    curfew_value = await get_curfew_status(city, supabase)
    evaluations.append(("curfew", curfew_value, TRIGGERS["curfew"]["threshold"], "Supabase"))

    for trigger_type, raw_value, threshold, source in evaluations:
        breached = raw_value >= threshold
        order_drop = _simulate_order_drop(city, trigger_type) if breached else 0.0
        and_condition = order_drop >= TRIGGERS[trigger_type]["order_drop_pct"]
        confirmed = breached and and_condition and _check_and_update_persistence(
            city,
            trigger_type,
            breached and and_condition,
        )

        persistence_day = _persistence.get(
            _persistence_key(city, trigger_type),
            {},
        ).get("count", 0 if not breached else 1)

        event_data = {
            "trigger_type": trigger_type,
            "city": city,
            "raw_value": raw_value,
            "threshold": threshold,
            "persistence_day": persistence_day,
            "confirmed": confirmed,
            "data_source": source,
            "quality_flag": "measured",
            "metadata": {
                "order_drop_pct": order_drop,
                "and_condition": and_condition,
                "weather": weather,
                "aqi": aqi,
                "curfew_active": bool(curfew_value),
            },
        }

        result = supabase.table("trigger_events").insert(event_data).execute()
        event = _get_inserted_row(result)

        if confirmed:
            logger.info(
                "[TriggerEngine] CONFIRMED: %s in %s (value=%s, threshold=%s)",
                trigger_type.upper(),
                city,
                raw_value,
                threshold,
            )
            if event:
                await create_claims_for_trigger(event)
        else:
            logger.debug(
                "[TriggerEngine] %s in %s: value=%s, breached=%s, confirmed=%s",
                trigger_type,
                city,
                raw_value,
                breached,
                confirmed,
            )


async def poll_all_cities():
    """Called by scheduler every 15 minutes."""
    logger.info("[TriggerEngine] Polling all cities at %s", datetime.now(UTC).isoformat())
    for city in CITY_COORDS:
        await evaluate_city(city)


def start_trigger_engine(app):
    """Register the scheduler with the FastAPI lifespan."""
    del app
    scheduler = AsyncIOScheduler(timezone="UTC")
    scheduler.add_job(
        poll_all_cities,
        "interval",
        minutes=15,
        id="trigger_poll",
        replace_existing=True,
        coalesce=True,
    )
    scheduler.start()
    logger.info("[TriggerEngine] Scheduler started - polling every 15 minutes")
    return scheduler
