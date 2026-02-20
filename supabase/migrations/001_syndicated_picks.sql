-- ============================================================
-- Migration: Create syndicated_picks table
-- Fixes: game_time column missing + all columns used by:
--   - apps/prognostication/scripts/syndicate-progno-picks.ts
--   - apps/prognostication/app/api/webhooks/progno/route.ts
--   - apps/prognostication/app/api/picks/today/route.ts
--   - apps/prognostication/app/api/kalshi/sports/route.ts
-- ============================================================

-- Create table if it doesn't exist at all
CREATE TABLE IF NOT EXISTS public.syndicated_picks (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      timestamp with time zone DEFAULT now() NOT NULL,

  -- Batch tracking
  batch_id        text,
  tier            text CHECK (tier IN ('free', 'premium', 'elite')),
  pick_index      integer,
  source_file     text,

  -- Game identity
  game_id         text,
  sport           text,
  home_team       text,
  away_team       text,
  game_time       timestamp with time zone,   -- <-- the missing column
  pick_type       text DEFAULT 'MONEYLINE',

  -- Pick details
  pick_selection  text,
  confidence      numeric,
  odds            numeric,
  expected_value  numeric,
  edge            numeric,
  recommended_line numeric,
  mc_win_probability numeric,

  -- Analysis
  analysis        text,

  -- Full raw payload for reference
  raw_data        jsonb
);

-- ── Add missing columns to existing table (idempotent) ────────────────────────
-- Each ALTER is wrapped in a DO block so it skips silently if column exists.

DO $$ BEGIN
  ALTER TABLE public.syndicated_picks ADD COLUMN batch_id text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.syndicated_picks ADD COLUMN tier text CHECK (tier IN ('free', 'premium', 'elite'));
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.syndicated_picks ADD COLUMN pick_index integer;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.syndicated_picks ADD COLUMN source_file text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.syndicated_picks ADD COLUMN game_id text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.syndicated_picks ADD COLUMN sport text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.syndicated_picks ADD COLUMN home_team text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.syndicated_picks ADD COLUMN away_team text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.syndicated_picks ADD COLUMN game_time timestamp with time zone;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.syndicated_picks ADD COLUMN pick_type text DEFAULT 'MONEYLINE';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.syndicated_picks ADD COLUMN pick_selection text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.syndicated_picks ADD COLUMN confidence numeric;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.syndicated_picks ADD COLUMN odds numeric;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.syndicated_picks ADD COLUMN expected_value numeric;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.syndicated_picks ADD COLUMN edge numeric;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.syndicated_picks ADD COLUMN recommended_line numeric;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.syndicated_picks ADD COLUMN mc_win_probability numeric;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.syndicated_picks ADD COLUMN analysis text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.syndicated_picks ADD COLUMN raw_data jsonb;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_syndicated_picks_created_at
  ON public.syndicated_picks (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_syndicated_picks_game_time
  ON public.syndicated_picks (game_time);

CREATE INDEX IF NOT EXISTS idx_syndicated_picks_sport
  ON public.syndicated_picks (sport);

CREATE INDEX IF NOT EXISTS idx_syndicated_picks_tier
  ON public.syndicated_picks (tier);

CREATE INDEX IF NOT EXISTS idx_syndicated_picks_batch_id
  ON public.syndicated_picks (batch_id);

CREATE INDEX IF NOT EXISTS idx_syndicated_picks_confidence
  ON public.syndicated_picks (confidence DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.syndicated_picks ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
DO $$ BEGIN
  CREATE POLICY "service_role_all" ON public.syndicated_picks
    FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Authenticated users can read
DO $$ BEGIN
  CREATE POLICY "authenticated_read" ON public.syndicated_picks
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
