-- Zapier Pet of the Day - Using Existing lost_pets Table
-- This is the CORRECT version that uses your actual data

-- ============================================
-- Create pet_of_day_log table (if it doesn't exist)
-- This tracks which pets from lost_pets have been posted
-- ============================================
CREATE TABLE IF NOT EXISTS pet_of_day_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES lost_pets(id) ON DELETE CASCADE,
  posted_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pet_id, posted_date) -- Prevent duplicate posts on same day
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pet_of_day_log_posted_date ON pet_of_day_log(posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_pet_of_day_log_pet_id ON pet_of_day_log(pet_id);

-- ============================================
-- SQL Function: get_next_pet_of_day()
-- Works with existing lost_pets table
-- ============================================
CREATE OR REPLACE FUNCTION get_next_pet_of_day()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  image_url TEXT,
  breed TEXT,
  age TEXT,
  color TEXT,
  size TEXT,
  location_city TEXT,
  location_state TEXT,
  status TEXT,
  pet_type TEXT,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  selected_pet RECORD;
BEGIN
  -- First, try to find a pet that hasn't been posted today
  -- Prefer pets that haven't been posted recently (oldest posted_at or NULL)
  SELECT lp.*
  INTO selected_pet
  FROM lost_pets lp
  WHERE NOT EXISTS (
    SELECT 1 
    FROM pet_of_day_log l 
    WHERE l.pet_id = lp.id 
    AND l.posted_date = today_date
  )
  AND lp.photo_url IS NOT NULL
  AND lp.photo_url != ''
  ORDER BY 
    (SELECT MAX(posted_date) FROM pet_of_day_log WHERE pet_id = lp.id) ASC NULLS FIRST,
    lp.created_at ASC
  LIMIT 1;

  -- If we found a pet, return it and log the post
  IF selected_pet IS NOT NULL THEN
    -- Log the post
    INSERT INTO pet_of_day_log (pet_id, posted_date)
    VALUES (selected_pet.id, today_date)
    ON CONFLICT (pet_id, posted_date) DO NOTHING;
    
    -- Return the pet (mapped to Zapier-friendly format)
    RETURN QUERY SELECT 
      selected_pet.id,
      COALESCE(selected_pet.pet_name, 'Unknown') as name,
      selected_pet.description,
      selected_pet.photo_url as image_url,
      selected_pet.breed,
      selected_pet.age,
      selected_pet.color,
      selected_pet.size,
      selected_pet.location_city,
      selected_pet.location_state,
      selected_pet.status,
      selected_pet.pet_type,
      selected_pet.created_at;
    RETURN;
  END IF;

  -- Fallback: If all pets were posted today, find the one posted longest ago
  SELECT lp.*
  INTO selected_pet
  FROM lost_pets lp
  WHERE lp.photo_url IS NOT NULL
  AND lp.photo_url != ''
  ORDER BY 
    (SELECT MAX(posted_date) FROM pet_of_day_log WHERE pet_id = lp.id) ASC NULLS FIRST,
    lp.created_at ASC
  LIMIT 1;

  -- If we found a pet, update and return it
  IF selected_pet IS NOT NULL THEN
    -- Log the post (may conflict if already logged today, that's OK)
    INSERT INTO pet_of_day_log (pet_id, posted_date)
    VALUES (selected_pet.id, today_date)
    ON CONFLICT (pet_id, posted_date) DO NOTHING;
    
    RETURN QUERY SELECT 
      selected_pet.id,
      COALESCE(selected_pet.pet_name, 'Unknown') as name,
      selected_pet.description,
      selected_pet.photo_url as image_url,
      selected_pet.breed,
      selected_pet.age,
      selected_pet.color,
      selected_pet.size,
      selected_pet.location_city,
      selected_pet.location_state,
      selected_pet.status,
      selected_pet.pet_type,
      selected_pet.created_at;
  END IF;
  
  -- If no pets found, return empty result
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE pet_of_day_log ENABLE ROW LEVEL SECURITY;

-- Allow public read access to log
CREATE POLICY "Allow public read access to pet_of_day_log"
  ON pet_of_day_log
  FOR SELECT
  USING (true);

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE pet_of_day_log IS 'Log of when each pet from lost_pets was featured as Pet of the Day';
COMMENT ON FUNCTION get_next_pet_of_day() IS 'Returns the next pet from lost_pets table, avoiding duplicates and preferring least recently posted';
