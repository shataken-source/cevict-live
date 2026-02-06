-- ============================================
-- FIX PET OF THE DAY IF EMPTY
-- Run this if get_next_pet_of_day() returns no results
-- ============================================

-- First, let's check what's wrong
DO $$
DECLARE
  pet_count INTEGER;
  photo_count INTEGER;
  function_exists BOOLEAN;
BEGIN
  -- Check pets
  SELECT COUNT(*) INTO pet_count FROM lost_pets;
  SELECT COUNT(*) INTO photo_count FROM lost_pets WHERE photo_url IS NOT NULL AND photo_url != '';
  
  -- Check function
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_next_pet_of_day'
  ) INTO function_exists;
  
  RAISE NOTICE 'Total pets: %', pet_count;
  RAISE NOTICE 'Pets with photos: %', photo_count;
  RAISE NOTICE 'Function exists: %', function_exists;
  
  IF pet_count = 0 THEN
    RAISE EXCEPTION 'No pets found in lost_pets table!';
  ELSIF photo_count = 0 THEN
    RAISE EXCEPTION 'No pets with photos found! Need pets with photo_url set.';
  ELSIF NOT function_exists THEN
    RAISE EXCEPTION 'Function get_next_pet_of_day() does not exist! Run zapier-pet-of-day-lost-pets.sql first.';
  ELSE
    RAISE NOTICE '✅ All checks passed. Function should work.';
  END IF;
END $$;

-- If function exists but returns empty, try this query manually:
-- (This is what the function does internally)
SELECT 
  lp.id,
  lp.pet_name as name,
  lp.description,
  lp.photo_url as image_url,
  lp.breed,
  lp.age,
  lp.color,
  lp.size,
  lp.location_city,
  lp.location_state,
  lp.status,
  lp.pet_type,
  lp.created_at
FROM lost_pets lp
WHERE lp.photo_url IS NOT NULL
  AND lp.photo_url != ''
  AND NOT EXISTS (
    SELECT 1 
    FROM pet_of_day_log l 
    WHERE l.pet_id = lp.id 
    AND l.posted_date = CURRENT_DATE
  )
ORDER BY 
  (SELECT MAX(posted_date) FROM pet_of_day_log WHERE pet_id = lp.id) ASC NULLS FIRST,
  lp.created_at ASC
LIMIT 1;

-- If the above query returns a pet, the function should work.
-- If it returns empty, check:
-- 1. Do you have pets with photos? (run verify-pet-of-day.sql)
-- 2. Is photo_url actually set? (not NULL and not empty string)
-- 3. Are all pets already posted today? (check pet_of_day_log)
