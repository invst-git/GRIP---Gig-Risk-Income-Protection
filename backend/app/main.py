from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .premium_engine import calculate_weekly_premium, calculate_zone_risk_score
from .schemas import PremiumQuoteRequest, PremiumQuoteResponse

app = FastAPI(
    title="GRIP ML API",
    version="0.1.0",
    description="Premium calculation endpoints for GRIP.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/ml/premium-quote", response_model=PremiumQuoteResponse)
def premium_quote(payload: PremiumQuoteRequest) -> PremiumQuoteResponse:
    zone_risk_score = calculate_zone_risk_score(
        city=payload.city,
        operating_zone=payload.operating_zone,
        vehicle_type=payload.vehicle_type,
        avg_daily_orders=payload.avg_daily_orders,
        avg_daily_hours=payload.avg_daily_hours,
    )
    weekly_premium = calculate_weekly_premium(
        zone_risk_score=zone_risk_score,
        tier=payload.coverage_tier,
    )

    return PremiumQuoteResponse(
        zoneRiskScore=zone_risk_score,
        weeklyPremium=weekly_premium,
        coverageTier=payload.coverage_tier,
    )
