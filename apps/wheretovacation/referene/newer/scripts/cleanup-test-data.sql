/**
 * TEST DATA CLEANUP SCRIPT
 * 
 * WARNING: This script permanently deletes data. Use with caution!
 * 
 * Run this in Supabase SQL Editor before production deployment to:
 * - Remove all test users and captains
 * - Delete test bookings and charters
 * - Clean up test reviews and messages
 * - Reset analytics data
 * 
 * BACKUP FIRST: Always backup your database before running cleanup scripts
 * 
 * Usage:
 * 1. Go to Supabase Dashboard → SQL Editor
 * 2. Copy and paste this entire script
 * 3. Review the DELETE statements carefully
 * 4. Click "Run" to execute
 */

-- ============================================
-- STEP 1: Delete Test Bookings
-- ============================================
DELETE FROM bookings 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%@test.com' 
  OR email LIKE '%@example.com'
);

-- ============================================
-- STEP 2: Delete Test Reviews
-- ============================================
DELETE FROM reviews 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%@test.com' 
  OR email LIKE '%@example.com'
);

-- ============================================
-- STEP 3: Delete Test Messages
-- ============================================
DELETE FROM messages 
WHERE sender_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%@test.com' 
  OR email LIKE '%@example.com'
);

-- ============================================
-- STEP 4: Delete Test Charters
-- ============================================
DELETE FROM charters 
WHERE captain_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%@test.com' 
  OR email LIKE '%@example.com'
);

-- ============================================
-- STEP 5: Delete Test Profiles
-- ============================================
DELETE FROM profiles 
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%@test.com' 
  OR email LIKE '%@example.com'
);

-- ============================================
-- STEP 6: Delete Test Auth Users
-- ============================================
-- Note: This requires admin privileges
-- Run in Supabase Dashboard or via admin API
DELETE FROM auth.users 
WHERE email LIKE '%@test.com' 
OR email LIKE '%@example.com';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify cleanup was successful

-- Count remaining users
SELECT COUNT(*) as total_users FROM auth.users;

-- Count remaining profiles
SELECT COUNT(*) as total_profiles FROM profiles;

-- Count remaining bookings
SELECT COUNT(*) as total_bookings FROM bookings;

-- List all remaining users (verify no test accounts)
SELECT email, created_at, user_metadata->>'role' as role 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 20;

-- ============================================
-- OPTIONAL: Reset Auto-Increment IDs
-- ============================================
-- Uncomment if you want to reset ID sequences

-- ALTER SEQUENCE bookings_id_seq RESTART WITH 1;
-- ALTER SEQUENCE charters_id_seq RESTART WITH 1;
-- ALTER SEQUENCE reviews_id_seq RESTART WITH 1;
