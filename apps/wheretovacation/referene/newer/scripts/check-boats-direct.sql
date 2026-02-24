-- Direct SQL queries to check if boats are still in the database
-- Run these in Supabase Dashboard -> SQL Editor

-- 1. Check total count
SELECT COUNT(*) as total_boats FROM scraped_boats;

-- 2. Check recent boats
SELECT
    name,
    location_city,
    location_state,
    source,
    claimed,
    created_at
FROM scraped_boats
ORDER BY created_at DESC
LIMIT 20;

-- 3. Check by source
SELECT
    source,
    COUNT(*) as count
FROM scraped_boats
GROUP BY source
ORDER BY count DESC;

-- 4. Check if table exists and has data
SELECT
    'Table exists' as status,
    COUNT(*) as row_count,
    MIN(created_at) as oldest_boat,
    MAX(created_at) as newest_boat
FROM scraped_boats;

