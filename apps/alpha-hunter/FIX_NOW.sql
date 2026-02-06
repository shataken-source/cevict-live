-- COMPLETE FIX: Run this entire script to fix both issues
-- This will:
-- 1. Fix any NULL outcomes
-- 2. Increase spending limit to $1,000
-- 3. Show verification results

-- ============================================
-- PART 1: DIAGNOSE POSITIONS
-- ============================================

-- See what we're dealing with
SELECT 
  COALESCE(outcome::text, 'NULL') as outcome_status,
  COUNT(*) as count
FROM trade_history
WHERE platform = 'kalshi'
GROUP BY outcome
ORDER BY count DESC;

-- Count open positions
SELECT COUNT(*) as open_positions_count
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open';

-- Count NULL outcomes
SELECT COUNT(*) as null_outcomes_count
FROM trade_history
WHERE platform = 'kalshi' AND outcome IS NULL;

-- ============================================
-- PART 2: FIX NULL OUTCOMES
-- ============================================

-- Set NULL outcomes to 'closed' if they have closed_at
UPDATE trade_history
SET 
  outcome = 'closed',
  updated_at = NOW()
WHERE platform = 'kalshi'
  AND outcome IS NULL
  AND closed_at IS NOT NULL;

-- Set NULL outcomes to 'open' if they don't have closed_at
UPDATE trade_history
SET 
  outcome = 'open',
  updated_at = NOW()
WHERE platform = 'kalshi'
  AND outcome IS NULL
  AND closed_at IS NULL;

-- ============================================
-- PART 3: INCREASE SPENDING LIMIT
-- ============================================

-- Update main trading config
UPDATE bot_config
SET config_value = jsonb_set(
  config_value,
  '{dailySpendingLimit}',
  '1000'
)
WHERE config_key = 'trading';

-- Update all Kalshi strategy params
UPDATE bot_strategy_params
SET daily_spending_limit = 1000,
    updated_at = NOW()
WHERE platform = 'kalshi';

-- Create defaults if missing (idempotent)
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

-- ============================================
-- PART 4: VERIFY FIXES
-- ============================================

-- Verify position counts
SELECT 
  outcome,
  COUNT(*) as count
FROM trade_history
WHERE platform = 'kalshi'
GROUP BY outcome
ORDER BY count DESC;

-- Verify spending limits
SELECT 
  config_key,
  config_value->>'dailySpendingLimit' as daily_spending_limit
FROM bot_config
WHERE config_key = 'trading';

SELECT 
  platform,
  bot_category,
  daily_spending_limit
FROM bot_strategy_params
WHERE platform = 'kalshi'
ORDER BY bot_category;

-- Final open positions count
SELECT COUNT(*) as final_open_positions
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open';
