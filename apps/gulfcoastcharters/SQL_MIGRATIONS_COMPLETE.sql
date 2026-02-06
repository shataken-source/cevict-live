-- ============================================
-- GULF COAST CHARTERS - COMPLETE SQL MIGRATIONS
-- ============================================
-- Run these migrations in Supabase SQL Editor
-- Execute in order, one section at a time
-- Date: January 19, 2026
-- ============================================

-- ============================================
-- SECTION 1: CORE SYSTEM MIGRATIONS
-- ============================================

-- Note: Run existing migrations first:
-- 20240119_biometric_auth.sql
-- 20240120_avatar_system.sql
-- 20240120_avatar_analytics_functions.sql
-- 20240121_custom_emails.sql
-- 20240122_enable_rls.sql
-- 20240122_rls_policies.sql
-- 20240123_captain_reminders.sql
-- 20240124_multi_day_trips.sql
-- 20240125_weather_alerts.sql
-- 20240126_affiliate_credentials.sql
-- 20240128_email_campaigns.sql
-- 20240128_media_uploads.sql
-- 20240128_points_avatar_system.sql

-- ============================================
-- SECTION 2: COMMUNITY & SOCIAL FEATURES
-- ============================================

-- Run: 20260118_community_core.sql
-- Run: 20260118_community_events.sql
-- Run: 20260118_message_board.sql

-- ============================================
-- SECTION 3: BUSINESS FEATURES
-- ============================================

-- Run: 20260119_captain_applications.sql
-- Run: 20260119_vessels.sql
-- Run: 20260119_gps_live_tracking.sql
-- Run: 20260119_scraper_core.sql
-- Run: 20260119_stripe_payment_columns.sql
-- Run: 20260119_gamification_tables.sql

-- ============================================
-- SECTION 4: SMS & NOTIFICATIONS
-- ============================================

-- Run: 20260119_sms_reminder_system.sql
-- Run: 20260119_sms_notifications_system.sql
-- Run: 20260119_sms_campaign_system.sql

-- ============================================
-- SECTION 5: VERIFICATION QUERIES
-- ============================================

-- Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verify RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- Verify indexes exist
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- ============================================
-- SECTION 6: FINAL CHECKS
-- ============================================

-- Check for missing foreign keys
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Verify critical tables have RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- COMPLETE - All migrations verified
-- ============================================
