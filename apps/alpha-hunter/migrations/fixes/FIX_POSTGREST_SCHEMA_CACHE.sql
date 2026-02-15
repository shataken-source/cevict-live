-- FIX POSTGREST SCHEMA CACHE: Force PostgREST to see both tables
-- This fixes the PGRST205 errors for both bot_config and bot_strategy_params

-- ============================================
-- STEP 1: Drop and recreate bot_config (force PostgREST refresh)
-- ============================================
DROP TABLE IF EXISTS bot_config CASCADE;

CREATE TABLE bot_config (
  config_key TEXT PRIMARY KEY,
  config_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- STEP 2: Drop and recreate bot_strategy_params (force PostgREST refresh)
-- ============================================
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

-- Create indexes
CREATE INDEX idx_bot_strategy_params_platform_cat ON bot_strategy_params(platform, bot_category);

-- ============================================
-- STEP 3: Grant permissions (CRITICAL for PostgREST)
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON bot_config TO anon, authenticated, service_role;
GRANT ALL ON bot_strategy_params TO anon, authenticated, service_role;

-- ============================================
-- STEP 4: Insert bot_config with $1000 limit
-- ============================================
INSERT INTO bot_config (config_key, config_value, updated_at)
VALUES (
  'trading',
  '{"maxTradeSize":5,"minConfidence":55,"minEdge":2,"dailySpendingLimit":1000,"dailyLossLimit":25,"maxOpenPositions":5,"cryptoInterval":30000,"kalshiInterval":60000}'::jsonb,
  NOW()
);

-- ============================================
-- STEP 5: Insert all strategy params with $1000
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
  ('kalshi', 'momentum', 1000, 55, 2, 10, NOW());

-- ============================================
-- STEP 6: Fix duplicate positions
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
-- STEP 7: Try to refresh PostgREST schema cache
-- ============================================
-- This may or may not work in Supabase Cloud, but worth trying
NOTIFY pgrst, 'reload schema';

-- ============================================
-- STEP 8: VERIFICATION
-- ============================================
SELECT '=== VERIFICATION ===' as info;

-- Open positions (should be much less than 171)
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
  'bot_config dailySpendingLimit' as metric,
  config_value->>'dailySpendingLimit' as value
FROM bot_config
WHERE config_key = 'trading';

-- strategy_params (should show 1000 for world and derivatives)
SELECT 
  'strategy_params' as metric,
  bot_category,
  daily_spending_limit as value
FROM bot_strategy_params
WHERE platform = 'kalshi' 
  AND bot_category IN ('world', 'derivatives')
ORDER BY bot_category;

-- ============================================
-- IMPORTANT: Next Steps
-- ============================================
SELECT '=== NEXT STEPS ===' as info;
SELECT 
  '1. Wait 30-60 seconds for PostgREST schema cache to refresh' as step1,
  '2. Restart the bot: npm run kalshi:sandbox' as step2,
  '3. Bot should now see both tables and $1000 limits' as step3;
