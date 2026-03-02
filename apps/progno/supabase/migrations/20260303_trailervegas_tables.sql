-- TrailerVegas public grading: pending picks + completed reports
-- Used by /api/trailervegas/checkout, /webhook, /report

CREATE TABLE IF NOT EXISTS trailervegas_pending (
  session_id  TEXT PRIMARY KEY,
  picks       JSONB NOT NULL,
  pick_count  INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending | completed
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trailervegas_reports (
  session_id   TEXT PRIMARY KEY,
  email        TEXT,
  report       JSONB NOT NULL,
  pick_count   INTEGER NOT NULL DEFAULT 0,
  amount_paid  INTEGER,  -- cents
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-cleanup: drop pending rows older than 7 days (optional cron)
-- DELETE FROM trailervegas_pending WHERE created_at < now() - INTERVAL '7 days';
