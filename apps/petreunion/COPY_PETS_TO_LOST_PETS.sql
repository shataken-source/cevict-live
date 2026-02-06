-- COPY ALL PETS FROM pets TO lost_pets
-- Run this in project: rdbuwyefbgnbuhmjrizo

-- Check current counts
SELECT 
  'BEFORE MIGRATION' AS status,
  (SELECT COUNT(*) FROM pets) AS pets_table_count,
  (SELECT COUNT(*) FROM lost_pets) AS lost_pets_table_count;

-- Copy pets to lost_pets
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
  COALESCE(pet_type, 'dog') AS pet_type,  -- Default to 'dog' if null
  breed,
  description,
  photo_url,
  'lost' AS status,
  created_at,
  COALESCE(updated_at, created_at) AS updated_at
FROM pets
WHERE NOT EXISTS (
  SELECT 1 FROM lost_pets 
  WHERE lost_pets.photo_url = pets.photo_url
  AND lost_pets.pet_name = pets.name
  AND lost_pets.created_at = pets.created_at
);

-- Verify migration
SELECT 
  'AFTER MIGRATION' AS status,
  (SELECT COUNT(*) FROM pets) AS pets_table_count,
  (SELECT COUNT(*) FROM lost_pets) AS lost_pets_table_count;
