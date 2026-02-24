-- Add scan status tracking to shelters table
ALTER TABLE shelters ADD COLUMN IF NOT EXISTS scan_status TEXT DEFAULT 'unscanned';
ALTER TABLE shelters ADD COLUMN IF NOT EXISTS scanned_date TIMESTAMPTZ;

-- Create index for finding unscanned shelters
CREATE INDEX IF NOT EXISTS idx_shelters_scan_status ON shelters(scan_status) WHERE scan_status = 'unscanned';

-- Update existing shelters without scan_status to 'unscanned'
UPDATE shelters SET scan_status = 'unscanned' WHERE scan_status IS NULL;

-- Comments
COMMENT ON COLUMN shelters.scan_status IS 'Scan status: unscanned, scanned, or error';
COMMENT ON COLUMN shelters.scanned_date IS 'Date when shelter was last successfully scraped and pets added to database';

