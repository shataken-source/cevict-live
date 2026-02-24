-- ═══════════════════════════════════════════════════════════════════════════
-- FIELD OFFICER DASHBOARD SYSTEM
-- For Animal Control and Law Enforcement personnel
-- Enables rapid pet matching and "Return to Owner" (RTO) in the field
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Create user_roles enum if not exists
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin', 'shelter', 'officer');
EXCEPTION
  WHEN duplicate_object THEN 
    -- Add 'officer' to existing enum if needed
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'officer';
END $$;

-- 2. Create officers table (verified professionals)
CREATE TABLE IF NOT EXISTS officers (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  
  -- Professional Information
  badge_number TEXT,
  department_name TEXT NOT NULL,
  department_type TEXT NOT NULL CHECK (department_type IN ('animal_control', 'police', 'sheriff', 'municipal', 'state', 'federal', 'other')),
  jurisdiction TEXT, -- City/County/State
  
  -- Contact Info (work)
  work_email TEXT NOT NULL,
  work_phone TEXT,
  
  -- Verification
  email_domain TEXT NOT NULL, -- e.g., 'cityname.gov', 'animalcontrol.org'
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by TEXT, -- Admin who verified
  verification_document_url TEXT, -- Upload of badge/ID
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Stats
  total_scans INTEGER DEFAULT 0,
  total_matches INTEGER DEFAULT 0,
  total_rtos INTEGER DEFAULT 0, -- Return To Owner count
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create officer_scans table (every deep scan performed)
CREATE TABLE IF NOT EXISTS officer_scans (
  id SERIAL PRIMARY KEY,
  officer_id INTEGER NOT NULL REFERENCES officers(id) ON DELETE CASCADE,
  
  -- Scan Details
  scanned_photo_url TEXT NOT NULL,
  scan_location_lat DECIMAL(10, 8),
  scan_location_lon DECIMAL(11, 8),
  scan_location_address TEXT,
  scan_timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- AI Analysis Results
  detected_pet_type TEXT, -- 'dog', 'cat', etc.
  detected_breed TEXT,
  detected_color TEXT,
  detected_size TEXT,
  ai_description TEXT,
  
  -- Match Results
  matches_found INTEGER DEFAULT 0,
  top_match_id INTEGER, -- References lost_pets or pet_vault
  top_match_confidence DECIMAL(5,2),
  all_matches JSONB, -- Array of {pet_id, confidence, source}
  
  -- Processing
  processing_time_ms INTEGER,
  ai_model_used TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create officer_encounters table (found pet encounters)
CREATE TABLE IF NOT EXISTS officer_encounters (
  id SERIAL PRIMARY KEY,
  officer_id INTEGER NOT NULL REFERENCES officers(id) ON DELETE CASCADE,
  scan_id INTEGER REFERENCES officer_scans(id),
  
  -- Pet Information (from scan or manual entry)
  pet_type TEXT NOT NULL,
  pet_breed TEXT,
  pet_color TEXT,
  pet_size TEXT,
  pet_description TEXT,
  pet_photo_url TEXT,
  
  -- Location
  pickup_location_lat DECIMAL(10, 8),
  pickup_location_lon DECIMAL(11, 8),
  pickup_location_address TEXT,
  pickup_timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Match Details (if matched)
  matched_pet_id INTEGER, -- References lost_pets
  match_confidence DECIMAL(5,2),
  match_source TEXT, -- 'lost_pets', 'pet_vault'
  
  -- Owner Contact (revealed only if match > 85%)
  owner_name TEXT,
  owner_phone TEXT,
  owner_email TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  
  -- Outcome
  outcome TEXT CHECK (outcome IN ('rto', 'shelter', 'released', 'pending', 'deceased', 'other')),
  outcome_notes TEXT,
  outcome_timestamp TIMESTAMPTZ,
  
  -- If RTO (Return To Owner)
  rto_verified BOOLEAN DEFAULT FALSE,
  rto_signature_url TEXT, -- Owner signature confirming pickup
  rto_verified_id TEXT, -- How owner proved identity
  
  -- If taken to shelter
  shelter_name TEXT,
  shelter_intake_number TEXT,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'cancelled')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create officer_rto_log table (detailed RTO records)
CREATE TABLE IF NOT EXISTS officer_rto_log (
  id SERIAL PRIMARY KEY,
  encounter_id INTEGER NOT NULL REFERENCES officer_encounters(id) ON DELETE CASCADE,
  officer_id INTEGER NOT NULL REFERENCES officers(id) ON DELETE CASCADE,
  
  -- Owner Verification
  owner_id_type TEXT, -- 'drivers_license', 'passport', 'utility_bill', etc.
  owner_id_verified BOOLEAN DEFAULT FALSE,
  owner_signature_captured BOOLEAN DEFAULT FALSE,
  
  -- Pet Verification
  microchip_scanned BOOLEAN DEFAULT FALSE,
  microchip_number TEXT,
  microchip_matches BOOLEAN,
  
  -- Photos for record
  reunion_photo_url TEXT, -- Photo of owner with pet
  
  -- Confirmation
  owner_confirmed_at TIMESTAMPTZ,
  officer_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_officers_user_id ON officers(user_id);
CREATE INDEX IF NOT EXISTS idx_officers_work_email ON officers(work_email);
CREATE INDEX IF NOT EXISTS idx_officers_is_verified ON officers(is_verified);
CREATE INDEX IF NOT EXISTS idx_officers_department_type ON officers(department_type);

CREATE INDEX IF NOT EXISTS idx_officer_scans_officer_id ON officer_scans(officer_id);
CREATE INDEX IF NOT EXISTS idx_officer_scans_timestamp ON officer_scans(scan_timestamp);
CREATE INDEX IF NOT EXISTS idx_officer_scans_location ON officer_scans(scan_location_lat, scan_location_lon);

CREATE INDEX IF NOT EXISTS idx_officer_encounters_officer_id ON officer_encounters(officer_id);
CREATE INDEX IF NOT EXISTS idx_officer_encounters_status ON officer_encounters(status);
CREATE INDEX IF NOT EXISTS idx_officer_encounters_outcome ON officer_encounters(outcome);
CREATE INDEX IF NOT EXISTS idx_officer_encounters_location ON officer_encounters(pickup_location_lat, pickup_location_lon);

-- 7. Add column to lost_pets for quick matching if not exists
DO $$ BEGIN
  ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS image_vectors JSONB;
  ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
  ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- 8. Function to validate officer email domain
CREATE OR REPLACE FUNCTION validate_officer_email(email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  domain TEXT;
  valid_domains TEXT[] := ARRAY[
    '.gov', '.org', '.edu',
    'police.', 'sheriff.', 'pd.',
    'animalcontrol.', 'animalshelter.',
    'municipal.', 'county.', 'state.'
  ];
  pattern TEXT;
BEGIN
  domain := LOWER(split_part(email, '@', 2));
  
  -- Check for valid domain patterns
  FOREACH pattern IN ARRAY valid_domains LOOP
    IF domain LIKE '%' || pattern || '%' THEN
      RETURN TRUE;
    END IF;
  END LOOP;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 9. Function to update officer stats
CREATE OR REPLACE FUNCTION update_officer_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update scan count
  IF TG_TABLE_NAME = 'officer_scans' AND TG_OP = 'INSERT' THEN
    UPDATE officers 
    SET total_scans = total_scans + 1, 
        last_active_at = NOW(),
        updated_at = NOW()
    WHERE id = NEW.officer_id;
  END IF;
  
  -- Update match and RTO counts
  IF TG_TABLE_NAME = 'officer_encounters' THEN
    IF TG_OP = 'INSERT' AND NEW.matched_pet_id IS NOT NULL THEN
      UPDATE officers 
      SET total_matches = total_matches + 1,
          updated_at = NOW()
      WHERE id = NEW.officer_id;
    END IF;
    
    IF TG_OP = 'UPDATE' AND NEW.outcome = 'rto' AND OLD.outcome != 'rto' THEN
      UPDATE officers 
      SET total_rtos = total_rtos + 1,
          updated_at = NOW()
      WHERE id = NEW.officer_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create triggers for stats
DROP TRIGGER IF EXISTS officer_scan_stats_trigger ON officer_scans;
CREATE TRIGGER officer_scan_stats_trigger
  AFTER INSERT ON officer_scans
  FOR EACH ROW
  EXECUTE FUNCTION update_officer_stats();

DROP TRIGGER IF EXISTS officer_encounter_stats_trigger ON officer_encounters;
CREATE TRIGGER officer_encounter_stats_trigger
  AFTER INSERT OR UPDATE ON officer_encounters
  FOR EACH ROW
  EXECUTE FUNCTION update_officer_stats();

-- 11. Updated_at trigger for encounters
CREATE OR REPLACE FUNCTION update_officer_encounter_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS officer_encounter_updated_at ON officer_encounters;
CREATE TRIGGER officer_encounter_updated_at
  BEFORE UPDATE ON officer_encounters
  FOR EACH ROW
  EXECUTE FUNCTION update_officer_encounter_timestamp();

-- 12. Enable RLS
ALTER TABLE officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE officer_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE officer_encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE officer_rto_log ENABLE ROW LEVEL SECURITY;

-- 13. Policies for service role
CREATE POLICY "Service role full access to officers"
  ON officers FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service role full access to officer_scans"
  ON officer_scans FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service role full access to officer_encounters"
  ON officer_encounters FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service role full access to officer_rto_log"
  ON officer_rto_log FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- 14. Officers can read/update their own records
CREATE POLICY "Officers can manage own records"
  ON officers FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Officers can view own scans"
  ON officer_scans FOR SELECT TO authenticated
  USING (officer_id IN (SELECT id FROM officers WHERE user_id = auth.uid()));

CREATE POLICY "Officers can manage own encounters"
  ON officer_encounters FOR ALL TO authenticated
  USING (officer_id IN (SELECT id FROM officers WHERE user_id = auth.uid()))
  WITH CHECK (officer_id IN (SELECT id FROM officers WHERE user_id = auth.uid()));

-- 15. Quick stats view for dashboard
CREATE OR REPLACE VIEW officer_dashboard_stats AS
SELECT 
  o.id as officer_id,
  o.user_id,
  o.department_name,
  o.total_scans,
  o.total_matches,
  o.total_rtos,
  o.last_active_at,
  (SELECT COUNT(*) FROM officer_encounters e WHERE e.officer_id = o.id AND e.status = 'active') as active_encounters,
  (SELECT COUNT(*) FROM officer_encounters e WHERE e.officer_id = o.id AND e.outcome = 'rto' AND e.created_at > NOW() - INTERVAL '30 days') as rtos_last_30_days,
  CASE WHEN o.total_scans > 0 
    THEN ROUND((o.total_matches::DECIMAL / o.total_scans) * 100, 1) 
    ELSE 0 
  END as match_rate
FROM officers o
WHERE o.is_active = TRUE AND o.is_verified = TRUE;

