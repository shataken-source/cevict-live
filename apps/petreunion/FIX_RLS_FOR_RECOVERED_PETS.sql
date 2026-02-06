-- ============================================
-- FIX RLS POLICIES - Allow access to recovered pets
-- Run this if RLS is blocking access to recovered pets
-- ============================================

-- First, check current policies
SELECT 
  'Current Policies' as section,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'lost_pets';

-- Ensure public SELECT access (for viewing pets)
-- This policy allows anyone to read lost_pets
DROP POLICY IF EXISTS "Allow public read access to lost_pets" ON lost_pets;

CREATE POLICY "Allow public read access to lost_pets"
  ON lost_pets
  FOR SELECT
  USING (true);  -- Allow all rows to be read

-- Ensure public INSERT access (for reporting lost pets)
DROP POLICY IF EXISTS "Anyone can report lost pets" ON lost_pets;

CREATE POLICY "Anyone can report lost pets"
  ON lost_pets
  FOR INSERT
  WITH CHECK (true);  -- Allow anyone to insert

-- Verify the fix
SELECT 
  'After fix - visible count' as check_name,
  COUNT(*) as count
FROM lost_pets;

-- Show sample pets
SELECT 
  id,
  pet_name,
  photo_url,
  created_at
FROM lost_pets
ORDER BY created_at DESC
LIMIT 10;
