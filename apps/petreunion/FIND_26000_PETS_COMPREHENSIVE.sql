-- Comprehensive Search for 26,000 Pets
-- The small table size (8KB) suggests data might be elsewhere

-- ============================================
-- 1. Check ALL tables with "pet" in name (all schemas)
-- ============================================
SELECT 
  table_schema,
  table_name,
  (SELECT n_live_tup FROM pg_stat_user_tables 
   WHERE schemaname = table_schema AND tablename = table_name) as row_count,
  (SELECT pg_size_pretty(pg_total_relation_size(table_schema||'.'||table_name)) 
   FROM pg_stat_user_tables 
   WHERE schemaname = table_schema AND tablename = table_name) as size
FROM information_schema.tables 
WHERE table_name ILIKE '%pet%'
ORDER BY row_count DESC NULLS LAST;

-- ============================================
-- 2. Check for tables with large row counts (might be pets)
-- ============================================
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup > 1000  -- Look for tables with 1000+ rows
ORDER BY n_live_tup DESC;

-- ============================================
-- 3. Check if pets are in a different Supabase project
-- ============================================
-- Verify you're in the right database
SELECT 
  current_database() as database_name,
  current_schema() as current_schema;

-- ============================================
-- 4. Check for views that might aggregate pets
-- ============================================
SELECT 
  table_schema,
  table_name,
  view_definition
FROM information_schema.views 
WHERE table_schema = 'public'
  AND (table_name ILIKE '%pet%' OR view_definition ILIKE '%pet%');

-- ============================================
-- 5. Check for materialized views
-- ============================================
SELECT 
  schemaname,
  matviewname,
  (SELECT COUNT(*) FROM pg_class WHERE relname = matviewname) as might_have_data
FROM pg_matviews
WHERE schemaname = 'public'
  AND matviewname ILIKE '%pet%';

-- ============================================
-- 6. Check if lost_pets has partitions
-- ============================================
SELECT 
  schemaname,
  tablename,
  n_live_tup as rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'lost_pets%'
ORDER BY tablename;

-- ============================================
-- 7. Check Supabase backups/point-in-time recovery
-- ============================================
-- Note: This requires Supabase Dashboard access
-- Go to: Database → Backups → Point-in-Time Recovery

-- ============================================
-- 8. Check if data was moved to archive table
-- ============================================
-- Look for any table with similar structure
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    column_name IN ('pet_name', 'name', 'breed', 'color', 'photo_url', 'image_url')
    OR table_name ILIKE '%pet%'
  )
ORDER BY table_name, ordinal_position;

-- ============================================
-- 9. Check if there's a different database/schema
-- ============================================
SELECT DISTINCT table_schema 
FROM information_schema.tables 
WHERE table_name ILIKE '%pet%'
ORDER BY table_schema;

-- ============================================
-- 10. Check for foreign data wrappers (external data)
-- ============================================
SELECT 
  foreign_server_name,
  foreign_data_wrapper_name
FROM information_schema.foreign_servers;

-- ============================================
-- 11. Check if pets table exists (not lost_pets)
-- ============================================
SELECT COUNT(*) as pets_table_exists
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'pets';

-- If it exists, check it
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = 'pets') THEN
    RAISE NOTICE 'pets table EXISTS - check it with: SELECT COUNT(*) FROM pets;';
  ELSE
    RAISE NOTICE 'pets table does NOT exist';
  END IF;
END $$;
