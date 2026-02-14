-- Catch logging: fish_species, user_catches, catch_likes
-- Required for CatchLogger + CatchLeaderboard and catch-logger edge function.

-- Fish species (reference data)
CREATE TABLE IF NOT EXISTS public.fish_species (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  scientific_name TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User catches
CREATE TABLE IF NOT EXISTS public.user_catches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  species_id UUID NOT NULL REFERENCES public.fish_species(id),
  weight DECIMAL(10,2) NOT NULL,
  length DECIMAL(10,2),
  location TEXT NOT NULL,
  catch_date TIMESTAMPTZ NOT NULL,
  photo_url TEXT,
  notes TEXT,
  is_verified BOOLEAN DEFAULT false,
  shares_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Catch likes
CREATE TABLE IF NOT EXISTS public.catch_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catch_id UUID NOT NULL REFERENCES public.user_catches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(catch_id, user_id)
);

-- Seed species (skip if name exists)
INSERT INTO public.fish_species (name, scientific_name, category)
VALUES
  ('Red Snapper', 'Lutjanus campechanus', 'offshore'),
  ('Redfish', 'Sciaenops ocellatus', 'inshore'),
  ('Speckled Trout', 'Cynoscion nebulosus', 'inshore'),
  ('King Mackerel', 'Scomberomorus cavalla', 'offshore'),
  ('Mahi Mahi', 'Coryphaena hippurus', 'offshore'),
  ('Grouper', 'Epinephelus spp.', 'offshore'),
  ('Tarpon', 'Megalops atlanticus', 'inshore'),
  ('Snook', 'Centropomus undecimalis', 'inshore')
ON CONFLICT (name) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_catches_user_id ON public.user_catches(user_id);
CREATE INDEX IF NOT EXISTS idx_user_catches_species_id ON public.user_catches(species_id);
CREATE INDEX IF NOT EXISTS idx_user_catches_catch_date ON public.user_catches(catch_date DESC);
CREATE INDEX IF NOT EXISTS idx_catch_likes_catch_id ON public.catch_likes(catch_id);

-- RLS
ALTER TABLE public.fish_species ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_catches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catch_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read species" ON public.fish_species;
CREATE POLICY "Public read species" ON public.fish_species FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read catches" ON public.user_catches;
CREATE POLICY "Public read catches" ON public.user_catches FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users insert catches" ON public.user_catches;
CREATE POLICY "Users insert catches" ON public.user_catches FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own catches" ON public.user_catches;
CREATE POLICY "Users update own catches" ON public.user_catches FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public read catch_likes" ON public.catch_likes;
CREATE POLICY "Public read catch_likes" ON public.catch_likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users manage own catch_likes" ON public.catch_likes;
CREATE POLICY "Users manage own catch_likes" ON public.catch_likes FOR ALL USING (auth.uid() = user_id);
