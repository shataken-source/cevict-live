-- COMPLETE VERIFICATION AND FIX
-- Run this to check current state and fix everything

-- ============================================
-- STEP 1: Check current state
-- ============================================
SELECT '=== CURRENT STATE ===' as info;

SELECT 
  'bot_config' as source,
  config_key,
  config_value->>'dailySpendingLimit' as daily_limit,
  updated_at
FROM bot_config
WHERE config_key = 'trading';

SELECT 
  'bot_strategy_params' as source,
  bot_category,
  daily_spending_limit,
  updated_at
FROM bot_strategy_params
WHERE platform = 'kalshi'
ORDER BY bot_category;

-- ============================================
-- STEP 2: FORCE UPDATE bot_config to $1000
-- ============================================
-- Update existing row
UPDATE bot_config
SET 
  config_value = jsonb_set(
    COALESCE(config_value, '{}'::jsonb),
    '{dailySpendingLimit}',
    '1000',
    true
  ),
  updated_at = NOW()
WHERE config_key = 'trading';

-- Create if missing (separate INSERT to avoid ambiguity)
INSERT INTO bot_config (config_key, config_value, updated_at)
SELECT 
  'trading',
  jsonb_build_object(
    'maxTradeSize', 5,
    'minConfidence', 55,
    'minEdge', 2,
    'dailySpendingLimit', 1000,
    'dailyLossLimit', 25,
    'maxOpenPositions', 5,
    'cryptoInterval', 30000,
    'kalshiInterval', 60000
  ),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM bot_config WHERE config_key = 'trading');

-- ============================================
-- STEP 3: Update ALL strategy params
-- ============================================
UPDATE bot_strategy_params
SET daily_spending_limit = 1000,
    updated_at = NOW()
WHERE platform = 'kalshi';

-- ============================================
-- STEP 4: Create ALL categories (including derivatives)
-- ============================================
INSERT INTO bot_strategy_params (platform, bot_category, daily_spending_limit, min_confidence, min_edge, max_trade_usd)
VALUES
  ('kalshi', 'crypto', 1000, 55, 2, 10),
  ('kalshi', 'politics', 1000, 55, 2, 10),
  ('kalshi', 'economics', 1000, 55, 2, 10),
  ('kalshi', 'weather', 1000, 55, 2, 10),
  ('kalshi', 'entertainment', 1000, 55, 2, 10),
  ('kalshi', 'sports', 1000, 55, 2, 10),
  ('kalshi', 'world', 1000, 55, 2, 10),
  ('kalshi', 'unknown', 1000, 55, 2, 10),
  ('kalshi', 'derivatives', 1000, 55, 2, 10)
ON CONFLICT (platform, bot_category) 
DO UPDATE SET
  daily_spending_limit = 1000,
  updated_at = NOW();

-- ============================================
-- STEP 5: VERIFY - Show final state
-- ============================================
SELECT '=== AFTER FIX ===' as info;

SELECT 
  'bot_config (fallback)' as source,
  config_value->>'dailySpendingLimit' as daily_limit,
  updated_at
FROM bot_config
WHERE config_key = 'trading';

SELECT 
  'bot_strategy_params (primary)' as source,
  bot_category,
  daily_spending_limit,
  updated_at
FROM bot_strategy_params
WHERE platform = 'kalshi'
ORDER BY bot_category;

SELECT 
  'FINAL LIMITS' as info,
  sp.bot_category,
  sp.daily_spending_limit as strategy_param_limit,
  (SELECT bc.config_value->>'dailySpendingLimit' FROM bot_config bc WHERE bc.config_key = 'trading') as config_fallback_limit,
  COALESCE(sp.daily_spending_limit::text, (SELECT bc.config_value->>'dailySpendingLimit' FROM bot_config bc WHERE bc.config_key = 'trading')) as final_limit_used
FROM bot_strategy_params sp
WHERE sp.platform = 'kalshi'
ORDER BY sp.bot_category;
