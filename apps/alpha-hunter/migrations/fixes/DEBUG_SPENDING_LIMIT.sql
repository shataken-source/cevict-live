-- Debug: Check what the bot should be seeing for daily spending limits
-- Run this to verify the bot can read the $1000 limit

-- 1. Check bot_config (fallback)
SELECT 
  config_key,
  config_value->>'dailySpendingLimit' as daily_spending_limit,
  updated_at
FROM bot_config
WHERE config_key = 'trading';

-- 2. Check bot_strategy_params (primary source)
SELECT 
  platform,
  bot_category,
  daily_spending_limit,
  updated_at
FROM bot_strategy_params
WHERE platform = 'kalshi'
ORDER BY bot_category;

-- 3. Check if there are any NULL values
SELECT 
  platform,
  bot_category,
  daily_spending_limit,
  CASE 
    WHEN daily_spending_limit IS NULL THEN 'NULL - WILL USE FALLBACK'
    WHEN daily_spending_limit < 100 THEN 'LOW - NEEDS UPDATE'
    ELSE 'OK'
  END as status
FROM bot_strategy_params
WHERE platform = 'kalshi'
ORDER BY bot_category;

-- 4. Show what the bot will use for each category
-- The bot uses: params?.daily_spending_limit ?? config.trading.dailySpendingLimit
SELECT 
  sp.bot_category,
  COALESCE(sp.daily_spending_limit::text, 'NULL') as strategy_param_limit,
  COALESCE((SELECT config_value->>'dailySpendingLimit' FROM bot_config WHERE config_key = 'trading'), 'NULL') as config_fallback_limit,
  COALESCE(sp.daily_spending_limit, (SELECT (config_value->>'dailySpendingLimit')::numeric FROM bot_config WHERE config_key = 'trading')) as final_limit_used
FROM bot_strategy_params sp
WHERE sp.platform = 'kalshi'
ORDER BY sp.bot_category;
