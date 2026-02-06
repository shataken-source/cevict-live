-- =============================================
-- TEMPORARY TEST RLS BYPASS (DEV ONLY)
-- =============================================
-- ⚠️ WARNING: This policy allows anonymous access to bookings for testing
-- ⚠️ NEVER ENABLE IN PRODUCTION
-- ⚠️ Remove this policy before deploying to production
-- =============================================

-- Allow anonymous users to read bookings (TEST ONLY)
-- This is for localhost testing of the tip payment flow
DROP POLICY IF EXISTS "test_anonymous_bookings_read" ON public.bookings;
CREATE POLICY "test_anonymous_bookings_read"
  ON public.bookings
  FOR SELECT
  TO anon
  USING (true); -- Allow all anonymous reads (DEV ONLY)

-- Allow anonymous users to read captains (TEST ONLY)
-- Needed for the join query in test-tip page
DROP POLICY IF EXISTS "test_anonymous_captains_read" ON public.captains;
CREATE POLICY "test_anonymous_captains_read"
  ON public.captains
  FOR SELECT
  TO anon
  USING (true); -- Allow all anonymous reads (DEV ONLY)

-- =============================================
-- TO REMOVE BEFORE PRODUCTION:
-- =============================================
-- Run these commands in Supabase SQL Editor:
-- 
-- DROP POLICY IF EXISTS "test_anonymous_bookings_read" ON public.bookings;
-- DROP POLICY IF EXISTS "test_anonymous_captains_read" ON public.captains;
-- =============================================
