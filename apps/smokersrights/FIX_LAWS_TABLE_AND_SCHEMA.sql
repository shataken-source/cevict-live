-- Fix Laws Table and PostgREST Schema Cache
-- This script ensures the laws table exists and is visible to PostgREST

-- ============================================
-- STEP 1: Create laws table if it doesn't exist
-- ============================================
CREATE TABLE IF NOT EXISTS public.laws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL,
  state_name TEXT NOT NULL,
  category TEXT NOT NULL,
  summary TEXT,
  full_text TEXT,
  effective_date DATE,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 2: Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_laws_state_code ON public.laws(state_code);
CREATE INDEX IF NOT EXISTS idx_laws_category ON public.laws(category);
CREATE INDEX IF NOT EXISTS idx_laws_last_updated_at ON public.laws(last_updated_at);
CREATE INDEX IF NOT EXISTS idx_laws_state_category ON public.laws(state_code, category);

-- ============================================
-- STEP 3: Grant permissions (CRITICAL for PostgREST)
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.laws TO anon, authenticated, service_role;

-- ============================================
-- STEP 4: Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE public.laws ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all reads (public data)
DROP POLICY IF EXISTS "Laws are viewable by everyone" ON public.laws;
CREATE POLICY "Laws are viewable by everyone" 
  ON public.laws 
  FOR SELECT 
  USING (true);

-- Create policy to allow service_role to update
DROP POLICY IF EXISTS "Service role can update laws" ON public.laws;
CREATE POLICY "Service role can update laws" 
  ON public.laws 
  FOR UPDATE 
  USING (auth.role() = 'service_role');

-- ============================================
-- STEP 5: Try to refresh PostgREST schema cache
-- ============================================
-- This may or may not work in Supabase Cloud, but worth trying
NOTIFY pgrst, 'reload schema';

-- ============================================
-- STEP 6: VERIFICATION
-- ============================================
SELECT '=== VERIFICATION ===' as info;

-- Check if table exists
SELECT 
  'Table exists' as check,
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'laws')
    THEN '✅ YES'
    ELSE '❌ NO'
  END as status;

-- Count laws (if any exist)
SELECT 
  'Laws count' as check,
  COUNT(*) as count
FROM public.laws;

-- Check permissions
SELECT 
  'Permissions' as check,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'laws'
  AND grantee IN ('anon', 'authenticated', 'service_role');

-- ============================================
-- IMPORTANT: Next Steps
-- ============================================
SELECT '=== NEXT STEPS ===' as info;
SELECT 
  '1. Wait 30-60 seconds for PostgREST schema cache to refresh' as step1,
  '2. Run: npm run update-laws' as step2,
  '3. If still fails, check Supabase dashboard for RLS warnings' as step3;
