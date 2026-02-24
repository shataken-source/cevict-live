-- ═══════════════════════════════════════════════════════════════════════════
-- MATCH REPORTS & SHELTERS DIRECTORY
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add notification_details column to pet_matches
ALTER TABLE pet_matches ADD COLUMN IF NOT EXISTS notification_details JSONB;

-- 2. Create shelters_directory table
CREATE TABLE IF NOT EXISTS shelters_directory (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  website TEXT,
  
  -- Address
  address TEXT,
  city TEXT,
  state TEXT,
  zipcode TEXT,
  country TEXT DEFAULT 'USA',
  
  -- Coordinates
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Metadata
  shelter_type TEXT DEFAULT 'shelter', -- 'shelter', 'rescue', 'foster', 'humane_society'
  is_verified BOOLEAN DEFAULT FALSE,
  is_partner BOOLEAN DEFAULT FALSE,
  
  -- Stats
  total_pets INTEGER DEFAULT 0,
  reunifications INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_scraped_at TIMESTAMPTZ,
  
  UNIQUE(email),
  UNIQUE(name, city, state)
);

-- 3. Add shelter_id to lost_pets if not exists
ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS shelter_id INTEGER REFERENCES shelters_directory(id);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_shelters_location ON shelters_directory(city, state);
CREATE INDEX IF NOT EXISTS idx_shelters_email ON shelters_directory(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shelters_partner ON shelters_directory(is_partner) WHERE is_partner = TRUE;
CREATE INDEX IF NOT EXISTS idx_lost_pets_shelter ON lost_pets(shelter_id) WHERE shelter_id IS NOT NULL;

-- 5. Update trigger for shelters
CREATE OR REPLACE FUNCTION update_shelters_directory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shelters_directory_updated_at ON shelters_directory;
CREATE TRIGGER shelters_directory_updated_at
  BEFORE UPDATE ON shelters_directory
  FOR EACH ROW
  EXECUTE FUNCTION update_shelters_directory_updated_at();

-- 6. Insert some sample shelters (optional)
INSERT INTO shelters_directory (name, email, city, state, shelter_type)
VALUES 
  ('Sample Animal Shelter', 'shelter@example.com', 'Houston', 'TX', 'shelter'),
  ('Happy Paws Rescue', 'happypaws@example.com', 'Austin', 'TX', 'rescue')
ON CONFLICT (name, city, state) DO NOTHING;

-- 7. Create view for match statistics
CREATE OR REPLACE VIEW match_statistics AS
SELECT 
  DATE(created_at) as match_date,
  COUNT(*) as total_matches,
  COUNT(*) FILTER (WHERE status = 'shelter_notified') as shelters_notified,
  COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_matches,
  COUNT(*) FILTER (WHERE status = 'reunited') as reunifications,
  AVG(similarity_score) as avg_similarity
FROM pet_matches
GROUP BY DATE(created_at)
ORDER BY match_date DESC;

