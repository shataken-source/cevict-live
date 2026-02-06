-- CHECK pets TABLE SCHEMA
-- Run this FIRST to see what columns exist

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'pets'
ORDER BY ordinal_position;
