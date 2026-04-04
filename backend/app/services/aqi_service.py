import logging
import os

import httpx

CPCB_BASE = "https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69"
logger = logging.getLogger(__name__)

CITY_TO_STATE = {
    "Delhi": "Delhi",
    "Mumbai": "Maharashtra",
    "Bengaluru": "Karnataka",
    "Chennai": "TamilNadu",
    "Hyderabad": "Telangana",
}


async def get_city_aqi(city: str) -> dict:
    """
    Returns the highest AQI reading across all stations in the city's state.
    Uses CPCB real-time AQI API via data.gov.in.
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                CPCB_BASE,
                params={
                    "api-key": os.getenv("CPCB_API_KEY"),
                    "format": "json",
                    "filters[state]": CITY_TO_STATE[city],
                    "limit": 100,
                },
            )
            response.raise_for_status()
            data = response.json()

        records = data.get("records", [])
        if not records:
            return {
                "city": city,
                "aqi": 0,
                "station": None,
                "source": "CPCB",
                "quality_flag": "measured",
            }

        max_aqi = 0.0
        max_station = None
        for record in records:
            try:
                value = float(record.get("pollutant_avg", 0) or 0)
            except (TypeError, ValueError):
                continue

            if value > max_aqi:
                max_aqi = value
                max_station = record.get("station", "Unknown")

        return {
            "city": city,
            "aqi": round(max_aqi, 1),
            "station": max_station,
            "source": "CPCB",
            "quality_flag": "measured",
        }
    except Exception as e:
        logger.error(
            f"[AQI] Fetch failed for {city}: {type(e).__name__}: {e}"
        )
        return {
            "city":         city,
            "aqi":          0,
            "station":      None,
            "source":       "CPCB",
            "quality_flag": "estimated",
        }
