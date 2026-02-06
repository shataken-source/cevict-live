-- ============================================
-- CHECK MISSING TABLES - PRO Database
-- Run this to see which critical tables are missing
-- ============================================

-- Check critical tables that should exist
SELECT 
  'pet_of_day_log' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'pet_of_day_log') 
    THEN '✅ EXISTS' ELSE '❌ MISSING - Run petreunion/supabase/zapier-pet-of-day-lost-pets.sql' END as status
UNION ALL
SELECT 
  'vessels',
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'vessels') 
    THEN '✅ EXISTS' ELSE '❌ MISSING - Run gulfcoastcharters migrations' END
UNION ALL
SELECT 
  'reactions',
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'reactions') 
    THEN '✅ EXISTS' ELSE '❌ MISSING - Run popthepopcorn/supabase/schema.sql' END
UNION ALL
SELECT 
  'captain_applications',
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'captain_applications') 
    THEN '✅ EXISTS' ELSE '❌ MISSING - Run gulfcoastcharters migrations' END
UNION ALL
SELECT 
  'weather_alerts',
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'weather_alerts') 
    THEN '✅ EXISTS' ELSE '❌ MISSING - Run gulfcoastcharters migrations' END
UNION ALL
SELECT 
  'sms_campaigns',
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'sms_campaigns') 
    THEN '✅ EXISTS' ELSE '❌ MISSING - Run prognostication/migrations/create-sms-tables.sql' END
UNION ALL
SELECT 
  'bot_memory',
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'bot_memory') 
    THEN '✅ EXISTS' ELSE '❌ MISSING - Run alpha-hunter migrations' END
ORDER BY table_name;

-- Check lost_pets count (should be 10,397+)
SELECT 
  'lost_pets count' as check_name,
  COUNT(*) as current_count,
  CASE 
    WHEN COUNT(*) >= 10000 THEN '✅ GOOD (10,000+)'
    WHEN COUNT(*) >= 1000 THEN '⚠️ LOW (1,000+)'
    WHEN COUNT(*) >= 100 THEN '⚠️ VERY LOW (100+)'
    ELSE '❌ CRITICAL - Data recovery incomplete'
  END as status
FROM lost_pets;

-- Check get_next_pet_of_day function
SELECT 
  'get_next_pet_of_day function' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_next_pet_of_day'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING - Run petreunion/supabase/zapier-pet-of-day-lost-pets.sql' END as status;

-- List ALL tables (to see what's actually there)
SELECT 
  'All Tables' as section,
  tablename,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.tablename) as column_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;
