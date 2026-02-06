-- ============================================
-- COMPLETE FIX: get_next_pet_of_day() function
-- Run this entire script in PRO database SQL Editor
-- ============================================

-- STEP 1: Ensure table exists
CREATE TABLE IF NOT EXISTS pet_of_day_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES lost_pets(id) ON DELETE CASCADE,
  posted_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pet_id, posted_date)
);

CREATE INDEX IF NOT EXISTS idx_pet_of_day_log_posted_date ON pet_of_day_log(posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_pet_of_day_log_pet_id ON pet_of_day_log(pet_id);

-- STEP 2: Recreate function with guaranteed return logic
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
  -- Try to find pet not posted today
  SELECT lp.*
  INTO selected_pet
  FROM lost_pets lp
  WHERE lp.photo_url IS NOT NULL
    AND lp.photo_url != ''
    AND NOT EXISTS (
      SELECT 1 
      FROM pet_of_day_log l 
      WHERE l.pet_id = lp.id 
      AND l.posted_date = today_date
    )
  ORDER BY 
    (SELECT MAX(posted_date) FROM pet_of_day_log WHERE pet_id = lp.id) ASC NULLS FIRST,
    lp.created_at ASC
  LIMIT 1;

  -- If found, return it
  IF selected_pet IS NOT NULL THEN
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
    RETURN;
  END IF;

  -- Fallback: ANY pet with photo (even if posted today)
  SELECT lp.*
  INTO selected_pet
  FROM lost_pets lp
  WHERE lp.photo_url IS NOT NULL
    AND lp.photo_url != ''
  ORDER BY 
    (SELECT MAX(posted_date) FROM pet_of_day_log WHERE pet_id = lp.id) ASC NULLS FIRST,
    lp.created_at ASC
  LIMIT 1;

  -- Return it if found
  IF selected_pet IS NOT NULL THEN
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
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- STEP 3: Clear today's posts for testing
DELETE FROM pet_of_day_log WHERE posted_date = CURRENT_DATE;

-- STEP 4: Verify pets exist
SELECT 
  'Pets with photos' as check,
  COUNT(*) as count
FROM lost_pets 
WHERE photo_url IS NOT NULL AND photo_url != '';

-- STEP 5: Test function
SELECT * FROM get_next_pet_of_day();
