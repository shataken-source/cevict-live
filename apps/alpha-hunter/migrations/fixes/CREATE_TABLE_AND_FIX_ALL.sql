-- CREATE TABLE AND FIX ALL: Create missing table, fix positions, set limits to $1000
-- This is the complete fix for everything

-- ============================================
-- STEP 1: Create bot_strategy_params table if it doesn't exist
-- ============================================
-- Drop and recreate to ensure correct structure
DROP TABLE IF EXISTS bot_strategy_params CASCADE;

CREATE TABLE bot_strategy_params (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('kalshi', 'coinbase')),
  bot_category TEXT NOT NULL,
  min_confidence NUMERIC NOT NULL DEFAULT 55,
  min_edge NUMERIC NOT NULL DEFAULT 2,
  max_trade_usd NUMERIC NOT NULL DEFAULT 5,
  daily_spending_limit NUMERIC NOT NULL DEFAULT 50,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(platform, bot_category)
);

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_bot_strategy_params_platform_cat ON bot_strategy_params(platform, bot_category);

-- Refresh PostgREST schema cache so the new table is immediately available
NOTIFY pgrst, 'reload schema';

-- ============================================
-- STEP 2: Create bot_config table if it doesn't exist
-- ============================================
CREATE TABLE IF NOT EXISTS bot_config (
  config_key TEXT PRIMARY KEY,
  config_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- STEP 3: Fix positions - Close ALL duplicates
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

-- ============================================
-- STEP 4: Force bot_config to $1000
-- ============================================
DELETE FROM bot_config WHERE config_key = 'trading';

INSERT INTO bot_config (config_key, config_value, updated_at)
VALUES (
  'trading',
  '{"maxTradeSize":5,"minConfidence":55,"minEdge":2,"dailySpendingLimit":1000,"dailyLossLimit":25,"maxOpenPositions":5,"cryptoInterval":30000,"kalshiInterval":60000}'::jsonb,
  NOW()
);

-- ============================================
-- STEP 5: Insert/Update strategy params to $1000
-- ============================================
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
  ('kalshi', 'momentum', 1000, 55, 2, 10, NOW())
ON CONFLICT (platform, bot_category) 
DO UPDATE SET
  daily_spending_limit = 1000,
  updated_at = NOW();

-- ============================================
-- STEP 6: Verify everything
-- ============================================
SELECT '=== VERIFICATION ===' as info;

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
