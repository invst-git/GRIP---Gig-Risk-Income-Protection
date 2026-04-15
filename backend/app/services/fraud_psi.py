"""
PSI drift monitor for Isolation Forest features.
Computes Population Stability Index between training distribution
and live distribution of activity_kl_divergence from recent claims.
Run once per trigger poll cycle in trigger_engine.py.
"""

import logging
from datetime import datetime, timedelta

import numpy as np

from ..ml_config import KL_TRAINING_HIGH, KL_TRAINING_LOW

logger = logging.getLogger(__name__)

PSI_LOOKBACK_DAYS = 30
PSI_MIN_SAMPLE_SIZE = 10
PSI_BINS = 10
PSI_STABLE = 0.10
PSI_MONITOR = 0.25


def compute_psi(
    expected_dist: list[float],
    actual_dist: list[float],
    bins: int = PSI_BINS,
) -> float:
    """
    Compute Population Stability Index between two numeric distributions.
    PSI < PSI_STABLE  : stable - no action needed
    PSI < PSI_MONITOR : monitor - watch closely
    PSI >= PSI_MONITOR: retrain - distribution has shifted significantly
    Small epsilon added to avoid log(0).
    """
    min_val = min(min(expected_dist), min(actual_dist))
    max_val = max(max(expected_dist), max(actual_dist))
    bin_edges = np.linspace(min_val, max_val, bins + 1)

    eps = 1e-6

    expected_counts = np.histogram(expected_dist, bins=bin_edges)[0]
    actual_counts = np.histogram(actual_dist, bins=bin_edges)[0]

    expected_pct = (expected_counts + eps) / (len(expected_dist) + eps * bins)
    actual_pct = (actual_counts + eps) / (len(actual_dist) + eps * bins)

    psi = float(
        np.sum((actual_pct - expected_pct) * np.log(actual_pct / expected_pct))
    )
    return round(abs(psi), 4)


async def run_psi_monitor(supabase) -> dict:
    """
    Fetch last PSI_LOOKBACK_DAYS of live activity_kl_divergence values
    from the claims table. Compute PSI against training distribution.
    Store result in model_health table.
    Returns the health row dict or a status-only dict if insufficient data.
    """
    try:
        cutoff = (datetime.utcnow() - timedelta(days=PSI_LOOKBACK_DAYS)).isoformat()

        result = (
            supabase.table("claims")
            .select("activity_kl_divergence")
            .gte("created_at", cutoff)
            .not_.is_("activity_kl_divergence", "null")
            .execute()
        )

        if not result.data or len(result.data) < PSI_MIN_SAMPLE_SIZE:
            logger.info(
                f"[PSI] Insufficient live data for PSI computation "
                f"({len(result.data or [])} samples, need {PSI_MIN_SAMPLE_SIZE}) - skipping"
            )
            return {
                "status": "insufficient_data",
                "sample_count": len(result.data or []),
            }

        live_values = [row["activity_kl_divergence"] for row in result.data]
        training_values = list(
            np.random.uniform(KL_TRAINING_LOW, KL_TRAINING_HIGH, size=len(live_values))
        )

        psi_value = compute_psi(training_values, live_values)

        if psi_value >= PSI_MONITOR:
            status = "retrain"
        elif psi_value >= PSI_STABLE:
            status = "monitor"
        else:
            status = "stable"

        health_row = {
            "model_name": "isolation_forest_v2",
            "feature_name": "activity_kl_divergence",
            "psi_value": psi_value,
            "status": status,
            "training_mean": KL_TRAINING_LOW
            + (KL_TRAINING_HIGH - KL_TRAINING_LOW) / 2,
            "training_std": round(
                (KL_TRAINING_HIGH - KL_TRAINING_LOW) / (12**0.5), 6
            ),
            "live_mean": round(float(np.mean(live_values)), 6),
            "live_std": round(float(np.std(live_values)), 6),
            "sample_count": len(live_values),
        }

        supabase.table("model_health").insert(health_row).execute()

        logger.info(
            f"[PSI] activity_kl_divergence PSI={psi_value} "
            f"status={status} n={len(live_values)} "
            f"live_mean={health_row['live_mean']:.4f}"
        )

        return health_row

    except Exception as e:
        logger.error(f"[PSI] Monitor failed: {e}")
        return {"status": "error", "error": str(e)}
