-- Complete migration to fix shelters table with all required columns
-- Run this in Supabase SQL Editor to add all missing columns

-- Add scan_status column if it doesn't exist
ALTER TABLE shelters
ADD COLUMN IF NOT EXISTS scan_status TEXT DEFAULT 'unscanned';

-- Add scanned_date column if it doesn't exist
ALTER TABLE shelters
ADD COLUMN IF NOT EXISTS scanned_date TIMESTAMPTZ;

-- Add last_scraped_at column if it doesn't exist
ALTER TABLE shelters
ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMPTZ;

-- Add auto_scrape_enabled column if it doesn't exist
OPEN FILE apps/wheretovacation/components/petreunion/SocialShareButtons.tsx LINE 125
ADD COLUMN IF NOT EXISTS auto_scrape_enabled BOOLEAN DEFAULT true;

-- Add city column if it doesn't exist
ALTER TABLE shelters
ADD COLUMN IF NOT EXISTS city TEXT;

-- Add state column if it doesn't exist
ALTER TABLE shelters
ADD COLUMN IF NOT EXISTS state TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_shelters_scan_status ON shelters(scan_status);
CREATE INDEX IF NOT EXISTS idx_shelters_city_state ON shelters(city, state);
CREATE INDEX IF NOT EXISTS idx_shelters_auto_scrape ON shelters(auto_scrape_enabled);

-- Add comments for documentation
COMMENT ON COLUMN shelters.scan_status IS 'Current scan status: unscanned, scanning, scanned, error';
COMMENT ON COLUMN shelters.scanned_date IS 'Timestamp of the last successful scan';
COMMENT ON COLUMN shelters.last_scraped_at IS 'Timestamp of the last scrape attempt';
COMMENT ON COLUMN shelters.auto_scrape_enabled IS 'Whether this shelter should be automatically scraped';
COMMENT ON COLUMN shelters.city IS 'City where the shelter is located';
COMMENT ON COLUMN shelters.state IS 'State where the shelter is located';

-- Update existing shelters to have default values
UPDATE shelters
SET 
  scan_status = COALESCE(scan_status, 'unscanned'),
  auto_scrape_enabled = COALESCE(auto_scrape_enabled, true)
WHERE scan_status IS NULL OR auto_scrape_enabled IS NULL;

