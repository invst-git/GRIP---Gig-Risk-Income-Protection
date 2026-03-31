import os

import httpx

from ..trigger_config import CITY_COORDS

OWM_BASE = "https://api.openweathermap.org/data/3.0/onecall"


async def get_current_weather(city: str) -> dict:
    """
    Returns current temperature (C) and 24h rainfall (mm) for a city.
    Uses OWM One Call 3.0 daily summary.
    """
    coords = CITY_COORDS[city]

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            OWM_BASE,
            params={
                "lat": coords["lat"],
                "lon": coords["lon"],
                "appid": os.getenv("OWM_API_KEY"),
                "units": "metric",
                "exclude": "minutely,hourly,alerts",
            },
        )
        response.raise_for_status()
        data = response.json()

    today = data["daily"][0]
    temp_c = today["temp"]["max"]
    rain_mm = today.get("rain", 0.0)

    return {
        "city": city,
        "temp_c": round(temp_c, 1),
        "rain_mm_24h": round(rain_mm, 2),
        "source": "OpenWeatherMap",
        "quality_flag": "measured",
    }
