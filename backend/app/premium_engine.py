CITY_RISK = {
    "Delhi": {"aqi": 0.30, "flood": 0.10, "heat": 0.25},
    "Mumbai": {"aqi": 0.05, "flood": 0.35, "heat": 0.10},
    "Bengaluru": {"aqi": 0.05, "flood": 0.30, "heat": 0.05},
    "Chennai": {"aqi": 0.05, "flood": 0.20, "heat": 0.25},
    "Hyderabad": {"aqi": 0.15, "flood": 0.10, "heat": 0.25},
}

ZONE_RISK_OVERRIDES = {
    "Sarjapur Road": 0.15,
    "Bellandur": 0.15,
    "Whitefield": 0.12,
    "Chembur": 0.14,
    "Andheri": 0.12,
    "Parel": 0.12,
    "NH8": 0.14,
    "Connaught Place": 0.05,
}

VEHICLE_MODIFIER = {
    "Two-Wheeler ICE": 0.00,
    "Two-Wheeler EV": -0.03,
    "Bicycle": -0.05,
}

TIER_MULTIPLIERS = {
    "Basic": 1.0,
    "Standard": 1.25,
    "Premium": 1.5,
}


def calculate_zone_risk_score(
    city: str,
    operating_zone: str,
    vehicle_type: str,
    avg_daily_orders: int,
    _avg_daily_hours: int,
) -> float:
    city_risk = CITY_RISK.get(city, CITY_RISK["Delhi"])
    base_risk = (
        city_risk["aqi"] * 0.4
        + city_risk["flood"] * 0.35
        + city_risk["heat"] * 0.25
    )

    zone_key = next(
        (
            zone
            for zone in ZONE_RISK_OVERRIDES
            if zone.lower() in operating_zone.lower()
        ),
        None,
    )
    zone_bonus = ZONE_RISK_OVERRIDES[zone_key] if zone_key else 0

    vehicle_mod = VEHICLE_MODIFIER.get(vehicle_type, 0)
    activity_mod = 0.05 if avg_daily_orders > 30 else -0.05 if avg_daily_orders < 15 else 0

    raw_score = 0.85 + (base_risk * 1.5) + zone_bonus + vehicle_mod + activity_mod
    return round(min(1.50, max(0.85, raw_score)), 2)


def calculate_weekly_premium(zone_risk_score: float, tier: str) -> int:
    tier_multiplier = TIER_MULTIPLIERS.get(tier, TIER_MULTIPLIERS["Standard"])
    return round(49 * zone_risk_score * tier_multiplier)
