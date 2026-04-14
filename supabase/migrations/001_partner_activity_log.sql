CREATE TABLE IF NOT EXISTS partner_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  orders_completed INTEGER DEFAULT 0,
  active_hours NUMERIC(4,1) DEFAULT 0,
  active_days INTEGER DEFAULT 0,
  cancellation_count INTEGER DEFAULT 0,
  nocturnal_orders INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(partner_id, week_start)
);

ALTER TABLE partner_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON partner_activity_log FOR ALL USING (true);
