# GRIP: Gig Risk Income Protection

**Phase 3 Technical Implementation, Guidewire DEVTrails 2026**

> This document is the single authoritative technical reference for GRIP as delivered at the end of Week 6. It consolidates the product thesis and architecture from Phase 1, the live systems delivered in Phase 2, and the hardening, real-world signals, and intelligent dashboards added in Phase 3. Where Phase 1 and Phase 2 made claims that were later refined or replaced, this document reflects what is actually implemented in the Week 6 codebase.

## Pitch Deck
https://drive.google.com/file/d/1QNKXElHGjIxRvYwqOAWVfadvfmLc5ENY/view
---

## Table of Contents

1. The Problem
2. Persona
3. What GRIP Is
4. Scenario Walkthroughs
5. Coverage Scope and Exclusions
6. Weekly Premium Model and Dynamic Pricing
7. Four Parametric Triggers
8. Platform Choice: Progressive Web App
9. Location Signals Without a Native App
10. Technical Architecture
11. Database Schema
12. Onboarding Pipeline
13. Machine Learning Models
14. Three-Layer Fraud Architecture
15. Parametric Trigger Engine
16. Claim Lifecycle
17. Partner Dashboard
18. Admin Dashboard
19. Notification System
20. API Integration Summary
21. Innovative Methods and Technologies
22. Evolution Across Phases
23. Known Limitations
24. Local Deployment
25. Team

---

## 1. The Problem

India's delivery partners are the operating backbone of the urban gig economy. They are also the single group most exposed to weather, air quality, and social disruptions that remove their ability to earn without warning and without recourse.

Bengaluru's Sarjapur Road, Bellandur, and Whitefield came to a standstill on September 6 and 7, 2022. Gurugram's NH8 corridor flooded again on September 1, 2025. Mumbai's Chembur and Andheri suspend deliveries every monsoon. Delhi's October-to-January AQI cycle pulls riders off the road for weeks at a time. The pattern repeats every year, every season. Every time it does, India's delivery partners absorb the full financial hit alone.

The existing insurance cover these workers receive from their platforms does not address this risk at all. Swiggy provides group accident and medical cover tied to weekly performance rankings. Zomato spent over Rs 100 crore on partner insurance premiums in 2025, but that coverage is for accidents and illness and pays only after 10 days of inability to work. Neither platform has any mechanism for the most common disruption their partners actually face: a Tuesday when it rains too hard to go outside.

Only 14 percent of gig workers in India currently hold any form of insurance. The reasons are straightforward: liquidity constraints, product complexity, and a deep-seated distrust of systems that never paid out when they should have.

GRIP covers income loss only. Vehicle repairs, health, life, and accident coverage are explicitly out of scope because those risks are already addressed, however imperfectly, by existing platform covers.

---

## 2. Persona

Meet Arjun. He is 26 years old, from Bareilly, and moved to Delhi three years ago to earn more than his home district could offer. He delivers for Zomato on a petrol two-wheeler he bought on a two-year EMI. He works 10 to 12 hours a day, six days a week, completing 25 to 35 orders on a good day. His gross monthly income is around Rs 22,000 to Rs 25,000. After fuel, maintenance, and phone recharges, his weekly net income lands between Rs 4,100 and Rs 5,500. His fixed obligations every month are Rs 4,200 in rent for a shared room in Dwarka, Rs 1,800 in EMI for the bike, Rs 800 sent home to his mother, and roughly Rs 3,000 in food and daily expenses. That is Rs 9,800 in committed outgoings every month. The margin between what he earns and what he owes is thin enough that a single disrupted week does not create inconvenience. It creates a deficit. He has no savings beyond two weeks of income.

Arjun has heard of insurance. He remembers his father buying a policy from an agent in Bareilly that never paid out when they needed it. He does not trust agents. He has never downloaded an insurance app because he does not understand what it covers or whether it will actually work when something goes wrong. He pays for things he can see and feel. UPI he trusts completely because it has never lied to him.

Between October and January, Delhi's AQI crosses 300 and sometimes reaches 400 for days at a stretch. On those days Arjun makes a calculation: if he rides in this air for ten hours, his chest will hurt for a week. So he stays home. His income that week drops to Rs 1,500 or less. He skips sending money home. He borrows Rs 500 from a friend for groceries. His EMI does not care about the air quality index.

When the monsoon comes in July, it is worse. On the days Zomato sends a notification saying deliveries are suspended in his zone, he sits in his room watching his earnings counter stay at zero.

Arjun does not need a complex financial product. He needs a system that notices when his city makes it impossible for him to work, and puts money in his account before he has to make that call home to explain why the transfer is not coming this week.

That is the only problem GRIP is trying to solve. Everything else is secondary.

**Why Arjun has never bought insurance and what GRIP does differently.** He has never bought insurance because every product he has seen requires him to pay upfront, wait months to understand if he qualifies, and then file paperwork after something goes wrong. The timing is wrong, the process is opaque, and the language is not his. GRIP's premium is modelled as an auto-deduction from his weekly platform earnings settlement, so the decision never requires active effort. The payout arrives without him filing anything. The notification is in his preferred language. The amount is specific and predictable. For the first time, the product is structured around how he actually lives, not around how an insurance company prefers to operate.

---

## 3. What GRIP Is

GRIP is a parametric insurance platform for Indian food delivery partners on Zomato and Swiggy. It protects against four classes of income-loss disruption that are outside a partner's control: extreme heat, extreme rainfall, severe air quality, and government-ordered curfew or zone suspension.

- Coverage scope is strictly loss of income only. Health, life, and vehicle perils are permanently excluded and the exclusion is enforced via a mandatory consent screen before policy activation.
- Premiums are structured weekly, calibrated to gig worker cash flow, and priced dynamically by an XGBoost model on 12 features including operating zone, city, vehicle type, season, and historical hazard frequency.
- Payouts are parametric. When an objective trigger threshold is breached and confirmed by independent oracles, claims are auto-created, scored for fraud, and settled through a simulated payout pipeline in under two seconds. No paperwork. No filing.

---

## 4. Scenario Walkthroughs

> The scenarios below describe GRIP's implemented system behaviour against live APIs. Order volume cross-validation is modelled by a named `_mock_order_drop` function in the codebase, marked explicitly as the designated replacement point for a real platform integration.

### Scenario 1: The AQI Winter, Delhi, November

Delhi's CPCB-monitored AQI crosses 300 on November 12 and stays there for three consecutive days. GRIP's trigger engine polls the CPCB real-time AQI API every 15 minutes, detects the breach, and waits for the two-day persistence requirement. On day two, persistence is satisfied. The Layer 3 oracle integrity check confirms the reading against the historical 99th percentile from the `trigger_events` table. Order volume in Arjun's zone has dropped well below the simulated 30 percent threshold. All conditions are met. An automated payout of Rs 400 per disruption day is initiated for the confirmed day. Arjun receives the payout via a simulated UPI pipeline with a `pout_DEMO_` prefix, and his Claims tab updates in real time via a Supabase publication without any refresh.

### Scenario 2: The Monsoon Halt, Mumbai, July

Open-Meteo's ECMWF IFS 9 km model reports 118 mm of rainfall in a 24-hour window at the zone centroid for Chembur on July 9. The threshold is 100 mm. Google Maps Weather API, independently, confirms above-threshold precipitation at the same coordinates. Two of three sources agree, the Layer 3 oracle confirms, and the trigger fires for every active partner whose zone centroid falls inside that 9 km cell. Andheri, in a different ECMWF grid cell, records a lower value and does not trigger. This is the first time GRIP can discriminate within a single city, and it matters because SEWA's 2023 Gujarat heat pilot failed in Year 1 precisely because its city-level threshold never fired for any single partner.

### Scenario 3: The Summer Heatwave, Delhi, May

Open-Meteo records 44.1 degrees Celsius for two consecutive days for partners clustered around Safdarjung. The heatwave trigger fires on day two after the persistence check. Partners in Noida, whose zone centroid falls in a different grid cell and records 42.8 degrees, are not paid. This is actuarially correct and aligned with IMD's own station-based counting methodology for RWBCIS.

---

## 5. Coverage Scope and Exclusions

Phase 2 added an explicit exclusions screen at step 6 of onboarding. Partners must scroll through all six exclusions and check an explicit consent checkbox before the policy activates. The screen cannot be bypassed.

1. **Acts of War and Civil Conflict.** Income loss from war, invasion, armed conflict, or government-declared states of emergency involving military action.
2. **Pandemic and Epidemic Declarations.** Loss of income during nationally or internationally declared pandemics or epidemics, including platform shutdowns ordered under epidemic control measures.
3. **Nuclear and Radiation Events.** Any disruption caused by nuclear reaction, radiation, or radioactive contamination regardless of cause.
4. **Platform Policy Changes.** Deactivation, suspension, or income reduction caused by the platform's own policy decisions, algorithm changes, or terms of service enforcement.
5. **Pre-existing Zone Restrictions.** Areas already under operational restrictions at the time of policy activation are excluded from curfew and social disruption triggers.
6. **Voluntary Work Stoppage.** Income loss from personal choice not to work during a trigger event. Payouts require the trigger to have independently caused the disruption.

---

## 6. Weekly Premium Model and Dynamic Pricing

Food delivery partners operate on a weekly earnings cycle. Imposing a monthly or annual premium on a worker who gets paid weekly creates immediate liquidity friction, and liquidity friction is the single biggest driver of insurance non-renewal in the Indian microinsurance market per the ICMIF Foundation India diagnostic report of 2021.

GRIP's premium structure is entirely weekly. The base premium is Rs 49 per week, which is below the Rs 83 weekly acceptance threshold established by Dvara Research field studies in 2023. The actual weekly premium charged to each partner is dynamically adjusted.

### Premium Formula

```
Weekly Premium = Base Premium (Rs 49)
               x Zone Risk Multiplier (0.85 to 1.50)
               x Coverage Tier Multiplier (1.00 / 1.25 / 1.50)
```

### Coverage Tiers

- **Basic, 1.00x multiplier.** Rs 300 per disruption day, capped at Rs 900 per week.
- **Standard, 1.25x multiplier.** Rs 400 per disruption day, capped at Rs 1,200 per week.
- **Premium, 1.50x multiplier.** Rs 500 per disruption day, capped at Rs 1,500 per week.

### Zone Risk Multiplier

Zone Risk Multiplier reflects hyper-local disruption history. A partner operating in Bengaluru's Sarjapur Road corridor, a documented flood zone, carries a higher multiplier than one operating in Indiranagar. A partner in Mumbai's Chembur carries a higher multiplier than one in Navi Mumbai's Seawoods. A partner in Delhi's Yamuna Floodplain carries a higher multiplier than one in Connaught Place.

The multiplier is produced by the XGBoost Zone Risk Scorer described in Section 13. Phase 3's most consequential change is that zone-level differentiation is now real at trigger evaluation time as well, not only at pricing time. Open-Meteo's 9 km ECMWF IFS grid returns different readings for zones in different grid cells of the same city. Chembur and Andheri, 8 km apart, receive different rainfall readings and can trigger independently.

### Premium Collection

Premium is modelled as auto-deduction from the partner's weekly earnings settlement on the platform. This is simulated in the prototype and requires platform partnership in production. The decision to model collection as an auto-deduction, rather than a manual payment, is the single most important behavioural design choice in the product. A landmark Randomized Controlled Trial in Kenya by Casaburi and Willis (American Economic Review, 2020) demonstrated that aligning premium collection with income timing increased insurance take-up from 5 percent to 72 percent, while a 30 percent price discount had no statistically significant effect. VimoSEWA confirmed this independently: when premiums were linked to Fixed Deposits, renewal hit 100 percent compared to 22 to 41 percent under voluntary payment schemes.

---

## 7. Four Parametric Triggers

All four triggers use measured data from live APIs. None fire on a single source without oracle confirmation.

| Trigger | Threshold | Persistence | AND Condition | Primary Source |
|---|---|---|---|---|
| Heat | Daily Tmax above 43 degrees C | 2 consecutive days | Simulated 30 percent order drop | Open-Meteo ECMWF IFS 9 km |
| Rainfall | 24-hour accumulation above 100 mm | 1 day | Simulated 30 percent order drop | Open-Meteo ECMWF IFS 9 km, TSDPS mandal for Hyderabad |
| AQI | City AQI above 300 | 2 consecutive days | Simulated 30 percent order drop | CPCB via data.gov.in |
| Curfew | Admin flag active | 1 day | Simulated 60 percent order drop | Supabase `curfew_flags` table |

### Why Two-Day Persistence for Heat and AQI

SEWA launched heat insurance in Gujarat with a 7-day threshold in 2023. That threshold never fired in Year 1 because no single sustained event lasted 7 consecutive days above the threshold. Partners stopped trusting the product. GRIP's two-day persistence is calibrated against documented IMD frequency patterns. Delhi records about 7 heat days per year, but they cluster in 2 to 4 day stretches, not isolated single-day spikes.

### Why the Order Volume AND Condition

Platform order volume data requires NDA with Zomato or Swiggy. For the Phase 2 and Phase 3 codebase, a `_mock_order_drop()` function returns a city and trigger-type-specific base drop with 5 percent jitter. The function is named explicitly so that the replacement point for a real platform API integration is unambiguous.

| Trigger | Base simulated drop |
|---|---|
| Heat | 35 percent |
| Rainfall | 55 percent |
| AQI | 40 percent |
| Curfew | 75 percent |

---

## 8. Platform Choice: Progressive Web App

GRIP's Phase 1 design specified React Native for Android-first delivery and iOS on the Phase 3 roadmap. That path was reconsidered during Phase 2 in light of three realities that changed the correct answer.

- The dominant delivery partner device is a low-end Android phone with constrained storage. A 50 MB APK is real friction for a worker deciding whether to install an insurance app on a phone that already runs Zomato, Swiggy, WhatsApp, and their banking app. A Progressive Web App is effectively zero-install.
- Distribution through the Play Store requires a developer account, app-signing infrastructure, and a review cycle that is incompatible with iterative hackathon delivery.
- Every capability GRIP genuinely needs can be delivered via browser APIs on Android Chrome: HTTPS, service workers for offline caching, push notifications via the Web Push standard, the Geolocation API for device location, and Visual Viewport APIs for mobile-first layouts.

### Why PWA Is Correct for This Product

- **Zero install friction.** The partner opens a URL, adds to home screen, and has a full-screen app icon. No Play Store download. No 50 MB binary. No update prompts.
- **One codebase, zero platform forks.** The React + Vite bundle runs identically on Android, iOS Safari, and desktop Chrome. There is no iOS build to sequence into Phase 3 because there is no platform-specific build at all.
- **Automatic updates.** A service worker pushes the latest bundle without the partner doing anything.
- **Full-screen app experience.** Display mode `standalone` removes the browser chrome and renders at 390 px canvas with the same Framer Motion polish as a native app.
- **Web Push works over Firebase Cloud Messaging.** Real push notifications for payout alerts can land on the partner's home screen even when the PWA is closed.
- **Browser APIs cover the location requirement.** The Geolocation API returns real GPS coordinates with user permission on modern Android browsers, which is all Phase 3's GPS-based zone matching needs.

### What PWA Does Not Give Us and How We Mitigate That

- **No Google Play Integrity API.** A PWA cannot prove hardware-backed device integrity. This is replaced by IP reputation scoring through IPQualityScore, browser-level GPS capture at enrolment and login, and the shared-attribute identity graph described in Section 14.
- **No raw GNSS C/N0 or AGC measurements.** The browser Geolocation API returns post-fusion coordinates only. GNSS spoofing detection is therefore out of scope for a web-based product. The GPS signal is used as an additive feature in fraud scoring, not as the sole defence layer.
- **Background location tracking is restricted.** A PWA cannot poll GPS continuously while closed. GRIP works around this by capturing location at the two moments when the partner is actively using the app: onboarding completion and every login. These are the moments that matter.

---

## 9. Location Signals Without a Native App

Phase 1's adversarial defence stack was designed around Android Play Integrity and raw GNSS analysis, both of which require a native app. The PWA shift required a rethink. The question becomes: what location signals can a server-side-only, web-based parametric product actually use in a way that is honest, defensible, and resistant to trivial spoofing?

### Pre-bound Zone at Enrolment

The industry standard for web-based parametric insurance is to bind the insured location at enrolment and evaluate the trigger against that fixed location. Jumpstart, Descartes Underwriting, and Arbol all do this. GRIP does the same. Onboarding Step 1 calls the Google Maps Geocoding API with the partner's declared city, returning `zone_lat`, `zone_lng`, and a `zone_distance_from_city_km`. If the geocoded location is more than 50 km from the declared city centroid, a `zone_coordinates_flag` is raised on the partner record.

### Browser Geolocation at Enrolment Completion

At the end of Step 6, after the partner accepts the exclusions screen, the browser requests the Geolocation API with `enableHighAccuracy: true` and an 8-second timeout. If the partner grants permission, the returned coordinates are POSTed to `/kyc/partners/{partner_id}/enrollment-gps`. The backend compares these against the pre-bound zone centroid using a haversine distance calculation. Mismatches above 50 km set `enrollment_gps_flag` on the partner record. Permission denial never blocks registration, which is fail-open by design.

### Browser Geolocation at Every Login

On every successful login the app silently requests GPS with `enableHighAccuracy: false`, 5-second timeout, and `maximumAge: 60000` so the browser can return a recent cached fix. The result is POSTed to `/kyc/partners/{partner_id}/last-known-location` and written to `last_known_lat`, `last_known_lng`, and `last_known_at`. Permission denial is silent.

### Real `zone_match` in Fraud Scoring

In Phase 2, the `zone_match` feature of the Isolation Forest payload was set to 1 by default and 0 only when `zone_coordinates_flag` was set at registration. That is a placeholder. Phase 3 replaces it with a real priority hierarchy:

1. If `last_known_lat` and `last_known_at` are within the last 24 hours, compute haversine distance against the pre-bound zone centroid. Distance above 50 km sets `zone_match = 0`.
2. Otherwise, if `enrollment_gps_flag` is set, `zone_match = 0`.
3. Otherwise, if `zone_coordinates_flag` is set, `zone_match = 0`.
4. Otherwise `zone_match = 1`.

This is a real, computed, device-grounded signal. It will not stop a sophisticated attacker running a GPS spoofing browser extension, but it raises the cost of the attack from nothing to something and makes the checklist item "GPS vs platform login cross-check" defensible in the submission.

### IP Reputation via IPQualityScore

IPQualityScore's free tier returns a 0 to 100 fraud score plus VPN, proxy, and Tor classification for an IP address. The backend calls this at registration and stores `ipqs_fraud_score`, `ipqs_is_vpn`, `ipqs_is_proxy`, `ipqs_is_tor`, and a derived `ipqs_ip_suspicious` boolean. The signal is used as a Layer 1 reputation input, never as a location input, because Jio and Airtel route mobile CGNAT traffic through a small set of NOC cities regardless of device location.

---

## 10. Technical Architecture

### Tech Stack

| Layer | Technology | Justification |
|---|---|---|
| Frontend | React 19, Vite, Tailwind 3, Framer Motion 12 | Mobile-first 390 px canvas, Android-first delivery partner persona, PWA-capable |
| Backend | FastAPI on Python 3.12 | Async support, automatic OpenAPI docs, ML model serving without a separate inference process |
| Database | Supabase (PostgreSQL) | Row Level Security, real-time publications, JS SDK for direct frontend reads, `pg_trgm` for identity graph |
| ML Training | XGBoost, scikit-learn Isolation Forest | Industry standard for tabular risk scoring and unsupervised anomaly detection |
| Scheduler | APScheduler AsyncIOScheduler | Attached to FastAPI lifespan, async poll loop every 15 minutes |
| Rainfall and Heat, primary | Open-Meteo ECMWF IFS 9 km (`models=ecmwf_ifs`) | Highest-resolution free commercial-OK model for India |
| Rainfall and Heat, secondary | Google Maps Weather API (MetNet) | Independent model chain for oracle confirmation |
| Rainfall, Hyderabad tertiary | TSDPS mandal-level scrape | 5 to 10 km resolution, finer than any global free API for that region |
| Adverse Selection 5-day Forecast | OpenWeatherMap 2.5 | Forecast API for Layer 3 enrolment gate |
| AQI | CPCB via data.gov.in | Official government source, free API key, hourly updates |
| IP Risk Scoring | IPQualityScore free tier | 1,000 lookups per month, VPN, proxy, Tor classification |
| Geocoding | Google Maps Geocoding API | Returns zone centroid coordinates during Layer 1 |
| OTP | Demo OTP of 1234 | Matches Phase 2 submission scope, avoids TRAI DLT registration delay |
| Payments | Simulated payout engine | RazorpayX business-banking activation is out of scope for a hackathon, simulation is explicitly permitted under Phase 2 guidelines |

### Deployment

- Frontend deployed on Vercel as a static Vite bundle, served with service-worker support for PWA behaviour.
- Backend deployed on Railway as a FastAPI service behind a public HTTPS endpoint. Nixpacks is configured with `providers = ["python"]` and `python -m pip install -r backend/requirements.txt` to prevent the repo's root `package.json` from causing a Node.js auto-detection.
- Supabase is hosted on supabase.com. Migrations live under `supabase/migrations/` and are numbered `001_` through `005_`.

### Topology

```
┌─────────────────────┐         ┌─────────────────────┐
│  Partner PWA        │         │  Admin PWA          │
│  React 19 + Vite    │         │  Same codebase      │
│  Vercel CDN         │         │  /admin route group │
└──────────┬──────────┘         └──────────┬──────────┘
           │                               │
           │           HTTPS/JSON          │
           ▼                               ▼
┌──────────────────────────────────────────────────────┐
│  FastAPI on Railway                                  │
│  ├─ /kyc           onboarding, GPS endpoints         │
│  ├─ /ml            premium quote, fraud scoring      │
│  ├─ /admin         demo endpoints, BCR, stress test  │
│  ├─ trigger_engine APScheduler async poll loop       │
│  ├─ claim_service  claim + payout pipeline           │
│  ├─ fraud_layer1   registration integrity + IPQS     │
│  ├─ fraud_layer3   adverse selection + oracle check  │
│  ├─ ring_detection shared-attribute graph            │
│  └─ tsdps_scraper  Hyderabad mandal rainfall         │
└──────────┬──────────────────────────────────────────┘
           │
   ┌───────┼──────────────┬──────────────┬─────────────┐
   ▼       ▼              ▼              ▼             ▼
┌──────┐ ┌──────┐ ┌───────────────┐ ┌─────────┐ ┌──────────────┐
│ Open │ │ OWM  │ │ CPCB          │ │ Google  │ │ Supabase     │
│ Meteo│ │ 5-day│ │ data.gov.in   │ │ Weather │ │ PostgreSQL + │
│ 9 km │ │ fcst │ │ AQI           │ │ MetNet  │ │ Realtime     │
└──────┘ └──────┘ └───────────────┘ └─────────┘ └──────────────┘
                                                       ▲
                                                       │
                                         ┌─────────────┴─────────────┐
                                         │ Supabase Realtime channel │
                                         │  claims, payouts tables   │
                                         └───────────────────────────┘
```

---

## 11. Database Schema

GRIP operates on 11 Supabase (PostgreSQL) tables. Row Level Security is enabled on every table. Two PostgreSQL extensions are required: `uuid-ossp` for primary-key generation and `pg_trgm` for the trigram similarity index used in ring detection.

### 11.1 `partners`

Master partner record. One row per onboarded delivery partner. Combines profile, policy state, Layer 1 fraud signals, IPQS signals, ring-detection output, enrollment GPS, and last-known GPS.

```sql
CREATE TABLE partners (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name                   TEXT NOT NULL,
  mobile_number               TEXT UNIQUE NOT NULL,
  dob                         DATE,
  gender                      TEXT,
  language                    TEXT DEFAULT 'en',
  city                        TEXT NOT NULL,
  operating_zone              TEXT,
  platform                    TEXT,                          -- 'zomato' or 'swiggy'
  vehicle_type                TEXT,                          -- 'ICE', 'EV', 'Bicycle'
  avg_daily_orders            NUMERIC(5,2),
  avg_daily_hours             NUMERIC(4,2),
  pan_masked                  TEXT,
  aadhaar_last4               TEXT,
  dl_masked                   TEXT,
  rc_masked                   TEXT,
  emergency_contact           TEXT,
  bank_account_id             UUID REFERENCES bank_accounts(id),
  upi_id                      TEXT,

  -- Pricing output from XGBoost
  zone_risk_score             NUMERIC(4,3),                  -- [0.85, 1.50]
  coverage_tier               TEXT,                          -- 'basic', 'standard', 'premium'
  weekly_premium              INTEGER,                       -- rupees
  payout_per_day              INTEGER,                       -- rupees
  weekly_cap                  INTEGER,                       -- rupees

  -- Policy state
  enrolled_since              TIMESTAMPTZ DEFAULT NOW(),
  is_active                   BOOLEAN DEFAULT TRUE,

  -- Layer 1 fraud signals
  zone_lat                    NUMERIC(9,6),
  zone_lng                    NUMERIC(9,6),
  zone_distance_from_city_km  NUMERIC(6,2),
  zone_coordinates_flag       BOOLEAN DEFAULT FALSE,
  registration_ip             TEXT,
  ip_registrations_30d        INTEGER DEFAULT 0,
  identity_duplication_flag   BOOLEAN DEFAULT FALSE,
  enrollment_trigger_count    INTEGER DEFAULT 0,

  -- IPQualityScore signals (migration 003)
  ipqs_fraud_score            INTEGER,
  ipqs_is_vpn                 BOOLEAN DEFAULT FALSE,
  ipqs_is_proxy               BOOLEAN DEFAULT FALSE,
  ipqs_is_tor                 BOOLEAN DEFAULT FALSE,
  ipqs_ip_suspicious          BOOLEAN DEFAULT FALSE,

  -- Ring detection output (migration 003)
  ring_flag                   BOOLEAN DEFAULT FALSE,
  ring_cluster_id             TEXT,
  ring_edge_types             TEXT[],

  -- Enrollment GPS (migration 005)
  enrollment_lat              NUMERIC(9,6),
  enrollment_lng              NUMERIC(9,6),
  enrollment_gps_flag         BOOLEAN DEFAULT FALSE,

  -- Last-known GPS, updated at every login (migration 005)
  last_known_lat              NUMERIC(9,6),
  last_known_lng              NUMERIC(9,6),
  last_known_at               TIMESTAMPTZ,

  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigram index for fuzzy name matching in ring detection
CREATE INDEX idx_partners_full_name_trgm
  ON partners USING gin (full_name gin_trgm_ops);

-- Lookups used by trigger engine and Layer 1
CREATE INDEX idx_partners_city_active
  ON partners (city, is_active);
CREATE INDEX idx_partners_registration_ip
  ON partners (registration_ip);
CREATE INDEX idx_partners_ring_cluster
  ON partners (ring_cluster_id);
```

### 11.2 `policies`

One active row per partner. Premium lifecycle state.

```sql
CREATE TABLE policies (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id              UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  tier                    TEXT NOT NULL,                   -- 'basic', 'standard', 'premium'
  weekly_premium          INTEGER NOT NULL,
  payout_per_day          INTEGER NOT NULL,
  weekly_cap              INTEGER NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'active',  -- 'active', 'paused', 'cancelled'
  activated_at            TIMESTAMPTZ DEFAULT NOW(),
  next_premium_date       DATE,
  last_premium_collected  TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_policies_active_per_partner
  ON policies (partner_id) WHERE status = 'active';
```

### 11.3 `claims`

One row per auto-created claim. Written by `claim_service.py` inside the trigger engine. Carries the three layer flags, the Isolation Forest anomaly score, and the full 12-feature payload for audit.

```sql
CREATE TABLE claims (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id              UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  policy_id               UUID REFERENCES policies(id),
  trigger_event_id        UUID REFERENCES trigger_events(id),
  trigger_type            TEXT NOT NULL,                   -- 'heat', 'rainfall', 'aqi', 'curfew'
  trigger_date            DATE NOT NULL,
  amount                  INTEGER NOT NULL,                -- rupees
  status                  TEXT NOT NULL,                   -- 'approved', 'fraud_review', 'paid', 'rejected'
  auto_approved           BOOLEAN DEFAULT FALSE,

  -- Three-layer fraud flags
  layer1_flag             BOOLEAN DEFAULT FALSE,
  layer2_flag             BOOLEAN DEFAULT FALSE,
  layer3_flag             BOOLEAN DEFAULT FALSE,
  flags_count             INTEGER DEFAULT 0,

  -- Isolation Forest output
  anomaly_score           NUMERIC(6,4),
  confidence_level        TEXT,                            -- 'low', 'medium', 'high'

  -- Computed at claim-time for audit
  claim_latency_seconds   INTEGER,
  days_since_enrollment   INTEGER,
  activity_kl_divergence  NUMERIC(6,4),

  -- Full 12-feature fraud payload (JSONB for audit)
  fraud_features          JSONB,

  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),

  -- Idempotency: one claim per partner per trigger_type per UTC day
  UNIQUE (partner_id, trigger_type, trigger_date)
);

CREATE INDEX idx_claims_partner_created
  ON claims (partner_id, created_at DESC);
CREATE INDEX idx_claims_status
  ON claims (status);
```

### 11.4 `payouts`

One row per approved claim that was settled. The `provider_payout_id` is prefixed `pout_DEMO_` so simulated payouts are unambiguous.

```sql
CREATE TABLE payouts (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id                UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  partner_id              UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  amount                  INTEGER NOT NULL,                -- rupees
  provider_payout_id      TEXT UNIQUE NOT NULL,            -- 'pout_DEMO_XXXXXXXX'
  upi_destination         TEXT,
  status                  TEXT NOT NULL,                   -- 'processed', 'failed', 'pending'
  is_first_payout         BOOLEAN DEFAULT FALSE,
  first_payout_cap_applied BOOLEAN DEFAULT FALSE,          -- Rs 4,000 UPI cooling cap
  settled_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payouts_partner_settled
  ON payouts (partner_id, settled_at DESC);
CREATE INDEX idx_payouts_claim
  ON payouts (claim_id);
```

### 11.5 `trigger_events`

Append-only log of every scheduler poll and admin-fired trigger. Phase 3 adds `zone_level`, `zone_lat`, `zone_lng` (migration 004) and the oracle integrity columns (migration 002).

```sql
CREATE TABLE trigger_events (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city                    TEXT NOT NULL,
  trigger_type            TEXT NOT NULL,                   -- 'heat', 'rainfall', 'aqi', 'curfew'
  raw_value               NUMERIC(8,2),                    -- degrees C / mm / AQI / 0 or 1
  confirmed               BOOLEAN DEFAULT FALSE,           -- after persistence check
  consecutive_days        INTEGER DEFAULT 0,

  -- Oracle integrity (migration 002)
  single_source_breach    BOOLEAN DEFAULT FALSE,
  statistical_outlier     BOOLEAN DEFAULT FALSE,
  percentile              NUMERIC(5,2),                    -- historical percentile 0 to 100
  cpcb_raw_value          NUMERIC(8,2),
  oracle_confirmed        BOOLEAN DEFAULT FALSE,

  -- Zone-level trigger fields (migration 004)
  zone_level              BOOLEAN DEFAULT FALSE,
  zone_lat                NUMERIC(9,6),
  zone_lng                NUMERIC(9,6),

  fired_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trigger_events_city_type_fired
  ON trigger_events (city, trigger_type, fired_at DESC);
CREATE INDEX idx_trigger_events_confirmed
  ON trigger_events (confirmed, fired_at DESC);
```

### 11.6 `curfew_flags`

One row per city. Admin-toggled. The scheduler reads this on every poll.

```sql
CREATE TABLE curfew_flags (
  city                    TEXT PRIMARY KEY,
  is_active               BOOLEAN DEFAULT FALSE,
  set_by                  TEXT,                            -- admin identifier
  set_at                  TIMESTAMPTZ DEFAULT NOW(),
  notes                   TEXT
);

-- Seeded at deployment
INSERT INTO curfew_flags (city, is_active) VALUES
  ('Delhi', FALSE), ('Mumbai', FALSE), ('Bengaluru', FALSE),
  ('Chennai', FALSE), ('Hyderabad', FALSE)
ON CONFLICT (city) DO NOTHING;
```

### 11.7 `kyc_documents`

Masked document metadata. Full numbers are never stored per DPDP Act 2023.

```sql
CREATE TABLE kyc_documents (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id              UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  doc_type                TEXT NOT NULL,                   -- 'pan', 'aadhaar', 'dl', 'rc'
  masked_number           TEXT NOT NULL,                   -- e.g. 'AB***1234F'
  verification_status     TEXT,                            -- 'VERIFIED', 'NAME_MISMATCH', 'INVALID', etc.
  verified_at             TIMESTAMPTZ,
  expiry_date             DATE,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kyc_documents_partner
  ON kyc_documents (partner_id);
```

### 11.8 `bank_accounts`

Masked bank details. `account_number_masked` is `XXXX XXXX {last4}`. Referenced from `partners.bank_account_id`.

```sql
CREATE TABLE bank_accounts (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id              UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  account_holder_name     TEXT NOT NULL,
  account_number_masked   TEXT NOT NULL,                   -- 'XXXX XXXX 1234'
  ifsc_code               TEXT NOT NULL,
  bank_name               TEXT NOT NULL,
  is_primary              BOOLEAN DEFAULT TRUE,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Shared bank account edge used by ring detection
CREATE INDEX idx_bank_accounts_masked_ifsc
  ON bank_accounts (account_number_masked, ifsc_code);
```

### 11.9 `mock_kyc_records`

Seeded lookup table for mock NSDL PAN, Sarathi DL, and Vahan RC verification. Replaces a real government API for the hackathon.

```sql
CREATE TABLE mock_kyc_records (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_type             TEXT NOT NULL,                   -- 'pan', 'dl', 'rc'
  record_number           TEXT NOT NULL,                   -- full PAN/DL/RC
  holder_name             TEXT NOT NULL,
  is_valid                BOOLEAN DEFAULT TRUE,
  expiry_date             DATE,
  registered_city         TEXT,                            -- for RC
  seeded_at               TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (record_type, record_number)
);

CREATE INDEX idx_mock_kyc_lookup
  ON mock_kyc_records (record_type, record_number);
```

### 11.10 `partner_activity_log`

Phase 3 addition (migration 001). 12 rows per partner seeded at registration. Replaces the previous constant-scale `activity_kl_divergence` placeholder with a real per-partner baseline.

```sql
CREATE TABLE partner_activity_log (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id              UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  week_number             INTEGER NOT NULL,                -- 1 to 12, most recent = 12
  orders_count            INTEGER NOT NULL,
  active_hours            NUMERIC(5,2),
  nocturnal_fraction      NUMERIC(4,3),                    -- fraction of orders after 22:00
  cancellation_ratio      NUMERIC(4,3),
  recorded_at             TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (partner_id, week_number)
);

CREATE INDEX idx_partner_activity_partner
  ON partner_activity_log (partner_id, week_number DESC);
```

### 11.11 `model_health`

Phase 3 addition. PSI drift monitor output. `fraud_psi.py` writes to this table when any feature's Population Stability Index crosses 0.25 against the training distribution.

```sql
CREATE TABLE model_health (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_name              TEXT NOT NULL,                   -- 'isolation_forest_v2', 'xgboost_zone_risk'
  feature_name            TEXT NOT NULL,
  psi_value               NUMERIC(6,4),
  drift_detected          BOOLEAN DEFAULT FALSE,
  sample_size             INTEGER,
  baseline_window         TEXT,                            -- e.g. 'training_v2'
  compared_window         TEXT,                            -- e.g. 'last_24h'
  recorded_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_model_health_model_feature_recorded
  ON model_health (model_name, feature_name, recorded_at DESC);
```

### 11.12 Real-time Publications

Real-time publications are enabled on `claims` and `payouts`. The frontend subscribes via the Supabase JS client with a partner-scoped filter (`filter=partner_id=eq.{id}`) so a partner only receives their own events. This is what powers the live claim timeline and notification toast.

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE claims;
ALTER PUBLICATION supabase_realtime ADD TABLE payouts;
```

### 11.13 Migrations

Five ordered SQL files in `supabase/migrations/`:

- `001_partner_activity_log.sql` — creates the 12-week behavioural baseline table.
- `002_trigger_events_percentile.sql` — adds oracle integrity columns on `trigger_events`.
- `003_advanced_fraud_detection.sql` — adds IPQS columns and ring-detection columns on `partners`, enables `pg_trgm`, creates the trigram index.
- `004_zone_level_triggers.sql` — adds `zone_level`, `zone_lat`, `zone_lng` on `trigger_events`.
- `005_gps_location_fields.sql` — adds enrollment and last-known GPS fields on `partners`.

Applied either through the Supabase SQL editor or `supabase db push` via the CLI.

### 11.14 Document Handling Rules

Following the DPDP Act 2023 and Aadhaar regulations:

- Full Aadhaar number is never stored. Only last 4 digits are collected and stored as `XXXX-XXXX-{last4}`.
- Full PAN is never stored. Verified against mock records, then masked as `AB***1234F` before storage.
- Full DL is never stored. Masked as `DL04XXXXX2345` before storage.
- Full bank account number is never stored. Masked as `XXXX XXXX {last4}` before storage.
- All document metadata is stored in `kyc_documents` and linked to the partner by UUID.

---

## 12. Onboarding Pipeline

Six steps, redesigned around Swiggy and Zomato's documented partner flows. Swiggy uses a fully remote 6-step app-driven process. Zomato uses a hybrid 4-step flow with mandatory Asset Centre visits. GRIP's flow mirrors Swiggy's remote model since no physical centre infrastructure exists.

### Step Structure

| Step | Name | Key Fields | Validation |
|---|---|---|---|
| 1 | Personal Details | Name, Mobile, OTP, DOB, Gender, Language, City | OTP verified; geocoding fires; IPQS fires |
| 2 | Identity Verification | Aadhaar last 4, PAN, Selfie placeholder | PAN regex + mock backend verification |
| 3 | Work Profile | Platform, Vehicle type, Zone, Orders, Hours | None blocking |
| 4 | Vehicle Documents | DL number, RC number, Insurance checkbox | Skipped for bicycle; DL + RC verified for motorized |
| 5 | Payment Setup | Bank account, IFSC, UPI ID x 2, Authorization | IFSC auto-verifies on 11-char entry |
| 6 | Coverage Exclusions | 6 exclusions, consent checkbox, GPS capture | Adverse selection gate; enrollment GPS capture |

### Mock KYC Verification Endpoints

Five FastAPI endpoints simulate government verification APIs:

**`POST /kyc/send-otp` and `POST /kyc/verify-otp`.** Simulates the MSG91 or Twilio OTP flow. In submission mode, OTP `1234` always passes. Mobile number must be 10 digits and unique against the `partners` table.

**`POST /kyc/verify-pan`.** Validates PAN against regex `^[A-Z]{5}[0-9]{4}[A-Z]{1}$`, looks up the record in `mock_kyc_records`, and performs a fuzzy first-name match. Returns `VERIFIED`, `NAME_MISMATCH` as a warning, `PAN_INVALID`, or `PAN_NOT_FOUND`. Mirrors Income Tax Department PAN API behaviour.

**`POST /kyc/verify-dl`.** Looks up DL in `mock_kyc_records`, checks `is_valid` and `expiry_date`. Returns `VERIFIED`, `DL_NOT_FOUND`, `DL_INVALID`, or `DL_EXPIRED`. Simulates the Sarathi portal (MoRTH).

**`POST /kyc/verify-rc`.** Looks up RC in `mock_kyc_records`, returns registration validity and registered city. Simulates the Vahan portal (MoRTH).

**`POST /kyc/verify-ifsc`.** Validates IFSC against `^[A-Z]{4}0[A-Z0-9]{6}$`, maps the first 4 characters to a seeded 15-bank name lookup. Auto-triggers on 11-character entry without a button press.

### Conditional Vehicle Document Logic

Bicycle partners on Swiggy are explicitly exempt from DL and RC requirements. The onboarding flow programmatically skips Step 4 if `vehicleType === 'Bicycle'`. The Insurance checkbox is marked required when platform is Zomato (which mandates vehicle insurance for motorized partners) and recommended when platform is Swiggy.

### Phase 3 Additions to Onboarding

- **Google Maps Geocoding at Step 1** populates `zone_lat`, `zone_lng`, `zone_distance_from_city_km`. Distances above 50 km set `zone_coordinates_flag`.
- **IPQualityScore at Step 1.** Registration IP is written along with `ipqs_fraud_score`, `ipqs_is_vpn`, `ipqs_is_proxy`, `ipqs_is_tor`, and `ipqs_ip_suspicious`.
- **Browser Geolocation at Step 6 completion.** If the user grants permission, `enrollment_lat` and `enrollment_lng` are written, and a mismatch above 50 km sets `enrollment_gps_flag`.
- **Adverse selection gate at Step 6.** Before the policy activates, OpenWeatherMap's 5-day forecast is queried for the partner's city. If the modelled breach probability for any trigger exceeds 70 percent within the next 7 days, policy activation is blocked with a clear message. This prevents last-minute enrolment before a known red alert.
- **Ring detection after Layer 1.** The shared-attribute ring detector evaluates the new partner against the existing population and writes `ring_flag`, `ring_cluster_id`, and `ring_edge_types`.
- **Silent GPS capture at login.** Every successful login POSTs the current browser GPS to `/kyc/partners/{id}/last-known-location`, used as the freshest input to `zone_match` at claim time.

---

## 13. Machine Learning Models

### Model 1: XGBoost Zone Risk Scorer

**Purpose.** Produce a `zone_risk_score` in `[0.85, 1.50]` that multiplies the Rs 49 base premium. Enables hyper-local pricing so the same coverage tier costs more in a flood-prone zone than in an elevated, historically safe zone.

**Why XGBoost.** XGBoost handles the mixed categorical and numerical feature space (city, zone, vehicle type alongside continuous hazard counts) without requiring normalisation. It produces consistent predictions on the deterministic formula the training data was generated from and generalises well to unseen zone names via the OrdinalEncoder's `unknown_value = -1` fallback.

**Synthetic training dataset.** 5,000 records across 5 cities. No public dataset correlates historical weather with food-delivery order volumes, and platform data requires NDA. Synthetic data is calibrated against documented IMD and CPCB historical frequency data from 2019 to 2024.

**City hazard priors (measured IMD and CPCB, 2019 to 2024):**

| City | Heat days/yr (Tmax > 43 C) | Rain days/yr (24h > 100 mm) | AQI > 300 days/yr |
|---|---|---|---|
| Delhi | 7.0 | 0.75 | 25.0 |
| Mumbai | 0.0 | 6.0 | 1.0 |
| Bengaluru | 0.0 | 0.3 | 1.5 |
| Chennai | 1.0 | 2.0 | 2.0 |
| Hyderabad | 0.85 | 0.5 | 0.75 |

**Seasonal weather weights.** Heat peaks May to June at weight 1.80. Southwest Monsoon rain peaks July to September at weight 1.80. AQI breach season peaks October to January in Delhi at weight 1.80.

**Zone flood risk multipliers.** Encoded as a standalone additive multiplier in `[1.05, 1.50]`, independent of city weather hazard. This is the critical design decision: the zone component is additive to city hazard, not multiplicative. Without additive separation, Bengaluru's near-zero weather hazard zeroes out the zone component entirely and Mahadevapura scores identically to Indiranagar, which is actuarially wrong.

Selected zone multipliers:

- Yamuna Floodplain (Delhi): 1.50, per GNCTD Flood Control Order 2025
- Mahadevapura (Bengaluru): 1.50, per BBMP/OpenCity urban flood hazard zonation 2024
- Chembur (Mumbai): 1.45, per BMC Eastern Suburbs Resilience Plan 2024-25
- Pallikaranai (Chennai): 1.45, per GCC/ADB 2022
- Banjara Hills (Hyderabad): 1.05, per GHMC DMP 2024

**Feature set (12 features).** `city`, `zone`, `vehicle_type`, `platform`, `season`, `month`, `avg_daily_orders`, `avg_daily_hours`, `effective_heat_days`, `effective_rain_days`, `effective_aqi_days`, `zone_flood_risk`.

**Score formula (deterministic, used to generate labels):**

```
score = 0.85
      + city_hazard_component    (normalised weighted sum of three hazard types)
      + zone_flood_component     ((zone_flood_risk - 1.0) x 0.50)
      + season_risk_modifier     (Monsoon +0.10, Winter +0.07, Pre-monsoon +0.04, Post-monsoon +0.03)
      + vehicle_modifier         (ICE 0.00, EV -0.03, Bicycle -0.05)
      + order_activity_modifier  (>30 orders +0.05, <15 orders -0.05)
      clipped to [0.85, 1.50]
```

Normalisation denominators: heat max 10 days, rain max 10 days, AQI max 30 days. Individual hazard normalised values are clipped to `[0, 1]` before weighting to prevent seasonal amplifiers (max 1.80) from exceeding the normalisation ceiling.

**Training configuration:**

```python
XGBRegressor(
    n_estimators = 200,
    max_depth = 5,
    learning_rate = 0.05,
    subsample = 0.8,
    colsample_bytree = 0.8,
    random_state = 42
)
```

80/20 holdout split. Train MAE 0.0035. Validation MAE 0.0046. Validation RMSE 0.0061.

**Sanity check (Standard tier):**

| City | Zone | Score | Weekly Premium |
|---|---|---|---|
| Bengaluru | Indiranagar | 0.96 | Rs 59 |
| Delhi | Connaught Place | 1.34 | Rs 82 |
| Delhi | Yamuna Floodplain | 1.40 | Rs 86 |
| Mumbai | Chembur | 1.48 | Rs 91 |

Highest-to-lowest zone gap: 0.52. Annual difference at Standard tier: Rs 1,664. Actuarially meaningful differentiation.

**Serving.** Loaded once at FastAPI startup via pickle. Exposed at `POST /ml/premium-quote`. The frontend calls this during onboarding Step 5 and falls back to the rule-based `premiumEngine.js` if the API is unreachable, preserving the flow offline.

### Model 2: Isolation Forest v2 Fraud Detector

**Purpose.** Unsupervised anomaly detection on auto-created parametric claims. Flags claims with unusual feature combinations for manual review and blocks payout. Runs on every auto-created claim before any payout is initiated.

**Why Isolation Forest.** True fraud rate in Indian microinsurance is 0.05 to 0.30 percent per PM-JAY measured data. At this rate a supervised classifier requires millions of records to surface meaningful positive examples. Isolation Forest is unsupervised; it learns the shape of normal behaviour and identifies deviations. This is academically correct for extreme class imbalance, supported by the Edinburgh CRC paper, "Detecting Insurance Fraud with Isolation Forests," 2021.

**Synthetic training dataset.** 100,000 records, 0.5 percent fraud rate (500 fraud, 99,500 legitimate). Fraud rate is scaled up from PM-JAY's true 0.05 to 0.30 percent because at true rates the Isolation Forest requires substantially more records to produce measurable anomaly-score separation in a demo context.

**Twelve features with distribution justifications:**

| Feature | Legitimate | Fraud | Source |
|---|---|---|---|
| `claim_lag_hours` | Lognormal mu=3.5, sigma=0.5 (median 33h) | Lognormal mu=2.2, sigma=0.4 (median 9h) | NICB catastrophe fraud proxy |
| `prior_orders_48h` | Uniform [8, 16] | Uniform [0, 4] | Swiggy SHIELD device-first study |
| `claim_hour` | Bimodal peaks 9-12 and 18-21 | PM/evening peak 18-22, midnight spike | Worldline EU 2022/2024 |
| `prior_claims_30d` | ZINB: 85% zero-inflated, else [1, 2] | Negative Binomial n=2, p=0.4 (mu~3) | Indian health insurance ZINB literature; Madras HC motor ring |
| `device_returning` | 85% True | 100% False | Platform baseline; rings use disposable devices |
| `zone_match` | 95% True | 100% False | GPS-based zone check (Phase 3 real signal) |
| `device_tampered` | 4% True | 65% True | Swiggy Bytes engineering blog; Incognia 2025 |
| `nocturnal_fraction` | Uniform [0.05, 0.25] | Uniform [0.35, 0.80] | Worldline EU 2022/2024 |
| `cancellation_ratio` | Uniform [0.00, 0.12] | Uniform [0.20, 0.60] | Gig platform fraud literature |
| `network_reuse_count` | Uniform int [0, 1] | Uniform int [2, 20] | Madras HC motor ring |
| `fnol_last_trip_delta_hours` | Uniform [0.5, 6.0] | Uniform [12.0, 96.0] | FNOL timing literature |
| `activity_kl_divergence` | Uniform [0.01, 0.15] | Uniform [0.40, 1.20] | Edinburgh CRC IF paper 2021 |

Phase 3 upgrades three features from static placeholders to real computed values:

- **`activity_kl_divergence`** is now a real z-score computed against the partner's seeded 12-week baseline in `partner_activity_log`. KL constants live in `ml_config.py` as named fallbacks.
- **`zone_match`** is now computed from GPS data with the priority hierarchy described in Section 9.
- **`prior_orders_48h`** and **`prior_claims_30d`** are now live COUNT queries from the activity log and claims table, not hardcoded constants.

**Training configuration:**

```python
IsolationForest(
    n_estimators = 200,
    contamination = 0.01,
    max_samples = 256,
    max_features = 0.8,
    random_state = 42,
    n_jobs = -1
)
```

Trained on legitimate records only. Evaluated on a 20,000-record holdout with stratified split.

**Validation results.**

- Precision@Top0.5 percent: **95.0 percent.** 95 of the 100 most anomalous claims are actual fraud records.
- Recall: 1.00. Every fraud record in the holdout appears in the top-K anomaly window.
- Legit median anomaly score: -0.4682.
- Fraud median anomaly score: -0.7094.
- Delta: 0.2413. Clean separation.

**Confidence classification.**

- Score below -0.65: `high` confidence fraud.
- Score between -0.65 and -0.55: `medium`.
- Score above -0.55: `low` confidence anomaly flag.

**Serving.** Loaded at startup. Exposed at `POST /ml/fraud-score`. Called synchronously inside `claim_service.py` for every auto-created claim before payout. Approximately 8 ms per call on a standard development machine.

**PSI drift monitor.** `fraud_psi.py` runs every poll cycle. When a feature's Population Stability Index crosses 0.25 against the training distribution, the event is written to the `model_health` table for admin review. This is the early warning system for distribution shift in production.

---

## 14. Three-Layer Fraud Architecture

### Layer 1: Registration and Identity Integrity

Implemented in `backend/app/services/fraud_layer1.py`. Runs synchronously at Supabase seeding time for each new partner. Failure modes are fail-open: a Google Maps or IPQS outage never blocks registration.

Checks performed:

- **Zone coordinates via Google Maps Geocoding.** If the declared zone is more than 50 km from the city centroid we store, `zone_coordinates_flag` is set.
- **IP duplication.** If more than two active partners have registered from the same public IP in the last 30 days, `identity_duplication_flag` is set.
- **Enrolment timing.** If any confirmed trigger event fired for the partner's city in the past 7 days, `enrollment_trigger_count` is recorded. This is also the raw input to the Layer 3 adverse selection gate.
- **IPQualityScore IP risk scoring.** Returns `fraud_score`, `vpn`, `proxy`, `tor`. If `fraud_score >= 75` or `tor` is true, `ipqs_ip_suspicious` is set. Private IP prefixes short-circuit before the IPQS call.

### Layer 2: Isolation Forest Behavioural Anomaly

The Isolation Forest v2 pipeline described in Section 13. Invoked once per auto-created claim. Writes `anomaly_score`, `layer2_flag`, and `confidence_level` to the claim record. Claims with `layer2_flag` set move to `status = 'fraud_review'` and skip payout.

### Layer 3: Adverse Selection and Oracle Integrity

Implemented in `backend/app/services/fraud_layer3.py`. Two responsibilities.

**Adverse selection gate at enrolment and plan change.** Fetches OpenWeatherMap's 5-day forecast for the partner's city and computes a breach probability per trigger type against our thresholds. If the worst probability exceeds 70 percent within the next 7 days, enrolment or tier upgrade is blocked. Prevents partners from rushing to buy cover immediately before a red-alert day.

**Oracle integrity at trigger evaluation.** Three independent sources are checked for rainfall and heat, all evaluated at the zone centroid:

1. **Open-Meteo ECMWF IFS 9 km.** The primary source with `models=ecmwf_ifs` passed explicitly (without this parameter the default is 25 km and zone-centroid differentiation is meaningless).
2. **Google Maps Weather API (MetNet).** An independent model chain, so two-source agreement is meaningful and not a re-forecast of the same underlying model.
3. **Historical percentile check** against our own `trigger_events` table over the trailing 365 days.

A trigger is `oracle_confirmed` only when the primary source is above threshold and at least two of the three sources agree. The rule degrades to one-of-two if Google Weather is unavailable, and to one-of-one if only the primary responds. For AQI, CPCB is primary and historical percentile is secondary.

### Ring Detection via Shared-Attribute Graph

Implemented in `backend/app/services/ring_detection.py`. We use pure PostgreSQL rather than Neo4j or a GNN. A shared-attribute bipartite graph is built from five edge types:

1. **Shared registration IP within the last 30 days.**
2. **Shared bank account** (IFSC plus last-4 masked number).
3. **Shared UPI VPA local-part on the same handle.** `arjun1@paytm` and `arjun2@paytm` count as a shared handle but not a shared local-part. `arjun@paytm` and `arjun@ybl` count as a shared local-part across PSPs.
4. **Fuzzy full-name match above 0.85 trigram similarity**, computed in Python against the partners table with `pg_trgm` available as an upgrade path.
5. **Shared emergency contact number.**

A partner is flagged `ring_flag = true` when they share at least two distinct edge types with any single other partner. When a ring is detected, all partners in the cluster are updated with a shared `ring_cluster_id` and the complete set of observed `ring_edge_types`. The `ring_flag` becomes part of Layer 1 for every subsequent claim.

This trades recall for defensibility. It will not catch a well-isolated mule that shares zero structured attributes with the rest of the ring. It will catch the patterns documented in the Bengaluru Ola 2020 case (shared device farms, shared SIM procurement, payouts consolidated into a small cluster of accounts) and in the Madras HC 2024 motor-fraud case (shared contact numbers, shared addresses, shared hospital providers).

---

## 15. Parametric Trigger Engine

Implemented in `backend/app/trigger_engine.py`. APScheduler `AsyncIOScheduler` attached to the FastAPI lifespan. Polls every 15 minutes. All evaluations are async.

### Data Sources

**Rainfall and heat, primary.** Open-Meteo `/v1/forecast?models=ecmwf_ifs`. The `models=ecmwf_ifs` parameter is the single most important configuration line in the file. Without it, Open-Meteo defaults to `ecmwf_ifs025` which is 25 km and makes zone-centroid differentiation meaningless. With the 9 km model, partners whose zone centroids fall in different grid cells receive different readings.

**Rainfall and heat, secondary.** Google Maps Weather API `currentConditions:lookup`. Independent from Open-Meteo at the model layer; Google's MetNet is not a re-forecast of ECMWF. Used for two-of-three oracle confirmation.

**Rainfall, Hyderabad tertiary.** TSDPS scrape from `tsdps.telangana.gov.in/livejsp/GHMC.jsp`. Mandal-level (approximately 5 to 10 km) resolution, finer than any global model for that region. When TSDPS is reachable, Hyderabad rainfall evaluation uses the mandal reading nearest to the partner's zone centroid (capped at a 15 km match radius) and falls back to Open-Meteo if the scrape fails or if no mandal is within range.

**AQI.** CPCB via `data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69` with `filters[state]` per city. Returns all monitoring stations in the state. The maximum AQI value across all stations is used; a conservative approach that flags the city if any station breaches the threshold.

**Curfew.** Admin-toggled `curfew_flags` table. `POST /admin/set-curfew?city=X&active=true` sets the flag and the next scheduler poll fires the trigger.

### Zone-Centroid Evaluation Loop

For each polled city:

1. Pull all active partners, grouped by rounded zone centroid at two decimal places (~1 km bucketing). Partners with null zone coordinates fall back to the city centroid.
2. For each unique zone centroid, fetch Open-Meteo rainfall and Open-Meteo heat concurrently with `asyncio.gather`.
3. For Hyderabad, fetch the TSDPS mandal map in parallel and prefer its reading when available.
4. Evaluate rainfall and heat per zone group. Persistence tracking is keyed by `{city}_{lat:.2f}_{lon:.2f}_{trigger_type}` so a zone-level breach does not reset when a neighbouring zone drops below threshold.
5. Evaluate AQI and curfew per city (no zone-level data source exists for those).
6. Run the Layer 3 oracle integrity check. Only `oracle_confirmed` events proceed to claim creation.
7. For each confirmed event, create claims idempotently for every active partner in the affected zone or city, invoke Layer 2 fraud scoring, and emit real-time notifications.

### Admin Demo Endpoints

- `POST /admin/fire-trigger?city=X&trigger_type=Y&override_value=Z` bypasses scheduler and persistence. City-level. Used in the demo video to simulate a disruption without waiting 15 minutes.
- `POST /admin/fire-fraud-claim?city=X&trigger_type=Y&override_value=Z` creates a claim with a deliberately fraud-positive 12-feature payload. Isolation Forest flags it as `fraud_review` and no payout is created. Demonstrates the fraud path alongside a legitimate paid claim.
- `POST /admin/set-curfew?city=X&active=true` toggles the curfew flag.

---

## 16. Claim Lifecycle

On a confirmed trigger:

```
1. Fetch active partners in the affected zone or city (Supabase query)
2. For each partner:
   a. Idempotency check: skip if a claim already exists for (partner_id, trigger_type, UTC-day)
   b. Compute real prior_claims_30d and prior_orders_48h from Supabase
   c. Compute real activity_kl_divergence against the 12-week baseline
   d. Compute real zone_match from last-known GPS, then enrollment GPS flag,
      then Layer 1 zone flag, then default 1
   e. Compute layer1_flag from OR of zone_coordinates_flag,
      identity_duplication_flag, ipqs_ip_suspicious, ring_flag,
      enrollment_trigger_count > 0
   f. Compute layer3_flag from the oracle integrity outcome
      already embedded in the trigger event row
   g. POST payload to /ml/fraud-score -> anomaly_score, layer2_flag, confidence
   h. flags_count = layer1_flag + layer2_flag + layer3_flag
   i. If any flag is set: INSERT claim status='fraud_review', auto_approved=false
                          no payout
   j. Else: INSERT claim status='approved', auto_approved=true
            apply Rs 4,000 cap if first payout
            INSERT payout with pout_DEMO_{random_8_digits} ID
            UPDATE claim status='paid'
3. Supabase real-time publication fires on claims and payouts
4. Partner's claims screen updates without page refresh
5. Notification toast appears with payout ID
```

End-to-end latency from trigger confirmation to `paid` status is under two seconds in a small test pool.

### Payout Simulation

Simulation behaviour in `claim_service.py`:

- Generates a `pout_DEMO_{random_8_digits}` payout ID mimicking the RazorpayX format.
- Writes to `payouts` with `status = 'processed'`, `settled_at = now()`.
- Enforces the Rs 4,000 first-payout cap. This is a real UPI constraint: banks enforce a cooling period for new beneficiaries and deterministically fail payouts above Rs 5,000 to a first-time beneficiary.
- Updates the linked claim to `status = 'paid'`.

The `pout_DEMO_` prefix makes the simulated status unambiguous in every UI and database view.

---

## 17. Partner Dashboard

- **Earnings Protected** card on Home, summing lifetime processed payouts.
- **Active Weekly Coverage** card showing tier, weekly cap, and current week consumption.
- **Zone Risk Indicator** in plain language, rendered as a coloured progress bar from Low to Severe, derived from the same zone risk score that priced the policy.
- **Adverse Selection Warning Banner** that surfaces when the forecast probability of a breach in the partner's city crosses 50 percent within the next 5 days.
- **Claim Timeline** on the claim detail screen, with per-stage timestamps for Trigger Fired, Fraud Check Started, Fraud Check Completed, Payout Initiated, and Payout Settled.
- **Notification Bell** in the bottom navigation with an unread badge that clears on tap.
- **Offline-capable PWA shell** via a service worker that caches the Vite bundle so the partner can at least view their claim history without a network connection.

---

## 18. Admin Dashboard

- **Live Loss Ratio** panel split by city, with 7-day and 30-day windows.
- **Benefit-Cost Ratio** computed as `sum(approved_payouts) / sum(collected_premiums)` across a rolling window. Surfaced with a **Liquidity Reserve Indicator** assuming 20 percent of the current pool is ring-fenced.
- **14-Day Monsoon Stress Test** that re-runs the trigger engine against a synthetic extreme-rainfall scenario for 14 consecutive days and shows the simulated payout pressure on the pool.
- **5-Day Predictive Disruption Calendar** driven by OpenWeatherMap forecasts, heat-mapped per city and trigger type, with cell-level probability values.
- **Fraud Intelligence Panel** with six live cards: fraud flag rate, Layer 1 flag mix, Layer 2 anomaly score distribution, Layer 3 oracle disagreement counter, ring cluster count, IPQS suspicious IP counter.
- **Trigger Feed** tagged with historical percentile so each row can be read as "this is a 97th percentile rainfall event for this city over the last 365 days."
- **Ring Detection Review** table at `GET /admin/ring-detection`, grouped by `ring_cluster_id`, with the full set of observed edge types per partner.
- **Model Health Panel** reading from `model_health` table, showing PSI drift events per feature.

---

## 19. Notification System

The `src/context/NotificationContext.jsx` provider subscribes to Supabase real-time publications on the `claims` and `payouts` tables with a partner-scoped filter. When a row changes for the signed-in partner, the provider:

- Dispatches a toast with green styling for approved claims (including the full `pout_DEMO_` ID) or amber for fraud review.
- Increments an unread badge on the Claims tab in the bottom navigation.
- Persists the unread state in local storage so the badge survives a page refresh.

Toasts auto-dismiss after 5 seconds with an explicit cleanup on component unmount to prevent timer leaks. Tapping the badge clears it via `markAllRead`.

---

## 20. External APIs, Internal Endpoints, and Database

### 20.1 External APIs

Every live third-party integration wired into the Week 6 codebase. All are free-tier or free public endpoints. Failure modes are fail-open where documented in the code.

| Provider | Endpoint | Auth | Plan | Role in GRIP |
|---|---|---|---|---|
| Open-Meteo | `https://api.open-meteo.com/v1/forecast?models=ecmwf_ifs` | None | Free, CC-BY-NC | Primary rainfall and heat reading at zone centroid, 9 km ECMWF IFS grid |
| Google Maps Weather API | `https://weather.googleapis.com/v1/currentConditions:lookup` | Maps Platform key | 10,000 calls/month free, commercial-OK | Secondary oracle source (MetNet) for rainfall and heat at zone centroid |
| TSDPS Telangana | `https://tsdps.telangana.gov.in/livejsp/GHMC.jsp` | None (HTML scrape) | Public portal | Tertiary mandal-level rainfall for Hyderabad, 5 to 10 km resolution |
| OpenWeatherMap Forecast | `https://api.openweathermap.org/data/2.5/forecast` | API key | Free 1,000 calls/day | 5-day forecast for Layer 3 adverse selection gate and the 5-day predictive calendar |
| CPCB AQI via data.gov.in | `https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69` | API key | Free with registration | Hourly AQI per city across all state monitoring stations |
| Google Maps Geocoding | `https://maps.googleapis.com/maps/api/geocode/json` | Maps Platform key | Standard free tier | Zone centroid resolution at onboarding Step 1 (Layer 1) |
| IPQualityScore | `https://ipqualityscore.com/api/json/ip/{key}/{ip}` | Free key in header | 1,000 lookups/month | IP fraud score, VPN, proxy, Tor classification at registration (Layer 1) |
| Supabase REST | Auto-generated per project | Service role key | Self-hosted tier | All backend reads and writes to the Postgres database |
| Supabase Realtime | WebSocket channel `realtime/v1` | Anon key | Self-hosted tier | Live publication feed for `claims` and `payouts` tables, partner-scoped |
| Browser Geolocation API | Native `navigator.geolocation` | User permission | Built-in | Real GPS capture at onboarding completion and every login, feeds `zone_match` |
| Web Push API + Service Worker | Native browser standards | Built-in | Built-in | PWA installability and foreground/background notification routing |
| Vercel (hosting) | Static bundle CDN | Project token | Hobby tier | Frontend hosting with PWA service worker caching |
| Railway (hosting) | Python service runtime | Project token | Hobby tier | FastAPI backend hosting, Nixpacks build with Python 3.12 |

### 20.2 GRIP Internal Endpoints

Every FastAPI route exposed by the Week 6 backend. Interactive OpenAPI docs are served at `/docs`.

| Group | Endpoint | Purpose |
|---|---|---|
| ML | `POST /ml/premium-quote` | XGBoost zone risk score + tier-wise premium calculation, called at onboarding Step 5 |
| ML | `POST /ml/fraud-score` | Isolation Forest anomaly scoring on the 12-feature claim payload |
| KYC | `POST /kyc/send-otp` | Generate and deliver OTP (submission uses fixed demo `1234`) |
| KYC | `POST /kyc/verify-otp` | Verify OTP and mark mobile as verified |
| KYC | `POST /kyc/verify-pan` | PAN regex and mock NSDL lookup against `mock_kyc_records` |
| KYC | `POST /kyc/verify-dl` | DL regex and mock Sarathi lookup |
| KYC | `POST /kyc/verify-rc` | RC regex and mock Vahan lookup |
| KYC | `POST /kyc/verify-ifsc` | IFSC regex and seeded bank-name lookup |
| KYC | `POST /kyc/partners` | Persist the partner record and invoke Layer 1 + ring detection |
| GPS | `POST /kyc/partners/{partner_id}/enrollment-gps` | Store browser GPS at onboarding completion and flag >50 km mismatch |
| GPS | `POST /kyc/partners/{partner_id}/last-known-location` | Store browser GPS at every login for fresh `zone_match` input |
| Admin | `POST /admin/fire-trigger` | Bypass scheduler and confirm a trigger immediately (demo tool) |
| Admin | `POST /admin/fire-fraud-claim` | Create a fraud-positive claim to demonstrate Isolation Forest rejection |
| Admin | `POST /admin/set-curfew` | Toggle the per-city `curfew_flags.is_active` row |
| Admin | `GET /admin/bcr` | Benefit-Cost Ratio and liquidity reserve indicator |
| Admin | `GET /admin/stress-test` | 14-day monsoon stress test output |
| Admin | `GET /admin/forecast-risk` | 5-day predictive disruption calendar data |
| Admin | `GET /admin/ring-detection` | Ring clusters grouped by `ring_cluster_id` with edge-type breakdown |
| Admin | `GET /admin/fraud-intelligence` | Six-card fraud panel aggregates |
| Admin | `GET /admin/model-health` | PSI drift events from the `model_health` table |
| System | `GET /docs` | OpenAPI + Swagger UI |
| System | `GET /health` | Liveness probe |

### 20.3 Supabase Database

Supabase serves three distinct roles in the architecture and all three are actively used.

**Postgres with Row Level Security.** Eleven tables, all with RLS enabled. Frontend reads via the Supabase JS client using the anon key and RLS policies that restrict every partner to their own rows. Backend reads and writes via the Python client using the service role key for trigger-engine and admin operations. Schema listed in full in Section 11.

**Postgres Extensions.** `pg_trgm` for the trigram similarity fallback path in ring detection. `uuid-ossp` for primary-key generation across every table.

**Real-time publications.** Enabled on `claims` and `payouts` so the partner's Claims tab and notification toast update within milliseconds of an INSERT or UPDATE. The frontend subscribes with a `filter=partner_id=eq.{id}` parameter so a partner only receives their own events.

**Migrations.** Five ordered SQL files in `supabase/migrations/`:

- `001_partner_activity_log.sql` adds the 12-week behavioural baseline table.
- `002_trigger_events_percentile.sql` adds oracle integrity columns.
- `003_advanced_fraud_detection.sql` adds IPQS and ring-detection columns on `partners`.
- `004_zone_level_triggers.sql` adds `zone_level`, `zone_lat`, `zone_lng` to `trigger_events`.
- `005_gps_location_fields.sql` adds enrollment and last-known GPS fields to `partners`.

Applied either through the Supabase SQL editor or `supabase db push` via the CLI.

---

## 21. Innovative Methods and Technologies

### Zone-Centroid Parametric Triggering with Open-Meteo 9 km

OpenWeatherMap's free API snaps point queries to city centroids, which collapses the difference between two zones in the same metro 10 km apart. Switching to Open-Meteo with `models=ecmwf_ifs` gives a 9 km ECMWF grid and makes zone-level differentiation real for the first time. Partners in Chembur and Andheri in Mumbai, or Yamuna Floodplain and Connaught Place in Delhi, now receive materially different readings. The approach is explicitly modelled on India's RWBCIS Reference Weather Station methodology for crop insurance, translated into an urban gig context.

### Two-of-Three Oracle Confirmation with Graceful Degradation

Parametric products live or die by trust in their data pipeline. GRIP never fires a rainfall or heat trigger on a single source. Open-Meteo ECMWF IFS is primary, Google Maps Weather API (MetNet) is secondary, and a historical-percentile check against our own trigger-event log is tertiary. When all three are available the rule is two-of-three. When one source is unreachable the rule degrades to one-of-two and then one-of-one, without service interruption. This is drawn from the multi-source quorum recommendations in BIS/FSI-IAIS guidance on parametric oracle security.

### Shared-Attribute Identity Graph in Pure PostgreSQL

Ring detection in Indian gig fraud shows up as shared identity attributes at enrolment, not as claim-time timing bursts. We exploit this. The bipartite graph is built inside Supabase using `pg_trgm`, exact joins on bank and IP columns, and a pure-Python trigram fallback for fuzzy name matching. No Neo4j, no GNN, no extra infrastructure. The design is auditable, cheap to run, and aligned with the five edge types documented in the Bengaluru Ola 2020 and Madras HC 2024 cases.

### Real Browser-Based GPS Zone Match

A web-based parametric product cannot call Google Play Integrity or native GNSS raw APIs. It can, however, ask the browser's Geolocation API for coordinates when the user is actively interacting with the app. GRIP captures GPS at onboarding completion and silently at every login, writes them to the partner record, and computes `zone_match` at claim time by comparing the last-known GPS inside a 24-hour freshness window against the pre-bound zone centroid. This replaces the synthetic `zone_match = 1` placeholder that was in the Phase 2 fraud payload with a signal that is actually grounded in device reporting.

### State-Level Scraping for Genuinely Finer Resolution

Mandal-level rainfall from Telangana's TSDPS portal is parsed directly from `tsdps.telangana.gov.in/livejsp/GHMC.jsp` using `pandas.read_html` and mapped to the nearest pre-registered mandal centroid per partner. For Hyderabad this gives 5 to 10 km resolution, finer than any global free weather API. The fallback path is clean: if the scrape fails or no mandal is within 15 km of the partner's zone centroid, the system reverts to Open-Meteo without any visible disruption.

### Adverse Selection Gate with Real Forecasts

The product cannot allow partners to buy cover 24 hours before a red-alert day. The Layer 3 enrolment gate pulls OWM's 5-day forecast, models the probability of exceeding our thresholds per trigger type, and blocks enrolment or plan upgrades when that probability exceeds 70 percent within the next 7 days. A real actuarial control visible in the code, not a narrative claim.

### 12-Week Behavioural Baseline per Partner

The Isolation Forest `activity_kl_divergence` feature used a constant scale in Phase 2. Phase 3 seeds a 12-week activity log per partner at registration time, and computes the KL divergence as a real z-score against that baseline at claim time. Named constants in `ml_config.py` document the fallback regime so that a newly registered partner's first claim is not unfairly scored against an empty baseline.

### PWA as the Delivery Vehicle

GRIP ships as a Progressive Web App rather than a React Native APK. Zero install friction, one codebase across Android and iOS, service-worker caching for offline resilience, Web Push for payout notifications, and `standalone` display mode so it looks and feels native once added to the home screen. The location, persistence, and notification needs of the product are all served by standard browser APIs.

---

## 22. Evolution Across Phases

### Phase 1, Weeks 1 to 2

Product thesis, persona research, trigger design, fully designed React prototype on mock data. Five-layer adversarial defence stack documented as the aspirational target. Weekly premium model and four parametric trigger definitions finalised.

### Phase 2, Weeks 3 to 4

Two trained ML models served via FastAPI. Live parametric trigger engine polling OWM and CPCB every 15 minutes. Supabase-backed database replacing all mock data across eight tables. Six-step KYC onboarding with mock Sarathi DL, mock Vahan RC, and PAN validation, plus the mandatory coverage exclusions screen. Zero-touch claim lifecycle from trigger confirmation to simulated payout in under two seconds. Real-time claims feed via Supabase publications. Admin dashboard with live loss ratios, trigger heatmap, and fraud detection controls.

### Phase 3, Weeks 5 to 6

- Three-layer fraud architecture (registration integrity, behavioural anomaly, adverse selection and oracle integrity).
- Real browser-based GPS capture at enrolment and every login, replacing synthetic zone-matching.
- IP risk scoring via IPQualityScore.
- Shared-attribute identity graph ring detection in pure PostgreSQL.
- Zone-centroid-based triggering via Open-Meteo ECMWF IFS 9 km, replacing city-level OWM.
- Google Maps Weather API as a second live oracle, enabling two-of-three confirmation.
- TSDPS mandal-level scraper for Hyderabad rainfall.
- Expanded admin dashboard (BCR, liquidity reserve, 14-day monsoon stress test, 5-day predictive disruption calendar, six-card fraud intelligence panel, model health panel).
- Upgraded partner dashboard (earnings-protected total, plain-language zone risk indicator, per-stage claim timeline, adverse selection warning banner).
- Notification system with partner-scoped realtime and unread badge.
- 12-week behavioural baseline replacing the constant-scale KL placeholder.
- PWA platform choice replacing the Phase 1 React Native plan.

---

## 23. Known Limitations

- Payouts are simulated. The `pout_DEMO_` prefix is deliberately unambiguous in every UI and database view.
- `_mock_order_drop()` remains the AND-condition on the order-volume axis. It is named explicitly so replacement with a real Zomato or Swiggy platform API is a single swap.
- The 12-week behavioural baseline is seeded synthetically at registration. Production would replace `partner_activity_log` with a live feed from the platform.
- IP geolocation in India is structurally limited by Jio and Airtel CGNAT routing mobile IPs through a small set of NOC cities regardless of device location. This is why IP is used only as a reputation signal in Layer 1, never as a location signal. GPS from the browser is the location signal.
- Ward-level weather data does not exist through any single free commercial-OK API for all five target cities. Phase 3 extracts the highest-resolution free source per city (Open-Meteo 9 km as floor, TSDPS mandal as ceiling for Hyderabad) and the production upgrade path is documented: IMD DSP commercial licence, KSNDMC MOU for Bengaluru, Mumbai Mesonet MOU via IITM, TSDPS commercial licence for Hyderabad.
- OTP delivery uses a fixed demo code of `1234` throughout the submission to match Phase 2 scope and avoid TRAI DLT registration delay in the final hackathon window.
- Open-Meteo's free tier is CC-BY-NC, strictly non-commercial. Production deployment requires the $29 per month Standard tier for commercial licence.
- The PWA cannot prove hardware-backed device integrity (no Play Integrity). This is replaced by IP reputation, browser GPS, and the identity graph. A native companion app is the correct answer if Play Integrity becomes a regulatory requirement.

---

## 24. Local Deployment

### Prerequisites

- Python 3.12 or newer.
- Node.js 20 or newer and npm.
- A Supabase project with the SQL migrations in `supabase/migrations/` applied in order.
- API keys: OpenWeatherMap (free), data.gov.in (free), IPQualityScore (free 1,000 per month), Google Cloud project with Maps JavaScript API, Geocoding API, and Weather API enabled.

### Clone and Configure

```powershell
git clone <your-fork-url> grip
cd grip
```

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env` with the following keys:

```
SUPABASE_URL=<your Supabase project URL>
SUPABASE_SERVICE_KEY=<Supabase service role key>
OWM_API_KEY=<OpenWeatherMap API key>
CPCB_API_KEY=<data.gov.in API key>
GOOGLE_MAPS_API_KEY=<Google Cloud key with Geocoding and Weather enabled>
IPQS_API_KEY=<IPQualityScore API key>
ML_SERVICE_URL=http://127.0.0.1:8000
```

Apply Supabase migrations in order. Either run them through the Supabase SQL editor or use the Supabase CLI:

```powershell
supabase link --project-ref <your project ref>
supabase db push
```

Run the backend:

```powershell
cd ..
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

OpenAPI docs are served at `http://127.0.0.1:8000/docs`.

### Frontend

```powershell
cd ..
npm install
```

Create `.env.local` at the repo root with:

```
VITE_SUPABASE_URL=<your Supabase project URL>
VITE_SUPABASE_ANON_KEY=<Supabase anon key>
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Run the dev server:

```powershell
npm run dev
```

The frontend will be available at `http://127.0.0.1:5173`. The backend CORS policy whitelists both `localhost` and `127.0.0.1` on ports 5173 and 4173.

### Seed Demo Partners

Demo credentials for onboarding (OTP is `1234`):

| Name | Mobile | PAN | DL | RC | DOB | City |
|---|---|---|---|---|---|---|
| Rishi Verma | 9000000001 | RISHI1234P | DL0520180034521 | DL5SBJ7823 | 1999-03-12 | Mumbai |
| Uday Chandra | 9000000002 | UDAYC5678Q | KA0320210087654 | KA03MN4521 | 2001-08-25 | Bengaluru |
| Meera Krishnan | 9000000003 | MEERK4321M | TN0420190056789 | TN04PQ8834 | 1996-06-18 | Chennai |
| Arjun Sharma | 9000000004 | ABCDE1234F | DL0420110012345 | DL4CAB1234 | 1998-04-15 | Delhi |

IFSC test code: `SBIN0001234` maps to State Bank of India.

### Simulate a Disruption

Fire a rainfall trigger for Mumbai (this bypasses the 15-minute scheduler):

```powershell
curl -X POST "http://127.0.0.1:8000/admin/fire-trigger?city=Mumbai&trigger_type=rainfall&override_value=120"
```

Fire a fraud claim to see the Isolation Forest path:

```powershell
curl -X POST "http://127.0.0.1:8000/admin/fire-fraud-claim?city=Bengaluru&trigger_type=heat&override_value=44"
```

Toggle curfew on Delhi:

```powershell
curl -X POST "http://127.0.0.1:8000/admin/set-curfew?city=Delhi&active=true"
```

### Build for Production

```powershell
npm run build
```

The built assets land in `dist/` and can be served from any static host. The repo includes `nixpacks.toml` and `railway.json` for deploying the backend on Railway as a FastAPI service with Nixpacks pinned to Python 3.12.

### Verifying the Full Stack

After both frontend and backend are running:

1. Open `http://127.0.0.1:5173` in Android Chrome DevTools mobile emulation at 390 px.
2. Complete onboarding for a demo partner. Watch the backend logs for `[Layer1]`, `[RingDetection]`, and `[Layer1/IPQS]` lines confirming the fraud pipeline fires.
3. Grant location permission when prompted and confirm `enrollment_lat` populates on the partner row in Supabase.
4. Fire a trigger via the admin endpoint and watch the partner's Claims tab update in real time.
5. Check the admin dashboard BCR, stress test, and predictive calendar render live numbers from Supabase.

---

## 25. Team

Team Exogeneous, Guidewire DEVTrails 2026.