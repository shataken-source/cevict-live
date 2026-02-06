-- ============================================
-- CHECK RLS POLICIES - PRO Database
-- See what policies are blocking access to pets
-- ============================================

-- Show all RLS policies on lost_pets
SELECT 
  policyname,
  cmd as command,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'lost_pets'
ORDER BY policyname;

-- Check actual count WITH service role (bypasses RLS)
-- Note: This requires service role key, run via API or script
-- For now, check if policies are too restrictive

-- Check what the current user can see
SELECT 
  'Current user view' as check_name,
  COUNT(*) as visible_count,
  'This is what you see with current permissions' as note
FROM lost_pets;

-- Check if pets have required fields that policies might check
SELECT 
  'Pets with owner_name' as check_name,
  COUNT(*) as count
FROM lost_pets
WHERE owner_name IS NOT NULL;

SELECT 
  'Pets with created_at' as check_name,
  COUNT(*) as count
FROM lost_pets
WHERE created_at IS NOT NULL;

-- Check sample pet to see its structure
SELECT 
  'Sample pet structure' as check_name,
  id,
  pet_name,
  owner_name,
  created_at,
  status
FROM lost_pets
LIMIT 1;
