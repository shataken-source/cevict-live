-- ============================================
-- CHECK ALL SUPABASE PROJECTS
-- Run this in EACH Supabase project's SQL Editor
-- Compare results to find which project has 26,000 pets
-- ============================================

-- ============================================
-- PART A: Lost Pets Count and Table Size
-- ============================================
SELECT 
  'PART A: Lost Pets Status' AS check_type,
  current_database() AS database_name,
  COUNT(*) AS pets_in_lost_pets,
  COUNT(*) FILTER (WHERE photo_url IS NOT NULL AND photo_url != '') AS pets_with_photos,
  pg_size_pretty(pg_relation_size('public.lost_pets')) AS table_size,
  (pg_relation_size('public.lost_pets') / 1024)::numeric(10,2) AS table_size_kb
FROM lost_pets;

-- ============================================
-- PART B: Orphaned Logs (Proves Deletion)
-- ============================================
SELECT 
  'PART B: Orphaned Logs' AS check_type,
  COUNT(*) AS orphaned_log_entries,
  COUNT(DISTINCT l.pet_id) AS unique_deleted_pets,
  MIN(l.posted_date) AS earliest_deletion,
  MAX(l.posted_date) AS latest_deletion
FROM pet_of_day_log l
LEFT JOIN lost_pets lp ON lp.id = l.pet_id
WHERE lp.id IS NULL;

-- ============================================
-- PART C: Confirm Key Tables Exist
-- ============================================
SELECT 
  'PART C: Key Tables' AS check_type,
  table_name,
  (SELECT n_live_tup FROM pg_stat_user_tables 
   WHERE schemaname = 'public' AND relname = table_name) AS row_count
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('lost_pets', 'pet_of_day_log', 'pet_of_the_day')
ORDER BY table_name;

-- ============================================
-- PART D: All Pet Tables (Find Hidden Data)
-- ============================================
SELECT 
  'PART D: All Pet Tables' AS check_type,
  table_name,
  (SELECT n_live_tup FROM pg_stat_user_tables 
   WHERE schemaname = 'public' AND relname = table_name) AS row_count,
  pg_size_pretty(pg_total_relation_size('public.'||table_name)) AS total_size
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name ILIKE '%pet%'
ORDER BY row_count DESC NULLS LAST;

-- ============================================
-- PART E: Large Tables (Might Be Where 26K Pets Are)
-- ============================================
SELECT 
  'PART E: Large Tables' AS check_type,
  relname AS table_name,
  n_live_tup AS row_count,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) AS total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup > 1000
ORDER BY n_live_tup DESC
LIMIT 10;

-- ============================================
-- PART F: Auth Users Count (Different Project = Different Users)
-- ============================================
SELECT 
  'PART F: Auth Users' AS check_type,
  COUNT(*) AS total_auth_users
FROM auth.users;

-- ============================================
-- PART G: Storage Buckets (Different Project = Different Storage)
-- ============================================
SELECT 
  'PART G: Storage Buckets' AS check_type,
  name AS bucket_name,
  public AS is_public
FROM storage.buckets
ORDER BY name;

-- ============================================
-- PART H: Database Info (Verify Project)
-- ============================================
SELECT 
  'PART H: Database Info' AS check_type,
  current_database() AS database_name,
  current_schema() AS current_schema,
  version() AS postgres_version;
