-- COPY FROM pets TABLE TO lost_pets
-- Run this in project: rdbuwyefbgnbuhmjrizo (where pets table is)

-- Check if pets table has data
SELECT 
  'CHECK pets TABLE' AS step,
  COUNT(*) AS pets_count,
  pg_size_pretty(pg_relation_size('public.pets')) AS table_size
FROM pets;

-- If pets table has data, copy ALL to lost_pets
-- This will copy all 26,190 pets
INSERT INTO lost_pets (
  pet_name,
  pet_type,
  breed,
  description,
  photo_url,
  status,
  created_at,
  updated_at
)
SELECT 
  name AS pet_name,
  COALESCE(pet_type, 'dog') AS pet_type,
  breed,
  description,
  photo_url,
  'lost' AS status,
  created_at,
  COALESCE(updated_at, created_at) AS updated_at
FROM pets
ON CONFLICT DO NOTHING;

-- Verify copy worked
SELECT 
  'VERIFY COPY' AS step,
  (SELECT COUNT(*) FROM pets) AS pets_remaining,
  (SELECT COUNT(*) FROM lost_pets) AS lost_pets_total;
