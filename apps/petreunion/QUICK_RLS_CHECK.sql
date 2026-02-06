-- Quick RLS Check - Fixed Column Names
-- Run this to check if RLS is blocking your pets

-- ============================================
-- 1. Check RLS status (FIXED)
-- ============================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'lost_pets';

-- ============================================
-- 2. Check RLS policies
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
WHERE schemaname = 'public'
  AND tablename = 'lost_pets';

-- ============================================
-- 3. Check table size vs visible rows
-- ============================================
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  n_live_tup as visible_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename = 'lost_pets';

-- If table_size is large but visible_rows is 11, RLS is blocking!

-- ============================================
-- 4. Check current visible count
-- ============================================
SELECT COUNT(*) as visible_pets FROM lost_pets;
