-- Layer 1 additions to partners table
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS zone_lat NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS zone_lng NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS zone_distance_from_city_km NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS zone_coordinates_flag BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS registration_ip TEXT,
  ADD COLUMN IF NOT EXISTS ip_registrations_30d INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS identity_duplication_flag BOOLEAN DEFAULT FALSE;

-- Layer 2 additions to claims table
ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS claim_latency_seconds NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS days_since_enrollment INTEGER,
  ADD COLUMN IF NOT EXISTS layer1_flag BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS layer2_flag BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS layer3_flag BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flags_count INTEGER DEFAULT 0;

-- Layer 3 additions to trigger_events table
ALTER TABLE trigger_events
  ADD COLUMN IF NOT EXISTS single_source_breach BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS statistical_outlier BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS percentile NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS cpcb_raw_value NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS oracle_confirmed BOOLEAN DEFAULT TRUE;

-- Model health monitoring table
CREATE TABLE IF NOT EXISTS model_health (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_name TEXT NOT NULL,
  feature_name TEXT,
  psi_value NUMERIC(6,4),
  ks_pvalue NUMERIC(6,4),
  status TEXT CHECK (status IN ('stable', 'monitor', 'retrain')),
  training_mean NUMERIC(10,6),
  training_std NUMERIC(10,6),
  live_mean NUMERIC(10,6),
  live_std NUMERIC(10,6),
  sample_count INTEGER,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE model_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON model_health FOR ALL USING (true);
