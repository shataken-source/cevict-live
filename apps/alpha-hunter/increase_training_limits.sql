-- Increase Kalshi Sandbox Training Limits
-- Run this in Supabase SQL Editor to drastically increase spending limits for training

-- 1. Update main trading config - Increase daily spending limit to $1000
UPDATE bot_config
SET config_value = jsonb_set(
  config_value,
  '{dailySpendingLimit}',
  '1000'
)
WHERE config_key = 'trading';

-- 2. Update ALL strategy params for Kalshi - Set daily spending limit to $1000 for all categories
UPDATE bot_strategy_params
SET daily_spending_limit = 1000,
    updated_at = NOW()
WHERE platform = 'kalshi';

-- 3. If no strategy params exist yet, create defaults for common categories
INSERT INTO bot_strategy_params (platform, bot_category, daily_spending_limit, min_confidence, min_edge, max_trade_usd)
VALUES
  ('kalshi', 'crypto', 1000, 55, 2, 10),
  ('kalshi', 'politics', 1000, 55, 2, 10),
  ('kalshi', 'economics', 1000, 55, 2, 10),
  ('kalshi', 'weather', 1000, 55, 2, 10),
  ('kalshi', 'entertainment', 1000, 55, 2, 10),
  ('kalshi', 'sports', 1000, 55, 2, 10),
  ('kalshi', 'world', 1000, 55, 2, 10),
  ('kalshi', 'unknown', 1000, 55, 2, 10)
ON CONFLICT (platform, bot_category) DO UPDATE
SET daily_spending_limit = 1000,
    updated_at = NOW();

-- 4. Verify the changes
SELECT 
  config_key,
  config_value->>'dailySpendingLimit' as daily_limit
FROM bot_config
WHERE config_key = 'trading';

SELECT 
  platform,
  bot_category,
  daily_spending_limit,
  updated_at
FROM bot_strategy_params
WHERE platform = 'kalshi'
ORDER BY bot_category;

-- Note: Daily spending counter resets automatically at midnight
-- To manually reset, you would need to restart the bot or wait for new day
