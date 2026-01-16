-- PetReunion: lost_pets matching + scraper bookkeeping
-- NOTE: This file was previously empty in-repo; keep it idempotent so it can be re-run.

-- 1) Extend lost_pets for scraper attribution + optional demographics
ALTER TABLE public.lost_pets
  ADD COLUMN IF NOT EXISTS age TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS source_platform TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_post_id TEXT,
  ADD COLUMN IF NOT EXISTS shelter_name TEXT;

-- 2) Matches between lost/found rows (0..1 score, like existing code expects)
CREATE TABLE IF NOT EXISTS public.lost_pet_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_pet_id uuid NOT NULL REFERENCES public.lost_pets(id) ON DELETE CASCADE,
  matched_pet_id uuid NOT NULL REFERENCES public.lost_pets(id) ON DELETE CASCADE,
  match_score DOUBLE PRECISION NOT NULL CHECK (match_score >= 0 AND match_score <= 1),
  score_breakdown JSONB,
  match_reasons TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_pet_id, matched_pet_id)
);

CREATE INDEX IF NOT EXISTS idx_lost_pet_matches_source_pet_id ON public.lost_pet_matches(source_pet_id);
CREATE INDEX IF NOT EXISTS idx_lost_pet_matches_matched_pet_id ON public.lost_pet_matches(matched_pet_id);
CREATE INDEX IF NOT EXISTS idx_lost_pet_matches_score ON public.lost_pet_matches(match_score DESC);

-- 3) Minimal run log table used by API routes (scrapers + matcher)
CREATE TABLE IF NOT EXISTS public.scraper_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,          -- e.g. 'pawboost', 'social', 'matcher'
  state TEXT,
  mode TEXT,                        -- e.g. 'daily', 'live', 'rendered'
  pets_found INTEGER DEFAULT 0,
  pets_saved INTEGER DEFAULT 0,
  errors TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scraper_runs_platform_created ON public.scraper_runs(platform, created_at DESC);

-- 4) Reload PostgREST schema cache (helps local dev)
NOTIFY pgrst, 'reload schema';