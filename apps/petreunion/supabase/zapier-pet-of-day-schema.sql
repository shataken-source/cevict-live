-- Zapier Pet of the Day Schema
-- Alternative schema optimized for Zapier automation
-- This works alongside or instead of the existing pet_of_the_day system

-- ============================================
-- 1. Create pets table (if using separate pets table)
-- ============================================
CREATE TABLE IF NOT EXISTS pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  breed TEXT,
  age NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  posted_at TIMESTAMPTZ, -- Last time this pet was posted
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pets_posted_at ON pets(posted_at ASC NULLS FIRST);
CREATE INDEX IF NOT EXISTS idx_pets_created_at ON pets(created_at DESC);

-- ============================================
-- 2. Create pet_of_day_log table
-- ============================================
CREATE TABLE IF NOT EXISTS pet_of_day_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  posted_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pet_id, posted_date) -- Prevent duplicate posts on same day
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pet_of_day_log_posted_date ON pet_of_day_log(posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_pet_of_day_log_pet_id ON pet_of_day_log(pet_id);

-- ============================================
-- 3. SQL Function: get_next_pet_of_day()
-- ============================================
CREATE OR REPLACE FUNCTION get_next_pet_of_day()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  image_url TEXT,
  breed TEXT,
  age NUMERIC,
  created_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ
) AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  selected_pet RECORD;
BEGIN
  -- First, try to find a pet that hasn't been posted today
  -- Prefer pets that haven't been posted recently (oldest posted_at or NULL)
  SELECT p.*
  INTO selected_pet
  FROM pets p
  WHERE NOT EXISTS (
    SELECT 1 
    FROM pet_of_day_log l 
    WHERE l.pet_id = p.id 
    AND l.posted_date = today_date
  )
  AND p.image_url IS NOT NULL
  AND p.image_url != ''
  ORDER BY 
    p.posted_at ASC NULLS FIRST, -- NULL (never posted) comes first
    p.created_at ASC -- Then oldest created_at
  LIMIT 1;

  -- If we found a pet, return it
  IF selected_pet IS NOT NULL THEN
    -- Update the pet's posted_at timestamp
    UPDATE pets 
    SET posted_at = NOW(), updated_at = NOW()
    WHERE pets.id = selected_pet.id;
    
    -- Log the post
    INSERT INTO pet_of_day_log (pet_id, posted_date)
    VALUES (selected_pet.id, today_date)
    ON CONFLICT (pet_id, posted_date) DO NOTHING;
    
    -- Return the pet
    RETURN QUERY SELECT 
      selected_pet.id,
      selected_pet.name,
      selected_pet.description,
      selected_pet.image_url,
      selected_pet.breed,
      selected_pet.age,
      selected_pet.created_at,
      NOW() as posted_at;
    RETURN;
  END IF;

  -- Fallback: If all pets were posted today, find the one posted longest ago
  SELECT p.*
  INTO selected_pet
  FROM pets p
  WHERE p.image_url IS NOT NULL
  AND p.image_url != ''
  ORDER BY 
    p.posted_at ASC NULLS FIRST,
    p.created_at ASC
  LIMIT 1;

  -- If we found a pet, update and return it
  IF selected_pet IS NOT NULL THEN
    UPDATE pets 
    SET posted_at = NOW(), updated_at = NOW()
    WHERE pets.id = selected_pet.id;
    
    -- Log the post (may conflict if already logged today, that's OK)
    INSERT INTO pet_of_day_log (pet_id, posted_date)
    VALUES (selected_pet.id, today_date)
    ON CONFLICT (pet_id, posted_date) DO NOTHING;
    
    RETURN QUERY SELECT 
      selected_pet.id,
      selected_pet.name,
      selected_pet.description,
      selected_pet.image_url,
      selected_pet.breed,
      selected_pet.age,
      selected_pet.created_at,
      NOW() as posted_at;
  END IF;
  
  -- If no pets found, return empty result
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. Seed Data (Sample Pets)
-- ============================================
INSERT INTO pets (name, description, image_url, breed, age) VALUES
(
  'Max',
  'Friendly golden retriever who loves playing fetch and going on walks. Very gentle with children.',
  'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800',
  'Golden Retriever',
  5
),
(
  'Luna',
  'Beautiful black cat with green eyes. Indoor cat, very affectionate and loves cuddling.',
  'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800',
  'Domestic Shorthair',
  3
),
(
  'Buddy',
  'Energetic border collie mix. Great with other dogs, loves hiking and outdoor adventures.',
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800',
  'Border Collie Mix',
  4
),
(
  'Whiskers',
  'Calico cat with unique markings. Very playful and curious, loves exploring new places.',
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800',
  'Calico',
  2
),
(
  'Rocky',
  'Strong and loyal German Shepherd. Excellent guard dog, very protective of family.',
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800',
  'German Shepherd',
  6
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. RLS Policies (Row Level Security)
-- ============================================
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_of_day_log ENABLE ROW LEVEL SECURITY;

-- Allow public read access to pets
CREATE POLICY "Allow public read access to pets"
  ON pets
  FOR SELECT
  USING (true);

-- Allow public read access to log
CREATE POLICY "Allow public read access to pet_of_day_log"
  ON pet_of_day_log
  FOR SELECT
  USING (true);

-- Allow service role to insert/update (for API/Zapier)
-- Note: Service role bypasses RLS, so this is mainly for documentation

-- ============================================
-- 6. Helper Views (Optional, for easier querying)
-- ============================================
CREATE OR REPLACE VIEW pets_with_post_history AS
SELECT 
  p.*,
  COUNT(l.id) as times_posted,
  MAX(l.posted_date) as last_posted_date
FROM pets p
LEFT JOIN pet_of_day_log l ON l.pet_id = p.id
GROUP BY p.id;

-- ============================================
-- 7. Comments
-- ============================================
COMMENT ON TABLE pets IS 'Pets available for Pet of the Day feature';
COMMENT ON TABLE pet_of_day_log IS 'Log of when each pet was featured as Pet of the Day';
COMMENT ON FUNCTION get_next_pet_of_day() IS 'Returns the next pet to feature, avoiding duplicates and preferring least recently posted';
