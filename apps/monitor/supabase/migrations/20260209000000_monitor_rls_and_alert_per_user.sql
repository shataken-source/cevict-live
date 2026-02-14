-- Monitor: RLS lock-down (anon gets no access) + alert_config per user
-- Run after 20250205000000_plans_subscriptions.sql

-- 1. Alert config per user: add user_id, unique per user
ALTER TABLE alert_config ADD COLUMN IF NOT EXISTS user_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_config_user_id ON alert_config(user_id) WHERE user_id IS NOT NULL;
-- Migrate existing single row: leave user_id NULL for legacy "global" row; new configs get user_id

-- 2. Drop permissive policies so anon key cannot read/write (service_role bypasses RLS)
DROP POLICY IF EXISTS "Allow all operations" ON monitored_websites;
DROP POLICY IF EXISTS "Allow all operations" ON uptime_checks;
DROP POLICY IF EXISTS "Allow all operations" ON visitor_stats;
DROP POLICY IF EXISTS "Allow all operations" ON bot_status;
DROP POLICY IF EXISTS "Allow all operations" ON alert_config;
DROP POLICY IF EXISTS "Allow all operations" ON alerts;

-- No new policies for anon: API routes use service_role and filter by owner_id/userId