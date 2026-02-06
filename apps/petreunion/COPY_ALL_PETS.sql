-- COPY ALL 26,190 PETS FROM pets TO lost_pets
-- Run this ONCE in project: rdbuwyefbgnbuhmjrizo
-- This will copy ALL pets, skipping duplicates

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
WHERE NOT EXISTS (
  SELECT 1 FROM lost_pets 
  WHERE lost_pets.photo_url = pets.photo_url
  AND lost_pets.pet_name = pets.name
)
ON CONFLICT DO NOTHING;

-- Verify
SELECT 
  'FINAL COUNT' AS status,
  (SELECT COUNT(*) FROM pets) AS pets_remaining,
  (SELECT COUNT(*) FROM lost_pets) AS lost_pets_total;
