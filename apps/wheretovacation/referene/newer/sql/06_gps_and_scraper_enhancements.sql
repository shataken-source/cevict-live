-- ================================================================
-- GPS INTEGRATION & SCRAPER ENHANCEMENTS MIGRATION
-- ================================================================
-- Run this after 05_advanced_features_migration.sql

-- ================================================================
-- 1. CAPTAIN GPS CONNECTIONS TABLE
-- ================================================================

CREATE TABLE captain_gps_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Captain
  captain_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- GPS Provider
  provider TEXT NOT NULL, -- 'navionics', 'garmin', 'furuno', 'simrad', 'raymarine', 'lowrance', 'humminbird', 'browser'
  
  -- Connection Details
  credentials JSONB, -- Encrypted API tokens/credentials
  is_active BOOLEAN DEFAULT true,
  
  -- Connection History
  last_connected TIMESTAMPTZ,
  connection_count INTEGER DEFAULT 0,
  
  -- Settings
  share_location_by_default BOOLEAN DEFAULT false,
  update_interval_seconds INTEGER DEFAULT 5,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(captain_id, provider)
);

-- Indexes
CREATE INDEX idx_gps_connections_captain ON captain_gps_connections(captain_id);
CREATE INDEX idx_gps_connections_active ON captain_gps_connections(is_active);

-- ================================================================
-- 2. LOCATION UPDATES TABLE (Real-time tracking)
-- ================================================================

CREATE TABLE location_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  captain_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Location Data
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(8, 2), -- in meters
  
  -- Movement Data
  speed DECIMAL(6, 2), -- in knots
  heading DECIMAL(5, 2), -- degrees 0-360
  altitude DECIMAL(8, 2), -- in meters (if available)
  
  -- Provider Info
  provider TEXT,
  
  -- Timing
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_location_updates_booking ON location_updates(booking_id);
CREATE INDEX idx_location_updates_captain ON location_updates(captain_id);
CREATE INDEX idx_location_updates_timestamp ON location_updates(timestamp DESC);

-- Spatial index for location queries
CREATE INDEX idx_location_updates_coordinates ON location_updates USING GIST(
  ST_MakePoint(longitude, latitude)::geography
);

-- ================================================================
-- 3. SCRAPER FAILURE REPORTS TABLE
-- ================================================================

CREATE TABLE scraper_failure_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Run Info
  run_timestamp TIMESTAMPTZ NOT NULL,
  mode TEXT, -- 'auto', 'manual'
  sources TEXT[],
  
  -- Failure Counts
  total_failures INTEGER DEFAULT 0,
  total_incomplete INTEGER DEFAULT 0,
  
  -- Detailed Data
  failures JSONB, -- Array of complete failures
  incomplete_boats JSONB, -- Array of boats with missing data
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_failure_reports_timestamp ON scraper_failure_reports(run_timestamp DESC);
CREATE INDEX idx_failure_reports_totals ON scraper_failure_reports(total_failures, total_incomplete);

-- ================================================================
-- 4. UPDATE SCRAPED_BOATS TABLE
-- ================================================================

-- Add data quality tracking
ALTER TABLE scraped_boats
  ADD COLUMN IF NOT EXISTS data_complete BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS missing_fields TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS data_quality_score INTEGER DEFAULT 0; -- 0-100

-- Update quality score based on completeness
CREATE OR REPLACE FUNCTION calculate_data_quality_score()
RETURNS TRIGGER AS $$
DECLARE
  score INTEGER := 0;
  required_fields TEXT[] := ARRAY['name', 'location', 'captain', 'phone', 'boat_type', 'length'];
  field TEXT;
BEGIN
  -- Start with base score
  score := 0;
  
  -- Add points for each required field (15 points each)
  FOREACH field IN ARRAY required_fields
  LOOP
    IF (NEW).field IS NOT NULL AND (NEW).field != '' THEN
      score := score + 15;
    END IF;
  END LOOP;
  
  -- Bonus points for additional info
  IF NEW.email IS NOT NULL THEN score := score + 5; END IF;
  IF NEW.description IS NOT NULL THEN score := score + 5; END IF;
  IF NEW.photos IS NOT NULL AND array_length(NEW.photos, 1) > 0 THEN score := score + 5; END IF;
  IF NEW.price IS NOT NULL THEN score := score + 5; END IF;
  
  -- Set final score
  NEW.data_quality_score := LEAST(score, 100);
  
  -- Mark as complete if score is high enough
  NEW.data_complete := score >= 90;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_quality_score_trigger
  BEFORE INSERT OR UPDATE ON scraped_boats
  FOR EACH ROW
  EXECUTE FUNCTION calculate_data_quality_score();

-- ================================================================
-- 5. UPDATE SCRAPER_LOGS TABLE
-- ================================================================

-- Add new columns for enhanced tracking
ALTER TABLE scraper_logs
  ADD COLUMN IF NOT EXISTS target_boats INTEGER,
  ADD COLUMN IF NOT EXISTS complete_boats INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS incomplete_boats INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failures_count INTEGER DEFAULT 0;

-- ================================================================
-- 6. UPDATE BOOKINGS TABLE
-- ================================================================

-- Add location sharing tracking
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS location_sharing_active BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS location_sharing_started TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS location_sharing_ended TIMESTAMPTZ;

-- ================================================================
-- 7. UPDATE SCRAPER_CONFIG TABLE
-- ================================================================

-- Add configurable boat count
ALTER TABLE scraper_config
  ADD COLUMN IF NOT EXISTS max_boats_per_run INTEGER DEFAULT 10;

-- Update default config
UPDATE scraper_config 
SET max_boats_per_run = 10 
WHERE id = 1 AND max_boats_per_run IS NULL;

-- ================================================================
-- 8. RLS POLICIES FOR NEW TABLES
-- ================================================================

-- Captain GPS Connections - Captains can view/manage their own
ALTER TABLE captain_gps_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Captains can view their own GPS connections"
  ON captain_gps_connections FOR SELECT
  USING (
    captain_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Captains can manage their own GPS connections"
  ON captain_gps_connections FOR ALL
  USING (
    captain_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Location Updates - Customers can see for their bookings, captains for their trips
ALTER TABLE location_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view locations for their bookings"
  ON location_updates FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE customer_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Captains can view their own location updates"
  ON location_updates FOR SELECT
  USING (
    captain_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Captains can insert location updates"
  ON location_updates FOR INSERT
  WITH CHECK (
    captain_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Scraper Failure Reports - Admins only
ALTER TABLE scraper_failure_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view failure reports"
  ON scraper_failure_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ================================================================
-- 9. HELPER FUNCTIONS
-- ================================================================

-- Get captain's current location
CREATE OR REPLACE FUNCTION get_captain_current_location(
  p_captain_id UUID
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'latitude', latitude,
    'longitude', longitude,
    'speed', speed,
    'heading', heading,
    'accuracy', accuracy,
    'timestamp', timestamp
  ) INTO result
  FROM location_updates
  WHERE captain_id = p_captain_id
  ORDER BY timestamp DESC
  LIMIT 1;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get booking location history
CREATE OR REPLACE FUNCTION get_booking_location_history(
  p_booking_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  latitude DECIMAL,
  longitude DECIMAL,
  speed DECIMAL,
  heading DECIMAL,
  timestamp TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lu.latitude,
    lu.longitude,
    lu.speed,
    lu.heading,
    lu.timestamp
  FROM location_updates lu
  WHERE lu.booking_id = p_booking_id
  ORDER BY lu.timestamp DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get incomplete boats for review
CREATE OR REPLACE FUNCTION get_incomplete_boats(
  p_min_quality_score INTEGER DEFAULT 50
)
RETURNS TABLE (
  boat_id UUID,
  name TEXT,
  location TEXT,
  quality_score INTEGER,
  missing_fields TEXT[],
  source TEXT,
  source_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sb.id,
    sb.name,
    sb.location,
    sb.data_quality_score,
    sb.missing_fields,
    sb.source,
    sb.source_url
  FROM scraped_boats sb
  WHERE sb.data_complete = false
  AND sb.claimed = false
  AND sb.data_quality_score >= p_min_quality_score
  ORDER BY sb.data_quality_score DESC, sb.last_seen DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ================================================================
-- 10. AUTOMATIC CLEANUP
-- ================================================================

-- Delete old location updates (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_location_updates()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM location_updates
  WHERE timestamp < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (run this in Supabase cron if needed)
-- SELECT cron.schedule('cleanup-locations', '0 2 * * *', 'SELECT cleanup_old_location_updates()');

-- ================================================================
-- MIGRATION COMPLETE!
-- ================================================================

-- Verify new tables
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'captain_gps_connections',
  'location_updates',
  'scraper_failure_reports'
);

-- Check updated tables
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'scraped_boats' 
AND column_name IN ('data_complete', 'data_quality_score', 'missing_fields');
