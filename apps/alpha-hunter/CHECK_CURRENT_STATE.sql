-- Quick check: What's actually in the database right now?
-- Run this to see current values before fixing

-- 1. Check bot_config
SELECT 
  'bot_config' as table_name,
  config_key,
  config_value->>'dailySpendingLimit' as daily_spending_limit,
  config_value as full_config,
  updated_at
FROM bot_config
WHERE config_key = 'trading';

-- 2. Check bot_strategy_params for all categories
SELECT 
  'bot_strategy_params' as table_name,
  platform,
  bot_category,
  daily_spending_limit,
  updated_at
FROM bot_strategy_params
WHERE platform = 'kalshi'
ORDER BY bot_category;

-- 3. Check if "world" and "derivatives" categories exist
SELECT 
  'Missing categories check' as info,
  CASE 
    WHEN EXISTS (SELECT 1 FROM bot_strategy_params WHERE platform = 'kalshi' AND bot_category = 'world') 
    THEN 'world: EXISTS' 
    ELSE 'world: MISSING' 
  END as world_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM bot_strategy_params WHERE platform = 'kalshi' AND bot_category = 'derivatives') 
    THEN 'derivatives: EXISTS' 
    ELSE 'derivatives: MISSING' 
  END as derivatives_status;

-- 4. Show what the bot will actually use
SELECT 
  'What bot sees' as info,
  sp.bot_category,
  sp.daily_spending_limit as strategy_param_value,
  (SELECT bc.config_value->>'dailySpendingLimit' FROM bot_config bc WHERE bc.config_key = 'trading') as config_fallback_value,
  COALESCE(sp.daily_spending_limit::text, (SELECT bc.config_value->>'dailySpendingLimit' FROM bot_config bc WHERE bc.config_key = 'trading'), 'NULL') as final_value_used
FROM bot_strategy_params sp
WHERE sp.platform = 'kalshi'
ORDER BY sp.bot_category;
