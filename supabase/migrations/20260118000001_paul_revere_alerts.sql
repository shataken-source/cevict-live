-- 2026-01-18: Paul Revere Alerts (geo-targeted notifications)

CREATE TABLE IF NOT EXISTS paul_revere_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('immediate', 'urgent', 'watch')),
  scope text NOT NULL CHECK (scope IN ('national', 'state', 'local')),
  state text,
  zip_code text,
  headline text NOT NULL,
  summary text,
  source text,
  source_url text,
  matched_keywords text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  target_count integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_paul_revere_alerts_created_at ON paul_revere_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paul_revere_alerts_scope ON paul_revere_alerts(scope);
CREATE INDEX IF NOT EXISTS idx_paul_revere_alerts_state ON paul_revere_alerts(state);
CREATE INDEX IF NOT EXISTS idx_paul_revere_alerts_zip_code ON paul_revere_alerts(zip_code);

ALTER TABLE paul_revere_alerts ENABLE ROW LEVEL SECURITY;

-- Public read (no PII is stored here)
CREATE POLICY "Public read paul revere alerts"
  ON paul_revere_alerts
  FOR SELECT
  USING (true);

-- Service role can insert/update/delete
CREATE POLICY "Service role full access paul revere alerts"
  ON paul_revere_alerts
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

