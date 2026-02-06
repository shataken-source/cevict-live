-- CHECK BOTH PROJECTS - Run this in EACH project

-- Project 1: Check lost_pets
SELECT 
  'PROJECT 1: lost_pets' AS check_type,
  current_database() AS database,
  COUNT(*) AS pets_count
FROM lost_pets;

-- Project 2: Check pets table
SELECT 
  'PROJECT 2: pets TABLE' AS check_type,
  current_database() AS database,
  COUNT(*) AS pets_count
FROM pets;

-- Project 2: Check lost_pets too
SELECT 
  'PROJECT 2: lost_pets' AS check_type,
  current_database() AS database,
  COUNT(*) AS pets_count
FROM lost_pets;
