-- Shelter API Integration: Auto-populate found pets from shelters
-- Visual matching against lost pets using AI embeddings

CREATE TABLE IF NOT EXISTS shelter_integrations (
  id BIGSERIAL PRIMARY KEY,
  shelter_name TEXT NOT NULL,
  shelter_location TEXT NOT NULL, -- 'Orange Beach, AL'
  
  -- API details
  api_type TEXT NOT NULL CHECK (api_type IN ('petfinder', 'petstablished', 'rescuegroups', 'custom')),
  api_endpoint TEXT,
  api_key_name TEXT, -- Reference to KeyVault
  
  -- Settings
  is_active BOOLEAN DEFAULT TRUE,
  sync_frequency_hours INTEGER DEFAULT 6,
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  
  -- Stats
  total_pets_synced INTEGER DEFAULT 0,
  total_matches_found INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shelter_pets (
  id BIGSERIAL PRIMARY KEY,
  shelter_integration_id BIGINT REFERENCES shelter_integrations(id) ON DELETE CASCADE,
  
  -- Shelter data
  shelter_pet_id TEXT NOT NULL, -- ID in shelter's system
  shelter_name TEXT NOT NULL,
  
  -- Pet info
  pet_type TEXT NOT NULL CHECK (pet_type IN ('dog', 'cat', 'other')),
  breed TEXT,
  color TEXT,
  size TEXT,
  age_estimate TEXT,
  sex TEXT,
  
  -- Description
  description TEXT,
  special_needs TEXT,
  personality TEXT,
  
  -- Photos
  photo_urls TEXT[],
  image_embedding VECTOR(512), -- CLIP embedding for visual matching
  
  -- Location
  found_location TEXT,
  intake_date DATE,
  
  -- Status
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'adopted', 'returned', 'transferred')),
  
  -- Matching
  matched_lost_pet_ids BIGINT[], -- Array of potential matches
  match_confidence JSONB, -- { lost_pet_id: confidence_score }
  high_confidence_match_notified BOOLEAN DEFAULT FALSE,
  
  -- Contact
  shelter_contact_email TEXT,
  shelter_contact_phone TEXT,
  
  -- Metadata
  raw_data JSONB, -- Full API response
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(shelter_integration_id, shelter_pet_id)
);

CREATE TABLE IF NOT EXISTS visual_match_results (
  id BIGSERIAL PRIMARY KEY,
  
  -- Pairing
  lost_pet_id BIGINT NOT NULL,
  shelter_pet_id BIGINT NOT NULL REFERENCES shelter_pets(id) ON DELETE CASCADE,
  
  -- Match details
  visual_similarity DECIMAL(5,4), -- 0-1 (cosine similarity of embeddings)
  feature_match_score DECIMAL(5,4), -- 0-1 (breed, color, size match)
  combined_confidence DECIMAL(5,4), -- Weighted average
  
  -- Match breakdown
  breed_match BOOLEAN,
  color_match BOOLEAN,
  size_match BOOLEAN,
  location_distance_miles DECIMAL(8,2),
  
  -- Status
  status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'owner_notified', 'false_positive', 'confirmed_match')),
  
  -- Notifications
  owner_notified_at TIMESTAMPTZ,
  owner_viewed_at TIMESTAMPTZ,
  owner_feedback TEXT,
  
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS match_notification_log (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT NOT NULL REFERENCES visual_match_results(id) ON DELETE CASCADE,
  
  -- Notification details
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'sms', 'push')),
  recipient TEXT NOT NULL, -- email or phone
  
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'bounced')),
  error_message TEXT,
  
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shelter_integrations_active ON shelter_integrations(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_shelter_integrations_next_sync ON shelter_integrations(next_sync_at) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_shelter_pets_status ON shelter_pets(status);
CREATE INDEX IF NOT EXISTS idx_shelter_pets_intake ON shelter_pets(intake_date DESC);
CREATE INDEX IF NOT EXISTS idx_shelter_pets_embedding ON shelter_pets USING ivfflat (image_embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_visual_matches_confidence ON visual_match_results(combined_confidence DESC) WHERE status = 'pending_review';
CREATE INDEX IF NOT EXISTS idx_visual_matches_lost_pet ON visual_match_results(lost_pet_id);

-- RLS
ALTER TABLE shelter_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shelter_pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE visual_match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_notification_log ENABLE ROW LEVEL SECURITY;

-- Service role manages shelter data
CREATE POLICY "Service role full access on integrations"
  ON shelter_integrations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on shelter_pets"
  ON shelter_pets FOR ALL
  USING (auth.role() = 'service_role');

-- Anyone can view available shelter pets
CREATE POLICY "Anyone can view available shelter pets"
  ON shelter_pets FOR SELECT
  USING (status = 'available');

-- Only owners can see their match results
CREATE POLICY "Owners see their match results"
  ON visual_match_results FOR SELECT
  USING (
    lost_pet_id IN (
      SELECT id FROM lost_pets WHERE contact_email = auth.email()
    )
  );

CREATE POLICY "Service role full access on matches"
  ON visual_match_results FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on notifications"
  ON match_notification_log FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE shelter_integrations IS 'Scrape major shelter APIs (Petfinder, RescueGroups) every 6 hours.';
COMMENT ON TABLE shelter_pets IS 'Auto-populated from shelter APIs. Uses CLIP embeddings for visual matching.';
COMMENT ON TABLE visual_match_results IS 'AI-powered visual matching: shelter pet photos vs lost pet reports. Email owner when 85%+ similarity.';
