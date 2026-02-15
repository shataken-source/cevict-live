-- QUICK CHECK: See what's actually in the database RIGHT NOW
-- Run this to verify if fixes actually worked

-- 1. Open positions count
SELECT 
  'Open positions' as check,
  COUNT(*) as total,
  COUNT(DISTINCT market_id) as unique_markets
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open';

-- 2. bot_config value
SELECT 
  'bot_config limit' as check,
  config_value->>'dailySpendingLimit' as value
FROM bot_config
WHERE config_key = 'trading';

-- 3. Table exists?
SELECT 
  'Table exists?' as check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'bot_strategy_params'
    )
    THEN 'YES'
    ELSE 'NO'
  END as result;

-- 4. Strategy params (if table exists)
SELECT 
  'strategy_params' as check,
  bot_category,
  daily_spending_limit
FROM bot_strategy_params
WHERE platform = 'kalshi' 
  AND bot_category IN ('world', 'derivatives')
ORDER BY bot_category;
