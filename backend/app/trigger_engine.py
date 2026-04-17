import asyncio
import logging
import random
from datetime import UTC, date as date_type, datetime, timedelta, timezone

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from .ml_config import (
    FRAUD_DEFAULT_CANCELLATION_RATIO,
    FRAUD_DEFAULT_FNOL_DELTA_HOURS_MINIMUM,
    FRAUD_DEFAULT_NETWORK_REUSE_COUNT,
    FRAUD_DEFAULT_NOCTURNAL_FRACTION,
)
from .services.aqi_service import get_city_aqi
from .services.claim_service import (
    _generate_claim_number,
    _get_payout_rate,
    _has_claim_for_today,
    call_fraud_score,
    compute_activity_kl_divergence,
    create_claims_for_trigger,
    get_supabase,
    initiate_payout,
)
from .services.fraud_layer3 import oracle_integrity_check
from .services.fraud_psi import run_psi_monitor
from .trigger_config import (
    ADVERSE_SELECTION_ENROLLMENT_DAYS,
    CITY_COORDS,
    DEFAULT_DAILY_ORDERS,
    TRIGGERS,
)

logger = logging.getLogger(__name__)

OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_ZONE_TIMEOUT = 8.0

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


async def get_zone_rainfall_mm(lat: float, lon: float) -> float:
    """
    Fetch 24h rainfall accumulation for a specific coordinate
    from Open-Meteo using ECMWF IFS at 9km resolution.

    This provides zone-centroid-level triggering:
    partners in different 9km grid cells get different readings.
    Replaces city-level OWM rainfall which snaps to city centroid.

    Fails open - returns 0.0 on any error.
    """
    try:
        async with httpx.AsyncClient(timeout=OPEN_METEO_ZONE_TIMEOUT) as client:
            resp = await client.get(
                OPEN_METEO_BASE_URL,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "hourly": "rain",
                    "forecast_days": 1,
                    "timezone": "Asia/Kolkata",
                },
            )
            resp.raise_for_status()
        data = resp.json()
        hourly_rain = data.get("hourly", {}).get("rain", [])
        total_rain = round(sum(float(value) for value in hourly_rain if value is not None), 2)
        return total_rain
    except Exception as e:
        logger.warning(f"[TriggerEngine/OpenMeteo] Rainfall fetch failed ({lat},{lon}): {e}")
        return 0.0


async def get_zone_temp_max(lat: float, lon: float) -> float:
    """
    Fetch today's maximum temperature for a specific coordinate
    from Open-Meteo using ECMWF IFS at 9km resolution.

    Fails open - returns 0.0 on any error.
    """
    try:
        async with httpx.AsyncClient(timeout=OPEN_METEO_ZONE_TIMEOUT) as client:
            resp = await client.get(
                OPEN_METEO_BASE_URL,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "daily": "temperature_2m_max",
                    "forecast_days": 1,
                    "timezone": "Asia/Kolkata",
                },
            )
            resp.raise_for_status()
        data = resp.json()
        daily = data.get("daily", {}).get("temperature_2m_max", [])
        temp_max = float(daily[0]) if daily and daily[0] is not None else 0.0
        return round(temp_max, 2)
    except Exception as e:
        logger.warning(f"[TriggerEngine/OpenMeteo] Temp fetch failed ({lat},{lon}): {e}")
        return 0.0


async def get_partners_grouped_by_zone(city: str, supabase) -> dict:
    """
    Fetch active partners in a city and group them by zone centroid.
    Partners with null zone_lat/zone_lng fall back to city coordinates.

    Returns: {(lat, lon): [partner_dict, ...]}
    """
    result = (
        supabase.table("partners")
        .select(
            "id, full_name, city, operating_zone, created_at, "
            "zone_lat, zone_lng, coverage_tier, "
            "weekly_premium, payout_per_day, weekly_cap, "
            "upi_id, enrolled_since, is_active, "
            "zone_coordinates_flag, identity_duplication_flag, "
            "enrollment_trigger_count, ipqs_ip_suspicious, ring_flag"
        )
        .eq("city", city)
        .eq("is_active", True)
        .execute()
    )

    city_coords = CITY_COORDS.get(city, {"lat": 0.0, "lon": 0.0})
    city_lat = city_coords["lat"]
    city_lng = city_coords["lon"]

    zone_groups: dict[tuple[float, float], list] = {}
    for partner in (result.data or []):
        lat = partner.get("zone_lat") or city_lat
        lon = partner.get("zone_lng") or city_lng
        key = (round(float(lat), 2), round(float(lon), 2))
        zone_groups.setdefault(key, []).append(partner)

    logger.info(
        f"[TriggerEngine] {city}: {len(result.data or [])} partners "
        f"in {len(zone_groups)} zone groups"
    )
    return zone_groups


async def _create_claims_for_subset(trigger_event: dict, partners: list[dict], supabase):
    """Subset claim creation path for zone-level triggers."""
    created_claims = []

    for partner in partners:
        policy_result = (
            supabase.table("policies")
            .select("*")
            .eq("partner_id", partner["id"])
            .eq("status", "active")
            .limit(1)
            .execute()
        )
        policies = policy_result.data or []
        if not policies:
            continue

        if _has_claim_for_today(
            supabase=supabase,
            partner_id=partner["id"],
            trigger_type=trigger_event["trigger_type"],
            reference_dt=trigger_event.get("fired_at") or trigger_event.get("created_at"),
        ):
            continue

        policy = policies[0]
        tier = policy.get("coverage_tier") or partner.get("coverage_tier", "Standard")
        payout_rate = _get_payout_rate(trigger_event["trigger_type"], tier)
        claim_number = _generate_claim_number(trigger_event["city"])
        thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
        prior_result = (
            supabase.table("claims")
            .select("id", count="exact")
            .eq("partner_id", partner["id"])
            .gte("created_at", thirty_days_ago)
            .execute()
        )
        prior_claims_30d = prior_result.count or 0

        trigger_timestamp = (
            trigger_event.get("created_at")
            or trigger_event.get("fired_at")
            or datetime.now(tz=timezone.utc).isoformat()
        )
        trigger_created_at = datetime.fromisoformat(trigger_timestamp.replace("Z", "+00:00"))
        claim_created_at = datetime.now(tz=timezone.utc)
        claim_latency_secs = max(
            0.0,
            round((claim_created_at - trigger_created_at).total_seconds(), 2),
        )

        recent_activity = (
            supabase.table("partner_activity_log")
            .select("orders_completed")
            .eq("partner_id", partner["id"])
            .order("week_start", desc=True)
            .limit(1)
            .execute()
        )

        if recent_activity.data:
            daily_avg = recent_activity.data[0]["orders_completed"] / 6
            prior_orders_48h = int(daily_avg * 2)
        else:
            prior_orders_48h = DEFAULT_DAILY_ORDERS

        enrolled_since_value = partner.get("enrolled_since") or partner.get("created_at")
        enrolled_since = date_type.fromisoformat(str(enrolled_since_value)[:10])
        days_since_enrollment = (date_type.today() - enrolled_since).days

        kl_divergence = compute_activity_kl_divergence(partner["id"], supabase)
        zone_match = 0 if partner.get("zone_coordinates_flag") else 1

        fraud_features = {
            "claim_lag_hours": round(claim_latency_secs / 3600, 4),
            "prior_orders_48h": prior_orders_48h,
            "claim_hour": claim_created_at.hour,
            "prior_claims_30d": prior_claims_30d,
            "activity_kl_divergence": kl_divergence,
            "days_since_enrollment": days_since_enrollment,
            "zone_coordinates_flag": 1 if partner.get("zone_coordinates_flag") else 0,
            "zone_match": zone_match,
            "device_returning": 1,
            "device_tampered": 0,
            "nocturnal_fraction": FRAUD_DEFAULT_NOCTURNAL_FRACTION,
            "cancellation_ratio": FRAUD_DEFAULT_CANCELLATION_RATIO,
            "network_reuse_count": FRAUD_DEFAULT_NETWORK_REUSE_COUNT,
            "fnol_last_trip_delta_hours": max(
                FRAUD_DEFAULT_FNOL_DELTA_HOURS_MINIMUM,
                claim_latency_secs / 3600,
            ),
        }

        fraud_result = await call_fraud_score(fraud_features)

        layer1_flag = bool(
            partner.get("zone_coordinates_flag")
            or partner.get("identity_duplication_flag")
            or partner.get("enrollment_trigger_count", 0) > 0
            or partner.get("ipqs_ip_suspicious")
            or partner.get("ring_flag")
        )
        layer2_flag = bool(fraud_result.get("is_fraud_flag"))
        layer3_flag = bool(
            days_since_enrollment < ADVERSE_SELECTION_ENROLLMENT_DAYS
            and partner.get("enrollment_trigger_count", 0) > 0
        )
        flags_count = sum([layer1_flag, layer2_flag, layer3_flag])

        if flags_count >= 2:
            claim_status = "fraud_review"
            auto_approved = False
        else:
            claim_status = "approved"
            auto_approved = True

        claim_data = {
            "partner_id": partner["id"],
            "policy_id": policy["id"],
            "trigger_event_id": trigger_event["id"],
            "claim_number": claim_number,
            "trigger_type": trigger_event["trigger_type"],
            "status": claim_status,
            "payout_amount": payout_rate,
            "fraud_score": fraud_result["anomaly_score"],
            "fraud_flag": fraud_result["is_fraud_flag"],
            "anomaly_score": fraud_result["anomaly_score"],
            "auto_approved": auto_approved,
            "claim_latency_seconds": claim_latency_secs,
            "days_since_enrollment": days_since_enrollment,
            "layer1_flag": layer1_flag,
            "layer2_flag": layer2_flag,
            "layer3_flag": layer3_flag,
            "flags_count": flags_count,
            "activity_kl_divergence": kl_divergence,
            "created_at": claim_created_at.isoformat(),
        }
        claim_result = supabase.table("claims").insert(claim_data).execute()
        claim = _get_inserted_row(claim_result)
        if not claim:
            continue

        created_claims.append(claim)

        if claim_status != "fraud_review":
            await initiate_payout(claim, partner)

    return created_claims


async def get_curfew_status(city: str, supabase) -> float:
    """Returns 1.0 if curfew active for city, 0.0 otherwise."""
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
    except Exception as e:
        logger.warning(f"[TriggerEngine] Curfew check failed for {city}: {e}")
        return 0.0


async def evaluate_city(city: str):
    """
    Evaluate all 4 triggers for a city.
    Rainfall and heat: per zone-centroid using Open-Meteo (9km ECMWF grid).
    AQI: city-level using CPCB.
    Curfew: city-level binary flag from curfew_flags table.
    """
    supabase = get_supabase()
    logger.info(f"[TriggerEngine] Evaluating {city}")

    aqi = None
    try:
        aqi = await get_city_aqi(city)
    except Exception as exc:
        logger.error("[TriggerEngine] AQI fetch failed for %s: %s", city, exc)

    aqi_value = aqi["aqi"] if aqi else 0.0
    curfew_value = await get_curfew_status(city, supabase)

    zone_groups = await get_partners_grouped_by_zone(city, supabase)
    unique_centroids = list(zone_groups.keys())

    rainfall_readings = await asyncio.gather(
        *[get_zone_rainfall_mm(lat, lon) for lat, lon in unique_centroids],
        return_exceptions=True,
    )
    heat_readings = await asyncio.gather(
        *[get_zone_temp_max(lat, lon) for lat, lon in unique_centroids],
        return_exceptions=True,
    )

    centroid_rainfall = {
        centroid: float(reading) if isinstance(reading, (int, float)) else 0.0
        for centroid, reading in zip(unique_centroids, rainfall_readings)
    }
    centroid_heat = {
        centroid: float(reading) if isinstance(reading, (int, float)) else 0.0
        for centroid, reading in zip(unique_centroids, heat_readings)
    }

    for centroid in unique_centroids:
        logger.info(
            f"[TriggerEngine] {city} zone ({centroid[0]},{centroid[1]}): "
            f"rainfall={centroid_rainfall[centroid]}mm "
            f"heat={centroid_heat[centroid]}°C"
        )

    for trigger_type, raw_value, source, cpcb_value in [
        ("aqi", aqi_value, aqi["source"] if aqi else "CPCB", aqi_value),
        ("curfew", curfew_value, "Supabase", None),
    ]:
        threshold = TRIGGERS[trigger_type]["threshold"]
        breached = raw_value >= threshold
        order_drop = _simulate_order_drop(city, trigger_type) if breached else 0.0
        and_condition = order_drop >= TRIGGERS[trigger_type]["order_drop_pct"]

        oracle_result = await oracle_integrity_check(
            city=city,
            trigger_type=trigger_type,
            raw_value=raw_value,
            cpcb_value=cpcb_value if trigger_type == "aqi" else None,
            supabase=supabase,
        )

        confirmed = _check_and_update_persistence(
            city=city,
            trigger_type=trigger_type,
            breached=breached and and_condition and oracle_result["oracle_confirmed"],
        )

        persistence_day = _persistence.get(
            _persistence_key(city, trigger_type),
            {},
        ).get("count", 0 if not confirmed else 1)

        trigger_payload = {
            "city": city,
            "trigger_type": trigger_type,
            "raw_value": raw_value,
            "threshold": threshold,
            "persistence_day": persistence_day,
            "confirmed": confirmed,
            "data_source": source,
            "quality_flag": (aqi or {}).get("quality_flag", "measured")
            if trigger_type == "aqi"
            else "measured",
            "zone_level": False,
            "metadata": {
                "order_drop_pct": order_drop,
                "and_condition": and_condition,
                "curfew_active": bool(curfew_value),
                "aqi": aqi,
            },
            "single_source_breach": oracle_result["single_source_breach"],
            "statistical_outlier": oracle_result["statistical_outlier"],
            "percentile": oracle_result["percentile"],
            "cpcb_raw_value": oracle_result["cpcb_raw_value"],
            "oracle_confirmed": oracle_result["oracle_confirmed"],
        }
        result = supabase.table("trigger_events").insert(trigger_payload).execute()
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

    for trigger_type in ("rainfall", "heat"):
        threshold = TRIGGERS[trigger_type]["threshold"]
        for centroid, partners_in_zone in zone_groups.items():
            lat, lon = centroid
            raw_value = (
                centroid_rainfall[centroid]
                if trigger_type == "rainfall"
                else centroid_heat[centroid]
            )
            breached = raw_value >= threshold
            order_drop = _simulate_order_drop(city, trigger_type) if breached else 0.0
            and_condition = order_drop >= TRIGGERS[trigger_type]["order_drop_pct"]

            oracle_result = await oracle_integrity_check(
                city=city,
                trigger_type=trigger_type,
                raw_value=raw_value,
                cpcb_value=None,
                supabase=supabase,
            )

            zone_key = f"{lat:.2f}_{lon:.2f}"
            confirmed = _check_and_update_persistence(
                city=f"{city}_{zone_key}",
                trigger_type=trigger_type,
                breached=breached and and_condition and oracle_result["oracle_confirmed"],
            )

            persistence_day = _persistence.get(
                _persistence_key(f"{city}_{zone_key}", trigger_type),
                {},
            ).get("count", 0 if not confirmed else 1)

            trigger_payload = {
                "city": city,
                "trigger_type": trigger_type,
                "raw_value": raw_value,
                "threshold": threshold,
                "persistence_day": persistence_day,
                "confirmed": confirmed,
                "data_source": "Open-Meteo",
                "quality_flag": "measured",
                "zone_level": True,
                "zone_lat": lat,
                "zone_lng": lon,
                "metadata": {
                    "order_drop_pct": order_drop,
                    "and_condition": and_condition,
                    "zone_partner_count": len(partners_in_zone),
                },
                "single_source_breach": oracle_result["single_source_breach"],
                "statistical_outlier": oracle_result["statistical_outlier"],
                "percentile": oracle_result["percentile"],
                "cpcb_raw_value": oracle_result["cpcb_raw_value"],
                "oracle_confirmed": oracle_result["oracle_confirmed"],
            }
            result = supabase.table("trigger_events").insert(trigger_payload).execute()
            event = _get_inserted_row(result)

            if confirmed and event:
                logger.info(
                    f"[TriggerEngine] Zone trigger confirmed: "
                    f"{city} {trigger_type} zone ({lat},{lon}) "
                    f"raw={raw_value} partners={len(partners_in_zone)}"
                )
                await _create_claims_for_subset(event, partners_in_zone, supabase)


async def poll_all_cities():
    """Called by scheduler every 15 minutes."""
    supabase = get_supabase()
    logger.info("[TriggerEngine] Polling all cities at %s", datetime.now(UTC).isoformat())
    for city in CITY_COORDS:
        await evaluate_city(city)

    try:
        await run_psi_monitor(supabase)
    except Exception as exc:
        logger.error("[TriggerEngine] PSI monitor failed: %s", exc)


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
