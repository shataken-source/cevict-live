-- REFRESH SCHEMA CACHE AND VERIFY
-- This will ensure PostgREST can see the new table

-- ============================================
-- STEP 1: Grant permissions on bot_strategy_params
-- ============================================
-- PostgREST needs explicit permissions to access tables
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON bot_strategy_params TO anon, authenticated, service_role;
GRANT ALL ON bot_config TO anon, authenticated, service_role;

-- ============================================
-- STEP 2: Verify table exists and has data
-- ============================================
SELECT '=== TABLE VERIFICATION ===' as info;

SELECT 
  table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'bot_strategy_params'
    )
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'bot_strategy_params';

-- ============================================
-- STEP 3: Show current data
-- ============================================
SELECT '=== CURRENT DATA ===' as info;

-- bot_config
SELECT 
  'bot_config' as source,
  config_value->>'dailySpendingLimit' as daily_limit
FROM bot_config
WHERE config_key = 'trading';

-- bot_strategy_params
SELECT 
  'bot_strategy_params' as source,
  bot_category,
  daily_spending_limit
FROM bot_strategy_params
WHERE platform = 'kalshi' 
  AND bot_category IN ('world', 'derivatives')
ORDER BY bot_category;

-- ============================================
-- STEP 4: Check open positions
-- ============================================
SELECT '=== OPEN POSITIONS ===' as info;

SELECT 
  COUNT(*) as total_open,
  COUNT(DISTINCT market_id) as unique_markets
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open';

-- ============================================
-- STEP 5: Force update bot_config if still 50
-- ============================================
-- Double-check and force update
UPDATE bot_config
SET 
  config_value = jsonb_set(
    config_value,
    '{dailySpendingLimit}',
    '1000',
    true
  ),
  updated_at = NOW()
WHERE config_key = 'trading'
  AND (config_value->>'dailySpendingLimit')::numeric != 1000;

-- Show after update
SELECT 
  'bot_config AFTER UPDATE' as source,
  config_value->>'dailySpendingLimit' as daily_limit
FROM bot_config
WHERE config_key = 'trading';

-- ============================================
-- STEP 6: Refresh PostgREST schema cache
-- ============================================
-- This makes the new table immediately available via PostgREST API
NOTIFY pgrst, 'reload schema';

SELECT '=== SCHEMA CACHE REFRESHED ===' as info;
SELECT 'PostgREST schema cache has been reloaded' as status;
