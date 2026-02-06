-- ============================================
-- CHECK PROJECT: rdbuwyefbgnbuhmjrizo
-- Run this in the OTHER Supabase project
-- ============================================

-- PART A: How many pets in THIS project?
SELECT 
  'PART A: Pets Count' AS check_type,
  current_database() AS database_name,
  COUNT(*) AS pets_in_lost_pets,
  COUNT(*) FILTER (WHERE photo_url IS NOT NULL AND photo_url != '') AS pets_with_photos,
  pg_size_pretty(pg_relation_size('public.lost_pets')) AS table_size,
  (pg_relation_size('public.lost_pets') / 1024)::numeric(10,2) AS table_size_kb
FROM lost_pets;

-- PART B: Any orphaned logs? (Proves deletion)
SELECT 
  'PART B: Orphaned Logs' AS check_type,
  COUNT(*) AS orphaned_log_entries,
  COUNT(DISTINCT l.pet_id) AS unique_deleted_pets,
  MIN(l.posted_date) AS earliest_deletion,
  MAX(l.posted_date) AS latest_deletion
FROM pet_of_day_log l
LEFT JOIN lost_pets lp ON lp.id = l.pet_id
WHERE lp.id IS NULL;

-- PART C: All pet tables
SELECT 
  'PART C: Pet Tables' AS check_type,
  table_name,
  (SELECT n_live_tup FROM pg_stat_user_tables 
   WHERE schemaname = 'public' AND relname = table_name) AS row_count,
  pg_size_pretty(pg_total_relation_size('public.'||table_name)) AS total_size
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name ILIKE '%pet%'
ORDER BY row_count DESC NULLS LAST;

-- PART D: Large tables (might be where 26K pets are)
SELECT 
  'PART D: Large Tables' AS check_type,
  relname AS table_name,
  n_live_tup AS row_count,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) AS total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup > 1000
ORDER BY n_live_tup DESC
LIMIT 10;

-- PART E: Database info
SELECT 
  'PART E: Database Info' AS check_type,
  current_database() AS database_name,
  current_schema() AS current_schema;
