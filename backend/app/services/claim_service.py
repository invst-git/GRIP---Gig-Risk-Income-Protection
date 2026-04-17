import logging
import os
import random
from datetime import UTC, date as date_type, datetime, timedelta, timezone
from functools import lru_cache

import httpx
from supabase import Client, create_client

from ..ml_config import (
    FRAUD_DEFAULT_CANCELLATION_RATIO,
    FRAUD_DEFAULT_FNOL_DELTA_HOURS_MINIMUM,
    FRAUD_DEFAULT_NETWORK_REUSE_COUNT,
    FRAUD_DEFAULT_NOCTURNAL_FRACTION,
)
from ..trigger_config import (
    ADVERSE_SELECTION_ENROLLMENT_DAYS,
    DEFAULT_DAILY_ORDERS,
    FIRST_PAYOUT_CAP,
    PAYOUT_RATES,
)

logger = logging.getLogger(__name__)

ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://127.0.0.1:8000")
KL_FALLBACK = 0.08
KL_SCALE = 0.08
KL_CAP = 1.20


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


def compute_activity_kl_divergence(partner_id: str, supabase) -> float:
    """Compute real behavioral deviation from partner's 8-week baseline."""
    try:
        result = (
            supabase.table("partner_activity_log")
            .select("orders_completed")
            .eq("partner_id", partner_id)
            .order("week_start", desc=True)
            .limit(9)
            .execute()
        )

        if not result.data or len(result.data) < 5:
            return KL_FALLBACK

        values = [r["orders_completed"] for r in result.data]
        current = values[0]
        baseline = values[1:]

        baseline_mean = sum(baseline) / len(baseline)
        baseline_std = max(
            (sum((x - baseline_mean) ** 2 for x in baseline) / len(baseline)) ** 0.5,
            1.0,
        )
        z_score = abs(current - baseline_mean) / baseline_std
        kl_proxy = min(round(z_score * KL_SCALE, 4), KL_CAP)
        logger.info(
            "[Fraud] KL divergence for partner %s: %.4f (z=%.2f)",
            partner_id, kl_proxy, z_score,
        )
        return kl_proxy

    except Exception:
        logger.exception("[Fraud] compute_activity_kl_divergence failed for partner %s", partner_id)
        return KL_FALLBACK


async def call_fraud_score(claim_features: dict) -> dict:
    """Call the local /ml/fraud-score endpoint."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            f"{ML_SERVICE_URL}/ml/fraud-score",
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

        trigger_timestamp = (
            trigger_event.get("created_at")
            or trigger_event.get("fired_at")
            or datetime.now(tz=timezone.utc).isoformat()
        )
        trigger_created_at = datetime.fromisoformat(
            trigger_timestamp.replace("Z", "+00:00")
        )
        claim_created_at = datetime.now(tz=timezone.utc)
        claim_latency_secs = max(
            0.0,
            round((claim_created_at - trigger_created_at).total_seconds(), 2),
        )

        recent_activity = (
            supabase.table("partner_activity_log")
            .select("orders_completed")
            .eq("partner_id", partner["id"])
            .order("week_start", desc=True)
            .limit(1)
            .execute()
        )

        if recent_activity.data:
            daily_avg = recent_activity.data[0]["orders_completed"] / 6
            prior_orders_48h = int(daily_avg * 2)
        else:
            prior_orders_48h = DEFAULT_DAILY_ORDERS

        enrolled_since_value = partner.get("enrolled_since") or partner.get("created_at")
        enrolled_since = date_type.fromisoformat(str(enrolled_since_value)[:10])
        days_since_enrollment = (date_type.today() - enrolled_since).days

        kl_divergence = compute_activity_kl_divergence(partner["id"], supabase)
        zone_match = 0 if partner.get("zone_coordinates_flag") else 1

        fraud_features = {
            "claim_lag_hours": round(claim_latency_secs / 3600, 4),
            "prior_orders_48h": prior_orders_48h,
            "claim_hour": claim_created_at.hour,
            "prior_claims_30d": prior_claims_30d,
            "activity_kl_divergence": kl_divergence,
            "days_since_enrollment": days_since_enrollment,
            "zone_coordinates_flag": 1 if partner.get("zone_coordinates_flag") else 0,
            "zone_match": zone_match,
            "device_returning": 1,
            "device_tampered": 0,
            "nocturnal_fraction": FRAUD_DEFAULT_NOCTURNAL_FRACTION,
            "cancellation_ratio": FRAUD_DEFAULT_CANCELLATION_RATIO,
            "network_reuse_count": FRAUD_DEFAULT_NETWORK_REUSE_COUNT,
            "fnol_last_trip_delta_hours": max(
                FRAUD_DEFAULT_FNOL_DELTA_HOURS_MINIMUM,
                claim_latency_secs / 3600,
            ),
        }

        fraud_result = await call_fraud_score(fraud_features)

        layer1_flag = bool(
            partner.get("zone_coordinates_flag")
            or partner.get("identity_duplication_flag")
            or partner.get("enrollment_trigger_count", 0) > 0
            or partner.get("ipqs_ip_suspicious")
            or partner.get("ring_flag")
        )
        layer2_flag = bool(fraud_result.get("is_fraud_flag"))
        layer3_flag = bool(
            days_since_enrollment < ADVERSE_SELECTION_ENROLLMENT_DAYS
            and partner.get("enrollment_trigger_count", 0) > 0
        )
        flags_count = sum([layer1_flag, layer2_flag, layer3_flag])

        if flags_count >= 2:
            claim_status = "fraud_review"
            auto_approved = False
        elif flags_count == 1:
            claim_status = "approved"
            auto_approved = True
        else:
            claim_status = "approved"
            auto_approved = True

        claim_data = {
            "partner_id": partner["id"],
            "policy_id": policy["id"],
            "trigger_event_id": trigger_event["id"],
            "claim_number": claim_number,
            "trigger_type": trigger_event["trigger_type"],
            "status": claim_status,
            "payout_amount": payout_rate,
            "fraud_score": fraud_result["anomaly_score"],
            "fraud_flag": fraud_result["is_fraud_flag"],
            "anomaly_score": fraud_result["anomaly_score"],
            "auto_approved": auto_approved,
            "claim_latency_seconds": claim_latency_secs,
            "days_since_enrollment": days_since_enrollment,
            "layer1_flag": layer1_flag,
            "layer2_flag": layer2_flag,
            "layer3_flag": layer3_flag,
            "flags_count": flags_count,
            "activity_kl_divergence": kl_divergence,
            "created_at": claim_created_at.isoformat(),
        }
        claim_result = supabase.table("claims").insert(claim_data).execute()
        claim = _get_inserted_row(claim_result)

        if not claim:
            continue

        created_claims.append(claim)

        if claim_status != "fraud_review":
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
