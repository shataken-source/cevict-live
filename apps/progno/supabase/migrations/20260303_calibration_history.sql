-- Auto-calibration history table
-- Stores results from the weekly self-tuning pipeline
CREATE TABLE IF NOT EXISTS calibration_history (
  id BIGSERIAL PRIMARY KEY,
  run_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  days_analyzed INTEGER NOT NULL,
  total_picks INTEGER NOT NULL DEFAULT 0,
  overall_wr NUMERIC(5,1),
  overall_roi NUMERIC(7,2),
  overall_brier NUMERIC(6,4),
  sport_data JSONB,
  adjustments JSONB,
  recommendations TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calibration_history_run_date ON calibration_history(run_date DESC);
