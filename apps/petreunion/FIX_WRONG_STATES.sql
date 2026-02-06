-- FIX WRONG STATE ASSIGNMENTS IN DESCRIPTIONS
-- Updates descriptions that have wrong states (e.g., "Tuscaloosa, WV" should be "Tuscaloosa, AL")

-- ============================================
-- STEP 1: IDENTIFY WRONG STATE DESCRIPTIONS
-- ============================================
-- Find descriptions with Alabama cities but wrong states
SELECT 
  id,
  pet_name,
  location_city,
  location_state,
  description,
  CASE 
    WHEN location_city IN ('Birmingham', 'Montgomery', 'Mobile', 'Huntsville', 'Tuscaloosa', 'Hoover', 'Dothan', 'Auburn', 'Decatur', 'Madison')
      AND location_state != 'AL' THEN 'WRONG STATE - Should be AL'
    WHEN location_city IN ('Houston', 'San Antonio', 'Dallas', 'Austin', 'Fort Worth', 'El Paso', 'Arlington', 'Corpus Christi', 'Plano', 'Laredo')
      AND location_state != 'TX' THEN 'WRONG STATE - Should be TX'
    WHEN location_city IN ('Los Angeles', 'San Diego', 'San Jose', 'San Francisco', 'Fresno', 'Sacramento', 'Long Beach', 'Oakland', 'Bakersfield', 'Anaheim')
      AND location_state != 'CA' THEN 'WRONG STATE - Should be CA'
    ELSE 'OK'
  END as issue
FROM lost_pets
WHERE 
  (location_city IN ('Birmingham', 'Montgomery', 'Mobile', 'Huntsville', 'Tuscaloosa', 'Hoover', 'Dothan', 'Auburn', 'Decatur', 'Madison') AND location_state != 'AL')
  OR
  (location_city IN ('Houston', 'San Antonio', 'Dallas', 'Austin', 'Fort Worth', 'El Paso', 'Arlington', 'Corpus Christi', 'Plano', 'Laredo') AND location_state != 'TX')
  OR
  (location_city IN ('Los Angeles', 'San Diego', 'San Jose', 'San Francisco', 'Fresno', 'Sacramento', 'Long Beach', 'Oakland', 'Bakersfield', 'Anaheim') AND location_state != 'CA')
LIMIT 50;

-- ============================================
-- STEP 2: FIX DESCRIPTIONS WITH WRONG STATES
-- ============================================
-- Update descriptions to use correct state from location_state field
UPDATE lost_pets
SET description = REPLACE(
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(
                REPLACE(
                  REPLACE(description, ', WV', ', ' || location_state),
                  ', WA', ', ' || location_state),
                  ', VA', ', ' || location_state),
                  ', VT', ', ' || location_state),
                  ', UT', ', ' || location_state),
                  ', TX', ', ' || location_state),
                  ', CA', ', ' || location_state),
                  ', FL', ', ' || location_state),
                  ', GA', ', ' || location_state),
                  ', AZ', ', ' || location_state)
WHERE 
  description LIKE '%, WV'
  OR description LIKE '%, WA'
  OR description LIKE '%, VA'
  OR description LIKE '%, VT'
  OR description LIKE '%, UT'
  OR description LIKE '%, TX'
  OR description LIKE '%, CA'
  OR description LIKE '%, FL'
  OR description LIKE '%, GA'
  OR description LIKE '%, AZ'
  AND location_state IS NOT NULL;

-- ============================================
-- STEP 3: FIX location_state FIELD FOR ALABAMA CITIES
-- ============================================
-- Update location_state to AL for Alabama cities
UPDATE lost_pets
SET location_state = 'AL'
WHERE location_city IN ('Birmingham', 'Montgomery', 'Mobile', 'Huntsville', 'Tuscaloosa', 'Hoover', 'Dothan', 'Auburn', 'Decatur', 'Madison')
  AND location_state != 'AL';

-- ============================================
-- STEP 4: VERIFY FIXES
-- ============================================
-- Check remaining wrong states
SELECT 
  location_city,
  location_state,
  COUNT(*) as count
FROM lost_pets
WHERE 
  (location_city IN ('Birmingham', 'Montgomery', 'Mobile', 'Huntsville', 'Tuscaloosa', 'Hoover', 'Dothan', 'Auburn', 'Decatur', 'Madison') AND location_state != 'AL')
GROUP BY location_city, location_state
ORDER BY count DESC;
