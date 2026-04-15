import logging
import asyncio
from contextlib import asynccontextmanager
from datetime import UTC, date, datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .routers import kyc, ml
from .services.claim_service import ML_SERVICE_URL, create_claims_for_trigger, get_supabase
from .services.fraud_layer3 import check_adverse_selection_forecast
from .trigger_config import CITY_COORDS, LIQUIDITY_RESERVE_PCT, TRIGGERS
from .trigger_engine import start_trigger_engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

STRESS_TEST_DAYS = 14


def _get_inserted_row(result):
    if isinstance(result.data, list):
        return result.data[0] if result.data else None
    return result.data


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = start_trigger_engine(app)
    app.state.scheduler = scheduler
    try:
        yield
    finally:
        scheduler.shutdown(wait=False)


app = FastAPI(
    title="GRIP ML API",
    version="0.1.0",
    description="Premium calculation endpoints for GRIP.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ml.router, prefix="/ml", tags=["ML"])
app.include_router(kyc.router, prefix="/kyc", tags=["KYC"])


@app.post("/admin/set-curfew")
async def set_curfew(city: str, active: bool):
    supabase = get_supabase()
    supabase.table("curfew_flags").update(
        {
            "is_active": active,
            "updated_at": datetime.now(UTC).isoformat(),
        },
    ).eq("city", city).execute()
    return {"city": city, "curfew_active": active}


@app.post("/admin/fire-fraud-claim")
async def fire_fraud_claim(
    city: str = "Delhi",
    trigger_type: str = "aqi",
    override_value: float = 350.0,
):
    """
    Creates a claim with fraud-positive feature values for demo and testing.
    Status will be fraud_review. No payout is created.
    trigger_type and override_value are passed in - nothing hardcoded.
    """
    import os
    import random

    import httpx
    from supabase import create_client

    if trigger_type not in TRIGGERS:
        return {"error": f"Unknown trigger_type: {trigger_type}"}

    supabase = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_KEY"),
    )

    partner_result = (
        supabase.table("partners")
        .select("*, policies(*)")
        .eq("city", city)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )

    if not partner_result.data:
        return {"error": f"No active partners in {city}"}

    partner = partner_result.data[0]
    policy = next((item for item in partner.get("policies", []) if item["status"] == "active"), None)
    if not policy:
        return {"error": "No active policy found"}

    fraud_features = {
        "claim_lag_hours": 2.1,
        "prior_orders_48h": 1,
        "claim_hour": 20,
        "prior_claims_30d": 8,
        "device_returning": 0,
        "zone_match": 0,
        "device_tampered": 1,
        "nocturnal_fraction": 0.72,
        "cancellation_ratio": 0.48,
        "network_reuse_count": 14,
        "fnol_last_trip_delta_hours": 72.0,
        "activity_kl_divergence": 0.95,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        fraud_resp = await client.post(
            f"{ML_SERVICE_URL}/ml/fraud-score",
            json=fraud_features,
        )
        fraud_resp.raise_for_status()
        fraud_result = fraud_resp.json()

    trigger_result = (
        supabase.table("trigger_events")
        .insert(
            {
                "trigger_type": trigger_type,
                "city": city,
                "raw_value": override_value,
                "threshold": TRIGGERS[trigger_type]["threshold"],
                "confirmed": True,
                "data_source": "Manual",
                "quality_flag": "estimated",
                "metadata": {"demo_fraud_test": True},
            },
        )
        .execute()
    )
    trigger_event = _get_inserted_row(trigger_result)
    if not trigger_event:
        return {"error": "Trigger event insert returned no data"}

    claim_number = (
        f"CLM-FRAUD-{city[:2].upper()}-"
        f"{datetime.utcnow().strftime('%Y%m%d')}-"
        f"{random.randint(100000, 999999)}"
    )

    claim_result = (
        supabase.table("claims")
        .insert(
            {
                "partner_id": partner["id"],
                "policy_id": policy["id"],
                "trigger_event_id": trigger_event["id"],
                "claim_number": claim_number,
                "trigger_type": trigger_type,
                "status": "fraud_review",
                "payout_amount": policy["payout_per_day"],
                "fraud_flag": True,
                "anomaly_score": fraud_result["anomaly_score"],
                "auto_approved": False,
            },
        )
        .execute()
    )
    claim = _get_inserted_row(claim_result)
    if not claim:
        return {"error": "Claim insert returned no data"}

    return {
        "status": "fraud_claim_created",
        "claim_number": claim_number,
        "trigger_type": trigger_type,
        "city": city,
        "fraud_flag": True,
        "anomaly_score": fraud_result["anomaly_score"],
        "confidence": fraud_result["confidence"],
        "claim_id": claim["id"],
    }


@app.post("/admin/fire-trigger")
async def fire_trigger(city: str, trigger_type: str, override_value: float):
    """
    Demo endpoint: manually inject a trigger reading.
    Sets the raw value directly and bypasses the scheduler.
    Used exclusively for demo video recording.
    """
    if trigger_type not in TRIGGERS:
        raise HTTPException(status_code=400, detail=f"Unknown trigger_type: {trigger_type}")

    supabase = get_supabase()
    event_data = {
        "trigger_type": trigger_type,
        "city": city,
        "raw_value": override_value,
        "threshold": TRIGGERS[trigger_type]["threshold"],
        "persistence_day": TRIGGERS[trigger_type]["persistence_days"],
        "confirmed": True,
        "data_source": "Manual",
        "quality_flag": "estimated",
        "metadata": {"demo_override": True, "override_value": override_value},
    }

    result = supabase.table("trigger_events").insert(event_data).execute()
    event = _get_inserted_row(result)

    if not event:
        raise HTTPException(status_code=500, detail="Trigger event insert returned no data")

    await create_claims_for_trigger(event)
    return {"status": "trigger_fired", "event": event}


@app.get("/admin/bcr")
async def get_bcr():
    """
    Compute Benefit-Cost Ratio from live Supabase data.
    BCR = total_payouts_amount / estimated_total_premiums_collected

    Premium pool estimate: for each active partner,
    weekly_premium x weeks_enrolled since enrolled_since date.

    BCR < 0.65 : healthy
    BCR 0.65-1.0: monitor
    BCR > 1.0  : unsustainable without reinsurance
    """
    supabase = get_supabase()

    try:
        payouts_result = supabase.table("payouts").select("amount").execute()

        total_payouts = sum(
            float(payout["amount"])
            for payout in (payouts_result.data or [])
            if payout.get("amount") is not None
        )

        partners_result = (
            supabase.table("partners")
            .select("weekly_premium, enrolled_since")
            .eq("is_active", True)
            .execute()
        )

        total_premiums = 0.0
        for partner in (partners_result.data or []):
            if not partner.get("weekly_premium") or not partner.get("enrolled_since"):
                continue
            enrolled = date.fromisoformat(str(partner["enrolled_since"])[:10])
            weeks = max(1, (date.today() - enrolled).days // 7)
            total_premiums += float(partner["weekly_premium"]) * weeks

        bcr = round(total_payouts / total_premiums, 4) if total_premiums > 0 else 0.0

        if bcr < 0.65:
            status = "healthy"
        elif bcr < 1.0:
            status = "monitor"
        else:
            status = "unsustainable"

        reserve_amount = round(total_premiums * LIQUIDITY_RESERVE_PCT, 2)
        deployable_pool = round(total_premiums * (1 - LIQUIDITY_RESERVE_PCT), 2)
        pool_utilisation = (
            round(total_payouts / deployable_pool, 4) if deployable_pool > 0 else 0.0
        )

        return {
            "bcr": bcr,
            "status": status,
            "total_payouts": round(total_payouts, 2),
            "total_premiums": round(total_premiums, 2),
            "reserve_amount": reserve_amount,
            "deployable_pool": deployable_pool,
            "pool_utilisation": pool_utilisation,
            "partner_count": len(partners_result.data or []),
        }

    except Exception as e:  # noqa: BLE001
        logger.error(f"[BCR] Computation failed: {e}")
        return {
            "bcr": 0.0,
            "status": "error",
            "total_payouts": 0.0,
            "total_premiums": 0.0,
            "reserve_amount": 0.0,
            "deployable_pool": 0.0,
            "pool_utilisation": 0.0,
            "partner_count": 0,
        }


@app.get("/admin/forecast-risk")
async def get_forecast_risk():
    """
    Fetch 5-day breach probability forecast for all 5 cities.
    Runs adverse selection forecast check in parallel for all cities.
    Returns a dict keyed by city with per-day breach probabilities
    for rainfall and heat triggers.
    AQI forecast not available from OWM free tier -
    uses rolling 3-day average from trigger_events as proxy.
    """
    cities = list(CITY_COORDS.keys())

    results = await asyncio.gather(
        *[check_adverse_selection_forecast(city) for city in cities],
        return_exceptions=True,
    )

    forecast_map = {}
    for city, result in zip(cities, results):
        if isinstance(result, Exception):
            logger.warning(f"[ForecastRisk] Failed for {city}: {result}")
            forecast_map[city] = {
                "probabilities": {},
                "daily_probabilities": {},
                "blocked": False,
            }
        else:
            forecast_map[city] = result

    return {"cities": forecast_map, "days": 5}


@app.get("/admin/stress-test")
async def get_stress_test():
    """
    14-day monsoon stress test.
    Computes projected total payout if rainfall trigger fires every day
    for STRESS_TEST_DAYS consecutive days across all 5 cities simultaneously.
    Compares against current premium pool and reserve.

    Methodology: ETCCDI Rx14day - maximum 14-day rolling rainfall accumulation.
    Applied to current active partner pool to assess capital adequacy.
    """
    supabase = get_supabase()

    try:
        partners_result = (
            supabase.table("partners")
            .select("city, payout_per_day, weekly_premium, enrolled_since")
            .eq("is_active", True)
            .execute()
        )

        partners = partners_result.data or []

        from collections import defaultdict

        city_stats: dict = defaultdict(
            lambda: {
                "partner_count": 0,
                "daily_exposure": 0.0,
                "total_14d_payout": 0.0,
            },
        )

        total_premiums = 0.0

        for partner in partners:
            city = partner.get("city", "Unknown")
            payout_per_day = float(partner.get("payout_per_day") or 0)
            weekly_premium = float(partner.get("weekly_premium") or 0)

            city_stats[city]["partner_count"] += 1
            city_stats[city]["daily_exposure"] += payout_per_day
            city_stats[city]["total_14d_payout"] += payout_per_day * STRESS_TEST_DAYS

            if partner.get("enrolled_since"):
                enrolled = date.fromisoformat(str(partner["enrolled_since"])[:10])
                weeks = max(1, (date.today() - enrolled).days // 7)
                total_premiums += weekly_premium * weeks

        total_14d_exposure = sum(
            value["total_14d_payout"] for value in city_stats.values()
        )

        reserve_amount = total_premiums * LIQUIDITY_RESERVE_PCT
        deployable_pool = total_premiums * (1 - LIQUIDITY_RESERVE_PCT)
        shortfall = max(0.0, total_14d_exposure - deployable_pool)
        pool_survives = total_14d_exposure <= deployable_pool

        return {
            "stress_test_days": STRESS_TEST_DAYS,
            "trigger_type": "rainfall",
            "total_14d_exposure": round(total_14d_exposure, 2),
            "total_premiums": round(total_premiums, 2),
            "deployable_pool": round(deployable_pool, 2),
            "reserve_amount": round(reserve_amount, 2),
            "shortfall": round(shortfall, 2),
            "pool_survives": pool_survives,
            "city_breakdown": {
                city: {
                    "partner_count": stats["partner_count"],
                    "daily_exposure": round(stats["daily_exposure"], 2),
                    "total_14d_payout": round(stats["total_14d_payout"], 2),
                }
                for city, stats in city_stats.items()
            },
            "partner_count": len(partners),
        }

    except Exception as e:  # noqa: BLE001
        logger.error(f"[StressTest] Computation failed: {e}")
        return {"error": str(e)}
