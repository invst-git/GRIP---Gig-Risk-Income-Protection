import logging
import os
import random
from datetime import UTC, datetime, timedelta
from functools import lru_cache

import httpx
from supabase import Client, create_client

from ..trigger_config import FIRST_PAYOUT_CAP, PAYOUT_RATES

logger = logging.getLogger(__name__)


def _get_inserted_row(result):
    if isinstance(result.data, list):
        return result.data[0] if result.data else None
    return result.data


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    return create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_KEY"),
    )


async def call_fraud_score(claim_features: dict) -> dict:
    """Call the local /ml/fraud-score endpoint."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            "http://127.0.0.1:8000/ml/fraud-score",
            json=claim_features,
        )
        response.raise_for_status()
        return response.json()


async def create_claims_for_trigger(trigger_event: dict):
    """
    Find all active partners in the triggered city, create a claim for each,
    run fraud scoring, and initiate payout for clean claims.
    """
    supabase = get_supabase()
    city = trigger_event["city"]

    partner_result = (
        supabase.table("partners")
        .select("*")
        .eq("city", city)
        .eq("is_active", True)
        .execute()
    )
    partners = partner_result.data or []
    if not partners:
        return []

    created_claims = []
    for partner in partners:
        policy_result = (
            supabase.table("policies")
            .select("*")
            .eq("partner_id", partner["id"])
            .eq("status", "active")
            .limit(1)
            .execute()
        )
        policies = policy_result.data or []
        if not policies:
            continue

        if _has_claim_for_today(
            supabase=supabase,
            partner_id=partner["id"],
            trigger_type=trigger_event["trigger_type"],
            reference_dt=trigger_event.get("fired_at"),
        ):
            continue

        policy = policies[0]
        tier = policy.get("coverage_tier") or partner.get("coverage_tier", "Standard")
        payout_rate = _get_payout_rate(trigger_event["trigger_type"], tier)
        claim_number = _generate_claim_number(city)
        thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
        prior_result = (
            supabase.table("claims")
            .select("id", count="exact")
            .eq("partner_id", partner["id"])
            .gte("created_at", thirty_days_ago)
            .execute()
        )
        prior_claims_30d = prior_result.count or 0

        fraud_features = {
            "claim_lag_hours": 0.25,
            "prior_orders_48h": partner.get("avg_daily_orders", 15),
            "claim_hour": datetime.now(UTC).hour,
            "prior_claims_30d": prior_claims_30d,
            "device_returning": 1,
            "zone_match": 1,
            "device_tampered": 0,
            "nocturnal_fraction": 0.10,
            "cancellation_ratio": 0.05,
            "network_reuse_count": 0,
            "fnol_last_trip_delta_hours": 1.0,
            "activity_kl_divergence": 0.05,
        }

        fraud_result = await call_fraud_score(fraud_features)

        claim_data = {
            "partner_id": partner["id"],
            "policy_id": policy["id"],
            "trigger_event_id": trigger_event["id"],
            "claim_number": claim_number,
            "trigger_type": trigger_event["trigger_type"],
            "status": "fraud_review" if fraud_result["is_fraud_flag"] else "approved",
            "payout_amount": payout_rate,
            "fraud_score": fraud_result["anomaly_score"],
            "fraud_flag": fraud_result["is_fraud_flag"],
            "anomaly_score": fraud_result["anomaly_score"],
            "auto_approved": not fraud_result["is_fraud_flag"],
            "created_at": datetime.now(UTC).isoformat(),
        }
        claim_result = supabase.table("claims").insert(claim_data).execute()
        claim = _get_inserted_row(claim_result)

        if not claim:
            continue

        created_claims.append(claim)

        if not fraud_result["is_fraud_flag"]:
            await initiate_payout(claim, partner)

    return created_claims


async def initiate_payout(claim: dict, partner: dict):
    """
    Simulated payout for Phase 2 demo.
    RazorpayX activation requires business banking KYC.
    Usecase explicitly permits simulated payouts at this phase.
    """
    supabase = get_supabase()

    existing = (
        supabase.table("payouts")
        .select("id")
        .eq("partner_id", partner["id"])
        .eq("status", "processed")
        .execute()
    )
    is_first = len(existing.data or []) == 0
    amount = min(claim["payout_amount"], FIRST_PAYOUT_CAP) if is_first else claim["payout_amount"]
    simulated_payout_id = f"pout_DEMO_{random.randint(10000000, 99999999)}"

    payout_record = {
        "claim_id": claim["id"],
        "partner_id": partner["id"],
        "upi_id": partner["upi_id"],
        "amount": amount,
        "is_first_payout": is_first,
        "status": "processed",
        "razorpay_payout_id": simulated_payout_id,
        "settled_at": datetime.now(UTC).isoformat(),
    }

    supabase.table("payouts").insert(payout_record).execute()
    supabase.table("claims").update(
        {
            "status": "paid",
            "resolved_at": datetime.now(UTC).isoformat(),
        }
    ).eq("id", claim["id"]).execute()

    logger.info(
        "[Payout] Simulated: %s Rs %s to %s for claim %s",
        simulated_payout_id,
        amount,
        partner["upi_id"],
        claim["claim_number"],
    )


def _get_payout_rate(trigger_type: str, tier: str) -> int:
    return PAYOUT_RATES.get(tier, PAYOUT_RATES["Standard"])[trigger_type]


def _generate_claim_number(city: str) -> str:
    code = city[:2].upper()
    return (
        f"CLM-{code}-{datetime.now(UTC).strftime('%Y%m%d')}-"
        f"{random.randint(100000, 999999)}"
    )


def _has_claim_for_today(
    *,
    supabase: Client,
    partner_id: str,
    trigger_type: str,
    reference_dt: str | None,
) -> bool:
    if reference_dt:
        try:
            event_dt = datetime.fromisoformat(reference_dt.replace("Z", "+00:00"))
        except ValueError:
            event_dt = datetime.now(UTC)
    else:
        event_dt = datetime.now(UTC)

    start_of_day = event_dt.astimezone(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)

    existing = (
        supabase.table("claims")
        .select("id")
        .eq("partner_id", partner_id)
        .eq("trigger_type", trigger_type)
        .gte("created_at", start_of_day.isoformat())
        .lt("created_at", end_of_day.isoformat())
        .limit(1)
        .execute()
    )
    return bool(existing.data)
