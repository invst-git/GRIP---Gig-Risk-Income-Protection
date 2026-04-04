import os

import httpx

from ..trigger_config import CITY_COORDS


async def get_current_weather(city: str) -> dict:
    coords = CITY_COORDS[city]

    async with httpx.AsyncClient(timeout=10.0) as client:
        current_resp = await client.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={
                "lat": coords["lat"],
                "lon": coords["lon"],
                "appid": os.getenv("OWM_API_KEY"),
                "units": "metric",
            },
        )
        current_resp.raise_for_status()
        current = current_resp.json()

        forecast_resp = await client.get(
            "https://api.openweathermap.org/data/2.5/forecast",
            params={
                "lat": coords["lat"],
                "lon": coords["lon"],
                "appid": os.getenv("OWM_API_KEY"),
                "units": "metric",
                "cnt": 8,
            },
        )
        forecast_resp.raise_for_status()
        forecast = forecast_resp.json()

    temp_c = (
        current["main"]["temp_max"]
        if "temp_max" in current["main"]
        else current["main"]["temp"]
    )
    rain_mm = sum(slot.get("rain", {}).get("3h", 0.0) for slot in forecast.get("list", []))

    return {
        "city": city,
        "temp_c": round(temp_c, 1),
        "rain_mm_24h": round(rain_mm, 2),
        "source": "OpenWeatherMap",
        "quality_flag": "measured",
    }
