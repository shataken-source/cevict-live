-- Final Fix and Verification for Pet Tables (Robust Version)
-- Run this to fix RLS and verify all pet tables
-- This version safely handles missing test tables

-- ============================================
-- STEP 1: Count all pet tables (production vs test)
-- Safely handles missing test tables
-- ============================================
SELECT 'lost_pets (PRODUCTION)' AS table_name, COUNT(*) as row_count 
FROM public.lost_pets
UNION ALL
SELECT 'test_lost_pets (TEST)', 
  COALESCE((SELECT COUNT(*) FROM public.test_lost_pets), 0)
WHERE EXISTS (SELECT 1 FROM information_schema.tables 
              WHERE table_schema = 'public' AND table_name = 'test_lost_pets')
UNION ALL
SELECT 'test_found_pets (TEST)', 
  COALESCE((SELECT COUNT(*) FROM public.test_found_pets), 0)
WHERE EXISTS (SELECT 1 FROM information_schema.tables 
              WHERE table_schema = 'public' AND table_name = 'test_found_pets')
UNION ALL
SELECT 'test_shelter_pets (TEST)', 
  COALESCE((SELECT COUNT(*) FROM public.test_shelter_pets), 0)
WHERE EXISTS (SELECT 1 FROM information_schema.tables 
              WHERE table_schema = 'public' AND table_name = 'test_shelter_pets')
ORDER BY row_count DESC;

-- ============================================
-- STEP 2: Check RLS status
-- ============================================
SELECT 
  c.relrowsecurity AS rls_enabled,
  c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relname = 'lost_pets';

-- ============================================
-- STEP 3: Check existing policies
-- ============================================
SELECT 
  policyname, 
  cmd, 
  roles, 
  qual, 
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'lost_pets';

-- ============================================
-- STEP 4: Fix RLS - Enable public read access
-- ============================================
ALTER TABLE public.lost_pets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to lost_pets" ON public.lost_pets;

CREATE POLICY "Allow public read access to lost_pets"
  ON public.lost_pets 
  FOR SELECT 
  USING (true);

-- ============================================
-- STEP 5: Verify the fix worked
-- ============================================
SELECT COUNT(*) as total_pets FROM public.lost_pets;

SELECT COUNT(*) as pets_with_photos 
FROM public.lost_pets 
WHERE photo_url IS NOT NULL 
  AND photo_url != '';

-- ============================================
-- STEP 6: Check table sizes (fixed: tablename -> relname)
-- ============================================
SELECT 
  'lost_pets' as table_name,
  pg_size_pretty(pg_total_relation_size('public.lost_pets')) as total_size,
  pg_size_pretty(pg_relation_size('public.lost_pets')) as table_size,
  s.n_live_tup as row_count
FROM pg_stat_user_tables s
WHERE s.schemaname = 'public' AND s.relname = 'lost_pets';

-- ============================================
-- STEP 7: Verify get_next_pet_of_day() function works
-- ============================================
SELECT * FROM get_next_pet_of_day();
