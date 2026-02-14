-- =============================================
-- PET SEARCH LOGS TABLE
-- Tracks every time a pet is searched for matches
-- =============================================

CREATE TABLE IF NOT EXISTS pet_search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pet being searched for
  pet_id UUID NOT NULL REFERENCES lost_pets(id) ON DELETE CASCADE,
  
  -- Search details
  searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  search_type TEXT, -- 'immediate', 'continuous', 'manual', 'scheduled'
  search_area TEXT, -- Location or area searched
  search_radius_miles INTEGER, -- Radius in miles
  
  -- Results
  matches_found INTEGER DEFAULT 0,
  strong_matches INTEGER DEFAULT 0,
  matches_checked JSONB, -- Array of pet IDs that were checked
  
  -- Metadata
  search_duration_ms INTEGER, -- How long the search took
  notes TEXT -- Any additional notes about the search
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pet_search_logs_pet_id ON pet_search_logs(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_search_logs_searched_at ON pet_search_logs(searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_pet_search_logs_type ON pet_search_logs(search_type);

-- Enable RLS
ALTER TABLE pet_search_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow public read/write for search logs)
CREATE POLICY "Anyone can view search logs" ON pet_search_logs
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create search logs" ON pet_search_logs
  FOR INSERT WITH CHECK (true);

-- Function to get search stats for a pet
CREATE OR REPLACE FUNCTION get_pet_search_stats(pet_uuid UUID)
RETURNS TABLE (
  total_searches BIGINT,
  match_attempts BIGINT,
  last_search_time TIMESTAMPTZ,
  avg_matches_per_search NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_searches,
    COUNT(*) FILTER (WHERE matches_found > 0)::BIGINT as match_attempts,
    MAX(searched_at) as last_search_time,
    COALESCE(AVG(matches_found), 0) as avg_matches_per_search
  FROM pet_search_logs
  WHERE pet_id = pet_uuid;
END;
$$ LANGUAGE plpgsql;

