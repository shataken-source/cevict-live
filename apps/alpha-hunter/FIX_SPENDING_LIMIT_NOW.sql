-- FIX: Ensure both bot_config AND bot_strategy_params have $1000 limit
-- The bot uses: params?.daily_spending_limit ?? config.trading.dailySpendingLimit
-- So we need BOTH to be correct

-- ============================================
-- PART 1: Update bot_config (fallback) - Force update
-- ============================================
-- Update existing row
UPDATE bot_config
SET 
  config_value = jsonb_set(
    COALESCE(config_value, '{}'::jsonb),
    '{dailySpendingLimit}',
    '1000',
    true  -- create if missing
  ),
  updated_at = NOW()
WHERE config_key = 'trading';

-- If row doesn't exist, create it with all defaults
INSERT INTO bot_config (config_key, config_value, updated_at)
VALUES (
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
)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = jsonb_set(
    config_value,
    '{dailySpendingLimit}',
    '1000',
    true
  ),
  updated_at = NOW();

-- ============================================
-- PART 2: Update ALL bot_strategy_params (primary)
-- ============================================
UPDATE bot_strategy_params
SET daily_spending_limit = 1000,
    updated_at = NOW()
WHERE platform = 'kalshi';

-- ============================================
-- PART 3: Create missing strategy params (including "derivatives")
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
  ('kalshi', 'derivatives', 1000, 55, 2, 10)  -- ADDED: Missing category!
ON CONFLICT (platform, bot_category) 
DO UPDATE SET
  daily_spending_limit = 1000,
  updated_at = NOW();

-- ============================================
-- PART 4: VERIFY - Show what bot will see
-- ============================================
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

-- ============================================
-- PART 5: Show final limit for each category
-- ============================================
SELECT 
  sp.bot_category,
  sp.daily_spending_limit as strategy_param_limit,
  (SELECT config_value->>'dailySpendingLimit' FROM bot_config WHERE config_key = 'trading') as config_fallback_limit,
  COALESCE(sp.daily_spending_limit::text, (SELECT config_value->>'dailySpendingLimit' FROM bot_config WHERE config_key = 'trading')) as final_limit_used
FROM bot_strategy_params sp
WHERE sp.platform = 'kalshi'
ORDER BY sp.bot_category;
