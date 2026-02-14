-- Check if scraped_boats table exists
-- Run this in Supabase Dashboard -> SQL Editor

-- Check if table exists
SELECT
    table_name,
    table_schema
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'scraped_boats';

-- If table exists, check its structure
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'scraped_boats'
ORDER BY ordinal_position;

-- Try to insert a test row (will fail if table doesn't exist)
-- This also helps trigger PostgREST to recognize the table
INSERT INTO public.scraped_boats (name, source)
VALUES ('TEST_BOAT_DELETE_ME', 'test')
ON CONFLICT DO NOTHING;

-- Delete the test row
DELETE FROM public.scraped_boats WHERE name = 'TEST_BOAT_DELETE_ME';

-- Check row count
SELECT COUNT(*) as total_boats FROM public.scraped_boats;

