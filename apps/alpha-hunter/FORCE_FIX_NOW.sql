-- FORCE FIX: Aggressively fix both issues
-- This will FORCE update everything, no questions asked

-- ============================================
-- STEP 1: FORCE bot_config to $1000
-- ============================================
-- Delete and recreate to ensure clean state
DELETE FROM bot_config WHERE config_key = 'trading';

INSERT INTO bot_config (config_key, config_value, updated_at)
VALUES (
  'trading',
  '{"maxTradeSize":5,"minConfidence":55,"minEdge":2,"dailySpendingLimit":1000,"dailyLossLimit":25,"maxOpenPositions":5,"cryptoInterval":30000,"kalshiInterval":60000}'::jsonb,
  NOW()
);

-- ============================================
-- STEP 2: DELETE ALL existing strategy params and recreate
-- ============================================
DELETE FROM bot_strategy_params WHERE platform = 'kalshi';

-- Insert ALL possible categories with $1000
INSERT INTO bot_strategy_params (platform, bot_category, daily_spending_limit, min_confidence, min_edge, max_trade_usd, updated_at)
VALUES
  ('kalshi', 'world', 1000, 55, 2, 10, NOW()),
  ('kalshi', 'derivatives', 1000, 55, 2, 10, NOW()),
  ('kalshi', 'crypto', 1000, 55, 2, 10, NOW()),
  ('kalshi', 'politics', 1000, 55, 2, 10, NOW()),
  ('kalshi', 'economics', 1000, 55, 2, 10, NOW()),
  ('kalshi', 'weather', 1000, 55, 2, 10, NOW()),
  ('kalshi', 'entertainment', 1000, 55, 2, 10, NOW()),
  ('kalshi', 'sports', 1000, 55, 2, 10, NOW()),
  ('kalshi', 'unknown', 1000, 55, 2, 10, NOW()),
  ('kalshi', 'value', 1000, 55, 2, 10, NOW()),
  ('kalshi', 'momentum', 1000, 55, 2, 10, NOW());

-- ============================================
-- STEP 3: FIX POSITIONS - Close all that should be closed
-- ============================================
-- Set NULL outcomes based on closed_at
UPDATE trade_history
SET 
  outcome = CASE 
    WHEN closed_at IS NOT NULL THEN 'closed'
    ELSE 'open'
  END,
  updated_at = NOW()
WHERE platform = 'kalshi' AND outcome IS NULL;

-- Close positions that have closed_at but still marked 'open'
UPDATE trade_history
SET 
  outcome = 'closed',
  updated_at = NOW()
WHERE platform = 'kalshi' 
  AND outcome = 'open'
  AND closed_at IS NOT NULL;

-- ============================================
-- STEP 4: VERIFY
-- ============================================
SELECT '=== VERIFICATION ===' as info;

-- Check bot_config
SELECT 
  'bot_config' as source,
  config_value->>'dailySpendingLimit' as daily_limit
FROM bot_config
WHERE config_key = 'trading';

-- Check strategy params
SELECT 
  'bot_strategy_params' as source,
  bot_category,
  daily_spending_limit
FROM bot_strategy_params
WHERE platform = 'kalshi'
ORDER BY bot_category;

-- Check open positions
SELECT 
  'open_positions' as source,
  COUNT(*) as count
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open';

-- Show outcome breakdown
SELECT 
  COALESCE(outcome::text, 'NULL') as outcome,
  COUNT(*) as count
FROM trade_history
WHERE platform = 'kalshi'
GROUP BY outcome
ORDER BY count DESC;
