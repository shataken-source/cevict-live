-- Create scraped_boats table for Gulf Coast Charters scraper
-- This table stores boats discovered by the automated scraper
CREATE TABLE IF NOT EXISTS public.scraped_boats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Basic boat information
  name TEXT NOT NULL,
  captain TEXT,
  boat_type TEXT DEFAULT 'Charter Boat',
  length TEXT,
  capacity INTEGER,
  -- Location information
  location TEXT,
  location_city TEXT,
  location_state TEXT,
  home_port TEXT,
  -- Contact information
  phone TEXT,
  email TEXT,
  -- Pricing information
  price TEXT,
  hourly_rate NUMERIC(10, 2),
  half_day_rate NUMERIC(10, 2),
  full_day_rate NUMERIC(10, 2),
  -- Description and media
  description TEXT,
  photos TEXT [] DEFAULT '{}',
  -- Source tracking
  source TEXT NOT NULL,
  source_url TEXT,
  -- Verification and tracking
  claimed BOOLEAN DEFAULT FALSE,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  times_seen INTEGER DEFAULT 1,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_scraped_boats_name ON public.scraped_boats(name);
CREATE INDEX IF NOT EXISTS idx_scraped_boats_location_city ON public.scraped_boats(location_city);
CREATE INDEX IF NOT EXISTS idx_scraped_boats_location_state ON public.scraped_boats(location_state);
CREATE INDEX IF NOT EXISTS idx_scraped_boats_source ON public.scraped_boats(source);
CREATE INDEX IF NOT EXISTS idx_scraped_boats_claimed ON public.scraped_boats(claimed);
CREATE INDEX IF NOT EXISTS idx_scraped_boats_created_at ON public.scraped_boats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraped_boats_name_location ON public.scraped_boats(name, location_city);
-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scraped_boats_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Create trigger to automatically update updated_at
CREATE TRIGGER update_scraped_boats_updated_at BEFORE
UPDATE ON public.scraped_boats FOR EACH ROW EXECUTE FUNCTION update_scraped_boats_updated_at();
-- Enable Row Level Security (RLS)
ALTER TABLE public.scraped_boats ENABLE ROW LEVEL SECURITY;
-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Public can view scraped boats" ON public.scraped_boats;
DROP POLICY IF EXISTS "Service role can manage scraped boats" ON public.scraped_boats;
-- Create policies for public read access (boats are public listings)
CREATE POLICY "Public can view scraped boats" ON public.scraped_boats FOR
SELECT USING (true);
-- Allow service role to insert/update/delete (service role bypasses RLS, but this ensures API access)
CREATE POLICY "Service role can manage scraped boats" ON public.scraped_boats FOR ALL WITH CHECK (true);
-- Add comment to table
COMMENT ON TABLE public.scraped_boats IS 'Boats discovered by the automated scraper for Gulf Coast Charters';