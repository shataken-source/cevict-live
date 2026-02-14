-- ═══════════════════════════════════════════════════════════════════════════
-- BIOMETRIC IDENTIFICATION SYSTEM
-- "Digital DNA" for Pet Recovery
-- 
-- Uses nose-prints (dogs) and facial landmarks (cats) for unique identification
-- Similar to fingerprint matching in forensics
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add biometric columns to lost_pets table
ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS nose_print_url TEXT;
ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS nose_print_vector JSONB; -- 512-point vector
ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS facial_landmarks_url TEXT;
ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS facial_landmarks_vector JSONB;
ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS biometric_hash TEXT; -- Unique identifier
ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS biometric_confidence DECIMAL(5,2); -- Quality score 0-100
ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS biometric_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS biometric_captured_at TIMESTAMPTZ;

-- 2. Add biometric columns to pet_vault table
ALTER TABLE pet_vault ADD COLUMN IF NOT EXISTS nose_print_url TEXT;
ALTER TABLE pet_vault ADD COLUMN IF NOT EXISTS nose_print_vector JSONB;
ALTER TABLE pet_vault ADD COLUMN IF NOT EXISTS facial_landmarks_url TEXT;
ALTER TABLE pet_vault ADD COLUMN IF NOT EXISTS facial_landmarks_vector JSONB;
ALTER TABLE pet_vault ADD COLUMN IF NOT EXISTS biometric_hash TEXT;
ALTER TABLE pet_vault ADD COLUMN IF NOT EXISTS biometric_confidence DECIMAL(5,2);
ALTER TABLE pet_vault ADD COLUMN IF NOT EXISTS biometric_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE pet_vault ADD COLUMN IF NOT EXISTS biometric_captured_at TIMESTAMPTZ;

-- 3. Create biometric_matches table for forensic-grade match logging
CREATE TABLE IF NOT EXISTS biometric_matches (
  id SERIAL PRIMARY KEY,
  
  -- The search image
  search_image_url TEXT NOT NULL,
  search_vector JSONB,
  search_location_lat DECIMAL(10, 8),
  search_location_lon DECIMAL(11, 8),
  search_timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Who performed the search
  searcher_type TEXT NOT NULL CHECK (searcher_type IN ('officer', 'user', 'system')),
  searcher_id TEXT, -- officer_id or user_id
  
  -- Match results
  match_pet_id INTEGER,
  match_source TEXT CHECK (match_source IN ('lost_pets', 'pet_vault')),
  biometric_similarity DECIMAL(5,4), -- 0.0000 to 1.0000 (99.99%)
  biometric_confidence_score DECIMAL(5,2), -- Final confidence 0-100
  
  -- Match verification
  is_verified_match BOOLEAN DEFAULT FALSE,
  verified_by TEXT, -- officer who verified
  verified_at TIMESTAMPTZ,
  verification_method TEXT, -- 'microchip', 'owner_id', 'photo_comparison', etc.
  
  -- Outcome
  outcome TEXT CHECK (outcome IN ('confirmed', 'rejected', 'pending', 'rto', 'shelter')),
  outcome_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create biometric_markers table for detailed feature storage
CREATE TABLE IF NOT EXISTS biometric_markers (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL,
  pet_source TEXT NOT NULL CHECK (pet_source IN ('lost_pets', 'pet_vault')),
  
  -- Marker type
  marker_type TEXT NOT NULL CHECK (marker_type IN ('nose_print', 'facial', 'ear_shape', 'eye_pattern', 'coat_pattern')),
  
  -- Feature data
  feature_vector JSONB NOT NULL, -- 128-512 dimensional vector
  feature_hash TEXT, -- Quick lookup hash
  feature_quality DECIMAL(5,2), -- Image quality score
  
  -- Metadata
  image_url TEXT NOT NULL,
  capture_method TEXT, -- 'manual_upload', 'camera_capture', 'ai_extracted'
  ai_model_used TEXT, -- 'gpt-4-vision', 'clip', 'custom_cnn'
  
  -- Indexing optimization
  cluster_id INTEGER, -- For approximate nearest neighbor search
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(pet_id, pet_source, marker_type)
);

-- 5. Create indexes for fast biometric matching
CREATE INDEX IF NOT EXISTS idx_biometric_markers_pet ON biometric_markers(pet_id, pet_source);
CREATE INDEX IF NOT EXISTS idx_biometric_markers_type ON biometric_markers(marker_type);
CREATE INDEX IF NOT EXISTS idx_biometric_markers_cluster ON biometric_markers(cluster_id);
CREATE INDEX IF NOT EXISTS idx_biometric_markers_hash ON biometric_markers(feature_hash);

CREATE INDEX IF NOT EXISTS idx_biometric_matches_searcher ON biometric_matches(searcher_type, searcher_id);
CREATE INDEX IF NOT EXISTS idx_biometric_matches_pet ON biometric_matches(match_pet_id, match_source);
CREATE INDEX IF NOT EXISTS idx_biometric_matches_outcome ON biometric_matches(outcome);

-- 6. Create index on biometric hash for quick lookups
CREATE INDEX IF NOT EXISTS idx_lost_pets_biometric_hash ON lost_pets(biometric_hash) WHERE biometric_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pet_vault_biometric_hash ON pet_vault(biometric_hash) WHERE biometric_hash IS NOT NULL;

-- 7. Function to compute biometric similarity score
CREATE OR REPLACE FUNCTION compute_biometric_similarity(
  vec1 JSONB,
  vec2 JSONB
) RETURNS DECIMAL AS $$
DECLARE
  arr1 FLOAT[];
  arr2 FLOAT[];
  dot_product FLOAT := 0;
  norm1 FLOAT := 0;
  norm2 FLOAT := 0;
  i INTEGER;
BEGIN
  -- Convert JSONB arrays to float arrays
  SELECT ARRAY_AGG(value::FLOAT) INTO arr1 FROM jsonb_array_elements_text(vec1) AS value;
  SELECT ARRAY_AGG(value::FLOAT) INTO arr2 FROM jsonb_array_elements_text(vec2) AS value;
  
  -- Check length match
  IF array_length(arr1, 1) != array_length(arr2, 1) THEN
    RETURN 0;
  END IF;
  
  -- Compute cosine similarity
  FOR i IN 1..array_length(arr1, 1) LOOP
    dot_product := dot_product + (arr1[i] * arr2[i]);
    norm1 := norm1 + (arr1[i] * arr1[i]);
    norm2 := norm2 + (arr2[i] * arr2[i]);
  END LOOP;
  
  IF norm1 = 0 OR norm2 = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN dot_product / (sqrt(norm1) * sqrt(norm2));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 8. Function to search for biometric matches
CREATE OR REPLACE FUNCTION search_biometric_matches(
  search_vector JSONB,
  pet_type TEXT DEFAULT NULL,
  min_similarity DECIMAL DEFAULT 0.75,
  max_results INTEGER DEFAULT 20
) RETURNS TABLE(
  pet_id INTEGER,
  pet_source TEXT,
  pet_name TEXT,
  similarity DECIMAL,
  biometric_hash TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH all_pets AS (
    -- Lost pets with biometrics
    SELECT 
      lp.id AS pet_id,
      'lost_pets'::TEXT AS pet_source,
      lp.pet_name,
      lp.nose_print_vector AS vector,
      lp.biometric_hash,
      lp.pet_type
    FROM lost_pets lp
    WHERE lp.nose_print_vector IS NOT NULL
      AND lp.status = 'lost'
      AND (pet_type IS NULL OR lp.pet_type = pet_type)
    
    UNION ALL
    
    -- Pet vault with biometrics (currently lost)
    SELECT 
      pv.id AS pet_id,
      'pet_vault'::TEXT AS pet_source,
      pv.pet_name,
      pv.nose_print_vector AS vector,
      pv.biometric_hash,
      pv.pet_type
    FROM pet_vault pv
    WHERE pv.nose_print_vector IS NOT NULL
      AND pv.is_currently_lost = TRUE
      AND (pet_type IS NULL OR pv.pet_type = pet_type)
  )
  SELECT 
    ap.pet_id,
    ap.pet_source,
    ap.pet_name,
    compute_biometric_similarity(search_vector, ap.vector) AS similarity,
    ap.biometric_hash
  FROM all_pets ap
  WHERE compute_biometric_similarity(search_vector, ap.vector) >= min_similarity
  ORDER BY similarity DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger to update biometric timestamp
CREATE OR REPLACE FUNCTION update_biometric_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.nose_print_url IS DISTINCT FROM OLD.nose_print_url 
     OR NEW.facial_landmarks_url IS DISTINCT FROM OLD.facial_landmarks_url THEN
    NEW.biometric_captured_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lost_pets_biometric_timestamp ON lost_pets;
CREATE TRIGGER lost_pets_biometric_timestamp
  BEFORE UPDATE ON lost_pets
  FOR EACH ROW
  EXECUTE FUNCTION update_biometric_timestamp();

DROP TRIGGER IF EXISTS pet_vault_biometric_timestamp ON pet_vault;
CREATE TRIGGER pet_vault_biometric_timestamp
  BEFORE UPDATE ON pet_vault
  FOR EACH ROW
  EXECUTE FUNCTION update_biometric_timestamp();

-- 10. Enable RLS on new tables
ALTER TABLE biometric_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_markers ENABLE ROW LEVEL SECURITY;

-- Service role access
CREATE POLICY "Service role full access to biometric_matches"
  ON biometric_matches FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service role full access to biometric_markers"
  ON biometric_markers FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- 11. View for quick biometric stats
CREATE OR REPLACE VIEW biometric_stats AS
SELECT 
  'lost_pets' AS source,
  COUNT(*) FILTER (WHERE nose_print_vector IS NOT NULL) AS pets_with_biometrics,
  COUNT(*) FILTER (WHERE biometric_verified) AS verified_biometrics,
  AVG(biometric_confidence) AS avg_confidence
FROM lost_pets
WHERE status = 'lost'

UNION ALL

SELECT 
  'pet_vault' AS source,
  COUNT(*) FILTER (WHERE nose_print_vector IS NOT NULL) AS pets_with_biometrics,
  COUNT(*) FILTER (WHERE biometric_verified) AS verified_biometrics,
  AVG(biometric_confidence) AS avg_confidence
FROM pet_vault
WHERE is_currently_lost = TRUE;

