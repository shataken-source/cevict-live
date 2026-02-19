-- =============================================================================
-- PROGNO SUPABASE SETUP — Run this in Supabase SQL editor
-- Run sections individually if any step fails.
-- Safe to re-run: all DDL uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. prediction_daily_summary  (daily-results cron writes here)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prediction_daily_summary (
  id         BIGSERIAL    PRIMARY KEY,
  date       DATE         NOT NULL,
  total_picks INTEGER      DEFAULT 0,
  correct    INTEGER      DEFAULT 0,
  wrong      INTEGER      DEFAULT 0,
  pending    INTEGER      DEFAULT 0,
  graded     INTEGER      DEFAULT 0,
  win_rate   NUMERIC(5,2) DEFAULT 0,
  graded_at  TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (date)
);

CREATE INDEX IF NOT EXISTS idx_pred_daily_summary_date ON public.prediction_daily_summary(date);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. picks  (daily-predictions cron writes picks here so they survive Vercel cold starts)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.picks (
  id               BIGSERIAL    PRIMARY KEY,
  game_id          TEXT,
  game_date        DATE,
  game_time        TIMESTAMPTZ,
  home_team        TEXT,
  away_team        TEXT,
  sport            TEXT,
  league           TEXT,
  pick             TEXT,
  confidence       NUMERIC(5,2),
  odds             INTEGER,
  is_home          BOOLEAN      DEFAULT true,
  early_lines      BOOLEAN      DEFAULT false,
  commence_time    TIMESTAMPTZ,
  expected_value   NUMERIC(8,4),
  kelly_fraction   NUMERIC(8,4),
  status           TEXT         DEFAULT 'pending',
  result           TEXT,
  actual_home_score INTEGER,
  actual_away_score INTEGER,
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- Add columns for existing installs that may be missing newer columns
ALTER TABLE IF EXISTS public.picks
  ADD COLUMN IF NOT EXISTS game_id          TEXT,
  ADD COLUMN IF NOT EXISTS game_date        DATE,
  ADD COLUMN IF NOT EXISTS game_time        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS home_team        TEXT,
  ADD COLUMN IF NOT EXISTS away_team        TEXT,
  ADD COLUMN IF NOT EXISTS sport            TEXT,
  ADD COLUMN IF NOT EXISTS league           TEXT,
  ADD COLUMN IF NOT EXISTS pick             TEXT,
  ADD COLUMN IF NOT EXISTS confidence       NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS odds             INTEGER,
  ADD COLUMN IF NOT EXISTS is_home          BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS early_lines      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS commence_time    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expected_value   NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS kelly_fraction   NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS status           TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS result           TEXT,
  ADD COLUMN IF NOT EXISTS actual_home_score INTEGER,
  ADD COLUMN IF NOT EXISTS actual_away_score INTEGER;

-- Unique constraint for upsert deduplication (daily picks per game+side)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'picks_game_date_home_away_early_key'
    AND conrelid = 'public.picks'::regclass
  ) THEN
    ALTER TABLE public.picks
      ADD CONSTRAINT picks_game_date_home_away_early_key
      UNIQUE (game_date, home_team, away_team, early_lines);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_picks_game_date   ON public.picks(game_date);
CREATE INDEX IF NOT EXISTS idx_picks_sport        ON public.picks(sport);
CREATE INDEX IF NOT EXISTS idx_picks_status       ON public.picks(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. historical_odds  (verify unique constraint exists for upsert)
-- ─────────────────────────────────────────────────────────────────────────────
-- Add missing columns if historical_odds was created without them
ALTER TABLE IF EXISTS public.historical_odds
  ADD COLUMN IF NOT EXISTS home_spread  NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS away_spread  NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS total_line   NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS over_odds    INTEGER,
  ADD COLUMN IF NOT EXISTS under_odds   INTEGER;

-- Unique constraint required for ON CONFLICT upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'historical_odds_game_id_bookmaker_market_type_captured_at_key'
    AND conrelid = 'public.historical_odds'::regclass
  ) THEN
    ALTER TABLE public.historical_odds
      ADD CONSTRAINT historical_odds_game_id_bookmaker_market_type_captured_at_key
      UNIQUE (game_id, bookmaker, market_type, captured_at);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hist_odds_game_id      ON public.historical_odds(game_id);
CREATE INDEX IF NOT EXISTS idx_hist_odds_sport         ON public.historical_odds(sport);
CREATE INDEX IF NOT EXISTS idx_hist_odds_captured_at   ON public.historical_odds(captured_at);
CREATE INDEX IF NOT EXISTS idx_hist_odds_commence      ON public.historical_odds(commence_time);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. api_usage_quota  (already created — verify index)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_api_usage_quota_api_date ON public.api_usage_quota(api_key, date);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RLS Policies
-- ─────────────────────────────────────────────────────────────────────────────
-- prediction_daily_summary — read-only for anon, full for service_role
ALTER TABLE public.prediction_daily_summary ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prediction_daily_summary' AND policyname = 'anon_read') THEN
    EXECUTE 'CREATE POLICY anon_read ON public.prediction_daily_summary FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prediction_daily_summary' AND policyname = 'service_all') THEN
    EXECUTE 'CREATE POLICY service_all ON public.prediction_daily_summary USING (auth.role() = ''service_role'')';
  END IF;
END $$;

-- picks — service_role writes, anon reads
ALTER TABLE public.picks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'picks' AND policyname = 'anon_read') THEN
    EXECUTE 'CREATE POLICY anon_read ON public.picks FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'picks' AND policyname = 'service_all') THEN
    EXECUTE 'CREATE POLICY service_all ON public.picks USING (auth.role() = ''service_role'')';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Update picks status when prediction_results are graded (optional trigger)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_pick_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.picks
  SET status = NEW.status
  WHERE game_date = NEW.game_date
    AND home_team = NEW.home_team
    AND away_team = NEW.away_team;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_pick_status ON public.prediction_results;
CREATE TRIGGER trg_sync_pick_status
  AFTER INSERT OR UPDATE OF status ON public.prediction_results
  FOR EACH ROW EXECUTE FUNCTION public.sync_pick_status();

-- ─────────────────────────────────────────────────────────────────────────────
-- Done. Run: SELECT COUNT(*) FROM public.prediction_daily_summary to verify.
-- ─────────────────────────────────────────────────────────────────────────────
