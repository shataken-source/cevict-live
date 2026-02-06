-- ============================================
-- DIAGNOSE: Why get_next_pet_of_day() returns empty
-- Run this in PRO database SQL Editor
-- ============================================

-- Check 1: Do we have pets with photos?
SELECT 
  'Check 1: Pets with photos' as check_name,
  COUNT(*) as total_pets,
  COUNT(*) FILTER (WHERE photo_url IS NOT NULL AND photo_url != '' AND photo_url != 'null') as pets_with_photos
FROM lost_pets;

-- Check 2: Sample pets with photos
SELECT 
  'Check 2: Sample pets with photos' as check_name,
  id,
  pet_name,
  pet_type,
  photo_url,
  created_at
FROM lost_pets
WHERE photo_url IS NOT NULL 
  AND photo_url != '' 
  AND photo_url != 'null'
ORDER BY created_at ASC
LIMIT 5;

-- Check 3: How many pets posted today?
SELECT 
  'Check 3: Pets posted today' as check_name,
  COUNT(*) as posted_today
FROM pet_of_day_log
WHERE posted_date = CURRENT_DATE;

-- Check 4: Does function exist?
SELECT 
  'Check 4: Function exists' as check_name,
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'get_next_pet_of_day';

-- Check 5: Test query manually (what function should find)
SELECT 
  'Check 5: Manual test - pet not posted today' as check_name,
  lp.id,
  lp.pet_name,
  lp.photo_url,
  (SELECT MAX(posted_date) FROM pet_of_day_log WHERE pet_id = lp.id) as last_posted
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
ORDER BY 
  (SELECT MAX(posted_date) FROM pet_of_day_log WHERE pet_id = lp.id) ASC NULLS FIRST,
  lp.created_at ASC
LIMIT 1;
