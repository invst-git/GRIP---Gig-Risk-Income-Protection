"""
Ring Detection - Shared-Attribute Identity Graph
Detects multiple accounts registered by the same person or syndicate
using shared identity attributes at enrollment time.

Approach: bipartite graph on account <-> shared_attribute edges.
A partner is flagged as a ring node if they share 2+ attribute types
with any other partner. Implemented in pure PostgreSQL - no graph DB needed.

Source: Bengaluru Ola GPS ring (2020) - 4 persons, 40+ driver accounts,
shared devices and SIMs. Madras HC motor ring (2024) - 467 claims,
shared hospital/provider clusters.
"""

import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

RING_MIN_SHARED_ATTRIBUTES = 2
IP_RING_LOOKBACK_DAYS = 30


async def detect_ring_membership(partner_id: str, supabase) -> dict:
    """
    Check if a newly registered partner shares identity attributes
    with existing partners. Run at registration time.

    Checks 5 edge types:
    1. Shared registration IP (within IP_RING_LOOKBACK_DAYS)
    2. Shared bank account (IFSC + last4)
    3. Shared UPI VPA local-part on same handle
    4. Fuzzy full name match (pg_trgm similarity > 0.85)
    5. Shared emergency contact number

    Returns ring_flag, shared_partner_ids, edge_types found.
    """
    try:
        partner_result = (
            supabase.table("partners")
            .select(
                "id, full_name, registration_ip, upi_id, "
                "emergency_contact, bank_account_id, enrolled_since"
            )
            .eq("id", partner_id)
            .single()
            .execute()
        )

        if not partner_result.data:
            logger.warning(f"[RingDetection] Partner {partner_id} not found")
            return {"ring_flag": False, "ring_cluster_id": None, "ring_edge_types": []}

        partner = partner_result.data
        shared_with: dict[str, list[str]] = {}

        if partner.get("registration_ip"):
            cutoff = (datetime.utcnow() - timedelta(days=IP_RING_LOOKBACK_DAYS)).isoformat()
            ip_result = (
                supabase.table("partners")
                .select("id")
                .eq("registration_ip", partner["registration_ip"])
                .neq("id", partner_id)
                .gte("enrolled_since", cutoff)
                .execute()
            )

            for row in (ip_result.data or []):
                pid = row["id"]
                shared_with.setdefault(pid, []).append("shared_registration_ip")

        if partner.get("bank_account_id"):
            bank_result = (
                supabase.table("bank_accounts")
                .select("account_number_masked, ifsc_code")
                .eq("id", partner["bank_account_id"])
                .single()
                .execute()
            )

            if bank_result.data:
                acct_masked = bank_result.data["account_number_masked"]
                ifsc = bank_result.data["ifsc_code"]

                match_result = (
                    supabase.table("bank_accounts")
                    .select("partner_id")
                    .eq("account_number_masked", acct_masked)
                    .eq("ifsc_code", ifsc)
                    .neq("partner_id", partner_id)
                    .execute()
                )

                for row in (match_result.data or []):
                    pid = row["partner_id"]
                    if pid:
                        shared_with.setdefault(pid, []).append("shared_bank_account")

        if partner.get("upi_id") and "@" in partner["upi_id"]:
            upi_local, upi_handle = partner["upi_id"].split("@", 1)
            all_partners = (
                supabase.table("partners")
                .select("id, upi_id")
                .neq("id", partner_id)
                .not_.is_("upi_id", "null")
                .execute()
            )

            for row in (all_partners.data or []):
                other_upi = row.get("upi_id", "")
                if "@" not in other_upi:
                    continue
                other_local, other_handle = other_upi.split("@", 1)
                if other_handle == upi_handle and other_local == upi_local:
                    shared_with.setdefault(row["id"], []).append("shared_upi_local_part")

        if partner.get("full_name"):
            recent_partners = (
                supabase.table("partners")
                .select("id, full_name")
                .neq("id", partner_id)
                .not_.is_("full_name", "null")
                .execute()
            )

            name_a = partner["full_name"].lower().strip()
            for row in (recent_partners.data or []):
                name_b = (row.get("full_name") or "").lower().strip()
                if not name_b:
                    continue
                similarity = _trigram_similarity(name_a, name_b)
                if similarity >= 0.85:
                    shared_with.setdefault(row["id"], []).append("fuzzy_name_match")

        if partner.get("emergency_contact"):
            ec_result = (
                supabase.table("partners")
                .select("id")
                .eq("emergency_contact", partner["emergency_contact"])
                .neq("id", partner_id)
                .execute()
            )

            for row in (ec_result.data or []):
                shared_with.setdefault(row["id"], []).append("shared_emergency_contact")

        ring_partners = {
            pid: edges for pid, edges in shared_with.items()
            if len(edges) >= RING_MIN_SHARED_ATTRIBUTES
        }

        ring_flag = len(ring_partners) > 0
        edge_types_all = list({
            edge
            for edges in ring_partners.values()
            for edge in edges
        })

        if ring_flag:
            all_ids = sorted([partner_id] + list(ring_partners.keys()))
            cluster_id = "RING-" + "-".join(item[:8] for item in all_ids)
        else:
            cluster_id = None

        if ring_flag:
            logger.warning(
                f"[RingDetection] Ring flag for partner {partner_id}: "
                f"shares {edge_types_all} with {list(ring_partners.keys())}"
            )

        for pid in ring_partners:
            try:
                (
                    supabase.table("partners")
                    .update({
                        "ring_flag": True,
                        "ring_cluster_id": cluster_id,
                    })
                    .eq("id", pid)
                    .execute()
                )
            except Exception as e:
                logger.error(f"[RingDetection] Failed to update partner {pid}: {e}")

        return {
            "ring_flag": ring_flag,
            "ring_cluster_id": cluster_id,
            "ring_edge_types": edge_types_all,
        }

    except Exception as e:
        logger.error(f"[RingDetection] Failed for partner {partner_id}: {e}")
        return {"ring_flag": False, "ring_cluster_id": None, "ring_edge_types": []}


def _trigram_similarity(a: str, b: str) -> float:
    """
    Python approximation of PostgreSQL pg_trgm similarity.
    Computes Jaccard similarity on trigram sets.
    Used when pg_trgm cannot be called directly via Supabase client.
    """

    def trigrams(s: str) -> set:
        s = f"  {s} "
        return {s[i:i + 3] for i in range(len(s) - 2)}

    tg_a = trigrams(a)
    tg_b = trigrams(b)
    if not tg_a and not tg_b:
        return 1.0
    if not tg_a or not tg_b:
        return 0.0
    intersection = len(tg_a & tg_b)
    union = len(tg_a | tg_b)
    return intersection / union if union > 0 else 0.0
