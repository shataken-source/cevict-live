-- ============================================
-- VERIFY PET OF THE DAY SETUP
-- Run this in PRO database (rdbuwyefbgnbuhmjrizo)
-- ============================================

-- Step 1: Check if lost_pets table exists and has data
SELECT 
  'Step 1: Check lost_pets table' as step,
  COUNT(*) as total_pets,
  COUNT(*) FILTER (WHERE photo_url IS NOT NULL AND photo_url != '') as pets_with_photos,
  COUNT(*) FILTER (WHERE photo_url IS NULL OR photo_url = '') as pets_without_photos
FROM lost_pets;

-- Step 2: Show sample pets with photos
SELECT 
  'Step 2: Sample pets with photos' as step,
  id,
  pet_name,
  pet_type,
  breed,
  photo_url,
  status,
  location_city,
  location_state,
  created_at
FROM lost_pets
WHERE photo_url IS NOT NULL 
  AND photo_url != ''
ORDER BY created_at DESC
LIMIT 5;

-- Step 3: Check if pet_of_day_log table exists
SELECT 
  'Step 3: Check pet_of_day_log table' as step,
  COUNT(*) as total_log_entries,
  COUNT(DISTINCT pet_id) as unique_pets_posted,
  MIN(posted_date) as first_post_date,
  MAX(posted_date) as last_post_date
FROM pet_of_day_log;

-- Step 4: Check if function exists
SELECT 
  'Step 4: Check function exists' as step,
  proname as function_name,
  prorettype::regtype as return_type,
  prosrc IS NOT NULL as has_source
FROM pg_proc
WHERE proname = 'get_next_pet_of_day';

-- Step 5: Test the function directly
SELECT 
  'Step 5: Test get_next_pet_of_day() function' as step,
  *
FROM get_next_pet_of_day();

-- Step 6: Check for pets that haven't been posted today
SELECT 
  'Step 6: Pets available for posting today' as step,
  COUNT(*) as available_pets
FROM lost_pets lp
WHERE lp.photo_url IS NOT NULL
  AND lp.photo_url != ''
  AND NOT EXISTS (
    SELECT 1 
    FROM pet_of_day_log l 
    WHERE l.pet_id = lp.id 
    AND l.posted_date = CURRENT_DATE
  );

-- Step 7: Show pets that could be selected (debugging)
SELECT 
  'Step 7: Top 5 pets that should be selected' as step,
  lp.id,
  lp.pet_name,
  lp.pet_type,
  lp.photo_url IS NOT NULL AND lp.photo_url != '' as has_photo,
  (SELECT MAX(posted_date) FROM pet_of_day_log WHERE pet_id = lp.id) as last_posted,
  lp.created_at
FROM lost_pets lp
WHERE lp.photo_url IS NOT NULL
  AND lp.photo_url != ''
ORDER BY 
  (SELECT MAX(posted_date) FROM pet_of_day_log WHERE pet_id = lp.id) ASC NULLS FIRST,
  lp.created_at ASC
LIMIT 5;

-- Step 8: Check RLS policies
SELECT 
  'Step 8: Check RLS policies' as step,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('lost_pets', 'pet_of_day_log')
ORDER BY tablename, policyname;
