-- SQL queries to help PostgREST recognize the scraped_boats table
-- Run these in Supabase Dashboard -> SQL Editor
-- These queries might trigger PostgREST to refresh its schema cache

-- 1. Verify table exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'scraped_boats';

-- 2. Query the table directly (sometimes helps PostgREST recognize it)
SELECT COUNT(*) as boat_count FROM public.scraped_boats;

-- 3. Create a simple view (PostgREST sometimes recognizes views faster)
CREATE OR REPLACE VIEW public.v_scraped_boats AS
SELECT * FROM public.scraped_boats;

-- 4. Query the view
SELECT COUNT(*) FROM public.v_scraped_boats;

-- 5. Grant explicit permissions (ensures PostgREST can see it)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scraped_boats TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scraped_boats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scraped_boats TO service_role;

-- 6. Refresh materialized views (if any) - this sometimes triggers a cache refresh
-- (Not applicable here, but included for completeness)

-- 7. Final verification query
SELECT
    'Table exists' as status,
    COUNT(*) as current_boat_count
FROM public.scraped_boats;

