-- Find ALL tables that might contain pets
-- Run this to discover where your 26,000 pets are stored

-- ============================================
-- 1. List ALL tables in the database
-- ============================================
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================
-- 2. Find tables with "pet" in the name
-- ============================================
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name ILIKE '%pet%'
ORDER BY table_name;

-- ============================================
-- 3. Check common pet table names
-- ============================================
-- Check if 'pets' table exists and has data
SELECT 
  'pets' as table_name,
  COUNT(*) as row_count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'pets'
UNION ALL
SELECT 
  'lost_pets' as table_name,
  COUNT(*) as row_count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'lost_pets'
UNION ALL
SELECT 
  'found_pets' as table_name,
  COUNT(*) as row_count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'found_pets'
UNION ALL
SELECT 
  'all_pets' as table_name,
  COUNT(*) as row_count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'all_pets';

-- ============================================
-- 4. Check row counts for potential pet tables
-- ============================================
-- This will show which tables have the most rows
SELECT 
  schemaname,
  tablename,
  n_live_tup as estimated_row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- ============================================
-- 5. If 'pets' table exists, check it
-- ============================================
-- Uncomment and run if 'pets' table exists:
-- SELECT COUNT(*) as total_pets FROM pets;
-- SELECT COUNT(*) as pets_with_photos FROM pets WHERE image_url IS NOT NULL AND image_url != '';
-- SELECT * FROM pets LIMIT 5;

-- ============================================
-- 6. Check for views that might combine tables
-- ============================================
SELECT 
  table_schema,
  table_name,
  view_definition
FROM information_schema.views 
WHERE table_schema = 'public'
  AND (table_name ILIKE '%pet%' OR view_definition ILIKE '%pet%');

-- ============================================
-- 7. Check lost_pets table structure and count
-- ============================================
SELECT COUNT(*) as total_rows FROM lost_pets;

-- Check if there are different schemas
SELECT DISTINCT table_schema 
FROM information_schema.tables 
WHERE table_name ILIKE '%pet%';
