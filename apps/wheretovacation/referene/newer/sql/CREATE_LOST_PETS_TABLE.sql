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
DROP POLICY IF EXISTS "Anyone can view shelters" ON shelters;
CREATE POLICY "Anyone can view shelters"
  ON shelters
  FOR SELECT
  USING (true);

-- Policy: Anyone can create shelter accounts
DROP POLICY IF EXISTS "Anyone can register shelter" ON shelters;
CREATE POLICY "Anyone can register shelter"
  ON shelters
  FOR INSERT
  WITH CHECK (true);

-- Create lost_pets table for PetReunion app
CREATE TABLE IF NOT EXISTS lost_pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pet Information
  pet_name TEXT,
  pet_type TEXT NOT NULL,
  breed TEXT NOT NULL,
  color TEXT NOT NULL,
  size TEXT,
  
  -- When/Where Lost
  date_lost DATE NOT NULL,
  location_city TEXT NOT NULL,
  location_state TEXT NOT NULL,
  location_zip TEXT,
  location_detail TEXT,
  
  -- Description
  markings TEXT,
  description TEXT,
  
  -- Identification
  microchip TEXT,
  collar TEXT,
  
  -- Owner Contact
  owner_name TEXT NOT NULL,
  owner_email TEXT,
  owner_phone TEXT,
  reward_amount DECIMAL(10, 2),
  
  -- Media
  photo_url TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'lost',
  
  -- Facebook tracking (for scraper)
  facebook_post_id TEXT,
  
  -- Shelter association
  shelter_id UUID REFERENCES shelters(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lost_pets_location ON lost_pets(location_city, location_state);
CREATE INDEX IF NOT EXISTS idx_lost_pets_date ON lost_pets(date_lost);
CREATE INDEX IF NOT EXISTS idx_lost_pets_status ON lost_pets(status);
CREATE INDEX IF NOT EXISTS idx_lost_pets_type ON lost_pets(pet_type);
CREATE INDEX IF NOT EXISTS idx_lost_pets_breed ON lost_pets(breed);
CREATE INDEX IF NOT EXISTS idx_lost_pets_facebook_post ON lost_pets(facebook_post_id) WHERE facebook_post_id IS NOT NULL;

-- Enable RLS
ALTER TABLE lost_pets ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Anyone can view lost pets" ON lost_pets;
CREATE POLICY "Anyone can view lost pets"
  ON lost_pets
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can report lost pets" ON lost_pets;
CREATE POLICY "Anyone can report lost pets"
  ON lost_pets
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Owners can update their reports" ON lost_pets;
CREATE POLICY "Owners can update their reports"
  ON lost_pets
  FOR UPDATE
  USING (true);

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_lost_pets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS update_lost_pets_timestamp ON lost_pets;
CREATE TRIGGER update_lost_pets_timestamp
  BEFORE UPDATE ON lost_pets
  FOR EACH ROW
  EXECUTE FUNCTION update_lost_pets_updated_at();

