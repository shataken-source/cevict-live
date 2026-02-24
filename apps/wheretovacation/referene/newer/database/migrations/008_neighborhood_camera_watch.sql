-- ═══════════════════════════════════════════════════════════════════════════
-- NEIGHBORHOOD CAMERA WATCH SYSTEM
-- Privacy-first neighbor notification for lost pets
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Camera Watch Volunteers (neighbors who opt-in)
CREATE TABLE IF NOT EXISTS camera_watch_volunteers (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Location (used for radius search)
  location_lat DECIMAL(10, 8) NOT NULL,
  location_lon DECIMAL(11, 8) NOT NULL,
  location_address TEXT,
  location_city TEXT,
  location_state TEXT,
  location_zip TEXT,
  
  -- Notification preferences
  notify_email TEXT,
  notify_phone TEXT,
  notify_push BOOLEAN DEFAULT TRUE,
  max_radius_miles DECIMAL(4,2) DEFAULT 1.0,
  
  -- Privacy settings
  anonymous_by_default BOOLEAN DEFAULT TRUE,
  share_contact_if_match BOOLEAN DEFAULT FALSE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  opted_out_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Camera Watch Notifications (alerts sent to volunteers)
CREATE TABLE IF NOT EXISTS camera_watch_notifications (
  id SERIAL PRIMARY KEY,
  volunteer_id INTEGER REFERENCES camera_watch_volunteers(id) ON DELETE CASCADE,
  pet_id INTEGER REFERENCES lost_pets(id) ON DELETE CASCADE,
  
  -- Notification details
  notification_type TEXT NOT NULL, -- 'new_lost_pet', 'match_found', 'pet_found'
  message TEXT,
  distance_miles DECIMAL(4,2),
  
  -- Status
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  
  UNIQUE(volunteer_id, pet_id, notification_type)
);

-- 3. Camera Uploads (footage from volunteers)
CREATE TABLE IF NOT EXISTS camera_uploads (
  id SERIAL PRIMARY KEY,
  volunteer_id INTEGER REFERENCES camera_watch_volunteers(id) ON DELETE SET NULL,
  pet_id INTEGER REFERENCES lost_pets(id) ON DELETE CASCADE,
  
  -- Upload details
  upload_type TEXT NOT NULL, -- 'image', 'video'
  storage_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size_bytes INTEGER,
  duration_seconds INTEGER, -- For videos
  
  -- Capture metadata
  capture_timestamp TIMESTAMPTZ,
  capture_location_lat DECIMAL(10, 8),
  capture_location_lon DECIMAL(11, 8),
  capture_location_text TEXT,
  
  -- AI Analysis results
  ai_analyzed BOOLEAN DEFAULT FALSE,
  ai_analysis_at TIMESTAMPTZ,
  ai_match_confidence DECIMAL(5,4), -- 0.0000 to 1.0000
  ai_match_details JSONB,
  ai_detected_pet_type TEXT,
  ai_detected_features JSONB,
  
  -- Verification
  is_verified_match BOOLEAN DEFAULT FALSE,
  verified_by_owner BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  
  -- Privacy (uploader remains anonymous by default)
  uploader_anonymous BOOLEAN DEFAULT TRUE,
  uploader_consent_to_contact BOOLEAN DEFAULT FALSE,
  uploader_contact_email TEXT,
  uploader_contact_phone TEXT,
  
  -- Map pin
  pinned_on_map BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indexes for geospatial queries
CREATE INDEX IF NOT EXISTS idx_camera_volunteers_location 
  ON camera_watch_volunteers(location_lat, location_lon) 
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_camera_volunteers_city 
  ON camera_watch_volunteers(location_city, location_state) 
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_camera_uploads_pet 
  ON camera_uploads(pet_id);

CREATE INDEX IF NOT EXISTS idx_camera_uploads_match 
  ON camera_uploads(ai_match_confidence DESC) 
  WHERE ai_match_confidence > 0.7;

-- 5. Function to find volunteers within radius
CREATE OR REPLACE FUNCTION find_volunteers_in_radius(
  center_lat DECIMAL(10, 8),
  center_lon DECIMAL(11, 8),
  radius_miles DECIMAL(4,2) DEFAULT 1.0
)
RETURNS TABLE (
  volunteer_id INTEGER,
  distance_miles DECIMAL(8,4)
) AS $$
BEGIN
  -- Haversine formula for distance calculation
  RETURN QUERY
  SELECT 
    v.id AS volunteer_id,
    (3959 * acos(
      cos(radians(center_lat)) * cos(radians(v.location_lat)) *
      cos(radians(v.location_lon) - radians(center_lon)) +
      sin(radians(center_lat)) * sin(radians(v.location_lat))
    ))::DECIMAL(8,4) AS distance_miles
  FROM camera_watch_volunteers v
  WHERE v.is_active = TRUE
    AND (3959 * acos(
      cos(radians(center_lat)) * cos(radians(v.location_lat)) *
      cos(radians(v.location_lon) - radians(center_lon)) +
      sin(radians(center_lat)) * sin(radians(v.location_lat))
    )) <= radius_miles
  ORDER BY distance_miles ASC;
END;
$$ LANGUAGE plpgsql;

-- 6. Enable RLS
ALTER TABLE camera_watch_volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE camera_watch_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE camera_uploads ENABLE ROW LEVEL SECURITY;

-- 7. Policies for service role
CREATE POLICY "Service role full access to camera_watch_volunteers"
  ON camera_watch_volunteers FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service role full access to camera_watch_notifications"
  ON camera_watch_notifications FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service role full access to camera_uploads"
  ON camera_uploads FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

