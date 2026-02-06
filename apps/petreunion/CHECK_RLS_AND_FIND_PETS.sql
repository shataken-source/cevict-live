-- Check if RLS is hiding your 26,000 pets
-- Run these queries to see if data exists but is blocked

-- ============================================
-- 1. Check RLS status on lost_pets
-- ============================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'lost_pets';

-- ============================================
-- 2. Check RLS policies on lost_pets
-- ============================================
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'lost_pets';

-- ============================================
-- 3. Check actual row count (bypassing RLS if possible)
-- ============================================
-- This uses service role which bypasses RLS
-- If you're using anon key, RLS might block

-- Try with current role
SELECT COUNT(*) as visible_rows FROM lost_pets;

-- ============================================
-- 4. Check if there are archived/backup tables
-- ============================================
SELECT 
  table_name,
  (SELECT n_live_tup FROM pg_stat_user_tables 
   WHERE schemaname = table_schema AND relname = table_name) as rows
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND (
    table_name ILIKE '%pet%archive%' OR
    table_name ILIKE '%pet%backup%' OR
    table_name ILIKE '%pet%old%' OR
    table_name ILIKE '%pet%history%'
  );

-- ============================================
-- 5. Check for partitions (pets might be partitioned)
-- ============================================
SELECT 
  schemaname,
  relname as tablename,
  n_live_tup as rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND relname LIKE 'lost_pets%'
ORDER BY relname;

-- ============================================
-- 6. Check table size (might indicate hidden data)
-- ============================================
SELECT 
  schemaname,
  relname as tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) as table_size,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND relname = 'lost_pets';

-- If table_size is large but row_count is small, data might be hidden by RLS

-- ============================================
-- 7. Check if you're in the right Supabase project
-- ============================================
-- Verify your project URL matches
SELECT current_database() as database_name;

-- ============================================
-- 8. Check for soft-deleted pets (if status field exists)
-- ============================================
SELECT 
  status,
  COUNT(*) as count
FROM lost_pets
GROUP BY status;

-- ============================================
-- 9. Check if pets are in a different schema
-- ============================================
SELECT 
  table_schema,
  table_name,
  (SELECT n_live_tup FROM pg_stat_user_tables 
   WHERE schemaname = table_schema AND relname = table_name) as rows
FROM information_schema.tables 
WHERE table_name ILIKE '%pet%'
ORDER BY rows DESC NULLS LAST;
