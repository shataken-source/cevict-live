-- ============================================
-- IMMEDIATE FIX: Why get_next_pet_of_day() returns empty
-- Run this in PRO database SQL Editor
-- ============================================

-- STEP 1: Check pets with photos
SELECT 
  'STEP 1: Total pets with photos' as check,
  COUNT(*) as count
FROM lost_pets 
WHERE photo_url IS NOT NULL AND photo_url != '';

-- STEP 2: Check if any were posted today
SELECT 
  'STEP 2: Posted today' as check,
  COUNT(*) as posted_today
FROM pet_of_day_log 
WHERE posted_date = CURRENT_DATE;

-- STEP 3: Reset today's posts (so function can return a pet)
DELETE FROM pet_of_day_log 
WHERE posted_date = CURRENT_DATE;

SELECT 'STEP 3: Cleared today''s posts' as status;

-- STEP 4: Show which pet should be returned
SELECT 
  'STEP 4: Pet that will be returned' as check,
  lp.id,
  lp.pet_name as name,
  lp.photo_url as image_url,
  lp.breed
FROM lost_pets lp
WHERE lp.photo_url IS NOT NULL
  AND lp.photo_url != ''
ORDER BY lp.created_at ASC
LIMIT 1;

-- STEP 5: Test the function (should work now)
SELECT 'STEP 5: Testing function...' as check;
SELECT * FROM get_next_pet_of_day();
