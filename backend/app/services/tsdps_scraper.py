"""
TSDPS (Telangana State Development Planning Society) rainfall scraper.
Provides mandal-level (~5-10km) rainfall data for Hyderabad - finer
than Open-Meteo's 9km ECMWF IFS grid.

Source: https://tsdps.telangana.gov.in/mandaldata.jsp?s1={district_id}
        https://tsdps.telangana.gov.in/livejsp/GHMC.jsp

Hyderabad district IDs: 16 (Hyderabad), 17 (Rangareddy), 18 (Medchal)

Note: Commercial use requires MOU with TSDPS (tsdps-plg@telangana.gov.in)
      and ~Rs 3,500/AWS/year licensing per 2019 RTI precedent.
      For hackathon demo, scraping is used for demonstration purposes.
      Production deployment requires a signed MOU.
"""

import logging
from io import StringIO

import httpx
import pandas as pd

logger = logging.getLogger(__name__)

TSDPS_BASE_URL = "https://tsdps.telangana.gov.in"
TSDPS_TIMEOUT = 10.0

HYDERABAD_DISTRICT_IDS = {
    "Hyderabad": 16,
    "Rangareddy": 17,
    "Medchal": 18,
}

HYDERABAD_MANDAL_COORDS: dict[str, tuple[float, float]] = {
    "Secunderabad": (17.4399, 78.4983),
    "Kukatpally": (17.4849, 78.3998),
    "LB Nagar": (17.3488, 78.5518),
    "Charminar": (17.3616, 78.4747),
    "Serilingampally": (17.4947, 78.3193),
    "Uppal": (17.3980, 78.5590),
    "Medchal": (17.6291, 78.4808),
    "Shamshabad": (17.2543, 78.4290),
}


async def fetch_hyderabad_mandal_rainfall() -> dict[str, float]:
    """
    Scrape TSDPS GHMC live rainfall page for Hyderabad mandal-level data.
    Returns dict of {mandal_name: rainfall_mm_today}

    Falls back to empty dict on any failure - caller uses Open-Meteo instead.
    """
    try:
        async with httpx.AsyncClient(
            timeout=TSDPS_TIMEOUT,
            headers={"User-Agent": "Mozilla/5.0 GRIP-Research-Demo/1.0"},
            follow_redirects=True,
        ) as client:
            resp = await client.get(f"{TSDPS_BASE_URL}/livejsp/GHMC.jsp")
            resp.raise_for_status()

        tables = pd.read_html(StringIO(resp.text))
        if not tables:
            logger.warning("[TSDPS] No tables found in GHMC.jsp")
            return {}

        df = tables[0]
        df.columns = [str(column).strip().lower() for column in df.columns]

        mandal_col = next(
            (column for column in df.columns if "mandal" in column or "station" in column),
            None,
        )
        rainfall_col = next(
            (column for column in df.columns if "rain" in column or "today" in column),
            None,
        )

        if not mandal_col or not rainfall_col:
            logger.warning(f"[TSDPS] Could not identify columns: {df.columns.tolist()}")
            return {}

        result = {}
        for _, row in df.iterrows():
            mandal = str(row[mandal_col]).strip()
            try:
                rainfall = float(str(row[rainfall_col]).replace("--", "0").strip())
            except (ValueError, TypeError):
                rainfall = 0.0

            if mandal and mandal not in ("nan", "Total", "Grand Total"):
                result[mandal] = rainfall

        logger.info(f"[TSDPS] Fetched {len(result)} Hyderabad mandal readings")
        return result

    except Exception as e:
        logger.warning(f"[TSDPS] Scrape failed: {e} - falling back to Open-Meteo")
        return {}


def get_nearest_mandal_rainfall(
    lat: float,
    lon: float,
    mandal_data: dict[str, float],
) -> float | None:
    """
    Find the nearest known mandal centroid to a partner's zone coordinates
    and return its scraped rainfall reading.

    Returns None if no mandal data available or no match within 15km.
    """
    if not mandal_data:
        return None

    from math import asin, cos, radians, sin, sqrt

    def haversine(lat1, lon1, lat2, lon2):
        radius = 6371.0
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = (
            sin(dlat / 2) ** 2
            + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
        )
        return radius * 2 * asin(sqrt(a))

    best_mandal = None
    best_distance = float("inf")

    for mandal, (mandal_lat, mandal_lon) in HYDERABAD_MANDAL_COORDS.items():
        if mandal not in mandal_data:
            continue
        distance = haversine(lat, lon, mandal_lat, mandal_lon)
        if distance < best_distance:
            best_distance = distance
            best_mandal = mandal

    if best_mandal and best_distance <= 15.0:
        logger.info(
            f"[TSDPS] Matched ({lat},{lon}) to {best_mandal} "
            f"({best_distance:.1f}km) rainfall={mandal_data[best_mandal]}mm"
        )
        return mandal_data[best_mandal]

    return None
