"""
GRIP Synthetic Dataset Generator
Generates training data for:
  1. XGBoost Zone Risk Scorer        -> data/zone_risk_training.csv
  2. Isolation Forest Fraud Detector -> data/fraud_detection_training.csv

Run:
    pip install numpy pandas scipy xgboost scikit-learn
    python data_generator.py
"""

from pathlib import Path
import os

import numpy as np
import pandas as pd
from scipy.stats import lognorm

rng = np.random.default_rng(42)
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

# ─────────────────────────────────────────────
# DATASET SIZES — edit here only
# ─────────────────────────────────────────────
ZONE_RISK_N    = 5_000
FRAUD_N        = 100_000
FRAUD_RATE     = 0.005      # 0.5% -> 500 fraud records out of 100,000
                            # PM-JAY measured 0.05-0.30%; scaled up for
                            # detectable signal without needing 500k rows

# ─────────────────────────────────────────────────────────────────
# CITY HAZARD PRIORS
# Source: IMD/CPCB/NDMA 2019-2024 (research report)
# Status: Estimated averages unless marked Measured
# ─────────────────────────────────────────────────────────────────

CITY_HAZARD = {
    # heat_days:  avg days/yr where Tmax > 43°C
    # rain_days:  avg days/yr where 24h rainfall > 100mm
    # aqi_days:   avg days/yr where city AQI > 300
    #
    # Delhi heat: IMD measured events confirm ~7/yr May-Jun (Estimated avg)
    # Delhi AQI:  CPCB Measured severe days: 24,15,24,6,15,17 (2019-2024) → avg 16.8
    #             using 25 to represent the worst-quarter skew in risk pricing
    # Mumbai:     Zero measured days >43°C in recorded history. Rain: 3 measured
    #             extreme cloudbursts 2019/2021/2024 + smaller events → ~6/yr Estimated
    # Bengaluru:  131.6mm on 5 Sep 2022 is the single confirmed extreme rain event.
    #             Near-zero heat and AQI by city average.
    # Hyderabad:  43.0-43.6°C Measured in 2019/2020/2024. 2020 flash flood Measured.
    "Delhi":     {"heat_days": 7.0,  "rain_days": 0.75, "aqi_days": 25.0},
    "Mumbai":    {"heat_days": 0.0,  "rain_days": 6.0,  "aqi_days": 1.0},
    "Bengaluru": {"heat_days": 0.0,  "rain_days": 0.3,  "aqi_days": 1.5},
    "Chennai":   {"heat_days": 1.0,  "rain_days": 2.0,  "aqi_days": 2.0},
    "Hyderabad": {"heat_days": 0.85, "rain_days": 0.5,  "aqi_days": 0.75},
}

# Normalisation denominators: max plausible annual days per hazard type
# Used to bring each hazard onto a 0-1 scale before weighting
HAZARD_MAX = {"heat_days": 10.0, "rain_days": 10.0, "aqi_days": 30.0}

# Hazard weights in city component
# Rain 35% + AQI 35% + Heat 30% = 100%
# Justification: rain and AQI are more frequent income drivers for
# food delivery partners than heat (platforms slow orders in heat;
# partners refuse AQI/rain days entirely)
HAZARD_WEIGHTS = {"heat_days": 0.30, "rain_days": 0.35, "aqi_days": 0.35}

# Season weights by month index 0=Jan...11=Dec
# Heat: May-Jun peak (index 4,5)
# Rain: Jul-Sep SWM (index 6,7,8), Oct-Dec NEM for Chennai (index 9,10,11)
# AQI:  Oct-Jan Delhi smog season (index 9,10,11,0)
# Source: IMD seasonal calendars + CSE Delhi AQI analysis
SEASON_WEATHER_WEIGHTS = {
    "heat": [0.20, 0.20, 0.60, 1.00, 1.80, 1.80, 0.40, 0.20, 0.20, 0.20, 0.20, 0.20],
    "rain": [0.10, 0.10, 0.10, 0.20, 0.40, 1.20, 1.80, 1.80, 1.20, 0.80, 0.50, 0.10],
    "aqi":  [1.80, 1.60, 0.80, 0.40, 0.40, 0.20, 0.20, 0.20, 0.40, 1.40, 1.80, 1.80],
}

# ─────────────────────────────────────────────────────────────────
# ZONE FLOOD RISK
# Values represent standalone flood/waterlogging multiplier (1.0 = neutral)
# These are ADDITIVE to city hazard in the revised formula
#
# Sources:
# Bengaluru: BBMP/OpenCity urban flood hazard zonation 2024
#            ORR corridor worst due to encroached rajakaluves + lake chains
# Mumbai:    BMC Eastern Suburbs Resilience Plan 2024-25
#            Eastern suburbs + Mithi corridor (tide-locked outfalls)
# Delhi:     GNCTD Flood Control Order 2025 (445 hotspots identified)
#            Yamuna floodplain + low-lying underpasses
# Chennai:   GCC/ADB 2022 + TNSDMA
#            Pallikaranai marshland loss + NEM backwater flooding
# Hyderabad: GHMC DMP 2020/2024
#            Nala encroachments + impervious IT corridor growth
# ─────────────────────────────────────────────────────────────────

ZONE_FLOOD_RISK = {
    # Bengaluru — range 1.05 to 1.50
    "Mahadevapura": 1.50, "Sarjapur Road": 1.45, "Bellandur": 1.45,
    "Whitefield":   1.40, "Varthur":       1.40, "HSR Layout": 1.30,
    "Koramangala":  1.20, "Indiranagar":   1.10, "JP Nagar":   1.05,
    # Mumbai — range 1.10 to 1.45
    "Chembur": 1.45, "Deonar":  1.45, "Mankhurd": 1.40,
    "Sion":    1.35, "Dharavi": 1.35, "Kurla":    1.35,
    "Andheri": 1.30, "Wadala":  1.25, "Parel":    1.30,
    "Khar":    1.20, "Bandra":  1.10,
    # Delhi — range 1.05 to 1.50
    "Yamuna Floodplain": 1.50, "ITO":             1.40, "Azad Market":  1.35,
    "Lajpat Nagar":      1.10, "Connaught Place": 1.05, "Saket":        1.05,
    # Chennai — range 1.05 to 1.45
    "Pallikaranai": 1.45, "Velachery":     1.40, "Adyar":       1.40,
    "Perungudi":    1.38, "Sholinganallur":1.35, "Anna Nagar":  1.05,
    # Hyderabad — range 1.05 to 1.35
    "Charminar":  1.35, "Falaknuma": 1.35, "Madhapur": 1.30,
    "HITEC City": 1.25, "Begumpet":  1.20, "Banjara Hills": 1.05,
}

CITY_ZONES = {
    "Delhi":     ["Connaught Place", "ITO", "Yamuna Floodplain",
                  "Azad Market", "Lajpat Nagar", "Saket"],
    "Mumbai":    ["Andheri", "Chembur", "Dharavi",
                  "Kurla", "Bandra", "Wadala", "Parel"],
    "Bengaluru": ["Koramangala", "Sarjapur Road", "Bellandur",
                  "Whitefield", "Mahadevapura", "Indiranagar"],
    "Chennai":   ["Anna Nagar", "Adyar", "Perungudi",
                  "Pallikaranai", "Velachery", "Sholinganallur"],
    "Hyderabad": ["Banjara Hills", "Madhapur", "HITEC City",
                  "Begumpet", "Charminar", "Falaknuma"],
}

# City sampling proportional to documented delivery partner concentration
# Zomato FY25: 473k active; Swiggy FY25: 516k active
# Delhi+NCR ~30%, Mumbai ~25% per platform city concentration data
CITY_WEIGHTS   = [0.30, 0.25, 0.20, 0.15, 0.10]

VEHICLE_TYPES   = ["Two-Wheeler ICE", "Two-Wheeler EV", "Bicycle"]
VEHICLE_WEIGHTS = [0.70, 0.20, 0.10]  # ICE dominant; EV growing 2023-25
VEHICLE_MOD     = {"Two-Wheeler ICE": 0.00, "Two-Wheeler EV": -0.03, "Bicycle": -0.05}

PLATFORMS        = ["Zomato", "Swiggy", "Both"]
PLATFORM_WEIGHTS = [0.45, 0.45, 0.10]

SEASONS                 = ["Pre-monsoon", "Monsoon", "Post-monsoon", "Winter"]
SEASON_SAMPLE_WEIGHTS   = [0.25, 0.30, 0.25, 0.20]
SEASON_MONTH_RANGES     = {
    "Pre-monsoon":  [3, 4, 5],
    "Monsoon":      [6, 7, 8, 9],
    "Post-monsoon": [10, 11],
    "Winter":       [12, 1, 2],
}
# Additive season contribution to score
# Monsoon highest: direct delivery halt from waterlogging
# Winter: AQI-driven, significant for Delhi-enrolled partners
SEASON_RISK_MOD = {
    "Monsoon": 0.10, "Winter": 0.07,
    "Pre-monsoon": 0.04, "Post-monsoon": 0.03
}

# Zone flood component scaling factor
# (zone_flood_risk - 1.0) is in range [0, 0.50]
# Multiplied by ZONE_SCALE to bring contribution into [0, 0.25] range
# so it is meaningfully additive without dominating city hazard component
ZONE_SCALE = 0.50


# ─────────────────────────────────────────────────────────────────
# REVISED FORMULA — Additive, not multiplicative
#
# score = 0.85
#       + city_hazard_component    (0 to ~0.35 depending on city+season)
#       + zone_flood_component     (0 to 0.25 depending on zone)
#       + season_risk_mod          (0.03 to 0.10)
#       + vehicle_mod              (-0.05 to 0.00)
#       + order_activity_mod       (-0.05 to 0.05)
#
# Max theoretical: 0.85 + 0.35 + 0.25 + 0.10 + 0.00 + 0.05 = 1.60 → clipped to 1.50
# Min theoretical: 0.85 + 0.00 + 0.00 + 0.03 - 0.05 - 0.05 = 0.78 → clipped to 0.85
# ─────────────────────────────────────────────────────────────────

def compute_zone_risk_score(row: dict) -> float:
    h     = CITY_HAZARD[row["city"]]
    month = row["month"]

    # City hazard component: seasonal-weighted, normalised, weighted sum
    city_hazard = 0.0
    for htype, weight in HAZARD_WEIGHTS.items():
        season_key = htype.replace("_days", "")   # "heat", "rain", "aqi"
        seasonal_w = SEASON_WEATHER_WEIGHTS[season_key][month - 1]
        normalised = min(1.0, (h[htype] * seasonal_w) / HAZARD_MAX[htype])
        city_hazard += normalised * weight

    # Zone flood component: independent of city weather
    zone_risk      = ZONE_FLOOD_RISK.get(row["zone"], 1.10)
    zone_component = (zone_risk - 1.0) * ZONE_SCALE

    season_m = SEASON_RISK_MOD[row["season"]]
    vehicle_m = VEHICLE_MOD[row["vehicle_type"]]
    order_m   = (0.05 if row["avg_daily_orders"] > 30
                 else -0.05 if row["avg_daily_orders"] < 15
                 else 0.0)

    raw = 0.85 + city_hazard + zone_component + season_m + vehicle_m + order_m
    return float(np.clip(round(raw, 2), 0.85, 1.50))


def generate_zone_risk_dataset(n: int = ZONE_RISK_N) -> pd.DataFrame:
    rows = []
    for _ in range(n):
        city     = rng.choice(list(CITY_ZONES.keys()), p=CITY_WEIGHTS)
        zone     = rng.choice(CITY_ZONES[city])
        vehicle  = rng.choice(VEHICLE_TYPES, p=VEHICLE_WEIGHTS)
        season   = rng.choice(SEASONS, p=SEASON_SAMPLE_WEIGHTS)
        platform = rng.choice(PLATFORMS, p=PLATFORM_WEIGHTS)
        orders   = int(rng.integers(10, 45))
        hours    = int(rng.integers(6, 14))
        month    = int(rng.choice(SEASON_MONTH_RANGES[season]))

        h   = CITY_HAZARD[city]
        row = {
            "city":             city,
            "zone":             zone,
            "vehicle_type":     vehicle,
            "platform":         platform,
            "season":           season,
            "month":            month,
            "avg_daily_orders": orders,
            "avg_daily_hours":  hours,
            "effective_heat_days": round(
                h["heat_days"] * SEASON_WEATHER_WEIGHTS["heat"][month - 1], 3),
            "effective_rain_days": round(
                h["rain_days"] * SEASON_WEATHER_WEIGHTS["rain"][month - 1], 3),
            "effective_aqi_days":  round(
                h["aqi_days"]  * SEASON_WEATHER_WEIGHTS["aqi"][month - 1],  3),
            "zone_flood_risk":  ZONE_FLOOD_RISK.get(zone, 1.10),
        }
        row["zone_risk_score"] = compute_zone_risk_score(row)
        rows.append(row)

    return pd.DataFrame(rows)


# ─────────────────────────────────────────────────────────────────
# MODEL 2 — FRAUD DETECTOR DISTRIBUTIONS
# ─────────────────────────────────────────────────────────────────

def _legit_hour_weights() -> np.ndarray:
    # Bimodal: morning 9-12 peak (lunch orders) + evening 18-21 peak (dinner)
    w = np.array([
        0.5, 0.3, 0.2, 0.2, 0.2, 0.3,
        0.8, 1.5, 2.5, 3.5, 4.0, 4.0,
        3.5, 3.0, 3.0, 3.0, 4.5, 5.0,
        5.0, 4.5, 3.5, 2.0, 1.0, 0.7,
    ], dtype=float)
    return w / w.sum()


def _fraud_hour_weights() -> np.ndarray:
    # PM/evening concentrated + midnight spike (coordinated ring submissions)
    # Source: Worldline EU 2022/2024 fraud timing proxy
    w = np.array([
        1.5, 1.0, 0.5, 0.3, 0.3, 0.3,
        0.5, 0.5, 0.8, 1.0, 1.2, 1.5,
        2.0, 2.5, 3.0, 3.5, 4.0, 5.0,
        6.0, 6.5, 5.5, 4.0, 3.0, 2.5,
    ], dtype=float)
    return w / w.sum()


def generate_fraud_dataset(n: int = FRAUD_N, fraud_rate: float = FRAUD_RATE) -> pd.DataFrame:
    n_fraud = int(n * fraud_rate)
    n_legit = n - n_fraud
    rows    = []

    def make_record(is_fraud: bool) -> dict:
        # ── Claim lag hours — Lognormal ──────────────────────────────
        # Legit  μ=3.5, σ=0.5 → median ~33h
        # Fraud  μ=2.2, σ=0.4 → median ~9h
        # Source: NICB/Citizens FL catastrophe fraud proxy 2017-2019
        if is_fraud:
            lag = float(lognorm.rvs(s=0.4, scale=np.exp(2.2), random_state=rng))
        else:
            lag = float(lognorm.rvs(s=0.5, scale=np.exp(3.5), random_state=rng))
        lag = float(np.clip(lag, 0.1, 500.0))

        # ── Prior orders 48h ─────────────────────────────────────────
        # Legit 8-16, Fraud 0-4
        # Source: Swiggy/SHIELD device-first fraud study proxy
        prior_orders = (int(rng.integers(0, 5))
                        if is_fraud else int(rng.integers(8, 17)))

        # ── Claim hour ───────────────────────────────────────────────
        hour = (int(rng.choice(24, p=_fraud_hour_weights()))
                if is_fraud else int(rng.choice(24, p=_legit_hour_weights())))

        # ── Prior claims 30 days ─────────────────────────────────────
        # Legit: ZINB — 85% zero-inflated, else [1,2]
        #   μL ≈ 0.01-0.02/month  (Indian health insurance ZINB paper)
        # Fraud: NB(n=2, p=0.4) → μ ≈ 3/month
        #   μB ≈ 1-4/month from Madras HC motor ring case patterns
        if is_fraud:
            prior_claims = int(rng.negative_binomial(2, 0.4))
        else:
            prior_claims = (0 if rng.random() < 0.85
                            else int(rng.integers(1, 3)))

        # ── Device returning ─────────────────────────────────────────
        # Legit 85% returning device; Fraud 100% new/disposable
        device_returning = (False if is_fraud else rng.random() > 0.15)

        # ── Zone match ───────────────────────────────────────────────
        # Legit 95% in registered zone; Fraud 100% GPS-spoofed elsewhere
        zone_match = (False if is_fraud else rng.random() > 0.05)

        # ── Device tampered ──────────────────────────────────────────
        # Legit  4%: Swiggy blog ~8% of ALL partners run cloned apps;
        #            insurance-enrolled cohort is lower risk → halved
        # Fraud 65%: ring members split between basic mock-location apps
        #            (flagged by isMock()) and advanced Magisk/LSPosed.
        #            NOT 85%: some members use manual GPS entry, undetected.
        # Source: Swiggy Bytes + Incognia Gig Economy Frontline Report 2025
        device_tampered = ((rng.random() < 0.65) if is_fraud
                           else (rng.random() < 0.04))

        # ── Nocturnal fraction ───────────────────────────────────────
        # Legit [0.05, 0.25]: daytime delivery dominant
        # Fraud [0.35, 0.80]: PM/evening activity concentration
        # Floor lowered from 0.40 to 0.35 for partial cohort overlap
        # Source: Worldline EU 2022/2024
        nocturnal = (float(rng.uniform(0.35, 0.80)) if is_fraud
                     else float(rng.uniform(0.05, 0.25)))

        # ── Cancellation ratio ───────────────────────────────────────
        # Legit [0.00, 0.12]; Fraud [0.20, 0.60]
        # No India-specific measured distribution; derived from
        # general gig platform fraud literature
        cancel = (float(rng.uniform(0.20, 0.60)) if is_fraud
                  else float(rng.uniform(0.00, 0.12)))

        # ── Network reuse count ──────────────────────────────────────
        # Legit [0, 1]; Fraud [2, 20]
        # Ceiling 20 (not 49): Madras HC motor fraud confirms ring
        # collusion but no exact network size distribution published.
        # [2,20] defensible for mid-scale coordinated ring.
        network = (int(rng.integers(2, 21)) if is_fraud
                   else int(rng.integers(0, 2)))

        # ── FNOL last-trip delta hours ───────────────────────────────
        # Time between last completed delivery and claim submission
        # Legit [0.5, 6.0]h: partner was working during disruption
        # Fraud [12.0, 96.0]h: fraudster was not on the road
        # No India-specific measured distribution; derived from
        # FNOL timing literature + ring behaviour logic
        fnol_delta = (float(rng.uniform(12.0, 96.0)) if is_fraud
                      else float(rng.uniform(0.5, 6.0)))

        # ── Activity KL divergence ───────────────────────────────────
        # KL divergence: claim-week activity vs 90-day baseline
        # Legit [0.01, 0.15]: small divergence, behaved normally
        # Fraud [0.40, 1.20]: large divergence, unusual activity pattern
        # Source: Detecting Insurance Fraud with Isolation Forests,
        #         Edinburgh CRC 2021
        kl_div = (float(rng.uniform(0.40, 1.20)) if is_fraud
                  else float(rng.uniform(0.01, 0.15)))

        city = rng.choice(list(CITY_ZONES.keys()), p=CITY_WEIGHTS)

        return {
            "city":                       city,
            "claim_lag_hours":            round(lag, 2),
            "prior_orders_48h":           prior_orders,
            "claim_hour":                 hour,
            "prior_claims_30d":           prior_claims,
            "device_returning":           int(device_returning),
            "zone_match":                 int(zone_match),
            "device_tampered":            int(device_tampered),
            "nocturnal_fraction":         round(nocturnal, 4),
            "cancellation_ratio":         round(cancel, 4),
            "network_reuse_count":        network,
            "fnol_last_trip_delta_hours": round(fnol_delta, 2),
            "activity_kl_divergence":     round(kl_div, 4),
            "is_fraud":                   int(is_fraud),
        }

    for _ in range(n_legit):
        rows.append(make_record(False))
    for _ in range(n_fraud):
        rows.append(make_record(True))

    df = pd.DataFrame(rows)
    return df.sample(frac=1, random_state=42).reset_index(drop=True)


# ─────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    os.makedirs(DATA_DIR, exist_ok=True)
    zone_risk_path = DATA_DIR / "zone_risk_training.csv"
    fraud_path = DATA_DIR / "fraud_detection_training.csv"

    # ── Zone Risk ──────────────────────────────────────────────────
    print(f"Generating Zone Risk dataset ({ZONE_RISK_N:,} records, 5 cities)...")
    df_risk = generate_zone_risk_dataset(n=ZONE_RISK_N)
    df_risk.to_csv(zone_risk_path, index=False)
    print(f"  Saved: {zone_risk_path.relative_to(BASE_DIR)}")
    print(f"  Score range: {df_risk['zone_risk_score'].min()} - {df_risk['zone_risk_score'].max()}")

    print(f"\n  City distribution:")
    print(df_risk["city"].value_counts().to_string())

    print(f"\n  Premium spread per city (Standard tier x1.25):")
    for city in ["Delhi", "Mumbai", "Bengaluru", "Chennai", "Hyderabad"]:
        city_df    = df_risk[df_risk.city == city]
        min_score  = city_df["zone_risk_score"].min()
        max_score  = city_df["zone_risk_score"].max()
        min_prem   = round(49 * min_score * 1.25)
        max_prem   = round(49 * max_score * 1.25)
        print(f"    {city:12}: score {min_score:.2f}-{max_score:.2f} "
              f"-> Rs{min_prem}-Rs{max_prem}/week")

    print(f"\n  Top 3 highest-risk zone samples:")
    top3 = df_risk.nlargest(3, "zone_risk_score")[
        ["city", "zone", "season", "zone_risk_score"]].copy()
    top3["Rs/week_standard"] = (49 * top3["zone_risk_score"] * 1.25).round(0).astype(int)
    print(top3.to_string(index=False))

    print(f"\n  Top 3 lowest-risk zone samples:")
    bot3 = df_risk.nsmallest(3, "zone_risk_score")[
        ["city", "zone", "season", "zone_risk_score"]].copy()
    bot3["Rs/week_standard"] = (49 * bot3["zone_risk_score"] * 1.25).round(0).astype(int)
    print(bot3.to_string(index=False))

    # ── Fraud ──────────────────────────────────────────────────────
    n_fraud_records = int(FRAUD_N * FRAUD_RATE)
    print(f"\nGenerating Fraud dataset "
          f"({FRAUD_N:,} records, {FRAUD_RATE*100:.1f}% fraud "
          f"= {n_fraud_records:,} fraud records)...")
    df_fraud = generate_fraud_dataset(n=FRAUD_N, fraud_rate=FRAUD_RATE)
    df_fraud.to_csv(fraud_path, index=False)
    print(f"  Saved: {fraud_path.relative_to(BASE_DIR)}")
    print(f"  Fraud: {df_fraud['is_fraud'].sum():,} / {len(df_fraud):,} "
          f"({df_fraud['is_fraud'].mean()*100:.2f}%)")

    legit = df_fraud[df_fraud.is_fraud == 0]
    fraud = df_fraud[df_fraud.is_fraud == 1]
    print(f"\n  Feature separation (legit vs fraud):")
    print(f"    claim_lag_hours       legit median {legit['claim_lag_hours'].median():.1f}h  "
          f"fraud median {fraud['claim_lag_hours'].median():.1f}h")
    print(f"    prior_orders_48h      legit avg    {legit['prior_orders_48h'].mean():.1f}    "
          f"fraud avg    {fraud['prior_orders_48h'].mean():.1f}")
    print(f"    fnol_delta_hours      legit avg    {legit['fnol_last_trip_delta_hours'].mean():.1f}h  "
          f"fraud avg    {fraud['fnol_last_trip_delta_hours'].mean():.1f}h")
    print(f"    activity_kl_div       legit avg    {legit['activity_kl_divergence'].mean():.3f}  "
          f"fraud avg    {fraud['activity_kl_divergence'].mean():.3f}")
    print(f"    device_tampered rate  legit        {legit['device_tampered'].mean()*100:.1f}%   "
          f"fraud        {fraud['device_tampered'].mean()*100:.1f}%")

    print("\nDone. Run train.py next.")
