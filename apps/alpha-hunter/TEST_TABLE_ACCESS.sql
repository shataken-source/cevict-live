-- TEST: Verify table is accessible and check what bot will see
-- This simulates what the bot's Supabase client will query

-- ============================================
-- 1. Verify table exists in database
-- ============================================
SELECT 
  'Table exists in database' as test,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'bot_strategy_params'
    )
    THEN '✅ YES'
    ELSE '❌ NO'
  END as result;

-- ============================================
-- 2. Check permissions
-- ============================================
SELECT 
  'Permissions check' as test,
  has_table_privilege('service_role', 'bot_strategy_params', 'SELECT') as service_role_select,
  has_table_privilege('anon', 'bot_strategy_params', 'SELECT') as anon_select,
  has_table_privilege('authenticated', 'bot_strategy_params', 'SELECT') as authenticated_select;

-- ============================================
-- 3. Test query (what bot will run)
-- ============================================
SELECT 
  'Test query for world category' as test,
  platform,
  bot_category,
  daily_spending_limit
FROM bot_strategy_params
WHERE platform = 'kalshi' AND bot_category = 'world';

-- ============================================
-- 4. Check if table is in PostgREST schema
-- ============================================
-- PostgREST exposes tables via REST API
-- If this query works, PostgREST can see it
SELECT 
  'PostgREST visibility' as test,
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'bot_strategy_params';

-- ============================================
-- 5. Show all data bot should see
-- ============================================
SELECT 
  'All strategy params' as info,
  platform,
  bot_category,
  daily_spending_limit
FROM bot_strategy_params
WHERE platform = 'kalshi'
ORDER BY bot_category;

-- ============================================
-- 6. Check open positions count
-- ============================================
SELECT 
  'Open positions' as info,
  COUNT(*) as total,
  COUNT(DISTINCT market_id) as unique_markets
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open';
