-- ============================================
-- DIAGNOSE: Why get_next_pet_of_day() returns empty
-- Run this in PRO database
-- ============================================

-- Check 1: Do you have pets with photos?
SELECT 
  'CHECK 1: Pets with photos' as check_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN '❌ NO PETS WITH PHOTOS' ELSE '✅ OK' END as status
FROM lost_pets 
WHERE photo_url IS NOT NULL AND photo_url != '';

-- Check 2: How many pets were posted today?
SELECT 
  'CHECK 2: Posted today' as check_name,
  COUNT(*) as posted_today,
  (SELECT COUNT(*) FROM lost_pets WHERE photo_url IS NOT NULL AND photo_url != '') as total_with_photos,
  CASE 
    WHEN COUNT(*) >= (SELECT COUNT(*) FROM lost_pets WHERE photo_url IS NOT NULL AND photo_url != '') 
    THEN '⚠️ ALL PETS POSTED TODAY - Function should still return oldest'
    ELSE '✅ OK'
  END as status
FROM pet_of_day_log 
WHERE posted_date = CURRENT_DATE;

-- Check 3: What pets are available (not posted today)?
SELECT 
  'CHECK 3: Available pets (not posted today)' as check_name,
  COUNT(*) as available_count
FROM lost_pets lp
WHERE lp.photo_url IS NOT NULL
  AND lp.photo_url != ''
  AND NOT EXISTS (
    SELECT 1 
    FROM pet_of_day_log l 
    WHERE l.pet_id = lp.id 
    AND l.posted_date = CURRENT_DATE
  );

-- Check 4: Show the pet that should be returned (manual query)
SELECT 
  'CHECK 4: Pet that should be returned' as check_name,
  lp.id,
  lp.pet_name as name,
  lp.photo_url as image_url,
  (SELECT MAX(posted_date) FROM pet_of_day_log WHERE pet_id = lp.id) as last_posted,
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
ORDER BY 
  (SELECT MAX(posted_date) FROM pet_of_day_log WHERE pet_id = lp.id) ASC NULLS FIRST,
  lp.created_at ASC
LIMIT 1;

-- Check 5: Test function
SELECT 
  'CHECK 5: Function result' as check_name,
  *
FROM get_next_pet_of_day();

-- Check 6: Clear today's log (if you want to test again)
-- UNCOMMENT TO RESET TODAY'S POSTS:
-- DELETE FROM pet_of_day_log WHERE posted_date = CURRENT_DATE;
