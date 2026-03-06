-- Accu-Solar Telemetry Table
-- Stores BMS readings from eco_worthy_bridge.py for historical data and remote access.

CREATE TABLE IF NOT EXISTS telemetry (
  id            BIGSERIAL PRIMARY KEY,
  battery_id    TEXT NOT NULL DEFAULT 'primary',
  voltage       REAL NOT NULL,
  current       REAL NOT NULL DEFAULT 0,
  soc           REAL NOT NULL,
  power         REAL NOT NULL DEFAULT 0,
  temperature   REAL NOT NULL DEFAULT 25,
  cycles        INTEGER NOT NULL DEFAULT 0,
  capacity_remain REAL,
  capacity_full   REAL,
  cells         JSONB,        -- array of individual cell voltages
  health        TEXT NOT NULL DEFAULT 'Normal',  -- Normal, Warning, Critical
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for time-range queries (most common: "last 24h for battery X")
CREATE INDEX IF NOT EXISTS idx_telemetry_battery_time
  ON telemetry (battery_id, recorded_at DESC);

-- Index for recent data polling
CREATE INDEX IF NOT EXISTS idx_telemetry_recent
  ON telemetry (recorded_at DESC);

-- Auto-delete readings older than 90 days to keep DB small (Supabase free tier = 500MB)
-- Run this manually or via pg_cron if available:
-- DELETE FROM telemetry WHERE recorded_at < now() - interval '90 days';

-- RLS: allow insert from service role, read from anon
ALTER TABLE telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read" ON telemetry
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow service insert" ON telemetry
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Allow authenticated read" ON telemetry
  FOR SELECT TO authenticated USING (true);
