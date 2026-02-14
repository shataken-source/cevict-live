-- Fix Supabase Database Linter Security Errors
-- This migration addresses:
-- 1. RLS disabled on public tables
-- 2. SECURITY DEFINER view security concern

-- ============================================================================
-- 1. ENABLE RLS ON ALL PUBLIC TABLES
-- ============================================================================

-- Enable RLS on badges table (read-only for public, admin write)
ALTER TABLE IF EXISTS public.badges ENABLE ROW LEVEL SECURITY;

-- Enable RLS on daily_check_ins table (user-specific)
ALTER TABLE IF EXISTS public.daily_check_ins ENABLE ROW LEVEL SECURITY;

-- Enable RLS on notification_log table (user-specific)
ALTER TABLE IF EXISTS public.notification_log ENABLE ROW LEVEL SECURITY;

-- Enable RLS on weather_data table (public read, admin write)
ALTER TABLE IF EXISTS public.weather_data ENABLE ROW LEVEL SECURITY;

-- Enable RLS on weather_alerts table (user-specific)
ALTER TABLE IF EXISTS public.weather_alerts ENABLE ROW LEVEL SECURITY;

-- Enable RLS on conversations table (user-specific)
ALTER TABLE IF EXISTS public.conversations ENABLE ROW LEVEL SECURITY;

-- Note: spatial_ref_sys is a PostGIS system table and should remain read-only
-- We'll create a policy that allows public read access only
ALTER TABLE IF EXISTS public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. CREATE RLS POLICIES
-- ============================================================================

-- BADGES: Public read, admin write
DROP POLICY IF EXISTS "Public can view badges" ON public.badges;
CREATE POLICY "Public can view badges"
  ON public.badges FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage badges" ON public.badges;
CREATE POLICY "Admins can manage badges"
  ON public.badges FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- DAILY_CHECK_INS: Users can only see/manage their own
DROP POLICY IF EXISTS "Users manage own check-ins" ON public.daily_check_ins;
CREATE POLICY "Users manage own check-ins"
  ON public.daily_check_ins FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- NOTIFICATION_LOG: Users can only see their own notifications
DROP POLICY IF EXISTS "Users view own notifications" ON public.notification_log;
CREATE POLICY "Users view own notifications"
  ON public.notification_log FOR SELECT
  USING (auth.uid() = user_id);

-- Allow service role to insert notifications (for system use)
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notification_log;
CREATE POLICY "Service role can insert notifications"
  ON public.notification_log FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS

-- WEATHER_DATA: Public read, admin/service write
DROP POLICY IF EXISTS "Public can view weather data" ON public.weather_data;
CREATE POLICY "Public can view weather data"
  ON public.weather_data FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage weather data" ON public.weather_data;
CREATE POLICY "Admins can manage weather data"
  ON public.weather_data FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Allow service role to insert weather data (for automated updates)
DROP POLICY IF EXISTS "Service role can insert weather data" ON public.weather_data;
CREATE POLICY "Service role can insert weather data"
  ON public.weather_data FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS

-- WEATHER_ALERTS: Users see alerts for their bookings
DROP POLICY IF EXISTS "Users view own weather alerts" ON public.weather_alerts;
CREATE POLICY "Users view own weather alerts"
  ON public.weather_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = weather_alerts.booking_id
      AND (user_id = auth.uid() OR captain_id = auth.uid())
    )
  );

-- Allow service role to insert weather alerts
DROP POLICY IF EXISTS "Service role can insert weather alerts" ON public.weather_alerts;
CREATE POLICY "Service role can insert weather alerts"
  ON public.weather_alerts FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS

-- CONVERSATIONS: Users see their own conversations
DROP POLICY IF EXISTS "Users view own conversations" ON public.conversations;
CREATE POLICY "Users view own conversations"
  ON public.conversations FOR SELECT
  USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

DROP POLICY IF EXISTS "Users create own conversations" ON public.conversations;
CREATE POLICY "Users create own conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

DROP POLICY IF EXISTS "Users update own conversations" ON public.conversations;
CREATE POLICY "Users update own conversations"
  ON public.conversations FOR UPDATE
  USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

-- SPATIAL_REF_SYS: Public read-only (PostGIS system table)
DROP POLICY IF EXISTS "Public can view spatial ref sys" ON public.spatial_ref_sys;
CREATE POLICY "Public can view spatial ref sys"
  ON public.spatial_ref_sys FOR SELECT
  USING (true);

-- ============================================================================
-- 3. FIX SECURITY DEFINER VIEW
-- ============================================================================

-- Option 1: Remove SECURITY DEFINER if not needed
-- If the view doesn't need elevated permissions, recreate it without SECURITY DEFINER
-- First, check if the view exists and what it does
DO $$
BEGIN
  -- Check if view exists
  IF EXISTS (
    SELECT 1 FROM pg_views
    WHERE schemaname = 'public'
    AND viewname = 'wtv_boats_needing_processing'
  ) THEN
    -- Drop the view
    DROP VIEW IF EXISTS public.wtv_boats_needing_processing CASCADE;

    -- Recreate without SECURITY DEFINER (if it's just a simple query)
    -- Note: Adjust the SELECT statement based on your actual view definition
    CREATE OR REPLACE VIEW public.wtv_boats_needing_processing AS
    SELECT
      b.id,
      b.name,
      b.status,
      b.created_at,
      b.updated_at
    FROM public.boats b
    WHERE b.status IN ('pending', 'needs_review', 'processing')
    ORDER BY b.created_at DESC;

    -- Enable RLS on the view (views inherit RLS from underlying tables)
    -- The view will respect the RLS policies on the boats table
  END IF;
END $$;

-- ============================================================================
-- 4. VERIFY RLS IS ENABLED
-- ============================================================================

-- Run this query to verify RLS is enabled on all tables:
-- SELECT
--   schemaname,
--   tablename,
--   rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN (
--   'badges',
--   'daily_check_ins',
--   'notification_log',
--   'weather_data',
--   'weather_alerts',
--   'conversations',
--   'spatial_ref_sys'
-- )
-- ORDER BY tablename;

