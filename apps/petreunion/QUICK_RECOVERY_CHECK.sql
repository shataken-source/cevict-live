-- QUICK RECOVERY CHECK
-- Run this FIRST to see current state

-- ============================================
-- 0. Verify Schema (Check Column Names)
-- ============================================
SELECT 
  'SCHEMA CHECK' AS check_type,
  'pet_of_day_log' AS table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'pet_of_day_log'
ORDER BY ordinal_position;

-- ============================================
-- 1. Current Status
-- ============================================
SELECT 
  'CURRENT STATUS' AS check_type,
  COUNT(*) AS pets_in_lost_pets,
  COUNT(*) FILTER (WHERE photo_url IS NOT NULL AND photo_url != '') AS pets_with_photos,
  pg_size_pretty(pg_relation_size('public.lost_pets')) AS table_size_bytes,
  (pg_relation_size('public.lost_pets') / 1024)::numeric(10,2) AS table_size_kb
FROM lost_pets;

-- ============================================
-- 2. Orphaned Logs (Proves Deletion)
-- Note: Uses posted_date - if column doesn't exist, check schema above
-- ============================================
SELECT 
  'ORPHANED LOGS' AS check_type,
  COUNT(*) AS orphaned_log_entries,
  COUNT(DISTINCT l.pet_id) AS unique_deleted_pets,
  MIN(l.posted_date) AS earliest_log_date,
  MAX(l.posted_date) AS latest_log_date
FROM pet_of_day_log l
LEFT JOIN lost_pets lp ON lp.id = l.pet_id
WHERE lp.id IS NULL;

-- ============================================
-- 3. All Pet Tables (Find Where Data Might Be)
-- ============================================
SELECT 
  'ALL PET TABLES' AS check_type,
  table_name,
  (SELECT n_live_tup FROM pg_stat_user_tables 
   WHERE schemaname = 'public' AND relname = table_name) AS row_count,
  pg_size_pretty(pg_total_relation_size('public.'||table_name)) AS total_size
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name ILIKE '%pet%'
ORDER BY row_count DESC NULLS LAST;

-- ============================================
-- 4. Large Tables (Might Be Where 26K Pets Are)
-- ============================================
SELECT 
  'LARGE TABLES' AS check_type,
  relname AS table_name,
  n_live_tup AS row_count,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) AS total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup > 1000
ORDER BY n_live_tup DESC
LIMIT 10;

-- ============================================
-- 5. Database Info (Verify You're in Right Project)
-- ============================================
SELECT 
  'DATABASE INFO' AS check_type,
  current_database() AS database_name,
  current_schema() AS current_schema,
  version() AS postgres_version;
