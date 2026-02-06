-- ============================================
-- DIAGNOSTIC FIX: get_next_pet_of_day()
-- This version will help us see what's happening
-- ============================================

-- Step 1: Clear today's log
DELETE FROM pet_of_day_log WHERE posted_date = CURRENT_DATE;

-- Step 2: Drop old function
DROP FUNCTION IF EXISTS get_next_pet_of_day() CASCADE;

-- Step 3: Create diagnostic version
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  pet_record RECORD;
  available_count INTEGER;
  logged_count INTEGER;
BEGIN
  -- Count available pets
  SELECT COUNT(*) INTO available_count
  FROM lost_pets
  WHERE photo_url IS NOT NULL
    AND photo_url != ''
    AND photo_url != 'null';
  
  -- Count pets already logged today
  SELECT COUNT(*) INTO logged_count
  FROM pet_of_day_log
  WHERE posted_date = CURRENT_DATE;
  
  -- Get first pet with photo that hasn't been posted today
  SELECT * INTO STRICT pet_record
  FROM lost_pets
  WHERE photo_url IS NOT NULL
    AND photo_url != ''
    AND photo_url != 'null'
    AND NOT EXISTS (
      SELECT 1 FROM pet_of_day_log 
      WHERE pet_id = lost_pets.id 
      AND posted_date = CURRENT_DATE
    )
  ORDER BY created_at ASC
  LIMIT 1;

  -- If we get here, we found a pet
  INSERT INTO pet_of_day_log (pet_id, posted_date)
  VALUES (pet_record.id, CURRENT_DATE)
  ON CONFLICT (pet_id, posted_date) DO NOTHING;
  
  RETURN QUERY SELECT 
    pet_record.id,
    COALESCE(pet_record.pet_name, 'Unknown'),
    pet_record.description,
    pet_record.photo_url,
    pet_record.breed,
    pet_record.age,
    pet_record.color,
    pet_record.size,
    pet_record.location_city,
    pet_record.location_state,
    pet_record.status,
    pet_record.pet_type,
    pet_record.created_at;
    
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    -- No pet found that hasn't been posted today, try fallback
    BEGIN
      SELECT * INTO STRICT pet_record
      FROM lost_pets
      WHERE photo_url IS NOT NULL
        AND photo_url != ''
        AND photo_url != 'null'
      ORDER BY created_at ASC
      LIMIT 1;
      
      INSERT INTO pet_of_day_log (pet_id, posted_date)
      VALUES (pet_record.id, CURRENT_DATE)
      ON CONFLICT (pet_id, posted_date) DO NOTHING;
      
      RETURN QUERY SELECT 
        pet_record.id,
        COALESCE(pet_record.pet_name, 'Unknown'),
        pet_record.description,
        pet_record.photo_url,
        pet_record.breed,
        pet_record.age,
        pet_record.color,
        pet_record.size,
        pet_record.location_city,
        pet_record.location_state,
        pet_record.status,
        pet_record.pet_type,
        pet_record.created_at;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        -- No pets with photos at all
        RETURN;
    END;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_next_pet_of_day() TO anon;
GRANT EXECUTE ON FUNCTION get_next_pet_of_day() TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_pet_of_day() TO service_role;
GRANT EXECUTE ON FUNCTION get_next_pet_of_day() TO postgres;

-- Test it
SELECT 'Testing function...' as status;
SELECT * FROM get_next_pet_of_day();
