-- Update shelters table to include location and login info
ALTER TABLE shelters ADD COLUMN IF NOT EXISTS zipcode TEXT;
ALTER TABLE shelters ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE shelters ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE shelters ADD COLUMN IF NOT EXISTS password_hash TEXT; -- For shelter login
ALTER TABLE shelters ADD COLUMN IF NOT EXISTS login_enabled BOOLEAN DEFAULT false;
ALTER TABLE shelters ADD COLUMN IF NOT EXISTS shelter_url TEXT; -- URL to their pet listing page
ALTER TABLE shelters ADD COLUMN IF NOT EXISTS shelter_type TEXT DEFAULT 'adoptapet'; -- 'adoptapet', 'facebook', 'petfinder', etc.
ALTER TABLE shelters ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMPTZ;
ALTER TABLE shelters ADD COLUMN IF NOT EXISTS auto_scrape_enabled BOOLEAN DEFAULT false;

-- Create index for zipcode searches
CREATE INDEX IF NOT EXISTS idx_shelters_zipcode ON shelters(zipcode);
CREATE INDEX IF NOT EXISTS idx_shelters_location ON shelters(state, city);

-- Add comments
COMMENT ON COLUMN shelters.zipcode IS 'Shelter zipcode - used as starting point for searches';
COMMENT ON COLUMN shelters.shelter_url IS 'URL to shelter pet listing page for scraping';
COMMENT ON COLUMN shelters.shelter_type IS 'Type of shelter page: adoptapet, facebook, petfinder, etc.';
COMMENT ON COLUMN shelters.auto_scrape_enabled IS 'Enable automatic scraping of this shelter page';

