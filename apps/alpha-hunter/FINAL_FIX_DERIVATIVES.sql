-- FINAL FIX: Add derivatives category and verify everything
-- Run this, then restart the bot

-- 1. Add derivatives category if missing
INSERT INTO bot_strategy_params (platform, bot_category, daily_spending_limit, min_confidence, min_edge, max_trade_usd)
VALUES ('kalshi', 'derivatives', 1000, 55, 2, 10)
ON CONFLICT (platform, bot_category) 
DO UPDATE SET
  daily_spending_limit = 1000,
  updated_at = NOW();

-- 2. Verify all categories exist
SELECT 
  bot_category,
  daily_spending_limit,
  CASE 
    WHEN daily_spending_limit = 1000 THEN '✅ CORRECT'
    ELSE '❌ WRONG - ' || daily_spending_limit::text
  END as status
FROM bot_strategy_params
WHERE platform = 'kalshi'
ORDER BY bot_category;

-- 3. Verify bot_config
SELECT 
  'bot_config' as source,
  config_value->>'dailySpendingLimit' as daily_limit,
  CASE 
    WHEN (config_value->>'dailySpendingLimit')::numeric = 1000 THEN '✅ CORRECT'
    ELSE '❌ WRONG - ' || (config_value->>'dailySpendingLimit')
  END as status
FROM bot_config
WHERE config_key = 'trading';
