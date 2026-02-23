-- Syndicated picks from Progno engine
-- Receives picks via /api/webhooks/progno and serves them via /api/picks/today

CREATE TABLE IF NOT EXISTS public.syndicated_picks (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id        text NOT NULL,
  tier            text NOT NULL CHECK (tier IN ('free', 'premium', 'elite')),
  pick_index      integer NOT NULL DEFAULT 0,
  game_id         text,
  sport           text,
  home_team       text,
  away_team       text,
  pick_selection  text,
  confidence      numeric,
  odds            numeric,
  expected_value  numeric,
  edge            numeric,
  analysis        text,
  game_time       timestamptz,
  source_file     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_syndicated_picks_created_at ON public.syndicated_picks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_syndicated_picks_tier       ON public.syndicated_picks (tier);
CREATE INDEX IF NOT EXISTS idx_syndicated_picks_batch_id   ON public.syndicated_picks (batch_id);

-- Audit log for syndication events (idempotency + tracking)
CREATE TABLE IF NOT EXISTS public.syndication_log (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id    text NOT NULL UNIQUE,
  tier        text,
  pick_count  integer,
  success     boolean,
  errors      jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_syndication_log_batch_id   ON public.syndication_log (batch_id);
CREATE INDEX IF NOT EXISTS idx_syndication_log_created_at ON public.syndication_log (created_at DESC);
