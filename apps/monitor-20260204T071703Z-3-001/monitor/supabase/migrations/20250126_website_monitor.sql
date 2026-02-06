-- Website Monitor Database Schema

-- Websites to monitor
CREATE TABLE IF NOT EXISTS monitored_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  check_interval INTEGER DEFAULT 60, -- seconds
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Uptime checks
CREATE TABLE IF NOT EXISTS uptime_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES monitored_websites(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('up', 'down', 'slow')),
  response_time INTEGER, -- milliseconds
  status_code INTEGER,
  error_message TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uptime_checks_website_id ON uptime_checks(website_id);
CREATE INDEX IF NOT EXISTS idx_uptime_checks_checked_at ON uptime_checks(checked_at DESC);

-- Unique visitors tracking
CREATE TABLE IF NOT EXISTS visitor_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES monitored_websites(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  unique_visitors INTEGER DEFAULT 0,
  total_visits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(website_id, date)
);

CREATE INDEX IF NOT EXISTS idx_visitor_stats_website_id ON visitor_stats(website_id);
CREATE INDEX IF NOT EXISTS idx_visitor_stats_date ON visitor_stats(date DESC);

-- Bot status tracking
CREATE TABLE IF NOT EXISTS bot_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES monitored_websites(id) ON DELETE CASCADE,
  bot_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'waiting', 'broken')),
  last_check TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_status_website_id ON bot_status(website_id);
CREATE INDEX IF NOT EXISTS idx_bot_status_status ON bot_status(status);

-- Alert configuration
CREATE TABLE IF NOT EXISTS alert_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sms_phone TEXT,
  email TEXT,
  critical_only BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert history
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES monitored_websites(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('uptime', 'bot', 'visitor', 'custom')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,
  sms_sent BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_website_id ON alerts(website_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_monitored_websites_updated_at
  BEFORE UPDATE ON monitored_websites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visitor_stats_updated_at
  BEFORE UPDATE ON visitor_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bot_status_updated_at
  BEFORE UPDATE ON bot_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_config_updated_at
  BEFORE UPDATE ON alert_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE monitored_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE uptime_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for now - adjust based on your auth setup)
CREATE POLICY "Allow all operations" ON monitored_websites FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON uptime_checks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON visitor_stats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON bot_status FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON alert_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON alerts FOR ALL USING (true) WITH CHECK (true);

