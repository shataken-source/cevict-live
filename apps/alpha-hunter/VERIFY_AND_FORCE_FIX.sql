-- VERIFY AND FORCE FIX: Check current state, then force fix everything
-- Run this to see what's wrong and fix it

-- ============================================
-- PART 1: VERIFY CURRENT STATE
-- ============================================
SELECT '=== CURRENT STATE (BEFORE FIX) ===' as info;

-- Open positions
SELECT 
  'Open positions' as metric,
  COUNT(*) as total,
  COUNT(DISTINCT market_id) as unique_markets
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open';

-- bot_config
SELECT 
  'bot_config' as metric,
  config_value->>'dailySpendingLimit' as current_value
FROM bot_config
WHERE config_key = 'trading';

-- Table exists?
SELECT 
  'Table exists' as metric,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'bot_strategy_params'
    )
    THEN 'YES'
    ELSE 'NO'
  END as result;

-- ============================================
-- PART 2: FORCE FIX bot_config
-- ============================================
SELECT '=== FIXING bot_config ===' as info;

-- Delete and recreate to ensure it's $1000
DELETE FROM bot_config WHERE config_key = 'trading';

INSERT INTO bot_config (config_key, config_value, updated_at)
VALUES (
  'trading',
  '{"maxTradeSize":5,"minConfidence":55,"minEdge":2,"dailySpendingLimit":1000,"dailyLossLimit":25,"maxOpenPositions":5,"cryptoInterval":30000,"kalshiInterval":60000}'::jsonb,
  NOW()
);

-- Verify it's now $1000
SELECT 
  'bot_config AFTER FIX' as metric,
  config_value->>'dailySpendingLimit' as value
FROM bot_config
WHERE config_key = 'trading';

-- ============================================
-- PART 3: FIX DUPLICATES
-- ============================================
SELECT '=== FIXING DUPLICATES ===' as info;

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
  'Positions closed' as metric,
  (SELECT COUNT(*) FROM trade_history WHERE platform = 'kalshi' AND outcome = 'closed') as total_closed;

-- ============================================
-- PART 4: VERIFY AFTER FIX
-- ============================================
SELECT '=== AFTER FIX ===' as info;

-- Open positions (should be much less)
SELECT 
  'Open positions' as metric,
  COUNT(*) as total,
  COUNT(DISTINCT market_id) as unique_markets
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open';

-- Duplicates (should be 0)
SELECT 
  'Remaining duplicates' as metric,
  COUNT(*) as count
FROM (
  SELECT market_id
  FROM trade_history
  WHERE platform = 'kalshi' AND outcome = 'open'
  GROUP BY market_id
  HAVING COUNT(*) > 1
) dupes;

-- bot_config (should be 1000)
SELECT 
  'bot_config' as metric,
  config_value->>'dailySpendingLimit' as value
FROM bot_config
WHERE config_key = 'trading';
