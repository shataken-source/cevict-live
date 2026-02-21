-- Fix database schema issues for daily-results cron
-- Issue 1: game_outcomes unique constraint conflict
-- Issue 2: prediction_daily_summary missing 'correct' column (it has 'correct' but code may reference differently)

-- ============================================================================
-- 1. Fix game_outcomes table - add missing columns and fix unique constraint
-- ============================================================================

-- Add league column if missing (code inserts it but table may not have it)
ALTER TABLE IF EXISTS public.game_outcomes 
  ADD COLUMN IF NOT EXISTS league TEXT,
  ADD COLUMN IF NOT EXISTS game_id TEXT;

-- Drop old unique constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'game_outcomes_external_id_sport_game_date_key'
    AND conrelid = 'public.game_outcomes'::regclass
  ) THEN
    ALTER TABLE public.game_outcomes DROP CONSTRAINT game_outcomes_external_id_sport_game_date_key;
  END IF;
END $$;

-- Add new unique constraint matching what the code expects
-- Code uses: onConflict: 'game_date,home_team,away_team'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'game_outcomes_game_date_home_away_key'
    AND conrelid = 'public.game_outcomes'::regclass
  ) THEN
    ALTER TABLE public.game_outcomes 
      ADD CONSTRAINT game_outcomes_game_date_home_away_key 
      UNIQUE (game_date, home_team, away_team);
  END IF;
END $$;

-- ============================================================================
-- 2. Verify prediction_daily_summary has all required columns
-- ============================================================================

-- The table already has 'correct' column from supabase-setup.sql
-- But let's ensure all columns exist
ALTER TABLE IF EXISTS public.prediction_daily_summary
  ADD COLUMN IF NOT EXISTS total_picks INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS correct INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wrong INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS graded INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS win_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- 3. Add prediction_results table if it doesn't exist (for graded picks)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.prediction_results (
  id BIGSERIAL PRIMARY KEY,
  game_date DATE NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  pick TEXT NOT NULL,
  confidence NUMERIC(5,2),
  sport TEXT,
  league TEXT,
  game_id TEXT,
  status TEXT, -- 'win', 'lose', 'pending'
  actual_winner TEXT,
  actual_home_score INTEGER,
  actual_away_score INTEGER,
  graded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (game_date, home_team, away_team)
);

CREATE INDEX IF NOT EXISTS idx_prediction_results_date ON public.prediction_results(game_date);
CREATE INDEX IF NOT EXISTS idx_prediction_results_status ON public.prediction_results(status);

-- Enable RLS
ALTER TABLE IF EXISTS public.prediction_results ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prediction_results' AND policyname = 'anon_read') THEN
    EXECUTE 'CREATE POLICY anon_read ON public.prediction_results FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prediction_results' AND policyname = 'service_all') THEN
    EXECUTE 'CREATE POLICY service_all ON public.prediction_results USING (auth.role() = ''service_role'')';
  END IF;
END $$;

-- ============================================================================
-- 4. Add RLS policies for game_outcomes if missing
-- ============================================================================

ALTER TABLE IF EXISTS public.game_outcomes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_outcomes' AND policyname = 'anon_read') THEN
    EXECUTE 'CREATE POLICY anon_read ON public.game_outcomes FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_outcomes' AND policyname = 'service_all') THEN
    EXECUTE 'CREATE POLICY service_all ON public.game_outcomes USING (auth.role() = ''service_role'')';
  END IF;
END $$;

-- ============================================================================
-- Done! Test with:
-- SELECT * FROM public.game_outcomes LIMIT 5;
-- SELECT * FROM public.prediction_daily_summary ORDER BY date DESC LIMIT 5;
-- SELECT * FROM public.prediction_results ORDER BY game_date DESC LIMIT 5;
-- ============================================================================
