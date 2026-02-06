-- ============================================
-- RUN ALL COMMUNITY ENGAGEMENT MIGRATIONS
-- ============================================
-- 
-- This file runs all community engagement migrations in order.
-- Execute this in Supabase SQL Editor to create all tables.
--
-- Migration Order:
-- 1. 20260122_community_engagement_core.sql
-- 2. 20260122_community_contests_tournaments.sql
-- 3. 20260122_community_journal_forums.sql
--
-- ============================================

-- Note: In Supabase, you should run each migration file separately
-- OR copy the contents of all three files into this file and run it.

-- To run in Supabase:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Copy contents of 20260122_community_engagement_core.sql → Run
-- 3. Copy contents of 20260122_community_contests_tournaments.sql → Run
-- 4. Copy contents of 20260122_community_journal_forums.sql → Run
--
-- OR use Supabase CLI:
-- supabase db push

-- ============================================
-- VERIFICATION QUERIES (Run after migrations)
-- ============================================

-- Check all tables were created:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'daily_check_ins',
  'daily_challenges',
  'challenge_completions',
  'user_forecast_preferences',
  'user_connections',
  'activity_feed',
  'feed_engagement',
  'feed_comments',
  'conversations',
  'conversation_participants',
  'messages',
  'photo_contests',
  'contest_entries',
  'contest_votes',
  'tournaments',
  'tournament_entries',
  'tournament_submissions',
  'stories',
  'story_views',
  'video_reels',
  'reel_engagement',
  'fishing_journal_entries',
  'journal_catches',
  'learning_courses',
  'course_progress',
  'buddy_profiles',
  'buddy_matches',
  'buddy_ratings',
  'forum_categories',
  'forum_threads',
  'forum_posts',
  'forum_post_votes',
  'rewards_catalog',
  'rewards_redemptions'
)
ORDER BY table_name;

-- Expected: 33 tables
