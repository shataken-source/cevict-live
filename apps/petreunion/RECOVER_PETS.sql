-- ============================================
-- RECOVER 26,000 LOST PETS
-- Run this entire file in Supabase SQL Editor
-- ============================================

-- STEP 1: Check current status
SELECT 
  'STEP 1: Current Status' AS step,
  COUNT(*) AS pets_in_lost_pets,
  COUNT(*) FILTER (WHERE photo_url IS NOT NULL AND photo_url != '') AS pets_with_photos,
  pg_size_pretty(pg_relation_size('public.lost_pets')) AS table_size
FROM lost_pets;

-- STEP 2: Check for orphaned logs (proves deletion happened)
SELECT 
  'STEP 2: Orphaned Logs' AS step,
  COUNT(*) AS orphaned_log_entries,
  COUNT(DISTINCT l.pet_id) AS unique_deleted_pets,
  MIN(l.posted_date) AS earliest_deletion,
  MAX(l.posted_date) AS latest_deletion
FROM pet_of_day_log l
LEFT JOIN lost_pets lp ON lp.id = l.pet_id
WHERE lp.id IS NULL;

-- STEP 3: Find all pet tables
SELECT 
  'STEP 3: All Pet Tables' AS step,
  table_name,
  (SELECT n_live_tup FROM pg_stat_user_tables 
   WHERE schemaname = 'public' AND relname = table_name) AS row_count,
  pg_size_pretty(pg_total_relation_size('public.'||table_name)) AS total_size
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name ILIKE '%pet%'
ORDER BY row_count DESC NULLS LAST;

-- STEP 4: Find large tables (might be where 26K pets are)
SELECT 
  'STEP 4: Large Tables' AS step,
  relname AS table_name,
  n_live_tup AS row_count,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) AS total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup > 1000
ORDER BY n_live_tup DESC
LIMIT 10;

-- STEP 5: Verify database info
SELECT 
  'STEP 5: Database Info' AS step,
  current_database() AS database_name,
  current_schema() AS current_schema;
