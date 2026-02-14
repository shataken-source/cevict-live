-- Plans & subscriptions for Monitor (auth + Stripe)
-- Run after 20250126_website_monitor.sql

-- Link websites to owner (Clerk user id)
ALTER TABLE monitored_websites
  ADD COLUMN IF NOT EXISTS owner_id TEXT;

CREATE INDEX IF NOT EXISTS idx_monitored_websites_owner_id ON monitored_websites(owner_id);

-- Subscription state (synced by Stripe webhook)
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT PRIMARY KEY,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
  status TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service role" ON subscriptions FOR ALL USING (true) WITH CHECK (true);

-- Optional: account settings (e.g. status page slug) – for later
CREATE TABLE IF NOT EXISTS monitor_accounts (
  user_id TEXT PRIMARY KEY,
  status_page_slug TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE monitor_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service role" ON monitor_accounts FOR ALL USING (true) WITH CHECK (true);
