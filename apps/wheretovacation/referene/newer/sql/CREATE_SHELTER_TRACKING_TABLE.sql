c.-- Create table to track shelters and their scan history
CREATE TABLE IF NOT EXISTS shelter_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Shelter Info
  shelter_name TEXT NOT NULL,
  facebook_url TEXT UNIQUE NOT NULL,
  facebook_page_id TEXT,
  shelter_type TEXT DEFAULT 'shelter', -- 'shelter', 'rescue', 'community_page', 'community_group'
  
  -- Location
  location_city TEXT,
  location_state TEXT,
  location_zip TEXT,
  
  -- Scan Tracking
  first_discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_scanned_at TIMESTAMPTZ,
  next_scan_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scan_count INTEGER DEFAULT 0,
  scan_interval_hours INTEGER DEFAULT 6, -- How often to scan (default 6 hours)
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_blocked BOOLEAN DEFAULT false,
  last_error TEXT,
  
  -- Stats
  total_pets_found INTEGER DEFAULT 0,
  last_pets_found INTEGER DEFAULT 0,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shelter_tracking_next_scan ON shelter_tracking(next_scan_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_shelter_tracking_location ON shelter_tracking(location_state, location_city);
CREATE INDEX IF NOT EXISTS idx_shelter_tracking_type ON shelter_tracking(shelter_type);
CREATE INDEX IF NOT EXISTS idx_shelter_tracking_active ON shelter_tracking(is_active, next_scan_at);

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_shelter_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS update_shelter_tracking_timestamp ON shelter_tracking;
CREATE TRIGGER update_shelter_tracking_timestamp
  BEFORE UPDATE ON shelter_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_shelter_tracking_updated_at();

-- Enable RLS
ALTER TABLE shelter_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
DROP POLICY IF EXISTS "Service role full access" ON shelter_tracking;
CREATE POLICY "Service role full access"
  ON shelter_tracking
  FOR ALL
  USING (true)
  WITH CHECK (true);


