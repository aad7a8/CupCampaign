import os
import json
import logging
import requests

logger = logging.getLogger(__name__)

BASE_URL = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-091"


def get_taiwan_weather(api_key):
    """
    Fetch Taiwan weather forecast from CWA Open Data API.

    Args:
        api_key: CWA Open Data API key.

    Returns:
        dict: Weather data.
    """
    params = {
        "Authorization": api_key,
        "format": "JSON",
    }
    response = requests.get(BASE_URL, params=params)
    response.raise_for_status()
    return response.json()


def run():
    """
    Run the weather spider: fetch forecast and save to JSON.

    Returns:
        dict: Weather data.
    """
    api_key = os.getenv("OPEN_WEATHER_DATA_API_KEY")
    if not api_key:
        logger.error("OPEN_WEATHER_DATA_API_KEY not set, skipping weather fetch")
        return None

    logger.info("Fetching Taiwan weather forecast...")
    weather_data = get_taiwan_weather(api_key)

    output_file = "/app/data/weather.json"
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(weather_data, f, ensure_ascii=False, indent=2)

    logger.info("Saved weather data to %s", output_file)
    return weather_data
