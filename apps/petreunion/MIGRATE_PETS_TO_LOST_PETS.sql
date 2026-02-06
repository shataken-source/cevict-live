-- MIGRATE DATA FROM pets TO lost_pets
-- Run this in project: rdbuwyefbgnbuhmjrizo
-- This copies all pets from pets table to lost_pets table

-- First, check if lost_pets table exists and has the right structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'lost_pets'
ORDER BY ordinal_position;

-- Migrate pets to lost_pets
-- Adjust column mapping based on actual schema
INSERT INTO lost_pets (
  pet_name,
  pet_type,
  breed,
  color,
  size,
  age,
  description,
  photo_url,
  status,
  created_at,
  updated_at
)
SELECT 
  name AS pet_name,
  'dog' AS pet_type,  -- Adjust based on your data
  breed,
  NULL AS color,  -- Add if pets table has color
  NULL AS size,   -- Add if pets table has size
  age::text AS age,  -- Convert if needed
  description,
  image_url AS photo_url,
  'lost' AS status,
  created_at,
  COALESCE(updated_at, created_at) AS updated_at
FROM pets
WHERE NOT EXISTS (
  SELECT 1 FROM lost_pets 
  WHERE lost_pets.photo_url = pets.image_url
  OR (lost_pets.pet_name = pets.name AND lost_pets.created_at = pets.created_at)
)
ON CONFLICT DO NOTHING;

-- Verify migration
SELECT 
  'MIGRATION COMPLETE' AS status,
  COUNT(*) AS pets_in_lost_pets
FROM lost_pets;
