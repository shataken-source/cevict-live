-- ═══════════════════════════════════════════════════════════════════════════
-- QR POSTER GENERATION SYSTEM
-- Adds QR codes and poster generation for lost pet listings
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add QR code and poster columns to lost_pets
ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS poster_pdf_url TEXT;
ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS public_url_slug TEXT UNIQUE;
ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS poster_generated_at TIMESTAMPTZ;

-- 2. Add sightings tracking columns
ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS sighting_count INTEGER DEFAULT 0;
ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS last_sighting_at TIMESTAMPTZ;

-- 3. Create pet_sightings table to track reported sightings
CREATE TABLE IF NOT EXISTS pet_sightings (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES lost_pets(id) ON DELETE CASCADE,
  reporter_name TEXT,
  reporter_email TEXT,
  reporter_phone TEXT,
  sighting_location TEXT NOT NULL,
  sighting_city TEXT,
  sighting_state TEXT,
  sighting_lat DECIMAL(10, 8),
  sighting_lon DECIMAL(11, 8),
  sighting_date TIMESTAMPTZ NOT NULL,
  description TEXT,
  photo_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  owner_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_lost_pets_public_slug ON lost_pets(public_url_slug) WHERE public_url_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pet_sightings_pet_id ON pet_sightings(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_sightings_date ON pet_sightings(sighting_date DESC);

-- 5. Function to generate unique public URL slug
CREATE OR REPLACE FUNCTION generate_pet_slug()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger to auto-generate slug on insert
CREATE OR REPLACE FUNCTION auto_generate_pet_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.public_url_slug IS NULL THEN
    NEW.public_url_slug := generate_pet_slug();
    -- Handle collision (extremely rare)
    WHILE EXISTS (SELECT 1 FROM lost_pets WHERE public_url_slug = NEW.public_url_slug AND id != COALESCE(NEW.id, 0)) LOOP
      NEW.public_url_slug := generate_pet_slug();
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lost_pets_auto_slug
  BEFORE INSERT ON lost_pets
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_pet_slug();

-- 7. Function to increment sighting count
CREATE OR REPLACE FUNCTION increment_sighting_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE lost_pets 
  SET 
    sighting_count = sighting_count + 1,
    last_sighting_at = NEW.sighting_date,
    updated_at = NOW()
  WHERE id = NEW.pet_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pet_sighting_count_trigger
  AFTER INSERT ON pet_sightings
  FOR EACH ROW
  EXECUTE FUNCTION increment_sighting_count();

