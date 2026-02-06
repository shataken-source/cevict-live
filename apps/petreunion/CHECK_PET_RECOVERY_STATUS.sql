-- ============================================
-- CHECK PET RECOVERY STATUS - PRO Database
-- Run this to see what happened to the recovered pets
-- ============================================

-- Check actual count
SELECT 
  'Current lost_pets count' as check_name,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 10000 THEN '✅ GOOD - Recovery worked'
    WHEN COUNT(*) >= 1000 THEN '⚠️ LOW - Partial recovery?'
    WHEN COUNT(*) >= 100 THEN '⚠️ VERY LOW - Most data missing'
    WHEN COUNT(*) = 1 THEN '❌ CRITICAL - Recovery failed or data deleted'
    ELSE '❌ CRITICAL - No data'
  END as status
FROM lost_pets;

-- Check if there are pets with photos (needed for Pet of Day)
SELECT 
  'Pets with photos' as check_name,
  COUNT(*) as count
FROM lost_pets 
WHERE photo_url IS NOT NULL AND photo_url != '';

-- Check sample of pets (to see what's there)
SELECT 
  'Sample pets' as check_name,
  id,
  pet_name,
  photo_url,
  created_at
FROM lost_pets
ORDER BY created_at DESC
LIMIT 5;

-- Check if there's a unique constraint that might be blocking
SELECT 
  'Unique constraints on lost_pets' as check_name,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'lost_pets'::regclass
  AND contype = 'u';

-- Check RLS policies (might be blocking reads)
SELECT 
  'RLS Status' as check_name,
  relrowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'lost_pets') as policy_count
FROM pg_class
WHERE relname = 'lost_pets';
