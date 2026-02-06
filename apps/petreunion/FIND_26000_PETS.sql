-- ============================================
-- FIND 26,000 PETS - Run in Each Supabase Project
-- ============================================

-- PART A: How many pets in this project?
SELECT 
  'PART A: Pets Count' AS check_type,
  COUNT(*) AS pets_in_lost_pets,
  pg_size_pretty(pg_relation_size('public.lost_pets')) AS table_size
FROM lost_pets;

-- PART B: Any orphaned logs? (Proves deletion)
SELECT 
  'PART B: Orphaned Logs' AS check_type,
  COUNT(*) AS orphaned_log_entries
FROM pet_of_day_log l
LEFT JOIN lost_pets lp ON lp.id = l.pet_id
WHERE lp.id IS NULL;

-- PART C: All pet tables
SELECT 
  'PART C: Pet Tables' AS check_type,
  table_name,
  (SELECT n_live_tup FROM pg_stat_user_tables 
   WHERE schemaname = 'public' AND relname = table_name) AS row_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name ILIKE '%pet%'
ORDER BY row_count DESC NULLS LAST;

-- PART D: Large tables (might be where 26K pets are)
SELECT 
  'PART D: Large Tables' AS check_type,
  relname AS table_name,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup > 1000
ORDER BY n_live_tup DESC
LIMIT 10;
