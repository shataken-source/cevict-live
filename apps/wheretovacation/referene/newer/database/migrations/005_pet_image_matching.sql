-- ═══════════════════════════════════════════════════════════════════════════
-- PET IMAGE MATCHING SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add image_vectors column to lost_pets table
ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS image_vectors JSONB;

-- 2. Add location coordinates (for distance calculation)
ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 8);
ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS location_lon DECIMAL(11, 8);

-- 3. Add owner contact info (for SMS notifications)
ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS owner_phone TEXT;
ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- 4. Create pet_matches table
CREATE TABLE IF NOT EXISTS pet_matches (
  id SERIAL PRIMARY KEY,
  lost_pet_id INTEGER NOT NULL REFERENCES lost_pets(id) ON DELETE CASCADE,
  found_pet_id INTEGER NOT NULL REFERENCES lost_pets(id) ON DELETE CASCADE,
  similarity_score DECIMAL(5, 4) NOT NULL, -- 0.0000 to 1.0000
  distance_miles DECIMAL(8, 2),
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'false_positive', 'reunited'
  notified_at TIMESTAMPTZ,
  owner_responded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(lost_pet_id, found_pet_id)
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lost_pets_status_vectors ON lost_pets(status) WHERE image_vectors IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lost_pets_location ON lost_pets(location_lat, location_lon) WHERE location_lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pet_matches_lost ON pet_matches(lost_pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_matches_found ON pet_matches(found_pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_matches_status ON pet_matches(status);
CREATE INDEX IF NOT EXISTS idx_pet_matches_similarity ON pet_matches(similarity_score DESC);

-- 6. Create Supabase Storage bucket for pet images (run in Supabase Dashboard)
-- Storage → Create Bucket → Name: "pet-images" → Public: true

-- 7. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pet_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pet_matches_updated_at
  BEFORE UPDATE ON pet_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_pet_matches_updated_at();

