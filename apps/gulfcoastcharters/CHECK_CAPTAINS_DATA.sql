-- Check if there's any data in the vessels/boats/charters tables

-- Check vessels table
SELECT 
  'vessels' AS table_name,
  COUNT(*) AS total_count,
  COUNT(*) FILTER (WHERE status = 'active' AND verified = true) AS available_count
FROM vessels;

-- Check boats table (if vessels doesn't exist)
SELECT 
  'boats' AS table_name,
  COUNT(*) AS total_count,
  COUNT(*) FILTER (WHERE is_active = true) AS available_count
FROM boats;

-- Check charters table (if both above don't exist)
SELECT 
  'charters' AS table_name,
  COUNT(*) AS total_count
FROM charters;

-- Show sample data from vessels (if exists)
SELECT 
  id,
  name,
  vessel_type,
  status,
  verified,
  created_at
FROM vessels
ORDER BY created_at DESC
LIMIT 5;
