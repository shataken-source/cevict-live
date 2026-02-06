-- ============================================
-- FIX: get_next_pet_of_day() - Bypass RLS
-- Run this in PRO database SQL Editor
-- ============================================

-- Step 1: Clear today's log (in case all pets were already posted today)
DELETE FROM pet_of_day_log WHERE posted_date = CURRENT_DATE;

-- Step 2: Recreate function with SECURITY DEFINER to bypass RLS
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
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  selected_pet RECORD;
BEGIN
  -- First, try to find a pet that hasn't been posted today
  SELECT lp.*
  INTO selected_pet
  FROM lost_pets lp
  WHERE lp.photo_url IS NOT NULL
    AND lp.photo_url != ''
    AND lp.photo_url != 'null'
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

  -- If we found a pet not posted today, return it
  IF selected_pet IS NOT NULL THEN
    -- Log the post
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

  -- Fallback: If all pets were posted today, find ANY pet with photo
  SELECT lp.*
  INTO selected_pet
  FROM lost_pets lp
  WHERE lp.photo_url IS NOT NULL
    AND lp.photo_url != ''
    AND lp.photo_url != 'null'
  ORDER BY 
    (SELECT MAX(posted_date) FROM pet_of_day_log WHERE pet_id = lp.id) ASC NULLS FIRST,
    lp.created_at ASC
  LIMIT 1;

  -- If we found a pet, return it
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

-- Step 3: Grant execute permissions
GRANT EXECUTE ON FUNCTION get_next_pet_of_day() TO anon;
GRANT EXECUTE ON FUNCTION get_next_pet_of_day() TO authenticated;

-- Step 4: Verify it works
SELECT 'Testing get_next_pet_of_day()...' as status;
SELECT * FROM get_next_pet_of_day();
