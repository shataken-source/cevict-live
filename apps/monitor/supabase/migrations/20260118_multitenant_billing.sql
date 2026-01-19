-- Multi-tenant + billing schema for Website Monitor
--
-- This migration adds:
-- - owner_id columns across all monitor tables (API code filters by owner_id)
-- - monitor_accounts table for plan limits / paid features

-- ---------------------------------------------------------------------------
-- 1) Billing / account table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS monitor_accounts (
  owner_id UUID PRIMARY KEY,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  allow_sms BOOLEAN NOT NULL DEFAULT false,
  max_websites INTEGER,
  paid_until TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure updated_at stays current (uses function from 20250126 migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_monitor_accounts_updated_at'
  ) THEN
    CREATE TRIGGER update_monitor_accounts_updated_at
      BEFORE UPDATE ON monitor_accounts
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE monitor_accounts ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'monitor_accounts' AND policyname = 'Allow all operations'
  ) THEN
    CREATE POLICY "Allow all operations" ON monitor_accounts FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_monitor_accounts_owner_id ON monitor_accounts(owner_id);

-- ---------------------------------------------------------------------------
-- 2) owner_id columns (multi-tenant partitioning)
-- ---------------------------------------------------------------------------

ALTER TABLE monitored_websites ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE uptime_checks ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE visitor_stats ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE bot_status ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE alert_config ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS owner_id UUID;

-- Helpful indexes for API filters
CREATE INDEX IF NOT EXISTS idx_monitored_websites_owner_id ON monitored_websites(owner_id);
CREATE INDEX IF NOT EXISTS idx_uptime_checks_owner_id ON uptime_checks(owner_id);
CREATE INDEX IF NOT EXISTS idx_visitor_stats_owner_id ON visitor_stats(owner_id);
CREATE INDEX IF NOT EXISTS idx_bot_status_owner_id ON bot_status(owner_id);
CREATE INDEX IF NOT EXISTS idx_alert_config_owner_id ON alert_config(owner_id);
CREATE INDEX IF NOT EXISTS idx_alerts_owner_id ON alerts(owner_id);

-- Composite indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_uptime_checks_owner_website_id ON uptime_checks(owner_id, website_id);
CREATE INDEX IF NOT EXISTS idx_visitor_stats_owner_website_id ON visitor_stats(owner_id, website_id);
CREATE INDEX IF NOT EXISTS idx_bot_status_owner_website_id ON bot_status(owner_id, website_id);
CREATE INDEX IF NOT EXISTS idx_alerts_owner_website_id ON alerts(owner_id, website_id);

-- One alert_config row per owner (allows multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_config_owner_unique ON alert_config(owner_id);

