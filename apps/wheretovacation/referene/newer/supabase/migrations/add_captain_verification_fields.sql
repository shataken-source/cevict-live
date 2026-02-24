-- Add captain verification fields to scraped_boats table
-- These fields help identify and verify captains when they claim their boats

ALTER TABLE scraped_boats
  ADD COLUMN IF NOT EXISTS captain_full_name TEXT,
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS verification_info TEXT;

-- Create indexes for captain verification searches
CREATE INDEX IF NOT EXISTS idx_scraped_boats_captain_full_name 
  ON scraped_boats(captain_full_name) 
  WHERE captain_full_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scraped_boats_business_name 
  ON scraped_boats(business_name) 
  WHERE business_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scraped_boats_license 
  ON scraped_boats(license_number) 
  WHERE license_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scraped_boats_unclaimed 
  ON scraped_boats(claimed, created_at DESC) 
  WHERE claimed = false;

-- Add comment
COMMENT ON COLUMN scraped_boats.captain_full_name IS 'Full captain name for verification when claiming boat';
COMMENT ON COLUMN scraped_boats.business_name IS 'Business/company name for verification';
COMMENT ON COLUMN scraped_boats.license_number IS 'USCG or captain license number for verification';
COMMENT ON COLUMN scraped_boats.website IS 'Website URL for verification';
COMMENT ON COLUMN scraped_boats.verification_info IS 'Combined verification details to help identify captain ownership';

-- Ensure all boats are marked as unclaimed
UPDATE scraped_boats 
SET claimed = false 
WHERE claimed IS NULL;






