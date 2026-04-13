import random
from datetime import date, timedelta

import logging

logger = logging.getLogger(__name__)


def seed_partner_baseline(
    partner_id: str,
    avg_daily_orders: int,
    avg_daily_hours: float,
    supabase,
) -> None:
    """Seed 12 weeks of realistic activity history at registration."""
    rows = []
    for week_offset in range(1, 13):
        week_start = date.today() - timedelta(weeks=week_offset)
        jitter = random.uniform(0.85, 1.15)
        rows.append({
            "partner_id": partner_id,
            "week_start": week_start.isoformat(),
            "orders_completed": max(0, int(avg_daily_orders * 6 * jitter)),
            "active_hours": round(avg_daily_hours * 6 * jitter, 1),
            "active_days": random.randint(5, 6),
            "cancellation_count": random.randint(0, 3),
            "nocturnal_orders": max(0, int(avg_daily_orders * 0.08 * jitter)),
        })
    supabase.table("partner_activity_log").insert(rows).execute()
    logger.info("[Baseline] Seeded 12 weeks of activity for partner %s", partner_id)
