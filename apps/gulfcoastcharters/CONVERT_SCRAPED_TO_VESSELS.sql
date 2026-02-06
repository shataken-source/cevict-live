-- Convert scraped_boats to vessels table
-- This will make scraped boats show up on /captains page

-- First, check if vessels table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vessels')
    THEN 'vessels table exists'
    ELSE 'vessels table does NOT exist - need to create it first'
  END AS status;

-- If vessels table exists, insert scraped boats as vessels
-- Only insert boats that haven't been converted yet (not claimed)
INSERT INTO vessels (
  name,
  vessel_type,
  category,
  capacity,
  home_marina,
  operating_area,
  status,
  verified,
  photos,
  created_at,
  updated_at
)
SELECT DISTINCT ON (sb.name, sb.phone)
  COALESCE(sb.name, 'Unnamed Charter') AS name,
  COALESCE(sb.boat_type, 'charter_fishing') AS vessel_type,
  'charter_fishing' AS category,
  CASE 
    WHEN sb.length IS NOT NULL THEN GREATEST(2, LEAST(20, sb.length / 10)) -- Estimate capacity from length
    ELSE 6
  END AS capacity,
  sb.location AS home_marina,
  sb.location AS operating_area,
  'active' AS status,
  false AS verified, -- Not verified yet - admin can verify later
  ARRAY[]::text[] AS photos,
  COALESCE(sb.first_seen, NOW()) AS created_at,
  NOW() AS updated_at
FROM scraped_boats sb
WHERE 
  sb.claimed = false
  AND sb.name IS NOT NULL
  AND sb.data_quality_score >= 30 -- Only boats with minimum quality
  AND NOT EXISTS (
    -- Don't insert if a vessel with same name/location already exists
    SELECT 1 FROM vessels v 
    WHERE LOWER(TRIM(v.name)) = LOWER(TRIM(sb.name))
      AND (sb.location IS NULL OR LOWER(TRIM(v.home_marina)) = LOWER(TRIM(sb.location)))
  )
ORDER BY sb.name, sb.phone, sb.data_quality_score DESC
LIMIT 50; -- Limit to 50 to avoid overwhelming

-- Mark converted boats as claimed
UPDATE scraped_boats
SET claimed = true
WHERE id IN (
  SELECT sb.id
  FROM scraped_boats sb
  WHERE sb.claimed = false
    AND sb.name IS NOT NULL
    AND sb.data_quality_score >= 30
    AND EXISTS (
      SELECT 1 FROM vessels v 
      WHERE LOWER(TRIM(v.name)) = LOWER(TRIM(sb.name))
        AND (sb.location IS NULL OR LOWER(TRIM(v.home_marina)) = LOWER(TRIM(sb.location)))
        AND v.created_at > NOW() - INTERVAL '1 minute' -- Only mark if just created
    )
);

-- Check results
SELECT 
  'Vessels created' AS action,
  COUNT(*) AS count
FROM vessels
WHERE created_at > NOW() - INTERVAL '5 minutes';

SELECT 
  'Scraped boats marked as claimed' AS action,
  COUNT(*) AS count
FROM scraped_boats
WHERE claimed = true
  AND updated_at > NOW() - INTERVAL '5 minutes';
