from pydantic import BaseModel, ConfigDict, Field


class PremiumQuoteRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    city: str
    operating_zone: str = Field(alias="operatingZone")
    vehicle_type: str = Field(alias="vehicleType")
    avg_daily_orders: int = Field(alias="avgDailyOrders")
    avg_daily_hours: int = Field(alias="avgDailyHours")
    coverage_tier: str = Field(default="Standard", alias="coverageTier")


class PremiumQuoteResponse(BaseModel):
    zone_risk_score: float = Field(alias="zoneRiskScore")
    weekly_premium: int = Field(alias="weeklyPremium")
    coverage_tier: str = Field(alias="coverageTier")
