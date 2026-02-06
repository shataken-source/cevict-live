-- EMERGENCY: Check if pets table was deleted or truncated
-- Run this in project: rdbuwyefbgnbuhmjrizo

-- Check if pets table still exists
SELECT 
  'TABLE EXISTS' AS check_type,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pets'
  ) AS pets_table_exists;

-- Check table size (if 0 bytes, data was deleted)
SELECT 
  'TABLE SIZE' AS check_type,
  pg_size_pretty(pg_relation_size('public.pets')) AS pets_table_size,
  (SELECT COUNT(*) FROM pets) AS pets_count;

-- Check for backups or point-in-time recovery
-- Go to Supabase Dashboard → Database → Backups NOW!
