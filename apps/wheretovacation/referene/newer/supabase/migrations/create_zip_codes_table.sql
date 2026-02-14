-- ZIP Codes Table for Pet Discovery Bot
-- Tracks which ZIP codes have been scraped and when
-- Created: 2025-12-12
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- ZIP Codes table
CREATE TABLE IF NOT EXISTS public.zip_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zip_code VARCHAR(10) NOT NULL UNIQUE,
    city VARCHAR(255) NOT NULL,
    state VARCHAR(50) NOT NULL,
    state_code VARCHAR(2) NOT NULL,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    -- Scraping tracking
    last_scraped_at TIMESTAMP WITH TIME ZONE,
    scrape_count INTEGER DEFAULT 0,
    last_pets_found INTEGER DEFAULT 0,
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    -- Higher priority = scrape more often
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_zip_codes_last_scraped ON public.zip_codes(last_scraped_at NULLS FIRST);
CREATE INDEX IF NOT EXISTS idx_zip_codes_state ON public.zip_codes(state_code);
CREATE INDEX IF NOT EXISTS idx_zip_codes_city ON public.zip_codes(city);
CREATE INDEX IF NOT EXISTS idx_zip_codes_priority ON public.zip_codes(priority DESC, last_scraped_at NULLS FIRST);
CREATE INDEX IF NOT EXISTS idx_zip_codes_active ON public.zip_codes(is_active)
WHERE is_active = TRUE;
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_zip_codes_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Trigger to auto-update updated_at (drop first if exists)
DROP TRIGGER IF EXISTS update_zip_codes_updated_at ON public.zip_codes;
CREATE TRIGGER update_zip_codes_updated_at BEFORE
UPDATE ON public.zip_codes FOR EACH ROW EXECUTE FUNCTION update_zip_codes_updated_at();
-- Enable Row Level Security
ALTER TABLE public.zip_codes ENABLE ROW LEVEL SECURITY;
-- Policy: Allow public read access (drop first if exists)
DROP POLICY IF EXISTS "Allow public read access to zip_codes" ON public.zip_codes;
CREATE POLICY "Allow public read access to zip_codes" ON public.zip_codes FOR
SELECT USING (true);
-- Policy: Allow service role full access (for scraping bot) (drop first if exists)
DROP POLICY IF EXISTS "Allow service role full access to zip_codes" ON public.zip_codes;
CREATE POLICY "Allow service role full access to zip_codes" ON public.zip_codes FOR ALL USING (true) WITH CHECK (true);
-- Add comment
COMMENT ON TABLE public.zip_codes IS 'ZIP codes for systematic pet discovery scraping. Tracks last scraped time to prioritize oldest/unscraped areas.';
COMMENT ON COLUMN public.zip_codes.last_scraped_at IS 'When this ZIP code was last scraped. NULL means never scraped.';
COMMENT ON COLUMN public.zip_codes.scrape_count IS 'Number of times this ZIP code has been scraped';
COMMENT ON COLUMN public.zip_codes.priority IS 'Higher priority ZIP codes are scraped more frequently';