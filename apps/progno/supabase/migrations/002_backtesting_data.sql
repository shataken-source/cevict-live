-- =============================================================================
-- BACKTESTING DATA UPGRADE — Run in Supabase SQL editor
-- Adds opening/closing line flags, game_results table, and optimized indexes
-- Safe to re-run: all DDL uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add is_opening / is_closing flags to historical_odds
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.historical_odds
  ADD COLUMN IF NOT EXISTS is_opening  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_closing  BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_hist_odds_opening ON public.historical_odds(game_id) WHERE is_opening = true;
CREATE INDEX IF NOT EXISTS idx_hist_odds_closing ON public.historical_odds(game_id) WHERE is_closing = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. game_results — final scores joined to game_id for backtesting
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.game_results (
  id               BIGSERIAL    PRIMARY KEY,
  game_id          TEXT         NOT NULL,
  sport            TEXT         NOT NULL,
  home_team        TEXT         NOT NULL,
  away_team        TEXT         NOT NULL,
  commence_time    TIMESTAMPTZ,
  game_date        DATE,
  home_score       INTEGER,
  away_score       INTEGER,
  winner           TEXT,            -- 'home', 'away', 'draw'
  total_points     INTEGER,         -- home_score + away_score
  home_margin      INTEGER,         -- home_score - away_score (negative = away won)
  status           TEXT DEFAULT 'final',  -- 'final', 'cancelled', 'postponed'
  source           TEXT DEFAULT 'espn',
  graded_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (game_id)
);

CREATE INDEX IF NOT EXISTS idx_game_results_sport     ON public.game_results(sport);
CREATE INDEX IF NOT EXISTS idx_game_results_date      ON public.game_results(game_date);
CREATE INDEX IF NOT EXISTS idx_game_results_teams     ON public.game_results(home_team, away_team);

-- RLS: anon read, service_role write
ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_results' AND policyname = 'anon_read') THEN
    EXECUTE 'CREATE POLICY anon_read ON public.game_results FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_results' AND policyname = 'service_all') THEN
    EXECUTE 'CREATE POLICY service_all ON public.game_results USING (auth.role() = ''service_role'')';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Composite indexes for common backtesting queries
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_hist_odds_sport_date    ON public.historical_odds(sport, captured_at);
CREATE INDEX IF NOT EXISTS idx_hist_odds_game_book     ON public.historical_odds(game_id, bookmaker);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. View: backtesting_dataset — pre-joined odds + results for easy export
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.backtesting_closing_lines AS
SELECT
  ho.game_id,
  ho.sport,
  ho.home_team,
  ho.away_team,
  ho.commence_time,
  ho.bookmaker,
  ho.market_type,
  ho.home_odds,
  ho.away_odds,
  ho.home_spread,
  ho.away_spread,
  ho.total_line,
  ho.over_odds,
  ho.under_odds,
  ho.captured_at AS closing_snapshot_at,
  gr.home_score,
  gr.away_score,
  gr.winner,
  gr.total_points,
  gr.home_margin,
  gr.game_date
FROM public.historical_odds ho
LEFT JOIN public.game_results gr ON ho.game_id = gr.game_id
WHERE ho.is_closing = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- Done. Verify: SELECT COUNT(*) FROM public.game_results;
-- ─────────────────────────────────────────────────────────────────────────────
