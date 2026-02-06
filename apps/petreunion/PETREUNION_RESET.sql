-- ============================================================
-- PETREUNION_RESET.sql
-- One-shot cleanup + verification for lost_pets
-- PURPOSE:
--   - Remove ALL fake scraper data (petharbor, social, pawboost sim)
--   - Clean up pet_of_day_log references to deleted pets
--   - Re-assert safe RLS policies so the app can read/insert
--
-- SAFETY:
--   - THIS SCRIPT PERMANENTLY DELETES ROWS FROM lost_pets.
--   - BACK UP YOUR DATABASE BEFORE RUNNING.
--   - Run in the correct Supabase project only.
-- ============================================================

-- ============================================
-- STEP 0: Quick sanity snapshot
-- ============================================
SELECT 
  'BEFORE RESET: lost_pets total' AS check_type,
  COUNT(*) AS total_pets
FROM public.lost_pets;

SELECT 
  'BEFORE RESET: pets with photos' AS check_type,
  COUNT(*) AS pets_with_photos
FROM public.lost_pets
WHERE photo_url IS NOT NULL AND photo_url != '';

-- ============================================
-- STEP 1: Identify FAKE scraper data
-- Criteria copied from REMOVE_FAKE_DATA.sql
-- ============================================
WITH fake_candidates AS (
  SELECT id
  FROM public.lost_pets
  WHERE 
    -- Owner name is "Community" (fake scraper pattern)
    owner_name = 'Community'
    OR
    -- Pet name is one of the fake scraper names
    pet_name IN (
      'Buddy', 'Luna', 'Max', 'Charlie', 'Cooper', 'Rocky', 'Bear', 'Duke',
      'Tucker', 'Jack', 'Oliver', 'Bella', 'Lucy', 'Daisy', 'Sadie', 'Molly',
      'Bailey', 'Maggie', 'Sophie', 'Chloe', 'Leo', 'Milo', 'Simba', 'Loki',
      'Oscar', 'Jasper', 'Tiger', 'Nala', 'Kitty', 'Lily', 'Callie', 'Cleo'
    )
    OR
    -- Description matches fake scraper patterns
    description LIKE 'Friendly % looking for a forever home. Found in %'
    OR description LIKE 'Seen near %, %. %'
    OR
    -- Source URL is from fake scrapers
    source_url LIKE 'https://example.com/%'
    OR source_post_id LIKE '%_sim_%'
    OR
    -- Source platform is from fake scrapers
    source_platform IN ('petharbor', 'facebook', 'instagram', 'tiktok')
    OR
    -- Photo URLs are from fake photo APIs
    photo_url LIKE 'https://images.dog.ceo/%'
    OR photo_url LIKE 'https://cdn2.thecatapi.com/%'
)
SELECT 
  'STEP 1: Fake candidates identified' AS check_type,
  COUNT(*) AS fake_pets
FROM fake_candidates;

-- Optional preview of a few fake rows
SELECT 
  'STEP 1 PREVIEW' AS section,
  lp.id,
  lp.pet_name,
  lp.pet_type,
  lp.location_city,
  lp.location_state,
  lp.owner_name,
  lp.description,
  lp.source_platform,
  lp.source_url,
  lp.photo_url,
  lp.created_at
FROM public.lost_pets lp
JOIN fake_candidates fc ON fc.id = lp.id
ORDER BY lp.created_at DESC
LIMIT 50;

-- ============================================================
-- STEP 2: DELETE fake data (and related pet_of_day_log rows)
-- UNCOMMENT THE DELETE BLOCKS ONLY AFTER REVIEWING STEP 1.
-- ============================================================

-- 2A: Clean pet_of_day_log references first to avoid orphans
-- DELETE FROM public.pet_of_day_log
-- WHERE pet_id IN (SELECT id FROM fake_candidates);

-- 2B: Delete fake pets from lost_pets
-- DELETE FROM public.lost_pets
-- WHERE id IN (SELECT id FROM fake_candidates);

-- ============================================================
-- STEP 3: Verify remaining data and check for any leftover patterns
-- ============================================================
SELECT 
  'AFTER DELETE: lost_pets total' AS check_type,
  COUNT(*) AS total_pets
FROM public.lost_pets;

SELECT 
  'AFTER DELETE: pets with photos' AS check_type,
  COUNT(*) AS pets_with_photos
FROM public.lost_pets
WHERE photo_url IS NOT NULL AND photo_url != '';

-- Any remaining obviously fake patterns?
SELECT 
  'AFTER DELETE: remaining obvious fake rows' AS check_type,
  COUNT(*) AS remaining_fake
FROM public.lost_pets
WHERE 
  owner_name = 'Community'
  OR description LIKE 'Friendly % looking for a forever home. Found in %'
  OR description LIKE 'Seen near %, %. %'
  OR source_url LIKE 'https://example.com/%'
  OR source_post_id LIKE '%_sim_%'
  OR photo_url LIKE 'https://images.dog.ceo/%'
  OR photo_url LIKE 'https://cdn2.thecatapi.com/%';

-- ============================================================
-- STEP 4: Re-assert RLS policies so the new app can read/insert
-- (Based on FIX_RLS_FOR_RECOVERED_PETS.sql and FINAL_FIX_AND_VERIFY.sql)
-- ============================================================

-- Ensure RLS is enabled
ALTER TABLE public.lost_pets ENABLE ROW LEVEL SECURITY;

-- Public read policy
DROP POLICY IF EXISTS "Allow public read access to lost_pets" ON public.lost_pets;

CREATE POLICY "Allow public read access to lost_pets"
  ON public.lost_pets
  FOR SELECT
  USING (true);

-- Public insert policy (for /report/lost and /report-found)
DROP POLICY IF EXISTS "Anyone can report lost pets" ON public.lost_pets;

CREATE POLICY "Anyone can report lost pets"
  ON public.lost_pets
  FOR INSERT
  WITH CHECK (true);

-- Quick visibility check
SELECT 
  'RLS VISIBILITY CHECK' AS check_name,
  COUNT(*) AS visible_pets
FROM public.lost_pets;

-- ============================================================
-- STEP 5: Optional – verify Pet of the Day still works
-- (only if you are using get_next_pet_of_day / pet_of_day_log)
-- ============================================================
-- SELECT * FROM get_next_pet_of_day();

