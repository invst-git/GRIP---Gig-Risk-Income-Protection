TRIGGERS = {
    "heat": {
        "threshold": 43.0,
        "unit": "celsius",
        "persistence_days": 2,
        "order_drop_pct": 0.30,
    },
    "rainfall": {
        "threshold": 100.0,
        "unit": "mm",
        "persistence_days": 1,
        "order_drop_pct": 0.30,
    },
    "aqi": {
        "threshold": 300,
        "unit": "aqi",
        "persistence_days": 2,
        "order_drop_pct": 0.30,
    },
    "curfew": {
        "threshold": 1,
        "unit": "binary",
        "persistence_days": 1,
        "order_drop_pct": 0.60,
    },
}

CITY_COORDS = {
    "Delhi": {"lat": 28.6139, "lon": 77.2090},
    "Mumbai": {"lat": 19.0760, "lon": 72.8777},
    "Bengaluru": {"lat": 12.9716, "lon": 77.5946},
    "Chennai": {"lat": 13.0827, "lon": 80.2707},
    "Hyderabad": {"lat": 17.3850, "lon": 78.4867},
}

PAYOUT_RATES = {
    "Basic": {"heat": 300, "rainfall": 300, "aqi": 300, "curfew": 300},
    "Standard": {"heat": 400, "rainfall": 400, "aqi": 400, "curfew": 400},
    "Premium": {"heat": 500, "rainfall": 500, "aqi": 500, "curfew": 500},
}

FIRST_PAYOUT_CAP = 4000
