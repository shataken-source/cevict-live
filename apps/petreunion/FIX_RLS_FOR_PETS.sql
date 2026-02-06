-- Fix RLS Policies to Show All 26,000 Pets
-- Run this if RLS is blocking access to your pets

-- ============================================
-- 1. Check current RLS status
-- ============================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename = 'lost_pets';

-- ============================================
-- 2. Check existing policies
-- ============================================
SELECT 
  policyname,
  cmd,
  roles,
  qual
FROM pg_policies 
WHERE tablename = 'lost_pets';

-- ============================================
-- 3. Enable RLS (if not already)
-- ============================================
ALTER TABLE lost_pets ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. Drop existing restrictive policies
-- ============================================
-- Remove any policies that might be blocking
DROP POLICY IF EXISTS "Allow public read access to lost_pets" ON lost_pets;
DROP POLICY IF EXISTS "Allow authenticated read" ON lost_pets;
DROP POLICY IF EXISTS "Users can only see their own pets" ON lost_pets;

-- ============================================
-- 5. Create public read policy (allows everyone to see pets)
-- ============================================
CREATE POLICY "Allow public read access to lost_pets"
  ON lost_pets FOR SELECT
  USING (true);

-- ============================================
-- 6. Allow public insert (for reporting lost/found pets)
-- ============================================
CREATE POLICY "Allow public insert to lost_pets"
  ON lost_pets FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 7. Allow public update (for status changes)
-- ============================================
CREATE POLICY "Allow public update to lost_pets"
  ON lost_pets FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 8. Verify it works
-- ============================================
-- Now check the count (should show all pets)
SELECT COUNT(*) as total_pets FROM lost_pets;

-- Check pets with photos
SELECT COUNT(*) as pets_with_photos 
FROM lost_pets 
WHERE photo_url IS NOT NULL 
  AND photo_url != '';

-- ============================================
-- 9. Verify policies are correct
-- ============================================
SELECT 
  policyname,
  cmd,
  roles,
  CASE 
    WHEN qual IS NULL THEN 'No restrictions (allows all)'
    ELSE qual::text
  END as policy_condition
FROM pg_policies 
WHERE tablename = 'lost_pets';
