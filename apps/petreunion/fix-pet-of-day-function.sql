-- ============================================
-- FIX: get_next_pet_of_day() function
-- This version is more robust and will always return a pet if one exists
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

  -- Fallback: If all pets were posted today (or no pets available), 
  -- return the one posted longest ago (or oldest if never posted)
  SELECT lp.*
  INTO selected_pet
  FROM lost_pets lp
  WHERE lp.photo_url IS NOT NULL
    AND lp.photo_url != ''
  ORDER BY 
    (SELECT MAX(posted_date) FROM pet_of_day_log WHERE pet_id = lp.id) ASC NULLS FIRST,
    lp.created_at ASC
  LIMIT 1;

  -- If we found ANY pet with photo, return it
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
  
  -- If no pets found at all, return empty
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Test it
SELECT 'Testing function...' as status;
SELECT * FROM get_next_pet_of_day();
