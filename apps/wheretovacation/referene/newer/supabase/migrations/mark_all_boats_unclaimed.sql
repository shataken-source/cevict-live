-- Mark all scraped boats as unclaimed
-- This ensures all boats start as unclaimed until a captain verifies ownership

UPDATE scraped_boats 
SET claimed = false 
WHERE claimed IS NULL OR claimed = true;

-- Verify the update
SELECT 
  COUNT(*) as total_boats,
  COUNT(CASE WHEN claimed = false THEN 1 END) as unclaimed_boats,
  COUNT(CASE WHEN claimed = true THEN 1 END) as claimed_boats
FROM scraped_boats;






