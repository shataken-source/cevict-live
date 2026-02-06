-- ============================================
-- QUICK DIAGNOSE: Why is Pet of the Day Empty?
-- Run this in PRO database (rdbuwyefbgnbuhmjrizo)
-- ============================================

-- Check 1: Do you have pets?
SELECT 
  'CHECK 1: Total pets' as check_name,
  COUNT(*) as result,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ NO PETS - This is the problem!'
    ELSE '✅ You have pets'
  END as status
FROM lost_pets;

-- Check 2: Do you have pets with photos?
SELECT 
  'CHECK 2: Pets with photos' as check_name,
  COUNT(*) as result,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ NO PETS WITH PHOTOS - Function needs photo_url set!'
    ELSE '✅ You have pets with photos'
  END as status
FROM lost_pets 
WHERE photo_url IS NOT NULL 
  AND photo_url != '';

-- Check 3: Does function exist?
SELECT 
  'CHECK 3: Function exists' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Function exists'
    ELSE '❌ FUNCTION MISSING - Run zapier-pet-of-day-lost-pets.sql'
  END as status
FROM pg_proc
WHERE proname = 'get_next_pet_of_day';

-- Check 4: Test function (this is what Zapier will run)
SELECT 
  'CHECK 4: Function result' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Function returns a pet'
    ELSE '❌ FUNCTION RETURNS EMPTY - See checks above'
  END as status,
  COUNT(*) as pets_returned
FROM get_next_pet_of_day();

-- Check 5: Show what the function should return (manual query)
SELECT 
  'CHECK 5: Manual query (what function does)' as check_name,
  lp.id,
  lp.pet_name as name,
  lp.photo_url as image_url,
  lp.breed,
  lp.status,
  CASE 
    WHEN lp.photo_url IS NULL OR lp.photo_url = '' THEN '❌ No photo'
    ELSE '✅ Has photo'
  END as photo_status
FROM lost_pets lp
WHERE lp.photo_url IS NOT NULL
  AND lp.photo_url != ''
ORDER BY lp.created_at ASC
LIMIT 1;
