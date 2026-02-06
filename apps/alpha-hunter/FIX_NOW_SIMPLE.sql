-- SIMPLE FIX: Just fix the two critical issues
-- 1. Set bot_config to $1000 (this will work even if table isn't visible)
-- 2. Close duplicate positions

-- ============================================
-- FIX 1: Force bot_config to $1000
-- ============================================
DELETE FROM bot_config WHERE config_key = 'trading';

INSERT INTO bot_config (config_key, config_value, updated_at)
VALUES (
  'trading',
  '{"maxTradeSize":5,"minConfidence":55,"minEdge":2,"dailySpendingLimit":1000,"dailyLossLimit":25,"maxOpenPositions":5,"cryptoInterval":30000,"kalshiInterval":60000}'::jsonb,
  NOW()
);

-- ============================================
-- FIX 2: Close duplicate positions
-- ============================================
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

-- ============================================
-- VERIFY
-- ============================================
SELECT '=== VERIFICATION ===' as info;

SELECT 
  'Open positions' as metric,
  COUNT(*) as total
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open';

SELECT 
  'bot_config limit' as metric,
  config_value->>'dailySpendingLimit' as value
FROM bot_config
WHERE config_key = 'trading';
