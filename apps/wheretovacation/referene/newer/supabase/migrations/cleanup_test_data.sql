-- CLEANUP TEST DATA BEFORE GOING LIVE
-- Run this in Supabase SQL Editor to remove all test data

-- ============================================
-- 1. IDENTIFY TEST DATA FIRST (Review before deleting!)
-- ============================================

-- Check for test pets (common test patterns)
SELECT 
  id,
  pet_name,
  owner_name,
  owner_email,
  created_at,
  status
FROM lost_pets
WHERE 
  -- Test names
  LOWER(pet_name) LIKE '%test%' OR
  LOWER(pet_name) LIKE '%demo%' OR
  LOWER(pet_name) LIKE '%sample%' OR
  LOWER(owner_name) LIKE '%test%' OR
  LOWER(owner_name) LIKE '%demo%' OR
  LOWER(owner_email) LIKE '%test%' OR
  LOWER(owner_email) LIKE '%example%' OR
  -- Test emails
  owner_email LIKE '%@test.%' OR
  owner_email LIKE '%@example.%' OR
  owner_email LIKE '%@demo.%' OR
  -- Test phone numbers
  owner_phone LIKE '555-%' OR
  owner_phone LIKE '123-%' OR
  -- Very old test data (older than 30 days, still "lost")
  (created_at < NOW() - INTERVAL '30 days' AND status = 'lost')
ORDER BY created_at DESC;

-- Check for test shelters
SELECT 
  id,
  shelter_name,
  email,
  created_at
FROM shelters
WHERE 
  LOWER(shelter_name) LIKE '%test%' OR
  LOWER(shelter_name) LIKE '%demo%' OR
  LOWER(email) LIKE '%test%' OR
  LOWER(email) LIKE '%example%' OR
  email LIKE '%@test.%' OR
  email LIKE '%@example.%'
ORDER BY created_at DESC;

-- ============================================
-- 2. DELETE TEST DATA (Uncomment to run)
-- ============================================

-- DELETE test pets
-- DELETE FROM lost_pets
-- WHERE 
--   LOWER(pet_name) LIKE '%test%' OR
--   LOWER(pet_name) LIKE '%demo%' OR
--   LOWER(pet_name) LIKE '%sample%' OR
--   LOWER(owner_name) LIKE '%test%' OR
--   LOWER(owner_name) LIKE '%demo%' OR
--   LOWER(owner_email) LIKE '%test%' OR
--   LOWER(owner_email) LIKE '%example%' OR
--   owner_email LIKE '%@test.%' OR
--   owner_email LIKE '%@example.%' OR
--   owner_email LIKE '%@demo.%' OR
--   owner_phone LIKE '555-%' OR
--   owner_phone LIKE '123-%' OR
--   (created_at < NOW() - INTERVAL '30 days' AND status = 'lost');

-- DELETE test shelters (be careful - this will also delete associated pets!)
-- DELETE FROM shelters
-- WHERE 
--   LOWER(shelter_name) LIKE '%test%' OR
--   LOWER(shelter_name) LIKE '%demo%' OR
--   LOWER(email) LIKE '%test%' OR
--   LOWER(email) LIKE '%example%' OR
--   email LIKE '%@test.%' OR
--   email LIKE '%@example.%';

-- ============================================
-- 3. VERIFY CLEANUP
-- ============================================

-- Count remaining pets
SELECT COUNT(*) as total_pets FROM lost_pets;

-- Count by status
SELECT 
  status,
  COUNT(*) as count
FROM lost_pets
GROUP BY status;

-- Count by type
SELECT 
  pet_type,
  COUNT(*) as count
FROM lost_pets
GROUP BY pet_type;

-- List all remaining pets (for final review)
SELECT 
  id,
  pet_name,
  pet_type,
  breed,
  location_city,
  location_state,
  owner_name,
  owner_email,
  status,
  created_at
FROM lost_pets
ORDER BY created_at DESC;

-- ============================================
-- 4. FINAL SAFETY CHECK
-- ============================================

-- Make sure no test data remains
SELECT COUNT(*) as test_pets_remaining
FROM lost_pets
WHERE 
  LOWER(pet_name) LIKE '%test%' OR
  LOWER(owner_email) LIKE '%test%' OR
  owner_email LIKE '%@test.%';

-- Should return 0 before going live!

