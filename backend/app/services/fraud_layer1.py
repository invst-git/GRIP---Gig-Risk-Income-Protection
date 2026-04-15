"""
Layer 1 - Registration and Identity Integrity
Runs at partner registration. Results stored on partners table.
Detects: zone registration fraud, identity duplication.
"""

import logging
import math
import os
from datetime import datetime, timedelta

import httpx

from ..trigger_config import (
    ADVERSE_SELECTION_ENROLLMENT_DAYS,
    CITY_COORDS,
    EARTH_RADIUS_KM,
    GEOCODE_TIMEOUT_SECONDS,
    IP_LOOKBACK_DAYS,
    IP_REGISTRATION_LIMIT_30D,
    ZONE_DISTANCE_THRESHOLD_KM,
)

logger = logging.getLogger(__name__)

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")


def haversine_km(
    lat1: float,
    lng1: float,
    lat2: float,
    lng2: float,
) -> float:
    """Compute great-circle distance in kilometres between two coordinates."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def geocode_zone(zone: str, city: str) -> tuple[float, float] | None:
    """
    Use Google Maps Geocoding API to get centroid coordinates of operating zone.
    Returns (lat, lng) or None if geocoding fails or API key is absent.
    A failed geocode never blocks registration.
    """
    if not GOOGLE_MAPS_API_KEY:
        logger.warning("[Layer1] GOOGLE_MAPS_API_KEY not set - skipping zone geocode")
        return None

    query = f"{zone}, {city}, India"
    url = "https://maps.googleapis.com/maps/api/geocode/json"

    try:
        async with httpx.AsyncClient(timeout=GEOCODE_TIMEOUT_SECONDS) as client:
            resp = await client.get(
                url,
                params={
                    "address": query,
                    "key": GOOGLE_MAPS_API_KEY,
                },
            )
            resp.raise_for_status()

        data = resp.json()

        if data.get("status") == "OK" and data.get("results"):
            loc = data["results"][0]["geometry"]["location"]
            return float(loc["lat"]), float(loc["lng"])

    except Exception as e:
        logger.warning(f"[Layer1] Geocode failed for '{query}': {e}")

    return None


async def check_zone_coordinates(zone: str, city: str) -> dict:
    """
    Geocode the partner's operating zone and check if it is within
    ZONE_DISTANCE_THRESHOLD_KM of the declared city center.
    Returns flag=True if zone is geographically implausible for the city.
    """
    city_coords = CITY_COORDS.get(city)
    if not city_coords:
        return {
            "zone_lat": None,
            "zone_lng": None,
            "zone_distance_from_city_km": None,
            "zone_coordinates_flag": False,
        }

    city_lat = city_coords["lat"]
    city_lng = city_coords["lon"]
    coords = await geocode_zone(zone, city)

    if coords is None:
        return {
            "zone_lat": None,
            "zone_lng": None,
            "zone_distance_from_city_km": None,
            "zone_coordinates_flag": False,
        }

    zone_lat, zone_lng = coords
    distance_km = haversine_km(city_lat, city_lng, zone_lat, zone_lng)
    flag = distance_km > ZONE_DISTANCE_THRESHOLD_KM

    if flag:
        logger.warning(
            f"[Layer1] Zone coordinates flag: '{zone}' in {city} "
            f"is {distance_km:.1f}km from city center - "
            f"exceeds {ZONE_DISTANCE_THRESHOLD_KM}km threshold"
        )

    return {
        "zone_lat": zone_lat,
        "zone_lng": zone_lng,
        "zone_distance_from_city_km": round(distance_km, 2),
        "zone_coordinates_flag": flag,
    }


async def check_ip_duplication(registration_ip: str, supabase) -> dict:
    """
    Count how many partners registered from the same IP in the last IP_LOOKBACK_DAYS.
    Returns flag=True if count exceeds IP_REGISTRATION_LIMIT_30D.
    Private and localhost IPs are never flagged.
    """
    private_prefixes = ("127.", "192.168.", "10.", "::1")
    if any(registration_ip.startswith(prefix) for prefix in private_prefixes):
        return {
            "ip_registrations_30d": 0,
            "identity_duplication_flag": False,
        }

    try:
        cutoff = (datetime.utcnow() - timedelta(days=IP_LOOKBACK_DAYS)).isoformat()
        result = (
            supabase.table("partners")
            .select("id")
            .eq("registration_ip", registration_ip)
            .gte("created_at", cutoff)
            .execute()
        )

        count = len(result.data) if result.data else 0
        flag = count > IP_REGISTRATION_LIMIT_30D

        if flag:
            logger.warning(
                f"[Layer1] IP duplication flag: {registration_ip} "
                f"used for {count} registrations in last {IP_LOOKBACK_DAYS} days"
            )

        return {
            "ip_registrations_30d": count,
            "identity_duplication_flag": flag,
        }

    except Exception as e:
        logger.error(f"[Layer1] IP duplication check failed: {e}")
        return {
            "ip_registrations_30d": 0,
            "identity_duplication_flag": False,
        }


async def check_enrollment_timing(city: str, supabase) -> dict:
    """
    Count confirmed triggers in the partner's city in the prior
    ADVERSE_SELECTION_ENROLLMENT_DAYS days.
    Non-zero count means the partner enrolled during or after an active trigger window.
    """
    try:
        cutoff = (
            datetime.utcnow() - timedelta(days=ADVERSE_SELECTION_ENROLLMENT_DAYS)
        ).isoformat()

        result = (
            supabase.table("trigger_events")
            .select("id")
            .eq("city", city)
            .eq("confirmed", True)
            .gte("fired_at", cutoff)
            .execute()
        )

        count = len(result.data) if result.data else 0
        return {"enrollment_trigger_count": count}

    except Exception as e:
        logger.error(f"[Layer1] Enrollment timing check failed: {e}")
        return {"enrollment_trigger_count": 0}


async def run_layer1(
    partner_id: str,
    city: str,
    zone: str,
    registration_ip: str,
    supabase,
) -> dict:
    """
    Run all Layer 1 checks and update the partners table with results.
    Called at the end of partner registration via the seed-baseline endpoint.
    Returns the combined Layer 1 result dict.
    Never raises - all failures are caught and logged.
    """
    zone_result = await check_zone_coordinates(zone, city)
    ip_result = await check_ip_duplication(registration_ip, supabase)
    timing_result = await check_enrollment_timing(city, supabase)

    update_payload = {
        **zone_result,
        **ip_result,
        **timing_result,
        "registration_ip": registration_ip,
    }

    try:
        (
            supabase.table("partners")
            .update(update_payload)
            .eq("id", partner_id)
            .execute()
        )

        logger.info(
            f"[Layer1] Completed for partner {partner_id}: "
            f"zone_flag={zone_result['zone_coordinates_flag']} "
            f"ip_flag={ip_result['identity_duplication_flag']} "
            f"trigger_count={timing_result['enrollment_trigger_count']}"
        )

    except Exception as e:
        logger.error(f"[Layer1] Failed to update partner {partner_id}: {e}")

    return update_payload
