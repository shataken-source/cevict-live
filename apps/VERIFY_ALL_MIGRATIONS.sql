-- ============================================
-- VERIFY ALL MIGRATIONS - PRO Database
-- Run this to check which tables/functions exist
-- ============================================

-- Check all tables
SELECT 
  'Tables' as check_type,
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check all functions
SELECT 
  'Functions' as check_type,
  n.nspname as schema,
  p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- Check RLS status on key tables
SELECT 
  'RLS Status' as check_type,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'lost_pets',
    'bookings',
    'vessels',
    'headlines',
    'trending_topics',
    'story_arcs',
    'laws',
    'products',
    'bot_memory',
    'bot_config',
    'sms_subscriptions'
  )
ORDER BY c.relname;

-- Count records in key tables (if they exist)
SELECT 'lost_pets' as table_name, COUNT(*) as row_count FROM lost_pets
UNION ALL
SELECT 'bookings', COUNT(*) FROM bookings WHERE EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'bookings')
UNION ALL
SELECT 'vessels', COUNT(*) FROM vessels WHERE EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'vessels')
UNION ALL
SELECT 'headlines', COUNT(*) FROM headlines WHERE EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'headlines')
UNION ALL
SELECT 'trending_topics', COUNT(*) FROM trending_topics WHERE EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'trending_topics')
UNION ALL
SELECT 'story_arcs', COUNT(*) FROM story_arcs WHERE EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'story_arcs')
UNION ALL
SELECT 'laws', COUNT(*) FROM laws WHERE EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'laws')
UNION ALL
SELECT 'products', COUNT(*) FROM products WHERE EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'products')
UNION ALL
SELECT 'bot_memory', COUNT(*) FROM bot_memory WHERE EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'bot_memory')
UNION ALL
SELECT 'bot_config', COUNT(*) FROM bot_config WHERE EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'bot_config')
UNION ALL
SELECT 'sms_subscriptions', COUNT(*) FROM sms_subscriptions WHERE EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'sms_subscriptions')
ORDER BY table_name;
