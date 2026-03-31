from typing import Literal

import numpy as np
import pandas as pd
from fastapi import APIRouter
from pydantic import BaseModel

from ..ml_models import encoder_bundle, fraud_bundle, zone_risk_model

router = APIRouter()

CITY_HAZARD = {
    "Delhi": {"heat_days": 7.0, "rain_days": 0.75, "aqi_days": 25.0},
    "Mumbai": {"heat_days": 0.0, "rain_days": 6.0, "aqi_days": 1.0},
    "Bengaluru": {"heat_days": 0.0, "rain_days": 0.3, "aqi_days": 1.5},
    "Chennai": {"heat_days": 1.0, "rain_days": 2.0, "aqi_days": 2.0},
    "Hyderabad": {"heat_days": 0.85, "rain_days": 0.5, "aqi_days": 0.75},
}

SEASON_WEATHER_WEIGHTS = {
    "heat": [0.20, 0.20, 0.60, 1.00, 1.80, 1.80, 0.40, 0.20, 0.20, 0.20, 0.20, 0.20],
    "rain": [0.10, 0.10, 0.10, 0.20, 0.40, 1.20, 1.80, 1.80, 1.20, 0.80, 0.50, 0.10],
    "aqi": [1.80, 1.60, 0.80, 0.40, 0.40, 0.20, 0.20, 0.20, 0.40, 1.40, 1.80, 1.80],
}

ZONE_FLOOD_RISK = {
    "Mahadevapura": 1.50,
    "Sarjapur Road": 1.45,
    "Bellandur": 1.45,
    "Whitefield": 1.40,
    "Varthur": 1.40,
    "HSR Layout": 1.30,
    "Koramangala": 1.20,
    "Indiranagar": 1.10,
    "JP Nagar": 1.05,
    "Chembur": 1.45,
    "Deonar": 1.45,
    "Mankhurd": 1.40,
    "Sion": 1.35,
    "Dharavi": 1.35,
    "Kurla": 1.35,
    "Andheri": 1.30,
    "Wadala": 1.25,
    "Parel": 1.30,
    "Khar": 1.20,
    "Bandra": 1.10,
    "Yamuna Floodplain": 1.50,
    "ITO": 1.40,
    "Azad Market": 1.35,
    "Lajpat Nagar": 1.10,
    "Connaught Place": 1.05,
    "Saket": 1.05,
    "Pallikaranai": 1.45,
    "Velachery": 1.40,
    "Adyar": 1.40,
    "Perungudi": 1.38,
    "Sholinganallur": 1.35,
    "Anna Nagar": 1.05,
    "Charminar": 1.35,
    "Falaknuma": 1.35,
    "Madhapur": 1.30,
    "HITEC City": 1.25,
    "Begumpet": 1.20,
    "Banjara Hills": 1.05,
}

BASE_PREMIUM = 49


class PremiumQuoteRequest(BaseModel):
    city: str
    zone: str
    vehicle_type: str
    platform: str
    season: str
    month: int
    avg_daily_orders: int
    avg_daily_hours: int


class PremiumQuoteResponse(BaseModel):
    zone_risk_score: float
    weekly_premium_basic: int
    weekly_premium_standard: int
    weekly_premium_premium: int
    city: str
    zone: str


class FraudScoreRequest(BaseModel):
    claim_lag_hours: float
    prior_orders_48h: int
    claim_hour: int
    prior_claims_30d: int
    device_returning: int
    zone_match: int
    device_tampered: int
    nocturnal_fraction: float
    cancellation_ratio: float
    network_reuse_count: int
    fnol_last_trip_delta_hours: float
    activity_kl_divergence: float


class FraudScoreResponse(BaseModel):
    anomaly_score: float
    is_fraud_flag: bool
    confidence: Literal["high", "medium", "low"]


def _build_zone_risk_input(payload: PremiumQuoteRequest) -> pd.DataFrame:
    hazard = CITY_HAZARD.get(payload.city, CITY_HAZARD["Delhi"])
    month_index = payload.month - 1
    effective_heat_days = round(
        hazard["heat_days"] * SEASON_WEATHER_WEIGHTS["heat"][month_index], 3
    )
    effective_rain_days = round(
        hazard["rain_days"] * SEASON_WEATHER_WEIGHTS["rain"][month_index], 3
    )
    effective_aqi_days = round(
        hazard["aqi_days"] * SEASON_WEATHER_WEIGHTS["aqi"][month_index], 3
    )
    zone_flood_risk = ZONE_FLOOD_RISK.get(payload.zone, 1.10)

    feature_row = pd.DataFrame(
        [
            {
                "city": payload.city,
                "zone": payload.zone,
                "vehicle_type": payload.vehicle_type,
                "platform": payload.platform,
                "season": payload.season,
                "month": payload.month,
                "avg_daily_orders": payload.avg_daily_orders,
                "avg_daily_hours": payload.avg_daily_hours,
                "effective_heat_days": effective_heat_days,
                "effective_rain_days": effective_rain_days,
                "effective_aqi_days": effective_aqi_days,
                "zone_flood_risk": zone_flood_risk,
            }
        ]
    )

    cat_features = encoder_bundle["cat_features"]
    num_features = encoder_bundle["num_features"]
    encoded_categories = pd.DataFrame(
        encoder_bundle["encoder"].transform(feature_row[cat_features]),
        columns=cat_features,
    )
    return pd.concat(
        [encoded_categories.reset_index(drop=True), feature_row[num_features].reset_index(drop=True)],
        axis=1,
    )


@router.get("/health")
def ml_health() -> dict[str, str]:
    return {
        "zone_risk_model": "loaded" if zone_risk_model is not None else "missing",
        "fraud_model": "loaded" if fraud_bundle["model"] is not None else "missing",
        "encoder": "loaded" if encoder_bundle["encoder"] is not None else "missing",
    }


@router.post("/premium-quote", response_model=PremiumQuoteResponse)
def premium_quote(payload: PremiumQuoteRequest) -> PremiumQuoteResponse:
    model_input = _build_zone_risk_input(payload)
    raw_score = float(zone_risk_model.predict(model_input)[0])
    zone_risk_score = float(np.clip(raw_score, 0.85, 1.50))

    return PremiumQuoteResponse(
        zone_risk_score=zone_risk_score,
        weekly_premium_basic=int(round(BASE_PREMIUM * zone_risk_score * 1.00)),
        weekly_premium_standard=int(round(BASE_PREMIUM * zone_risk_score * 1.25)),
        weekly_premium_premium=int(round(BASE_PREMIUM * zone_risk_score * 1.50)),
        city=payload.city,
        zone=payload.zone,
    )


@router.post("/fraud-score", response_model=FraudScoreResponse)
def fraud_score(payload: FraudScoreRequest) -> FraudScoreResponse:
    feature_values = np.array(
        [[getattr(payload, feature_name) for feature_name in fraud_bundle["features"]]],
        dtype=float,
    )
    anomaly_score = float(fraud_bundle["model"].score_samples(feature_values)[0])
    prediction = int(fraud_bundle["model"].predict(feature_values)[0])
    is_fraud_flag = prediction == -1

    if anomaly_score < -0.65:
        confidence = "high"
    elif anomaly_score < -0.55:
        confidence = "medium"
    else:
        confidence = "low"

    return FraudScoreResponse(
        anomaly_score=anomaly_score,
        is_fraud_flag=is_fraud_flag,
        confidence=confidence,
    )
