# GRIP: Gig Risk Income Protection - Phase 2 Technical Implementation

> **Phase 2 submission - Guidewire DEVTrails 2026.** This document covers the full technical implementation delivered in Weeks 3–4: ML model training methodology, synthetic dataset construction, parametric trigger engine architecture, KYC onboarding pipeline, fraud detection system, and end-to-end zero-touch claim flow. All payout flows use simulated UPI disbursements as explicitly permitted under Phase 2 deliverable guidelines. Weather data is sourced from live OpenWeatherMap and CPCB APIs. ML models are trained, serialised, and served in production.

---

## What Changed from Phase 1

Phase 1 established the product concept, persona research, trigger design philosophy, and a fully designed prototype with mock data. The Phase 1 jury identified one gap: coverage exclusions were absent from the onboarding flow.

Phase 2 delivered the following on top of Phase 1:

- Two trained ML models served via FastAPI (XGBoost zone risk scorer, Isolation Forest fraud detector)
- Live parametric trigger engine polling OpenWeatherMap and CPCB every 15 minutes for 5 cities
- Supabase-backed database replacing all mock data across 8 tables
- Realistic 6-step KYC onboarding with mock Sarathi DL verification, Vahan RC verification, and PAN validation
- Zero-touch claim lifecycle: trigger confirmation → fraud scoring → simulated payout in under 2 seconds
- Real-time claims feed via Supabase Postgres change publications
- Admin dashboard with live loss ratios, trigger heatmap, and fraud detection controls
- Coverage exclusions screen added to onboarding (Phase 1 jury gap closed)

---

## Coverage Exclusions (Phase 1 Jury Gap - Closed)

The following are permanently excluded from GRIP coverage and are presented to every partner before policy activation via a mandatory consent screen:

1. **Acts of War and Civil Conflict** - Income loss from war, invasion, armed conflict, or government-declared states of emergency involving military action.
2. **Pandemic and Epidemic Declarations** - Loss of income during nationally or internationally declared pandemics or epidemics, including platform shutdowns ordered under epidemic control measures.
3. **Nuclear and Radiation Events** - Any disruption caused by nuclear reaction, radiation, or radioactive contamination regardless of cause.
4. **Platform Policy Changes** - Deactivation, suspension, or income reduction caused by the platform's own policy decisions, algorithm changes, or terms of service enforcement.
5. **Pre-existing Zone Restrictions** - Areas already under operational restrictions at the time of policy activation are excluded from curfew and social disruption triggers.
6. **Voluntary Work Stoppage** - Income loss from personal choice not to work during a trigger event. Payouts require the trigger to have independently caused the disruption.

Partners must scroll through all six exclusions and check an explicit consent checkbox before the policy activates. The screen is step 6 of 6 in the onboarding flow and cannot be bypassed.

---

## Tech Stack

| Layer | Technology | Justification |
|---|---|---|
| Frontend | React 19, Vite, Tailwind 3, Framer Motion 12 | Mobile-first 390px, Android-first delivery partner persona |
| Backend | FastAPI (Python 3.12) | Async support, automatic OpenAPI docs, ML model serving without separate inference server |
| Database | Supabase (PostgreSQL) | Real-time subscriptions via Postgres change publications, JS SDK for direct frontend queries |
| ML Training | XGBoost, scikit-learn Isolation Forest | Industry standard for tabular risk scoring and anomaly detection |
| Weather API | OpenWeatherMap 2.5 (free tier) | 1,000 calls/day free; `weather` + `forecast` endpoints; no paid subscription required |
| AQI API | CPCB via data.gov.in | Official government source; free API key; hourly updates; 5 state filters for our metro coverage |
| Scheduler | APScheduler AsyncIOScheduler | FastAPI-native async scheduling without a separate worker process |
| Payments | Simulated payout engine | RazorpayX requires business banking KYC not feasible in hackathon timeline; simulation is explicitly permitted per Phase 2 deliverable guidelines |

---

## Database Schema

Eight Supabase tables with Row Level Security enabled on all:

```
partners          - master partner record, zone_risk_score, coverage_tier, weekly_premium
policies          - one active policy per partner, next_premium_date, status
claims            - auto-created on trigger fire, fraud_flag, anomaly_score, status lifecycle
payouts           - simulated UPI payout per approved claim, pout_DEMO_ prefixed ID
trigger_events    - append-only log of every scheduler poll, confirmed flag
curfew_flags      - one row per city, admin-toggled for curfew trigger
kyc_documents     - masked document records per partner (never stores full numbers)
bank_accounts     - masked account number, IFSC, bank name per partner
mock_kyc_records  - seeded lookup table for PAN, DL, RC mock verification
```

Real-time publications enabled on `claims` and `payouts` tables so the partner's claims screen updates live when a trigger fires without any polling.

---

## Onboarding: 6-Step KYC Pipeline

Redesigned from scratch after researching Swiggy and Zomato's actual partner onboarding flows. Swiggy uses a fully remote 6-step app-driven process. Zomato uses a hybrid 4-step flow with mandatory Asset Centre visits. GRIP's flow mirrors Swiggy's remote model since no physical centre infrastructure exists.

### Step Structure

| Step | Name | Key Fields | Validation |
|---|---|---|---|
| 1 | Personal Details | Name, Mobile + OTP, DOB, Gender, Language, City | OTP verified before Continue allowed |
| 2 | Identity Verification | Aadhaar last 4, PAN number, Selfie placeholder | PAN regex + mock backend verification required |
| 3 | Work Profile | Platform, Vehicle type, Zone, Orders, Hours | None blocking |
| 4 | Vehicle Documents | DL number, RC number, Insurance checkbox | Skipped automatically for bicycle partners; DL + RC verification required for motorized |
| 5 | Payment Setup | Bank account, IFSC, UPI ID × 2, Authorization | IFSC auto-verifies on 11-char entry; UPI uniqueness checked against Supabase |
| 6 | Coverage Exclusions | 6 exclusions, consent checkbox | Cannot proceed without checkbox |

### Document Handling Rules

Following DPDP Act 2023 and Aadhaar regulations:
- Full Aadhaar number is never stored. Only last 4 digits are collected and stored as `XXXX-XXXX-{last4}`
- Full PAN is never stored. Verified against mock records, then masked as `AB***1234F` before storage
- Full DL is never stored. Masked as `DL04XXXXX2345` before storage
- Full bank account number is never stored. Masked as `XXXX XXXX {last4}` before storage
- All document metadata stored in `kyc_documents` table linked to partner by UUID

### Mock KYC Verification Endpoints

Four FastAPI endpoints simulate government verification APIs:

**`POST /kyc/send-otp`** and **`POST /kyc/verify-otp`**
Simulates Twilio/MSG91 OTP flow. In demo mode, OTP `1234` always passes. Mobile number must be 10 digits. Validates mobile uniqueness against Supabase before allowing Step 1 to proceed.

**`POST /kyc/verify-pan`**
Validates PAN against regex `^[A-Z]{5}[0-9]{4}[A-Z]{1}$`. Looks up in `mock_kyc_records` table. Performs fuzzy first-name match between entered name and record holder name. Returns `VERIFIED`, `NAME_MISMATCH` (warning, not blocking), `PAN_INVALID`, or `PAN_NOT_FOUND`. Mirrors Income Tax Department PAN verification API behaviour.

**`POST /kyc/verify-dl`**
Looks up DL number in `mock_kyc_records`. Checks `is_valid` flag and `expiry_date` against today's date. Returns `VERIFIED`, `DL_NOT_FOUND`, `DL_INVALID`, or `DL_EXPIRED`. Simulates Sarathi portal (MoRTH) vehicle licence verification.

**`POST /kyc/verify-rc`**
Looks up RC number in `mock_kyc_records`. Returns registration validity and registered city. Simulates Vahan portal (MoRTH) vehicle registration verification.

**`POST /kyc/verify-ifsc`**
Validates IFSC against regex `^[A-Z]{4}0[A-Z0-9]{6}$`. Maps first 4 characters to bank name from a seeded lookup covering 15 major Indian banks. Auto-triggers on 11-character entry in the frontend without requiring a separate button press.

### Conditional Vehicle Document Logic

The research established that bicycle partners on Swiggy are explicitly exempt from DL and RC requirements. This is implemented as:

```python
# OnboardingStepFour.jsx
useEffect(() => {
  if (onboardingForm.vehicleType === 'Bicycle') {
    navigate('/onboarding/5')  # Skip vehicle docs entirely
  }
}, [])
```

Insurance checkbox is marked required when platform is Zomato (Zomato mandates vehicle insurance for motorized partners) and recommended when platform is Swiggy.

---

## ML Model 1: XGBoost Zone Risk Scorer

### Purpose

Produces a `zone_risk_score` in `[0.85, 1.50]` that multiplies the base weekly premium of Rs 49. The model enables hyper-local pricing: the same coverage tier costs more in a flood-prone zone than in an elevated, historically safe zone.

### Why XGBoost

XGBoost handles the mixed categorical and numerical feature space (city, zone, vehicle type alongside continuous hazard counts) without requiring normalisation. It produces consistent predictions on the deterministic formula the training data was generated from and generalises well to unseen zone names via the OrdinalEncoder's `unknown_value=-1` fallback.

### Synthetic Training Dataset Construction

5,000 records across 5 cities. No public dataset correlates historical weather with food delivery order volumes - Zomato and Swiggy data requires NDA. Synthetic data calibrated against documented IMD/CPCB historical frequency data.

**City hazard priors (source: IMD/CPCB measured data, 2019-2024):**

| City | Heat days/yr (Tmax > 43°C) | Rain days/yr (24h > 100mm) | AQI > 300 days/yr | Status |
|---|---|---|---|---|
| Delhi | 7.0 | 0.75 | 25.0 | Estimated avg; AQI: CPCB measured 24/15/24/6/15/17 across 2019-2024 |
| Mumbai | 0.0 | 6.0 | 1.0 | Heat: zero measured days in recorded history; Rain: 3 measured cloudbursts |
| Bengaluru | 0.0 | 0.3 | 1.5 | Single confirmed extreme: 131.6mm on 5 Sep 2022 |
| Chennai | 1.0 | 2.0 | 2.0 | NEM season dominant; cyclone-driven rainfall events |
| Hyderabad | 0.85 | 0.5 | 0.75 | 43.0-43.6°C measured 2019/2020/2024; 2020 flash flood measured |

**Seasonal weather weights by month (source: IMD seasonal calendars, CSE Delhi AQI analysis):**

Heat peaks May-June (weight 1.80). Southwest Monsoon rain peaks July-September (weight 1.80). AQI breach season peaks October-January in Delhi (weight 1.80). These weights modulate effective hazard days per month, enabling seasonal premium variation without separate seasonal products.

**Zone flood risk multipliers (source: BBMP/BMC/GNCTD/GCC flood atlases):**

Zone flood risk is encoded as a standalone multiplier in `[1.05, 1.50]` independent of city weather hazard. This is the critical design decision: zone component is **additive** to city hazard, not multiplicative.

Without additive separation, Bengaluru's near-zero weather hazard zeros out the zone component entirely. A partner in Mahadevapura - ranked as one of Bengaluru's highest flood-risk zones by BBMP's urban flood hazard zonation study - would score identically to a partner in Indiranagar. That is actuarially wrong and SEWA's 7-day threshold lesson made explicit: imprecise thresholds destroy trust.

Selected zone multipliers:
- Yamuna Floodplain (Delhi): 1.50 - GNCTD Flood Control Order 2025, 445 identified hotspots
- Mahadevapura (Bengaluru): 1.50 - BBMP/OpenCity urban flood hazard zonation 2024, encroached rajakaluves
- Chembur (Mumbai): 1.45 - BMC Eastern Suburbs Resilience Plan 2024-25, tide-locked outfalls
- Pallikaranai (Chennai): 1.45 - GCC/ADB 2022, marshland loss and NEM backwater flooding
- Banjara Hills (Hyderabad): 1.05 - GHMC DMP 2024, elevated western periphery

**Feature set (12 features):**

`city`, `zone`, `vehicle_type`, `platform`, `season`, `month`, `avg_daily_orders`, `avg_daily_hours`, `effective_heat_days`, `effective_rain_days`, `effective_aqi_days`, `zone_flood_risk`

Effective days = annual hazard days × seasonal weight for the given month. This encodes both city baseline risk and temporal concentration of hazard events.

**Score formula (deterministic, used to generate labels):**

```
score = 0.85
      + city_hazard_component    (normalised weighted sum of three hazard types)
      + zone_flood_component     ((zone_flood_risk - 1.0) × 0.50)
      + season_risk_modifier     (Monsoon +0.10, Winter +0.07, Pre-monsoon +0.04, Post-monsoon +0.03)
      + vehicle_modifier         (ICE 0.00, EV -0.03, Bicycle -0.05)
      + order_activity_modifier  (>30 orders +0.05, <15 orders -0.05)
      clipped to [0.85, 1.50]
```

Normalisation denominators: heat max 10 days, rain max 10 days, AQI max 30 days. Individual hazard normalised values are clipped to `[0, 1]` before weighting to prevent seasonal amplifiers (max 1.80) from exceeding the normalisation ceiling. Without this clip, Delhi's winter AQI component saturates the formula and makes zone differences invisible within the city - Connaught Place and Yamuna Floodplain would score identically.

**Training configuration:**

```python
XGBRegressor(
    n_estimators=200,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42
)
```

80/20 holdout split. Train MAE: 0.0035. Validation MAE: 0.0046. Validation RMSE: 0.0061.

**Sanity check results:**

| City | Zone | Score | Standard Tier (Rs/week) |
|---|---|---|---|
| Bengaluru | Indiranagar | 0.96 | Rs 59 |
| Delhi | Connaught Place | 1.34 | Rs 82 |
| Delhi | Yamuna Floodplain | 1.40 | Rs 86 |
| Mumbai | Chembur | 1.48 | Rs 91 |

Score gap between highest and lowest zone: 0.52. Weekly premium gap at Standard tier: Rs 32. Over 52 weeks: Rs 1,664 annual difference - actuarially meaningful differentiation.

**Serving:**

Loaded once at FastAPI startup via pickle. Exposed at `POST /ml/premium-quote`. Frontend calls this during onboarding Step 5 and falls back to the rule-based engine in `premiumEngine.js` if the API is unreachable.

---

## ML Model 2: Isolation Forest Fraud Detector

### Purpose

Anomaly detection on auto-created parametric claims. Flags claims with unusual feature combinations for manual review and blocks payout. The model runs on every claim created by the trigger engine before any payout is initiated.

### Why Isolation Forest

True fraud rate in Indian microinsurance is 0.05–0.30% per PM-JAY measured data. At this rate, a supervised classifier requires millions of records to surface meaningful positive examples. Isolation Forest is unsupervised - it learns the shape of normal behaviour and identifies deviations. This is the academically correct approach for extreme class imbalance, supported by the Edinburgh CRC paper (Detecting Insurance Fraud with Isolation Forests, 2021).

### Synthetic Training Dataset Construction

100,000 records. Fraud rate: 0.5% (500 fraud records, 99,500 legitimate). PM-JAY measured rate of 0.05-0.30% is scaled up to 0.5% because at true rates the Isolation Forest requires substantially more records to produce measurable anomaly score separation in a demo context.

**12 features with distribution justifications:**

| Feature | Legitimate Distribution | Fraud Distribution | Source |
|---|---|---|---|
| claim_lag_hours | Lognormal μ=3.5, σ=0.5 (median 33h) | Lognormal μ=2.2, σ=0.4 (median 9h) | NICB/Citizens FL catastrophe fraud proxy 2017-2019 |
| prior_orders_48h | Uniform [8, 16] | Uniform [0, 4] | Swiggy/SHIELD device-first fraud study |
| claim_hour | Bimodal peaks 9-12 and 18-21 | PM/evening peak 18-22, midnight spike | Worldline EU 2022/2024 fraud timing proxy |
| prior_claims_30d | ZINB: 85% zero-inflated, else [1, 2] | Negative Binomial n=2, p=0.4 (μ≈3) | Indian health insurance ZINB literature; Madras HC motor ring case |
| device_returning | 85% True | 100% False | Platform baseline; fraud rings use disposable devices |
| zone_match | 95% True | 100% False | GPS spoofing into trigger zone |
| device_tampered | 4% True | 65% True | Swiggy Bytes engineering blog; Incognia Gig Economy Report 2025 |
| nocturnal_fraction | Uniform [0.05, 0.25] | Uniform [0.35, 0.80] | Worldline EU 2022/2024 |
| cancellation_ratio | Uniform [0.00, 0.12] | Uniform [0.20, 0.60] | Gig platform fraud literature |
| network_reuse_count | Uniform integer [0, 1] | Uniform integer [2, 20] | Madras HC motor fraud case (ring collusion, no exact distribution published; [2,20] defensible for mid-scale ring) |
| fnol_last_trip_delta_hours | Uniform [0.5, 6.0] | Uniform [12.0, 96.0] | FNOL timing literature; genuine partner was working during disruption |
| activity_kl_divergence | Uniform [0.01, 0.15] | Uniform [0.40, 1.20] | Edinburgh CRC Isolation Forest paper 2021 |

**Notes on parameter choices:**

`device_tampered` fraud rate set at 65%, not 85%. Swiggy's blog documents ~8% of all active partners running cloned apps. Insurance-enrolled cohort is lower risk. Fraud ring members split between basic mock-location apps (flagged by Android's `Location.isMock()`) and advanced Magisk/LSPosed hooks (harder to detect). 65% is the average across both sophistication levels.

`network_reuse_count` ceiling is 20, not 49. The Madras HC motor fraud case confirms coordinated ring collusion but no exact network size distribution is published for parametric insurance. [2, 20] is defensible for a mid-scale ring without overstating separation.

`nocturnal_fraction` fraud floor is 0.35, not 0.40. Lowered to allow partial overlap with legitimate partners who do late-night deliveries, making the model work harder and producing more defensible precision scores.

**Training configuration:**

```python
IsolationForest(
    n_estimators=200,
    contamination=0.005,  # actual fraud rate in dataset
    max_features=0.8,
    random_state=42,
    n_jobs=-1
)
```

Trained on legitimate records only (79,600 rows from 80% train split). Evaluated on 20,000-record holdout with stratified split to preserve fraud rate.

**Validation results:**

- Precision@Top0.5%: **95.0%** - 95 of the 100 most anomalous claims in the holdout are actual fraud records
- Recall: 1.00 - every fraud record in the holdout appears in the top-K anomaly window
- Legit median anomaly score: -0.4682
- Fraud median anomaly score: -0.7094
- Delta: 0.2413 - clean separation between cohorts

**Confidence classification:**

- Score below -0.65 → `"high"` confidence fraud flag
- Score between -0.65 and -0.55 → `"medium"` confidence
- Score above -0.55 → `"low"` confidence (anomaly flag but borderline)

**Serving:**

Loaded at startup, exposed at `POST /ml/fraud-score`. Called synchronously inside `claim_service.py` for every auto-created claim before payout is initiated. Takes approximately 8ms per call on a standard development machine.

---

## Parametric Trigger Engine

### Architecture

APScheduler `AsyncIOScheduler` attached to FastAPI lifespan. Polls every 15 minutes. All evaluations are async - no blocking calls.

### Data Sources

**Weather (OpenWeatherMap 2.5 free tier):**
Two calls per city per poll:
- `GET /data/2.5/weather` - current temperature (`main.temp_max`)
- `GET /data/2.5/forecast?cnt=8` - 8 × 3-hour slots summed for 24h rainfall accumulation (`rain.3h`)

Total: 10 calls per poll cycle × 96 cycles/day = 960 calls/day. Free tier limit: 1,000 calls/day. Within limit with 40 calls headroom.

One Call 3.0 was rejected: requires paid subscription activation even on free tier, returning 401 on all requests until manually subscribed at `openweathermap.org/api`.

**AQI (CPCB via data.gov.in):**
`GET /resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69` with `filters[state]` per city. Returns all monitoring stations in the state. Maximum AQI value across all stations is used - conservative approach that flags the city as at-risk if any station breaches the threshold. Hourly update frequency; free with API key registration.

**Curfew (Supabase `curfew_flags` table):**
No public API exists for zone suspension events. The `curfew_flags` table has one row per city seeded at deployment, all `is_active = false`. Admin toggles via `POST /admin/set-curfew?city=X&active=true`. Scheduler reads this table on every poll - the trigger is fully automated once the admin sets the flag, not manual.

### Four Trigger Definitions

| Trigger | Threshold | Persistence | AND Condition | Source |
|---|---|---|---|---|
| Heat | Tmax > 43°C | 2 consecutive days | >30% simulated order drop | IMD national heatwave definition |
| Rainfall | 24h accumulation > 100mm | 1 day | >30% simulated order drop | IMD extreme rainfall classification |
| AQI | City AQI > 300 | 2 consecutive days | >30% simulated order drop | CPCB "Very Poor" AQI category |
| Curfew | Admin flag active | 1 day | >60% simulated order drop | Binary - zone suspension confirmed by admin |

**Why 2-day persistence for heat and AQI:**

SEWA launched heat insurance in Gujarat with a 7-day threshold in 2023. That threshold never fired in Year 1 because no single sustained event lasted 7 consecutive days above the threshold. Partners stopped trusting the product. Our 2-day persistence is calibrated against the documented frequency patterns: Delhi has ~7 heat days per year but they cluster in 2-4 day stretches, not isolated single-day spikes.

**Persistence mechanism:**

In-memory dictionary per `{city}_{trigger_type}` key tracking consecutive breach days and last breach date. Resets to zero on any non-breach day. Survives within a single server session; state is rebuilt from scratch on restart, which is acceptable since trigger confirmation requires 2 consecutive calendar days.

**Order volume AND condition:**

Platform order volume data requires NDA with Zomato/Swiggy. For Phase 2, a `_mock_order_drop()` function returns a city and trigger type specific base drop with ±5% jitter:

| Trigger | Base simulated drop |
|---|---|
| Heat | 35% |
| Rainfall | 55% |
| AQI | 40% |
| Curfew | 75% |

This function is explicitly named `_mock_order_drop` in the codebase and is the designated replacement point for a real platform API integration in production.

### Claim Creation Pipeline

On confirmed trigger:

```
1. Fetch all active partners in triggered city (Supabase query)
2. For each partner:
   a. Idempotency check: query claims WHERE partner_id = X
      AND trigger_type = Y AND created_at in UTC date range
      → skip if row exists (prevents duplicate daily claims)
   b. Fetch prior_claims_30d (live COUNT query, not hardcoded)
   c. Build 12-feature fraud payload from partner profile
   d. POST /ml/fraud-score → anomaly_score, is_fraud_flag
   e. INSERT claim:
        status = 'fraud_review' if fraud_flag else 'approved'
        auto_approved = not fraud_flag
   f. If approved:
        - Check COUNT of prior processed payouts (is_first_payout)
        - Apply Rs 4,000 cap if first payout
        - INSERT payout with pout_DEMO_{random} ID
        - UPDATE claim status to 'paid'
3. All Supabase inserts complete
4. Real-time subscription fires on claims table
5. Partner's claims screen updates without page refresh
```

Total latency from trigger confirmation to `paid` claim: under 2 seconds for 2 partners in test environment.

### Demo Endpoints

**`POST /admin/fire-trigger?city=X&trigger_type=Y&override_value=Z`**
Bypasses scheduler and persistence check. Marks the event as confirmed immediately. Used in demo video to simulate a trigger without waiting 15 minutes.

**`POST /admin/fire-fraud-claim?city=X&trigger_type=Y&override_value=Z`**
Creates a claim with all 12 features set to fraud-positive values (claim_lag 2.1h, prior_orders 1, device_tampered 1, zone_match 0, etc.). Isolation Forest flags it as `fraud_review`. No payout created. Demonstrates the fraud detection path alongside a legitimate paid claim.

**`POST /admin/set-curfew?city=X&active=true`**
Toggles `curfew_flags.is_active` for the given city. The next scheduler poll (within 15 minutes) will auto-fire the curfew trigger for all active partners in that city.

---

## Payout Simulation

RazorpayX Bulk Payouts API requires business banking KYC activation through a separate portal (`x.razorpay.com`). This activation requires verified business documents and takes 3-5 business days. The Phase 2 deadline and hackathon context made this activation infeasible.

The usecase explicitly permits simulation: *"Integrate mock payment gateways (Razorpay test mode, Stripe sandbox, or UPI simulators) to demonstrate how the worker receives their lost wages instantly."*

Simulation behaviour in `claim_service.py`:
- Generates a `pout_DEMO_{random_8_digits}` payout ID mimicking RazorpayX format
- Writes to `payouts` table with `status = 'processed'`, `settled_at = now()`
- Enforces Rs 4,000 first-payout cap (real UPI constraint: banks enforce cooling period for new beneficiaries, deterministic failure above Rs 5,000)
- Updates linked claim to `status = 'paid'`

The `pout_DEMO_` prefix makes the simulation status unambiguous in all UI and database views.

---

## API Integration Summary

| API | Endpoint | Auth | Use | Status |
|---|---|---|---|---|
| OpenWeatherMap Current | `/data/2.5/weather` | API key (free) | Live temperature per city | Active |
| OpenWeatherMap Forecast | `/data/2.5/forecast` | API key (free) | 24h rainfall accumulation | Active |
| CPCB AQI | `api.data.gov.in/resource/3b01bcb8...` | API key (free) | Live AQI per city | Active |
| GRIP ML Premium Quote | `POST /ml/premium-quote` | Internal | Zone risk score + tier premiums | Active |
| GRIP ML Fraud Score | `POST /ml/fraud-score` | Internal | 12-feature anomaly detection | Active |
| GRIP KYC OTP | `POST /kyc/send-otp`, `/kyc/verify-otp` | Internal | Mock mobile verification | Active |
| GRIP KYC PAN | `POST /kyc/verify-pan` | Internal | Mock PAN + name verification | Active |
| GRIP KYC DL | `POST /kyc/verify-dl` | Internal | Mock Sarathi DL verification | Active |
| GRIP KYC RC | `POST /kyc/verify-rc` | Internal | Mock Vahan RC verification | Active |
| GRIP KYC IFSC | `POST /kyc/verify-ifsc` | Internal | Bank name lookup from IFSC | Active |
| Supabase REST | Auto-generated | Service role key | All database operations | Active |
| Supabase Realtime | WebSocket channel | Anon key | Live claims feed | Active |

---


## What Phase 3 Adds

Phase 2 delivers the complete automated protection loop. Phase 3 adds:

- Advanced GPS spoofing detection via Google Play Integrity API `MEETS_STRONG_INTEGRITY` verdict
- GNSS raw signal analysis (C/N0 and AGC anomaly detection)
- Device graph clustering for coordinated ring detection
- Real RazorpayX payout integration (requires business banking activation)
- 7-day predictive disruption calendar using IMD forecast data
- iOS build from existing React Native codebase
- Partner language localisation (Hindi, Kannada, Tamil, Telugu, Marathi)

---

## Team

Team Exogeneous - Guidewire DEVTrails 2026