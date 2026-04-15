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

# Fraud Layer 1
ZONE_DISTANCE_THRESHOLD_KM = 50.0
IP_REGISTRATION_LIMIT_30D = 2
IP_LOOKBACK_DAYS = 30
GEOCODE_TIMEOUT_SECONDS = 5.0
EARTH_RADIUS_KM = 6371.0

# Fraud Layer 3
TRIGGER_THRESHOLDS = {
    "heat": 43.0,
    "rainfall": 100.0,
    "aqi": 300.0,
    "curfew": 1.0,
}
ADVERSE_SELECTION_FORECAST_THRESHOLD = 0.70
ADVERSE_SELECTION_ENROLLMENT_DAYS = 7
OWM_FORECAST_SLOTS = 40
OWM_FORECAST_TIMEOUT_SECONDS = 8.0
ORACLE_HISTORY_DAYS = 365
ORACLE_MIN_HISTORICAL_SAMPLES = 5
ORACLE_OUTLIER_PERCENTILE = 99.0

# Shared
DEFAULT_DAILY_ORDERS = 20
