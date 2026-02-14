-- Itinerary sharing & AI storyboard support

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE public.itineraries
  ADD COLUMN IF NOT EXISTS share_id UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS storyboard JSONB;

COMMENT ON COLUMN public.itineraries.share_id IS 'Public share identifier for /trips/share/[share_id]';
COMMENT ON COLUMN public.itineraries.is_public IS 'Whether this itinerary can be viewed without auth';
COMMENT ON COLUMN public.itineraries.storyboard IS 'Cached AI-generated storyboard (days, titles, images, copy)';

