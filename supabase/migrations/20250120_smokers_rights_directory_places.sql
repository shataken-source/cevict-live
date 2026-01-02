-- SmokersRights Directory Places Table
-- User-submitted smoker-friendly places with moderation

CREATE TABLE IF NOT EXISTS sr_directory_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state_code text NOT NULL CHECK (state_code ~ '^[A-Z]{2}$'),
  category text NOT NULL CHECK (category IN ('lounge', 'patio', 'hotel', 'bar', 'restaurant', 'shop', 'other')),
  description text,
  notes text,
  website_url text,
  phone text,
  coordinates point, -- PostGIS point for maps (optional)
  amenities text[] DEFAULT '{}', -- e.g., outdoor_seating, covered, food, drinks
  age_restriction text CHECK (age_restriction IN ('none', '18+', '21+')),
  submitted_by uuid NOT NULL REFERENCES unified_users(id),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'needs_more_info', 'verified', 'rejected', 'duplicate')),
  source_url text, -- user-provided source/proof
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES unified_users(id),
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_sr_directory_places_state ON sr_directory_places(state_code);
CREATE INDEX idx_sr_directory_places_category ON sr_directory_places(category);
CREATE INDEX idx_sr_directory_places_status ON sr_directory_places(status);
CREATE INDEX idx_sr_directory_places_submitted_by ON sr_directory_places(submitted_by);
CREATE INDEX idx_sr_directory_places_coords ON sr_directory_places USING GIST (coordinates) WHERE coordinates IS NOT NULL;

-- RLS
ALTER TABLE sr_directory_places ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read verified places
CREATE POLICY "Public read verified places" ON sr_directory_places
  FOR SELECT USING (status = 'verified');

-- Policy: Authenticated users can submit
CREATE POLICY "Authenticated insert" ON sr_directory_places
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Users can update their own submissions (before review)
CREATE POLICY "Creator update own submitted" ON sr_directory_places
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    submitted_by = auth.uid() AND
    status IN ('submitted', 'needs_more_info')
  );

-- Policy: Admins can review/update all
CREATE POLICY "Admin full access" ON sr_directory_places
  FOR ALL USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM unified_users WHERE id = auth.uid() AND role = 'admin')
  );

-- Trigger for updated_at
CREATE TRIGGER sr_directory_places_updated_at
  BEFORE UPDATE ON sr_directory_places
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
