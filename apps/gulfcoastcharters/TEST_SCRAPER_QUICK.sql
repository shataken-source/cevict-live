-- Quick test: Check scraper setup and run scraper

-- Step 1: Check if tables exist
SELECT 
  'scraper_config' AS table_name,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scraper_config') AS exists,
  (SELECT COUNT(*) FROM scraper_config) AS row_count
UNION ALL
SELECT 
  'scraper_status',
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scraper_status'),
  (SELECT COUNT(*) FROM scraper_status)
UNION ALL
SELECT 
  'scraped_boats',
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scraped_boats'),
  (SELECT COUNT(*) FROM scraped_boats)
UNION ALL
SELECT 
  'vessels',
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vessels'),
  (SELECT COUNT(*) FROM vessels);

-- Step 2: Initialize scraper config if needed
INSERT INTO scraper_config (sources, filters, max_boats_per_run)
SELECT 
  '{"thehulltruth": true, "craigslist": true}'::jsonb,
  '{"states": ["AL", "FL", "MS", "LA", "TX"]}'::jsonb,
  10
WHERE NOT EXISTS (SELECT 1 FROM scraper_config);

-- Step 3: Initialize scraper status if needed
INSERT INTO scraper_status (is_running, total_boats_scraped, new_boats_today, scheduled_enabled)
SELECT false, 0, 0, false
WHERE NOT EXISTS (SELECT 1 FROM scraper_status);

-- Step 4: Check current scraped boats
SELECT 
  name,
  location,
  phone,
  boat_type,
  length,
  data_quality_score,
  data_complete,
  claimed,
  created_at
FROM scraped_boats
ORDER BY created_at DESC
LIMIT 10;
