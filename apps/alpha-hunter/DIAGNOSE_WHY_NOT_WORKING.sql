-- DIAGNOSE: Why bot still shows $50 and 171 positions
-- Run this to see what's actually in the database

-- ============================================
-- PART 1: Check bot_config
-- ============================================
SELECT '=== BOT_CONFIG ===' as section;

SELECT 
  config_key,
  config_value->>'dailySpendingLimit' as daily_limit,
  config_value as full_config,
  updated_at
FROM bot_config
WHERE config_key = 'trading';

-- ============================================
-- PART 2: Check bot_strategy_params
-- ============================================
SELECT '=== BOT_STRATEGY_PARAMS ===' as section;

SELECT 
  platform,
  bot_category,
  daily_spending_limit,
  updated_at
FROM bot_strategy_params
WHERE platform = 'kalshi'
ORDER BY bot_category;

-- ============================================
-- PART 3: Check if "world" and "derivatives" exist
-- ============================================
SELECT '=== CATEGORY CHECK ===' as section;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM bot_strategy_params WHERE platform = 'kalshi' AND bot_category = 'world') 
    THEN '✅ world EXISTS' 
    ELSE '❌ world MISSING' 
  END as world_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM bot_strategy_params WHERE platform = 'kalshi' AND bot_category = 'derivatives') 
    THEN '✅ derivatives EXISTS' 
    ELSE '❌ derivatives MISSING' 
  END as derivatives_status;

-- ============================================
-- PART 4: Check open positions
-- ============================================
SELECT '=== OPEN POSITIONS ===' as section;

-- Count by outcome
SELECT 
  COALESCE(outcome::text, 'NULL') as outcome_status,
  COUNT(*) as count
FROM trade_history
WHERE platform = 'kalshi'
GROUP BY outcome
ORDER BY count DESC;

-- Actual open positions
SELECT 
  'ACTUAL OPEN' as info,
  COUNT(*) as open_positions
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open';

-- ============================================
-- PART 5: What bot will actually use
-- ============================================
SELECT '=== WHAT BOT SEES ===' as section;

-- Simulate bot's logic: params?.daily_spending_limit ?? config.trading.dailySpendingLimit
SELECT 
  'world' as bot_category,
  (SELECT daily_spending_limit FROM bot_strategy_params WHERE platform = 'kalshi' AND bot_category = 'world') as strategy_param_value,
  (SELECT config_value->>'dailySpendingLimit' FROM bot_config WHERE config_key = 'trading') as config_fallback_value,
  COALESCE(
    (SELECT daily_spending_limit::text FROM bot_strategy_params WHERE platform = 'kalshi' AND bot_category = 'world'),
    (SELECT config_value->>'dailySpendingLimit' FROM bot_config WHERE config_key = 'trading'),
    'NULL'
  ) as final_value_used
UNION ALL
SELECT 
  'derivatives' as bot_category,
  (SELECT daily_spending_limit FROM bot_strategy_params WHERE platform = 'kalshi' AND bot_category = 'derivatives') as strategy_param_value,
  (SELECT config_value->>'dailySpendingLimit' FROM bot_config WHERE config_key = 'trading') as config_fallback_value,
  COALESCE(
    (SELECT daily_spending_limit::text FROM bot_strategy_params WHERE platform = 'kalshi' AND bot_category = 'derivatives'),
    (SELECT config_value->>'dailySpendingLimit' FROM bot_config WHERE config_key = 'trading'),
    'NULL'
  ) as final_value_used;
