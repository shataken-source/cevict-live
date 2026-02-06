-- CHECK THE pets TABLE (NOT lost_pets)
-- Run this in project: rdbuwyefbgnbuhmjrizo

-- STEP 1: Check pets table structure FIRST
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'pets'
ORDER BY ordinal_position;

-- STEP 2: Count pets (use correct column name from STEP 1)
SELECT 
  'pets TABLE COUNT' AS check_type,
  COUNT(*) AS total_pets,
  pg_size_pretty(pg_relation_size('public.pets')) AS table_size
FROM pets;

-- STEP 3: Sample pets (adjust columns based on STEP 1 results)
SELECT id, name, breed, created_at
FROM pets
ORDER BY created_at DESC
LIMIT 10;
