-- FIX DUPLICATES: Remove duplicate open positions, keep only the most recent
-- Then verify spending limits are correct

-- ============================================
-- STEP 1: Identify duplicates
-- ============================================
SELECT '=== CHECKING FOR DUPLICATES ===' as info;

SELECT 
  market_id,
  COUNT(*) as duplicate_count
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open'
GROUP BY market_id
HAVING COUNT(*) > 1;

-- ============================================
-- STEP 2: Close duplicate positions (keep only the most recent one)
-- ============================================
-- For each market_id with duplicates, close all except the most recently opened one
WITH duplicates AS (
  SELECT 
    id,
    market_id,
    opened_at,
    ROW_NUMBER() OVER (PARTITION BY market_id ORDER BY opened_at DESC) as rn
  FROM trade_history
  WHERE platform = 'kalshi' 
    AND outcome = 'open'
    AND market_id IN (
      SELECT market_id
      FROM trade_history
      WHERE platform = 'kalshi' AND outcome = 'open'
      GROUP BY market_id
      HAVING COUNT(*) > 1
    )
)
UPDATE trade_history
SET 
  outcome = 'closed',
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- ============================================
-- STEP 3: Verify bot_config is $1000
-- ============================================
SELECT '=== VERIFYING BOT_CONFIG ===' as info;

-- Force update if not $1000
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

-- Show result
SELECT 
  config_value->>'dailySpendingLimit' as daily_limit,
  updated_at
FROM bot_config
WHERE config_key = 'trading';

-- ============================================
-- STEP 4: Verify strategy params exist
-- ============================================
SELECT '=== VERIFYING STRATEGY_PARAMS ===' as info;

-- Ensure world and derivatives exist with $1000
INSERT INTO bot_strategy_params (platform, bot_category, daily_spending_limit, min_confidence, min_edge, max_trade_usd, updated_at)
VALUES
  ('kalshi', 'world', 1000, 55, 2, 10, NOW()),
  ('kalshi', 'derivatives', 1000, 55, 2, 10, NOW())
ON CONFLICT (platform, bot_category) 
DO UPDATE SET
  daily_spending_limit = 1000,
  updated_at = NOW();

-- Show results
SELECT 
  bot_category,
  daily_spending_limit,
  updated_at
FROM bot_strategy_params
WHERE platform = 'kalshi' 
  AND bot_category IN ('world', 'derivatives')
ORDER BY bot_category;

-- ============================================
-- STEP 5: Final verification
-- ============================================
SELECT '=== FINAL VERIFICATION ===' as info;

-- Count open positions (should be much less now)
SELECT 
  'Open positions after fix' as info,
  COUNT(*) as count
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open';

-- Count unique market_ids
SELECT 
  'Unique open market_ids' as info,
  COUNT(DISTINCT market_id) as unique_count
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open';

-- Show remaining duplicates (should be 0)
SELECT 
  'Remaining duplicates' as info,
  COUNT(*) as duplicate_count
FROM (
  SELECT market_id
  FROM trade_history
  WHERE platform = 'kalshi' AND outcome = 'open'
  GROUP BY market_id
  HAVING COUNT(*) > 1
) duplicates;
