-- Verify scraped_boats table was created successfully
-- Run this in Supabase SQL Editor to confirm everything is set up correctly

-- Check if table exists
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'scraped_boats'
ORDER BY ordinal_position;

-- Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'scraped_boats';

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'scraped_boats';

-- Quick test - should return 0 rows (table is empty)
SELECT COUNT(*) as total_boats FROM scraped_boats;


