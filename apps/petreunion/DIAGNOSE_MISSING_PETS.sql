-- Emergency Diagnostic Queries for Missing Pets
-- Run these in Supabase SQL Editor to find out what happened

-- ============================================
-- 1. Check TOTAL pets (no filters)
-- ============================================
SELECT COUNT(*) as total_pets FROM lost_pets;

-- ============================================
-- 2. Check pets with photos
-- ============================================
SELECT COUNT(*) as pets_with_photos 
FROM lost_pets 
WHERE photo_url IS NOT NULL 
  AND photo_url != '';

-- ============================================
-- 3. Check pets WITHOUT photos
-- ============================================
SELECT COUNT(*) as pets_without_photos 
FROM lost_pets 
WHERE photo_url IS NULL 
  OR photo_url = '';

-- ============================================
-- 4. See ALL pets (last 20, no filters)
-- ============================================
SELECT 
  id,
  pet_name,
  pet_type,
  breed,
  color,
  photo_url,
  status,
  created_at,
  updated_at
FROM lost_pets 
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- 5. Check if table exists
-- ============================================
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'lost_pets';

-- ============================================
-- 6. Check RLS (Row Level Security) status
-- ============================================
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'lost_pets';

-- ============================================
-- 7. Check RLS policies
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'lost_pets';

-- ============================================
-- 8. Check for any DELETE operations in logs
-- ============================================
-- Note: This requires audit logging to be enabled
-- Most Supabase projects don't have this by default

-- ============================================
-- 9. Check pet_of_day_log (should reference pets)
-- ============================================
SELECT 
  COUNT(*) as log_entries,
  COUNT(DISTINCT pet_id) as unique_pets_logged
FROM pet_of_day_log;

-- ============================================
-- 10. Check if pets exist but are referenced in logs
-- ============================================
SELECT 
  l.pet_id,
  l.posted_date,
  lp.pet_name,
  lp.breed
FROM pet_of_day_log l
LEFT JOIN lost_pets lp ON lp.id = l.pet_id
ORDER BY l.posted_date DESC
LIMIT 10;

-- If lp.pet_name is NULL, the pet was deleted but log remains

-- ============================================
-- 11. Check recent activity (if you have updated_at)
-- ============================================
SELECT 
  COUNT(*) as total,
  MIN(created_at) as oldest_pet,
  MAX(created_at) as newest_pet,
  MAX(updated_at) as last_update
FROM lost_pets;
