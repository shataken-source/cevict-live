-- AGGRESSIVE FIX: Force close ALL duplicates and verify everything
-- This will definitely fix the issue

-- ============================================
-- STEP 1: Show current state
-- ============================================
SELECT '=== BEFORE FIX ===' as info;

SELECT 
  COUNT(*) as total_open,
  COUNT(DISTINCT market_id) as unique_markets
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open';

-- ============================================
-- STEP 2: Close ALL duplicates aggressively
-- ============================================
-- Close all but the most recent position for each market_id
WITH ranked_positions AS (
  SELECT 
    id,
    market_id,
    opened_at,
    ROW_NUMBER() OVER (PARTITION BY market_id ORDER BY opened_at DESC, id DESC) as rn
  FROM trade_history
  WHERE platform = 'kalshi' AND outcome = 'open'
),
duplicates_to_close AS (
  SELECT id
  FROM ranked_positions
  WHERE rn > 1
)
UPDATE trade_history
SET 
  outcome = 'closed',
  updated_at = NOW()
WHERE id IN (SELECT id FROM duplicates_to_close);

-- Show how many were closed
SELECT 
  'Positions closed' as info,
  (SELECT COUNT(*) FROM trade_history WHERE platform = 'kalshi' AND outcome = 'closed') as total_closed;

-- ============================================
-- STEP 3: Force bot_config to $1000
-- ============================================
DELETE FROM bot_config WHERE config_key = 'trading';

INSERT INTO bot_config (config_key, config_value, updated_at)
VALUES (
  'trading',
  '{"maxTradeSize":5,"minConfidence":55,"minEdge":2,"dailySpendingLimit":1000,"dailyLossLimit":25,"maxOpenPositions":5,"cryptoInterval":30000,"kalshiInterval":60000}'::jsonb,
  NOW()
);

-- ============================================
-- STEP 4: Force strategy params to $1000
-- ============================================
-- Delete and recreate to ensure clean state
DELETE FROM bot_strategy_params WHERE platform = 'kalshi' AND bot_category IN ('world', 'derivatives');

INSERT INTO bot_strategy_params (platform, bot_category, daily_spending_limit, min_confidence, min_edge, max_trade_usd, updated_at)
VALUES
  ('kalshi', 'world', 1000, 55, 2, 10, NOW()),
  ('kalshi', 'derivatives', 1000, 55, 2, 10, NOW());

-- ============================================
-- STEP 5: Verify AFTER fix
-- ============================================
SELECT '=== AFTER FIX ===' as info;

-- Open positions
SELECT 
  'Open positions' as info,
  COUNT(*) as total,
  COUNT(DISTINCT market_id) as unique_markets
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open';

-- Duplicates
SELECT 
  'Remaining duplicates' as info,
  COUNT(*) as count
FROM (
  SELECT market_id
  FROM trade_history
  WHERE platform = 'kalshi' AND outcome = 'open'
  GROUP BY market_id
  HAVING COUNT(*) > 1
) dupes;

-- bot_config
SELECT 
  'bot_config' as source,
  config_value->>'dailySpendingLimit' as limit
FROM bot_config
WHERE config_key = 'trading';

-- strategy_params
SELECT 
  'strategy_params' as source,
  bot_category,
  daily_spending_limit
FROM bot_strategy_params
WHERE platform = 'kalshi' 
  AND bot_category IN ('world', 'derivatives')
ORDER BY bot_category;
