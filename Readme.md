# GRIP: Gig Risk Income Protection

> Parametric Income Insurance for India's Food Delivery Partners

> **Hackathon prototype - Guidewire DEVTrails 2026, Phase 1 submission.** All payout flows, UPI disbursements, fraud detection layers, and platform integrations described in this document are architected and demonstrated in simulation. Specific items not yet active and pending commercial partnerships include: live earnings-settlement premium deductions, real-time order volume data from Zomato/Swiggy, Airtel IoT Locate network triangulation, and Razorpay bulk payout production mode. The RBI Innovation Hub DPIP integration is a planned architectural direction, not a built or contracted capability. Research findings, trigger calibration methodology, fraud defense architecture, and the Evidence Locker design are original work completed during this hackathon.

Delivery partners spend 10 hours a day gripping a handlebar, navigating rain, heat, and smog to keep India's cities fed. GRIP is built around that reality: a parametric income protection system that pays out automatically when the conditions they work in make it impossible to earn. When the weather stops them working, we make sure they still get paid.

---

## The Problem

On August 15, 2025, Mumbai received 300mm of rainfall in under 24 hours. Zomato and Swiggy halted deliveries across Chembur, Parel, Andheri, Wadala, and Thane for five consecutive days ([Economic Times, August 2025](https://m.economictimes.com/tech/technology/heavy-rains-flooding-disrupt-delivery-business-in-mumbai/articleshow/123391592.cms)). For the average Swiggy or Zomato partner earning a weekly net income of Rs 4,100 to Rs 5,500 ([MoneyControl, 2024](https://www.moneycontrol.com/news/business/startup/how-much-do-delivery-partners-actually-earn-a-look-inside-the-pay-model-for-gig-workers-on-zomato-swiggy-13756512.html)), that week simply did not exist. No orders. No income. No safety net.

This was not a freak event. Delhi NCR saw a historic monsoon deluge on July 8-10, 2023, forcing both platforms to suspend large delivery clusters ([Economic Times, July 2023](https://m.economictimes.com/industry/services/hotels-/-restaurants/online-deliveries-in-deep-water-after-heavy-rains-as-monsoon-lashes-northern-india/articleshow/101650803.cms)). Bengaluru's Sarjapur Road, Bellandur, and Whitefield came to a standstill on September 6-7, 2022 ([The News Minute, September 2022](https://www.thenewsminute.com/karnataka/bengaluru-rains-delivery-workers-face-difficulties-e-commerce-shipments-delayed-167643)). Gurugram's NH8 corridor flooded again on September 1, 2025 ([Moneycontrol, September 2025](https://www.moneycontrol.com/news/business/startup/swiggy-zomato-temporarily-halt-food-delivery-services-in-parts-of-delhi-ncr-amid-heavy-rains-13509494.html)). The pattern repeats every monsoon season, every summer heatwave, every Delhi smog cycle, and every time it does, India's delivery partners absorb the full financial hit alone.

The existing insurance coverage these workers receive from their platforms does not address this risk at all. Swiggy provides group accident and medical cover tied to weekly performance rankings ([Swiggy Diaries](https://blog.swiggy.com/press-release/how-delivery-partner-insurance-works-at-swiggy/)). Zomato spent over Rs 100 crore on partner insurance premiums in 2025, but that coverage is for accidents and illness and pays out only after 10 days of inability to work ([Times of India, March 2026](https://timesofindia.indiatimes.com/business/india-business/zomato-delivery-partner-earnings-rose-10-9-in-2025-founder-deepinder-goyal-bats-for-gig-model-flexibility/articleshow/126319253.cms)). Neither platform has any mechanism for the most common disruption their partners actually face: a Tuesday when it rains too hard to go outside.

Only 14% of gig workers in India currently hold any form of insurance ([Dvara Research, 2023, cited in The Actuary India](https://www.theactuaryindia.org/article/insuring-the-invisibles)). The reasons are straightforward: liquidity constraints, product complexity, and a deep-seated distrust of systems that never paid out when they should have. We cover income loss only. Vehicle repairs, health, life, and accident coverage are explicitly out of scope because those risks are already addressed, however imperfectly, by existing platform covers.

---

## Persona

Meet Arjun. He is 26 years old, from Bareilly, and moved to Delhi three years ago to earn more than his home district could offer. He delivers for Zomato on a petrol two-wheeler he bought on a two-year EMI. He works 10-12 hours a day, six days a week, completing 25-35 orders on a good day. His gross monthly income is around Rs 22,000-25,000 ([MoneyControl, 2024](https://www.moneycontrol.com/news/business/startup/how-much-do-delivery-partners-actually-earn-a-look-inside-the-pay-model-for-gig-workers-on-zomato-swiggy-13756512.html)). After fuel, maintenance, and phone recharges, his weekly net income lands between Rs 4,100 and Rs 5,500. His fixed obligations every month are Rs 4,200 in rent for a shared room in Dwarka, Rs 1,800 in EMI for the bike, Rs 800 sent home to his mother, and roughly Rs 3,000 in food and daily expenses. That is Rs 9,800 in committed outgoings every month. The margin between what he earns and what he owes is thin enough that a single disrupted week does not create inconvenience. It creates a deficit. He has no savings beyond two weeks of income.

Arjun has heard of insurance. He remembers his father buying a policy from an agent in Bareilly that never paid out when they needed it. He does not trust agents. He has never downloaded an insurance app because he does not understand what it covers or whether it will actually work when something goes wrong. He pays for things he can see and feel. UPI he trusts completely because it has never lied to him.

Between October and January, Delhi's AQI crosses 300 and sometimes reaches 400 for days at a stretch. On those days Arjun makes a calculation: if he rides in this air for ten hours, his chest will hurt for a week. So he stays home. His income that week drops to Rs 1,500 or less. He skips sending money home. He borrows Rs 500 from a friend for groceries. His EMI does not care about the air quality index.

When the monsoon comes in July, it is worse. He once got caught in a downpour near Connaught Place and his phone stopped working. He lost two hours of income waiting it out under a flyover. On the days Zomato sends a notification saying deliveries are suspended in his zone, he sits in his room watching his earnings counter stay at zero.

Arjun does not need a complex financial product. He needs a system that notices when his city makes it impossible for him to work, and puts money in his account before he has to make that call home to explain why the transfer is not coming this week.

That is the only problem GRIP is trying to solve. Everything else is secondary.

**Why Arjun has never bought insurance and what GRIP does differently:**

He has never bought insurance because every product he has seen requires him to pay upfront, wait months to understand if he qualifies, and then file paperwork after something goes wrong. The timing is wrong, the process is opaque, and the language is not his. GRIP deducts the premium automatically from his weekly Zomato earnings settlement before he even sees the money, so the decision never requires active effort. The payout arrives without him filing anything. The notification is in Hindi. The amount is specific and predictable. For the first time, the product is structured around how he actually lives, not around how an insurance company prefers to operate.

---

## Partner Onboarding and Application Workflow

The onboarding flow is designed to take under three minutes and require no prior insurance knowledge.

**Step 1 - Download and registration:** The partner downloads the GRIP app and registers using their Zomato or Swiggy partner ID. This links their account to their active delivery zone automatically.

**Step 2 - KYC:** Identity verification uses Aadhaar-based video KYC via Signzy, which supports nine Indian languages on connections as low as 75 kbps and achieves a 96% call conversion rate. The partner does not need to visit a branch or upload documents manually.

**Step 3 - Coverage selection:** The partner selects a coverage tier - Basic, Standard, or Premium. The app displays the weekly premium for their specific zone, calculated by the XGBoost model, and the payout they would receive per disruption day. No insurance jargon. The screen shows one number in, one number out.

**Step 4 - Premium deduction:** The weekly premium is designed to auto-deduct from the partner's earnings settlement on the platform *(simulated in prototype; requires platform partnership in production)*. No separate payment action is ever required.

**Step 5 - Coverage active:** From the next earnings cycle, the partner is covered. If a trigger fires in their zone, the payout reaches their UPI account without any further interaction. The app sends a push notification in their preferred language stating the trigger reason, disruption days covered, and the amount paid.

---

## Scenario Walkthroughs

> *The following scenarios describe the intended system behaviour demonstrated in simulation. Payouts, trigger confirmations, and order volume cross-validation are mocked in the prototype.*

### Scenario 1: The AQI Winter (Delhi, November)

Delhi's CPCB-monitored AQI crosses 300 on November 12 and stays there for three consecutive days. GRIP's trigger engine, pulling from the [CPCB real-time AQI API](https://www.data.gov.in/resource/real-time-air-quality-index-various-locations), detects the breach. After the threshold persists through day 2, the persistence check is satisfied. The composite trigger then confirms that platform order volume in Arjun's zone has dropped 35% versus his three-month rolling median. Both conditions are met. An automated payout of Rs 400 per disruption day is initiated retroactively for all confirmed disruption days including day 1. Arjun receives Rs 1,200 covering three days. The payout hits his UPI ID within minutes of trigger confirmation. His rent is safe this week.

### Scenario 2: The Monsoon Halt (Mumbai, July)

The Santacruz [IMD weather station](https://city.imd.gov.in/citywx/city_weather_test_try_warnings.php?id=43003) (Station ID: 43003) records 118mm of rainfall in a 24-hour window on July 9. The threshold is 100mm. Swiggy and Zomato both suspend delivery operations in Chembur and Andheri. The trigger fires automatically. No action is required from the partner. Payout is processed.

### Scenario 3: The Summer Heatwave (Delhi, May)

The [Safdarjung IMD station](https://city.imd.gov.in/citywx/city_weather_test_try_warnings.php?id=42182) (Station ID: 42182) records a daily maximum of 44.1°C for two consecutive days. The heatwave trigger activates. Partners registered in the Delhi zone receive their weekly disruption payout. The entire process from data ingestion to UPI credit targets under 15 minutes, benchmarked against [Cashfree Payouts P99 completion data](https://www.cashfree.com/docs/payments/online/webhooks/webhook-indempotency).

---

## Weekly Premium Model

Food delivery partners operate on a weekly earnings cycle. Imposing a monthly or annual premium on a worker who gets paid weekly creates immediate liquidity friction, and liquidity friction is the single biggest driver of insurance non-renewal in the Indian microinsurance market ([ICMIF Foundation India diagnostic report, 2021](https://icmiffoundation.org/wp-content/uploads/2021/06/India-diagnostic-complete-report.pdf)).

GRIP's premium structure is entirely weekly. The base premium is Rs 49 per week, which is below the Rs 83 weekly acceptance threshold established by Dvara Research field studies in 2023 ([The Actuary India](https://www.theactuaryindia.org/article/insuring-the-invisibles)). The actual weekly premium charged to each partner is dynamically adjusted based on their operating zone and historical disruption frequency.

**Premium Formula:**

```
Weekly Premium = Base Premium (Rs 49)
               x Zone Risk Multiplier (0.85 to 1.50)
               x Coverage Tier Multiplier (1.0 / 1.25 / 1.50)
```

Zone Risk Multiplier reflects hyper-local disruption history. A partner operating in Bengaluru's Sarjapur Road corridor, a [documented flood zone](https://www.thenewsminute.com/karnataka/bengaluru-rains-delivery-workers-face-difficulties-e-commerce-shipments-delayed-167643), carries a higher multiplier than one operating in an elevated, historically dry zone. A partner in Delhi's central zones carries a higher AQI-season multiplier than one in Noida's outer sectors.

Coverage tiers are structured as follows:

- **Basic (1x multiplier):** Rs 300 per disruption day, capped at Rs 900 per week
- **Standard (1.25x multiplier):** Rs 400 per disruption day, capped at Rs 1,200 per week
- **Premium (1.50x multiplier):** Rs 500 per disruption day, capped at Rs 1,500 per week

**Critical UX design decision:** Premiums are not collected as a separate payment. They are auto-deducted from the partner's weekly earnings settlement on the platform *(simulated in prototype; requires platform partnership in production)*. This single design choice is the difference between 14% uptake and significantly higher adoption. A landmark Randomized Controlled Trial in Kenya demonstrated that aligning premium collection with income timing increased insurance take-up from 5% to 72%, whereas a 30% price discount had zero statistically significant effect ([Casaburi and Willis, American Economic Review, 2020](https://haushofer.ne.su.se/ec2303/Lecture%204%20-%20Agriculture%20&%20Risk/Non-required%20papers/Casaburi_Willis_AER_2020.pdf)). VimoSEWA confirmed this independently: when premiums were linked to Fixed Deposits, renewal hit 100% compared to 22-41% under voluntary payment schemes ([ICMIF Foundation India diagnostic report, 2021](https://icmiffoundation.org/wp-content/uploads/2021/06/India-diagnostic-complete-report.pdf)).

---

## Parametric Triggers

We define three primary trigger categories for the initial product. All triggers use measured, not estimated, data. IMD's gridded data is flagged as estimated and does not independently trigger payouts. Only station-level measurements qualify. This distinction is critical for regulatory defensibility and payout integrity.

### Trigger 1: Extreme Heat

**Data source:** Official IMD city meteorological stations. [Safdarjung (42182)](https://city.imd.gov.in/citywx/city_weather_test_try_warnings.php?id=42182) for Delhi. [Santacruz (43003)](https://city.imd.gov.in/citywx/city_weather_test_try_warnings.php?id=43003) and Colaba (43057) for Mumbai.

**Threshold:** Daily maximum temperature exceeding 43°C for two or more consecutive days.

**Basis risk safeguard:** Co-trigger requires a greater than 30% drop in platform order volume in the affected zone, compared to the partner's 90-day rolling median. Both the environmental threshold and the order volume drop must be confirmed simultaneously before a payout is initiated.

**Payout:** Rs 300-500 per disruption day depending on coverage tier.

**Calibration note:** SEWA's first-year parametric heat product used a threshold of 43.2°C for seven consecutive days and achieved a 0% loss ratio in year one because the trigger never fired ([SEWA Insurance report, December 2025](https://www.sewainsurance.org/wp-content/uploads/2025/12/Parametric-Heat-and-Rainfall-Insurance-for-Informal-Women-Workers.pdf)). Workers paid premiums and received nothing. Trust collapsed. We deliberately use a lower two-day persistence threshold to ensure the product activates with meaningful frequency, targeting four to six trigger events per city per season. A product that never pays out is not insurance. It is a subscription fee.

### Trigger 2: Heavy Rainfall and Flooding

**Data source:** IMD 24-hour rainfall totals, measured from 08:30 IST to 08:30 IST the following day. Station-first rule applies throughout ([IMD gridded rainfall documentation](https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_25_Bin.html)).

**Threshold:** Greater than 100mm of rainfall in any 24-hour period. This is consistent with IMD's own classification of extremely heavy rainfall and matches the rainfall levels documented across the platform suspension events of 2022-2025 ([Economic Times, August 2025](https://m.economictimes.com/tech/technology/heavy-rains-flooding-disrupt-delivery-business-in-mumbai/articleshow/123391592.cms); [Moneycontrol, September 2025](https://www.moneycontrol.com/news/business/startup/swiggy-zomato-temporarily-halt-food-delivery-services-in-parts-of-delhi-ncr-amid-heavy-rains-13509494.html)).

**Geo-fencing:** Payouts are zone-specific, not city-wide. Documented high-risk microzones including Mumbai's Chembur, Andheri, Parel, and Wadala, and Bengaluru's ORR corridor, Bellandur, and Varthur carry higher multipliers and trigger independently from the broader city index ([Economic Times, August 2025](https://m.economictimes.com/tech/technology/heavy-rains-flooding-disrupt-delivery-business-in-mumbai/articleshow/123391592.cms); [The News Minute, September 2022](https://www.thenewsminute.com/karnataka/bengaluru-rains-delivery-workers-face-difficulties-e-commerce-shipments-delayed-167643)).

**Payout:** Rs 300-500 per disruption day.

### Trigger 3: Severe Air Quality (AQI)

**Data source:** CPCB real-time city AQI index, available via the [Open Government Data portal](https://www.data.gov.in/resource/real-time-air-quality-index-various-locations).

**Threshold:** AQI exceeding 300 (Severe category under CPCB classification) for two or more consecutive days.

**Go Digit benchmark:** Go Digit's live parametric wage-loss pilot for Delhi-NCR migrant workers, run in partnership with K.M. Dastur and Jan Sahas, uses AQI above 400 for 3 out of 5 days as the trigger and pays up to Rs 6,000 ([IBS Intelligence, 2024](https://ibsintelligence.com/ibsi-news/digit-insurance-kmd-launch-parametric-cover-for-delhi-ncr-migrant-workers/)). Our threshold of AQI 300 is intentionally more sensitive to activate coverage during the broader severe pollution window, not only at the extreme end.

**Primary target city and season:** Delhi NCR, October through January. This is the highest-frequency, most data-rich use case for AQI-triggered income loss in India.

### Trigger 4: Social Disruption (Curfew and Zone Closure)

**Data source:** Official platform zone suspension notification combined with zone-level order volume data *(order volume cross-validation simulated in prototype; requires platform data partnership in production)*.

**Threshold:** Confirmed platform suspension in the affected zone AND greater than 60% drop in order volume versus the 90-day zone median within the same window.

**Distinction from Triggers 1-3:** For environmental triggers, the order volume drop is a secondary confirmation signal. For Trigger 4, the platform suspension itself is the primary signal. A curfew or zone closure does not need an environmental reading to validate it - the operational shutdown is the disruption.

**Payout:** Rs 400-600 per disruption day depending on coverage tier. Higher base rate reflects the binary, total-loss nature of a zone suspension versus a partial environmental slowdown.

---

## Platform Choice: Mobile Application (Android-First, iOS on Roadmap)

GRIP is built as a mobile-first application using React Native, with a separate React web interface for the insurer admin dashboard.

Delivery partners spend 6-8 hours a day inside the Zomato and Swiggy mobile apps. They are entirely comfortable with the install, notification, and in-app payment patterns of a native mobile experience. A mobile app gives us reliable access to GPS and sensor data for fraud detection, persistent push notifications for payout alerts, and a familiar interface that requires no behavioural change from the target user. These are product requirements, not preferences.

**Why Android first:** Android accounts for the overwhelming majority of devices used by food delivery partners in India. Budget Android handsets are the standard across the delivery partner demographic. Zomato and Swiggy both treat Android as their primary partner app platform for the same reason. Launching on Android first is a deliberate prioritisation of the actual user base, not a limitation of the technology.

**Why React Native:** React Native compiles a single JavaScript codebase into a native Android APK and a native iOS IPA separately. The core product logic, UI, API integrations, ML model calls, and fraud detection layer are written once and run on both platforms. The only platform-specific differences are push notification backends (Firebase Cloud Messaging for Android, Apple Push Notification Service for iOS) and build environments. React Native libraries abstract both of these away, meaning the codebase remains unified throughout. There is no stack change between Android and iOS builds.

**iOS:** iOS support is on the Phase 3 roadmap. The technical groundwork is already in place by virtue of using React Native. No architectural changes are required to ship an iOS build. The decision to sequence Android before iOS is purely one of market prioritisation for the launch segment, not technical constraint.

The IAMAI-Kantar 2023 study found that 57% of mobile internet users in India prefer content in Indic languages ([IAMAI-Kantar Internet in India 2023](https://www.mediainfoline.com/article/internet-in-india-2023-report-by-iamai-and-kantar)). The partner-facing app launches in Hindi and English, with Tamil, Telugu, and Kannada added in Phase 3. KYC onboarding uses Aadhaar-based video KYC via Signzy, which achieves a 96% call conversion rate and supports nine Indian languages on connections as low as 75 kbps ([Signzy](https://www.signzy.com/blogs/bringing-kyc-to-every-corner-of-india-with-rbi-video-kyc-security-and-more)).

---

## AI and ML Integration Plan

### Dynamic Premium Calculation

The premium engine uses a gradient boosting model (XGBoost) trained on the following features:

- Partner's operating zone (geo-encoded)
- City and zone historical disruption frequency, derived from IMD and CPCB data using the station-first counting protocol across official stations: Safdarjung (Delhi), Santacruz and Colaba (Mumbai), [Nungambakkam (Chennai, Station ID 43278)](https://city.imd.gov.in/citywx/city_weather_test_try_aans.php?id=43278), and [Begumpet (Hyderabad, Station ID 43128)](https://city.imd.gov.in/citywx/city_weather_test_try_warnings.php?id=43128)
- Seasonal risk window (pre-monsoon, monsoon, post-monsoon, winter)
- Partner activity profile (average weekly orders, average active hours, vehicle type: EV vs ICE)
- Zone-level order volume volatility (standard deviation of weekly order counts over trailing 12 weeks)

At launch, this model is trained on historical IMD and CPCB disruption data for Delhi and Mumbai. It is retrained continuously as live platform telemetry data is ingested, following the [CloudEvents 1.0 JSON envelope format](https://github.com/cloudevents/spec/blob/main/cloudevents/formats/cloudevents.json) for schema compliance.

The model outputs a Zone Risk Score between 0.85 and 1.50. This score multiplies against the Rs 49 base premium to produce the partner's personalised weekly premium. A new partner with no personal history defaults to the city-zone population median score until four weeks of activity data are accumulated, at which point the model switches to their personal profile.

### Trigger-to-Payout Flow

> *Steps marked* **[simulated]** *are mocked in the Phase 1 prototype.*

**Step 1 - Oracle Ingestion (every 15 minutes)**

The Trigger Engine polls IMD, CPCB, and OpenWeatherMap simultaneously. Each reading is tagged with a measured-vs-estimated flag and station ID. A breach requires at least two of three sources to confirm before proceeding.

**Step 2 - Persistence and Order Volume Check [simulated]**

The engine verifies the threshold has held for the minimum consecutive period (two days for heat and AQI, one 24-hour window for rainfall), then cross-validates against zone-level order volume. If volume has not dropped more than 30% versus the 90-day median, the trigger is held and logged as a near-miss.

**Step 3 - Fraud Scoring and Partner Identification [architected; partially implemented]**

Eligible partners in the affected zone are identified. Each generates a payout intent with a unique idempotency key. The Isolation Forest model scores each intent against attestation verdict, location consistency, GNSS signal quality, temporal burst position, and device graph membership before any payout is released.

**Step 4 - Payout and Evidence Logging [Razorpay sandbox]**

Clean intents are submitted to Razorpay sandbox. First-time beneficiaries are capped at Rs 4,000 per the UPI cooling period constraint. On confirmation, the partner receives a push notification in their preferred language and the Evidence Locker writes a BSA 2023 Section 63 compliant SHA-256 certificate for the event. Target latency from trigger confirmation to UPI credit: under 15 minutes.

---

## Technical Architecture

```mermaid
flowchart TD
    subgraph PARTNER["Partner Layer"]
        APP["React Native App\nAndroid APK / iOS IPA"]
        KYC["Aadhaar Video KYC\nSignzy - 96% conversion"]
    end

    subgraph BACKEND["Backend - FastAPI on AWS t4g.micro"]
        API["REST API Gateway"]
        TRIGGER["Trigger Engine\nQuorum Rules + Persistence Check"]
        ML["XGBoost Premium Engine\nZone Risk Score 0.85 to 1.50"]
        FRAUD["Fraud Scoring\nIsolation Forest + Attestation"]
        PAYOUT["Payout Orchestrator\nIdempotency + Retry Logic"]
        EVIDENCE["Evidence Locker\nBSA 2023 SHA-256 Certificates"]
    end

    subgraph DATA["Data Sources"]
        IMD["IMD Station API\nTemperature + Rainfall"]
        CPCB["CPCB AQI API\ndata.gov.in"]
        OWM["OpenWeatherMap\nCross-validation"]
        PLATFORM["Platform Order API\nZone Volume Signals (simulated)"]
        AIRTEL["Airtel IoT Locate\nPlanned partnership"]
    end

    subgraph PAYMENTS["Payment Layer"]
        RAZORPAY["Razorpay Bulk Payouts\nSandbox mode"]
        UPI["UPI Credit\nTarget under 15 min"]
    end

    subgraph ADMIN["Admin Layer"]
        DASHBOARD["React Web Dashboard\nLoss Ratios + Trigger Heatmap"]
        HITL["Human Review Queue\n24hr SLA"]
    end

    subgraph DB["PostgreSQL"]
        POLICIES["Policies + Partners"]
        EVENTS["Trigger Event Log\nMeasured vs Estimated Flag"]
        PAYOUTS_DB["Payout Ledger\nReconciliation"]
    end

    APP -->|"Claim submission\nPlay Integrity Token"| API
    KYC --> APP
    API --> TRIGGER
    API --> ML
    API --> FRAUD

    IMD -->|"Every 15 min"| TRIGGER
    CPCB -->|"Every 15 min"| TRIGGER
    OWM -->|"Cross-validation"| TRIGGER
    PLATFORM -->|"Order volume delta"| TRIGGER
    AIRTEL -->|"Network location check (planned)"| FRAUD

    TRIGGER -->|"Quorum confirmed"| FRAUD
    ML -->|"Zone Risk Score"| API
    FRAUD -->|"Score below threshold"| PAYOUT
    FRAUD -->|"Score above threshold"| HITL

    PAYOUT --> RAZORPAY
    RAZORPAY --> UPI
    PAYOUT --> EVIDENCE

    TRIGGER --> EVENTS
    PAYOUT --> PAYOUTS_DB
    API --> POLICIES

    DASHBOARD --> EVENTS
    DASHBOARD --> PAYOUTS_DB
    HITL --> FRAUD
```

**Backend:** FastAPI (Python). Chosen for async support, automatic OpenAPI documentation, and the ability to serve the ML model as an API endpoint without a separate inference server. Deployed on [AWS t4g.micro](https://aws.amazon.com/ec2/instance-types/t4/) with 20GB gp3 EBS storage at approximately $9-10 per month (ap-south-1 region).

**Frontend (Partner App):** React Native. A single codebase compiles to native Android (APK/AAB) for the launch build and native iOS (IPA) for Phase 3. The app is mobile-first, vernacular-first, and optimised for budget devices with intermittent connectivity.

**Frontend (Admin Dashboard):** React web, desktop-first, with charts and a city-zone disruption heatmap for insurer analytics.

**Database:** PostgreSQL. Stores partner profiles, policy records, trigger events, payout history, and the full audit trail for every data point that contributed to a trigger decision.

**Payments:** Razorpay sandbox for all payouts during the hackathon ([Razorpay bulk payouts documentation](https://razorpay.com/docs/x/bulk-payouts/)). First-time payouts hard-capped at Rs 4,000 per the UPI cooling period constraint.
---

## Product Roadmap

**Phase 2 (Weeks 3–4): Automation and Protection**

Partner registration and onboarding flow, live policy creation with dynamic weekly premium calculation from the XGBoost model, claims management UI, and 3–5 automated parametric triggers connected to public APIs and mocks. Zero-touch claim experience - no action required from the partner once a trigger fires.

**Phase 3 (Weeks 5–6): Scale and Optimise**

Full fraud detection layer (GPS spoofing detection via sensor fusion, Isolation Forest anomaly model, device graph clustering), mock UPI payouts via Razorpay sandbox demonstrating sub-15-minute payout from trigger to credit, partner dashboard (active coverage, payout history, disruption alerts), and insurer admin dashboard (loss ratios, trigger heatmap, 7-day predictive disruption calendar). iOS build ships from the existing React Native codebase.

---

## Adversarial Defense and Anti-Spoofing Strategy

A parametric insurance platform faces a structurally different fraud threat than a traditional indemnity product. Because payouts are triggered by environmental data rather than individual proof of loss, a coordinated syndicate does not need to fake an accident or a hospital bill. They only need to fake a location.

The documented precedent is precise. In 2020, a four-person syndicate in Bengaluru used mock GPS applications, cycling through approximately 500 SIM cards to drain Ola's commission system before the Central Crime Branch made arrests ([The News Minute, 2020](https://www.thenewsminute.com/atom/four-ola-drivers-bengaluru-cheat-firm-lakhs-rupees-using-fake-location-tech-126392)). Indian fraud rings operating via Telegram move stolen funds through 10-15 UPI hops within minutes of collection, with a documented 2-4 hour recovery window ([Group-IB Classiscam Report, 2023](https://www.group-ib.com/blog/classiscam-2023/)). GRIP's defense architecture is built around that specific operational timeline.

Simple GPS verification is not a defense. It is the attack surface.

### Five-Layer Defense Stack

> *Layers 1–2 are implemented in the Phase 1 prototype. Layers 3–5 are architected for Phase 3.*

**Layer 1 - Hardware-Backed Attestation**

GRIP mandates Google Play Integrity API for every claim submission on Android. The `MEETS_STRONG_INTEGRITY` verdict provides hardware-backed proof of a locked bootloader and certified OS image, enforced server-side with a bound nonce per request. This single gate eliminates all emulator farms, VirtualXposed containers, and non-rooted spoofing applications. For iOS, Apple App Attest provisions a per-device key in the Secure Enclave with anti-replay counter verification.

**Layer 2 - GNSS Raw Signal Analysis**

GRIP analyses raw GNSS measurements that spoofing applications cannot fabricate: Carrier-to-Noise density (C/N0) and Automatic Gain Control (AGC) readings. Spoofed signals show anomalous C/N0 uniformity inconsistent with real satellite reception ([Detecting GNSS Jamming and Spoofing on Android Devices, NAVIGATION Journal, 2022](https://navi.ion.org/content/69/3/navi.537)). The raw measurement hash is included in every claim submission.

**Layer 3 - Network Triangulation** *(planned partnership)*

Cellular tower triangulation via the GSMA Open Gateway framework achieves 70–191 metre RMSE in urban India - sufficient to determine whether a device is in a flood zone or at home. Faking this requires rogue base station hardware at telecom scale, which is not feasible for a Telegram ring. When GPS and network location diverge by more than 500 metres, the claim is automatically escalated.

**Layer 4 - Temporal Burst Detection**

Telegram-coordinated syndicates produce a statistically distinctive pattern: a spike of claims from one zone within minutes of a threshold breach becoming public. Claims exceeding three standard deviations above the historical zone mean within any 90-minute window trigger a liquidity throttle - payouts are held up to 4 hours pending syndicate analysis. Legitimate partners receive an immediate in-app notification with an estimated resolution time.

**Layer 5 - Device Graph Clustering**

Every device is fingerprinted using hardware identifiers, installed application signatures, screen resolution, and system font set. The graph clusters fingerprints by shared infrastructure - shared IP subnets, Wi-Fi BSSIDs, and SIM batch IMSI prefixes. The 2020 Ola case involved exactly this pattern: 500 SIM cards cycling through four devices, detectable in retrospect. GRIP's graph analysis is designed to detect it in real time.

**Oracle Security**

The research reveals a third attack surface most teams miss: the weather data source itself. Two Colorado ranchers physically tampered with NOAA rain gauges to avoid crop insurance payouts and were sentenced to federal prison in 2024. The Mango Markets DeFi exploit drained $110 million via price oracle manipulation. All three cross-industry cases attack the data source, not the claims process. GRIP's three-source quorum means a manipulated reading from any single source cannot fire a payout.

**Evidence Locker**

All fraud telemetry is logged with SHA-256 certificates per Bharatiya Sakshya Adhiniyam 2023, Section 63, ensuring admissibility in Indian courts - designed to survive the country's 92.6% court pendency backlog ([NCRB Crime in India 2023](https://www.ncrb.gov.in/uploads/files/2CrimeinIndia2023PartII2.pdf)).

**Three-Tier Claims Review**

- **Tier 1 - Auto-approved:** Strong attestation + location consistency + normal claim timing → payout in under 15 minutes, no human intervention.
- **Tier 2 - Soft hold, max 4 hours:** One or two anomaly signals → partner notified immediately, 10-second on-device liveness check or single-tap location confirmation.
- **Tier 3 - Manual review, 24-hour SLA:** Multiple high-confidence fraud signals → human reviewer with full signal stack. Every denied claim generates an automatic appeals notification; successful appeals receive payout plus Rs 50 goodwill credit.

The architecture is asymmetric by design. Defeating any one layer is feasible. Defeating all five simultaneously within the 2-4 hour recovery window is not.


## Coverage Exclusions

GRIP covers one thing: income lost because an external, verifiable disruption made it 
impossible to work. The following are permanently excluded from coverage under any 
circumstance, consistent with IRDAI microinsurance regulations and standard 
parametric product design:

**War, Armed Conflict, and Civil Unrest Beyond Verified Zone Closures**
Income loss arising from war, invasion, foreign military action, or widespread armed 
civil conflict is excluded. Localised Section 144 curfews with verified platform zone 
suspensions remain covered under Trigger 4.

**Pandemic and Declared Public Health Emergencies**
Income loss during a government-declared epidemic or pandemic is excluded. These 
events create nationwide correlated risk that cannot be sustainably underwritten at 
microinsurance premium levels. This exclusion aligns with post-COVID IRDAI guidance 
on parametric product design.

**Nuclear, Radiological, Biological, and Chemical Events**
Any disruption caused by nuclear reaction, radiation, biological agents, or chemical 
contamination is excluded, regardless of whether the cause is accidental or deliberate.

**Platform-Initiated Policy Changes**
Income reduction caused by Zomato or Swiggy changing commission structures, 
incentive schemes, surge pricing algorithms, or partner deactivation decisions is 
excluded. GRIP insures against external disruptions, not platform business decisions.

**Pre-Existing Zone Restrictions**
Locations that are under permanent or long-standing operational restrictions at the 
time of policy enrollment are excluded from coverage for those specific restrictions. 
New restrictions arising after enrollment remain covered under the applicable trigger.

These exclusions are not limitations on the product's intent. They are the boundary 
conditions that make the product financially sustainable and actuarially sound at a 
Rs 49–74 weekly premium.
---

## Team Exogeneous