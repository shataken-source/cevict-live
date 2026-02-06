-- ============================================
-- VERIFY: get_next_pet_of_day() function
-- Run this to check if function is working
-- ============================================

-- Check 1: Function exists and has SECURITY DEFINER?
SELECT 
  'Check 1: Function definition' as check_name,
  proname as function_name,
  prosecdef as has_security_definer,
  proconfig as config
FROM pg_proc
WHERE proname = 'get_next_pet_of_day';

-- Check 2: Can we manually find pets with photos?
SELECT 
  'Check 2: Pets with photos (not posted today)' as check_name,
  COUNT(*) as available_pets
FROM lost_pets lp
WHERE lp.photo_url IS NOT NULL
  AND lp.photo_url != ''
  AND lp.photo_url != 'null'
  AND NOT EXISTS (
    SELECT 1 
    FROM pet_of_day_log l 
    WHERE l.pet_id = lp.id 
    AND l.posted_date = CURRENT_DATE
  );

-- Check 3: Test the function directly
SELECT 'Check 3: Testing function...' as check_name;
SELECT * FROM get_next_pet_of_day();

-- Check 4: If function returns empty, try this simpler version
SELECT 
  'Check 4: Direct query (what function should return)' as check_name,
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
  AND lp.photo_url != 'null'
  AND NOT EXISTS (
    SELECT 1 
    FROM pet_of_day_log l 
    WHERE l.pet_id = lp.id 
    AND l.posted_date = CURRENT_DATE
  )
ORDER BY lp.created_at ASC
LIMIT 1;
