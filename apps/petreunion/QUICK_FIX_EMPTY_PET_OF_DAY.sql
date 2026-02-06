-- ============================================
-- QUICK FIX: Diagnose and Fix Empty Pet of Day
-- Run this in PRO database SQL Editor
-- ============================================

-- STEP 1: Check if you have pets with photos
SELECT 
  'STEP 1: Checking pets with photos...' as step,
  COUNT(*) as pets_with_photos
FROM lost_pets 
WHERE photo_url IS NOT NULL AND photo_url != '';

-- STEP 2: Check if pet_of_day_log table exists
SELECT 
  'STEP 2: Checking pet_of_day_log table...' as step,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pet_of_day_log')
    THEN '✅ Table exists'
    ELSE '❌ Table missing - Run setup SQL first'
  END as status;

-- STEP 3: Check if function exists
SELECT 
  'STEP 3: Checking function...' as step,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'get_next_pet_of_day'
    )
    THEN '✅ Function exists'
    ELSE '❌ Function missing - Run setup SQL first'
  END as status;

-- STEP 4: Show what pet should be returned (manual query)
SELECT 
  'STEP 4: Pet that should be returned' as step,
  lp.id,
  lp.pet_name as name,
  lp.photo_url as image_url,
  lp.breed,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pet_of_day_log l 
      WHERE l.pet_id = lp.id AND l.posted_date = CURRENT_DATE
    ) THEN '⚠️ Already posted today'
    ELSE '✅ Available'
  END as status
FROM lost_pets lp
WHERE lp.photo_url IS NOT NULL
  AND lp.photo_url != ''
ORDER BY lp.created_at ASC
LIMIT 1;

-- STEP 5: If you want to reset today's posts, uncomment this:
-- DELETE FROM pet_of_day_log WHERE posted_date = CURRENT_DATE;

-- STEP 6: Test the function
SELECT 'STEP 6: Testing function...' as step;
SELECT * FROM get_next_pet_of_day();
