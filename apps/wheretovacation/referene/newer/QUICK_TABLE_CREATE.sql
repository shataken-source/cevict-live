-- Quick SQL to create scraped_boats table
-- Copy and paste this entire file into Supabase SQL Editor and run it
CREATE TABLE IF NOT EXISTS public.scraped_boats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  captain TEXT,
  boat_type TEXT DEFAULT 'Charter Boat',
  length TEXT,
  capacity INTEGER,
  location TEXT,
  location_city TEXT,
  location_state TEXT,
  home_port TEXT,
  phone TEXT,
  email TEXT,
  description TEXT,
  photos TEXT [] DEFAULT '{}',
  price TEXT,
  hourly_rate NUMERIC(10, 2),
  half_day_rate NUMERIC(10, 2),
  full_day_rate NUMERIC(10, 2),
  source TEXT NOT NULL,
  source_url TEXT,
  claimed BOOLEAN DEFAULT FALSE,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  times_seen INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scraped_boats_name ON public.scraped_boats(name);
CREATE INDEX IF NOT EXISTS idx_scraped_boats_location_city ON public.scraped_boats(location_city);
CREATE INDEX IF NOT EXISTS idx_scraped_boats_location_state ON public.scraped_boats(location_state);
CREATE INDEX IF NOT EXISTS idx_scraped_boats_source ON public.scraped_boats(source);
CREATE INDEX IF NOT EXISTS idx_scraped_boats_claimed ON public.scraped_boats(claimed);
CREATE INDEX IF NOT EXISTS idx_scraped_boats_created_at ON public.scraped_boats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraped_boats_name_location ON public.scraped_boats(name, location_city);
-- Enable RLS
ALTER TABLE public.scraped_boats ENABLE ROW LEVEL SECURITY;
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view scraped boats" ON public.scraped_boats;
DROP POLICY IF EXISTS "Service role can manage scraped boats" ON public.scraped_boats;
-- Create policies
CREATE POLICY "Public can view scraped boats" ON public.scraped_boats FOR
SELECT USING (true);
CREATE POLICY "Service role can manage scraped boats" ON public.scraped_boats FOR ALL WITH CHECK (true);