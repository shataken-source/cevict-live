-- ============================================
-- DEEP AUDIT: PetReunion Database
-- Find correct tables and investigate missing 26,000 pets
-- ============================================

-- ============================================
-- PART 1: DISCOVER ALL PET-RELATED TABLES
-- ============================================

-- 1.1 List ALL tables in public schema
SELECT 
  'ALL TABLES' as section,
  table_schema,
  table_name,
  table_type,
  (SELECT n_live_tup FROM pg_stat_user_tables 
   WHERE schemaname = table_schema AND relname = table_name) as row_count
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY row_count DESC NULLS LAST;

-- 1.2 Find tables with "pet" in name
SELECT 
  'PET TABLES' as section,
  table_schema,
  table_name,
  table_type,
  (SELECT n_live_tup FROM pg_stat_user_tables 
   WHERE schemaname = table_schema AND relname = table_name) as row_count,
  pg_size_pretty(pg_total_relation_size(table_schema||'.'||table_name)) as total_size
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name ILIKE '%pet%'
ORDER BY row_count DESC NULLS LAST;

-- 1.3 Check for large tables (might be where 26,000 pets are)
SELECT 
  'LARGE TABLES (>1000 rows)' as section,
  schemaname,
  relname as table_name,
  n_live_tup as row_count,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) as table_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup > 1000
ORDER BY n_live_tup DESC;

-- ============================================
-- PART 2: VERIFY lost_pets TABLE STRUCTURE
-- ============================================

-- 2.1 Check lost_pets table structure
SELECT 
  'lost_pets STRUCTURE' as section,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'lost_pets'
ORDER BY ordinal_position;

-- 2.2 Check lost_pets size and row count
SELECT 
  'lost_pets SIZE' as section,
  'lost_pets' as table_name,
  COUNT(*) as visible_rows,
  (SELECT n_live_tup FROM pg_stat_user_tables 
   WHERE schemaname = 'public' AND relname = 'lost_pets') as actual_rows,
  pg_size_pretty(pg_total_relation_size('public.lost_pets')) as total_size,
  pg_size_pretty(pg_relation_size('public.lost_pets')) as table_size
FROM lost_pets;

-- 2.3 Check lost_pets RLS status
SELECT 
  'lost_pets RLS' as section,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies 
   WHERE schemaname = 'public' AND tablename = 'lost_pets') as policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relname = 'lost_pets';

-- 2.4 Check lost_pets policies
SELECT 
  'lost_pets POLICIES' as section,
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'lost_pets';

-- ============================================
-- PART 3: CHECK FOR ORPHANED LOG ENTRIES
-- (Pets deleted but logs remain)
-- ============================================

-- 3.0 Check pet_of_day_log schema (verify columns exist)
SELECT 
  'pet_of_day_log SCHEMA' as section,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'pet_of_day_log'
ORDER BY ordinal_position;

-- 3.1 Check pet_of_day_log for orphaned entries
SELECT 
  'ORPHANED LOG ENTRIES' as section,
  COUNT(*) as orphaned_logs,
  COUNT(DISTINCT l.pet_id) as unique_deleted_pets
FROM pet_of_day_log l
LEFT JOIN lost_pets lp ON lp.id = l.pet_id
WHERE lp.id IS NULL;

-- 3.2 Show orphaned log entries (if any)
-- Note: Using posted_date as primary timestamp (created_at may not exist in all versions)
SELECT 
  'ORPHANED LOG DETAILS' as section,
  l.id as log_id,
  l.pet_id as deleted_pet_id,
  l.posted_date
FROM pet_of_day_log l
LEFT JOIN lost_pets lp ON lp.id = l.pet_id
WHERE lp.id IS NULL
ORDER BY l.posted_date DESC
LIMIT 20;

-- 3.3 Check pet_of_the_day for orphaned entries
SELECT 
  'ORPHANED pet_of_the_day' as section,
  COUNT(*) as orphaned_entries
FROM pet_of_the_day potd
LEFT JOIN lost_pets lp ON lp.id = potd.pet_id
WHERE lp.id IS NULL;

-- ============================================
-- PART 4: CHECK FOR DELETION TRIGGERS
-- ============================================

-- 4.1 Check for triggers on lost_pets
SELECT 
  'TRIGGERS ON lost_pets' as section,
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'lost_pets';

-- 4.2 Check for functions that might delete
SELECT 
  'FUNCTIONS WITH DELETE' as section,
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_definition ILIKE '%DELETE%lost_pets%'
    OR routine_definition ILIKE '%TRUNCATE%lost_pets%'
  );

-- ============================================
-- PART 5: CHECK FOREIGN KEY CONSTRAINTS
-- ============================================

-- 5.1 Check foreign keys referencing lost_pets
SELECT 
  'FOREIGN KEYS TO lost_pets' as section,
  tc.constraint_name,
  tc.table_name as referencing_table,
  kcu.column_name as referencing_column,
  ccu.table_name as referenced_table,
  ccu.column_name as referenced_column,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'lost_pets'
  AND tc.table_schema = 'public';

-- ============================================
-- PART 6: CHECK FOR DELETION IN AUDIT LOGS
-- (If Supabase audit logging is enabled)
-- ============================================

-- 6.1 Check if audit schema exists
SELECT 
  'AUDIT SCHEMA CHECK' as section,
  schema_name
FROM information_schema.schemata
WHERE schema_name IN ('audit', 'pg_catalog')
ORDER BY schema_name;

-- 6.2 Check for recent DELETE operations (if audit log exists)
-- Note: This may not exist in all Supabase projects
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'audit' AND table_name = 'logged_actions') THEN
    RAISE NOTICE 'Audit log exists - checking for DELETE operations';
  ELSE
    RAISE NOTICE 'No audit log found - audit logging may not be enabled';
  END IF;
END $$;

-- ============================================
-- PART 7: CHECK TABLE CREATION HISTORY
-- ============================================

-- 7.1 Check when lost_pets table was created (approximate)
-- Note: Uses created_at if it exists, otherwise shows table size only
SELECT 
  'TABLE CREATION' as section,
  schemaname,
  relname as table_name,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as size,
  (SELECT MIN(created_at) FROM lost_pets WHERE created_at IS NOT NULL) as oldest_pet,
  (SELECT MAX(created_at) FROM lost_pets WHERE created_at IS NOT NULL) as newest_pet
FROM pg_stat_user_tables
WHERE schemaname = 'public' AND relname = 'lost_pets';

-- ============================================
-- PART 8: CHECK FOR DATA IN OTHER SCHEMAS
-- ============================================

-- 8.1 Check all schemas for pet tables
SELECT DISTINCT 
  'OTHER SCHEMAS' as section,
  table_schema,
  table_name
FROM information_schema.tables 
WHERE table_name ILIKE '%pet%'
  AND table_schema != 'public'
ORDER BY table_schema, table_name;

-- ============================================
-- PART 9: SUMMARY - WHAT WE KNOW
-- ============================================

SELECT 
  'SUMMARY' as section,
  'lost_pets row count' as metric,
  COUNT(*)::text as value
FROM lost_pets
UNION ALL
SELECT 
  'SUMMARY',
  'lost_pets with photos',
  COUNT(*)::text
FROM lost_pets 
WHERE photo_url IS NOT NULL AND photo_url != ''
UNION ALL
SELECT 
  'SUMMARY',
  'Table size (bytes)',
  pg_relation_size('public.lost_pets')::text
UNION ALL
SELECT 
  'SUMMARY',
  'Expected size for 26K pets (MB)',
  '10-50' as value
UNION ALL
SELECT 
  'SUMMARY',
  'Actual size (KB)',
  (pg_relation_size('public.lost_pets') / 1024)::text;
