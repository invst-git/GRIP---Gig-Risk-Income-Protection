import logging
from contextlib import asynccontextmanager
from datetime import UTC, datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .routers import kyc, ml
from .services.claim_service import create_claims_for_trigger, get_supabase
from .trigger_config import TRIGGERS
from .trigger_engine import start_trigger_engine

logging.basicConfig(level=logging.INFO)


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
            "http://localhost:8000/ml/fraud-score",
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
