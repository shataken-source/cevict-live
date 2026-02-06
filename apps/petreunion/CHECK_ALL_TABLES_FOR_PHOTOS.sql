-- ============================================
-- CHECK ALL TABLES FOR PHOTOS - FREE Database
-- Run this in FREE database to find where photos are stored
-- ============================================

-- Check all tables that might have photos
SELECT 
  'All pet-related tables' as check_name,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND (
    table_name ILIKE '%pet%' OR
    table_name ILIKE '%photo%' OR
    table_name ILIKE '%image%' OR
    table_name ILIKE '%media%'
  )
ORDER BY table_name;

-- Check pets table structure (all columns)
SELECT 
  'pets table columns' as check_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pets'
ORDER BY ordinal_position;

-- Check for JSON columns that might contain photos
SELECT 
  'JSON columns in pets' as check_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pets'
  AND (data_type = 'json' OR data_type = 'jsonb')
ORDER BY column_name;

-- Sample pet with ALL data (to see what's actually there)
SELECT 
  'Sample pet - ALL fields' as check_name,
  *
FROM pets
LIMIT 1;
