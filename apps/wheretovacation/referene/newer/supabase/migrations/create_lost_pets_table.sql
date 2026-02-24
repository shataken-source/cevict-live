-- Create shelters table first
CREATE TABLE IF NOT EXISTS shelters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shelter_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for shelters
CREATE INDEX IF NOT EXISTS idx_shelters_email ON shelters(email);

-- Enable RLS for shelters
ALTER TABLE shelters ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view shelters (public info)
CREATE POLICY "Anyone can view shelters"
  ON shelters
  FOR SELECT
  USING (true);

-- Policy: Anyone can create shelter accounts
CREATE POLICY "Anyone can register shelter"
  ON shelters
  FOR INSERT
  WITH CHECK (true);

-- Create lost_pets table for PetReunion app
-- This table stores lost pet reports

CREATE TABLE IF NOT EXISTS lost_pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pet Information
  pet_name TEXT,
  pet_type TEXT NOT NULL, -- 'dog', 'cat', 'bird', etc.
  breed TEXT NOT NULL,
  color TEXT NOT NULL,
  size TEXT, -- 'small', 'medium', 'large'
  
  -- When/Where Lost
  date_lost DATE NOT NULL,
  location_city TEXT NOT NULL,
  location_state TEXT NOT NULL,
  location_zip TEXT,
  location_detail TEXT, -- Additional location details
  
  -- Description
  markings TEXT, -- Distinctive markings
  description TEXT, -- Full description
  
  -- Identification
  microchip TEXT,
  collar TEXT,
  
  -- Owner Contact
  owner_name TEXT NOT NULL,
  owner_email TEXT,
  owner_phone TEXT,
  reward_amount DECIMAL(10, 2),
  
  -- Media
  photo_url TEXT, -- Base64 or URL to photo
  
  -- Status
  status TEXT NOT NULL DEFAULT 'lost', -- 'lost', 'found', 'reunited'
  
  -- Shelter association (optional - for shelter-managed pets)
  shelter_id UUID REFERENCES shelters(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster searches
CREATE INDEX IF NOT EXISTS idx_lost_pets_location ON lost_pets(location_city, location_state, location_zip);
CREATE INDEX IF NOT EXISTS idx_lost_pets_date ON lost_pets(date_lost);
CREATE INDEX IF NOT EXISTS idx_lost_pets_status ON lost_pets(status);
CREATE INDEX IF NOT EXISTS idx_lost_pets_type ON lost_pets(pet_type);
CREATE INDEX IF NOT EXISTS idx_lost_pets_breed ON lost_pets(breed);
CREATE INDEX IF NOT EXISTS idx_lost_pets_shelter ON lost_pets(shelter_id);

-- Enable Row Level Security
ALTER TABLE lost_pets ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read lost pet reports (public service)
CREATE POLICY "Anyone can view lost pets"
  ON lost_pets
  FOR SELECT
  USING (true);

-- Policy: Anyone can insert lost pet reports
CREATE POLICY "Anyone can report lost pets"
  ON lost_pets
  FOR INSERT
  WITH CHECK (true);

-- Policy: Only the owner (or service role) can update their own reports
CREATE POLICY "Owners can update their reports"
  ON lost_pets
  FOR UPDATE
  USING (true); -- For now, allow updates (can be restricted later with auth)

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lost_pets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_lost_pets_timestamp
  BEFORE UPDATE ON lost_pets
  FOR EACH ROW
  EXECUTE FUNCTION update_lost_pets_updated_at();

-- Add comment
COMMENT ON TABLE lost_pets IS 'Lost pet reports for PetReunion - FREE public service to reunite pets with owners';

