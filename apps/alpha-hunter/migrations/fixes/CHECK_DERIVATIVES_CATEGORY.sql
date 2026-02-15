-- Check if derivatives category exists and what its value is
SELECT 
  platform,
  bot_category,
  daily_spending_limit,
  updated_at
FROM bot_strategy_params
WHERE platform = 'kalshi' 
  AND bot_category = 'derivatives';

-- If it doesn't exist, create it
INSERT INTO bot_strategy_params (platform, bot_category, daily_spending_limit, min_confidence, min_edge, max_trade_usd)
VALUES ('kalshi', 'derivatives', 1000, 55, 2, 10)
ON CONFLICT (platform, bot_category) 
DO UPDATE SET
  daily_spending_limit = 1000,
  updated_at = NOW();

-- Verify it exists now
SELECT 
  platform,
  bot_category,
  daily_spending_limit,
  updated_at
FROM bot_strategy_params
WHERE platform = 'kalshi' 
  AND bot_category = 'derivatives';
