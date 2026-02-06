-- COMPREHENSIVE FIX: 171 Positions + $50 Spending Limit
-- Run this to fix BOTH issues at once

-- ============================================
-- PART 1: DIAGNOSE THE 171 POSITIONS ISSUE
-- ============================================
SELECT '=== DIAGNOSING 171 POSITIONS ===' as info;

-- Count by outcome status
SELECT 
  COALESCE(outcome::text, 'NULL') as outcome_status,
  COUNT(*) as count
FROM trade_history
WHERE platform = 'kalshi'
GROUP BY outcome
ORDER BY count DESC;

-- Count actual open positions
SELECT COUNT(*) as actual_open_positions
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open';

-- Count NULL outcomes
SELECT COUNT(*) as null_outcomes
FROM trade_history
WHERE platform = 'kalshi' AND outcome IS NULL;

-- Check for positions that should be closed (have closed_at but outcome='open')
SELECT COUNT(*) as should_be_closed
FROM trade_history
WHERE platform = 'kalshi' 
  AND outcome = 'open'
  AND closed_at IS NOT NULL;

-- ============================================
-- PART 2: FIX NULL OUTCOMES
-- ============================================
SELECT '=== FIXING NULL OUTCOMES ===' as info;

-- Close positions that have closed_at but outcome is NULL
UPDATE trade_history
SET 
  outcome = CASE 
    WHEN closed_at IS NOT NULL THEN 'closed'
    ELSE 'open'
  END,
  updated_at = NOW()
WHERE platform = 'kalshi' 
  AND outcome IS NULL;

-- ============================================
-- PART 3: CLOSE POSITIONS THAT SHOULD BE CLOSED
-- ============================================
SELECT '=== CLOSING POSITIONS WITH closed_at ===' as info;

-- Close positions that have closed_at but still marked as 'open'
UPDATE trade_history
SET 
  outcome = 'closed',
  updated_at = NOW()
WHERE platform = 'kalshi' 
  AND outcome = 'open'
  AND closed_at IS NOT NULL;

-- ============================================
-- PART 4: FIX SPENDING LIMIT TO $1000
-- ============================================
SELECT '=== FIXING SPENDING LIMIT ===' as info;

-- Update bot_config to $1000
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

-- Create if missing
INSERT INTO bot_config (config_key, config_value, updated_at)
SELECT 
  'trading',
  jsonb_build_object(
    'maxTradeSize', 5,
    'minConfidence', 55,
    'minEdge', 2,
    'dailySpendingLimit', 1000,
    'dailyLossLimit', 25,
    'maxOpenPositions', 5,
    'cryptoInterval', 30000,
    'kalshiInterval', 60000
  ),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM bot_config WHERE config_key = 'trading');

-- Update ALL strategy params to $1000
UPDATE bot_strategy_params
SET daily_spending_limit = 1000,
    updated_at = NOW()
WHERE platform = 'kalshi';

-- Create ALL categories (including derivatives) if missing
INSERT INTO bot_strategy_params (platform, bot_category, daily_spending_limit, min_confidence, min_edge, max_trade_usd)
VALUES
  ('kalshi', 'crypto', 1000, 55, 2, 10),
  ('kalshi', 'politics', 1000, 55, 2, 10),
  ('kalshi', 'economics', 1000, 55, 2, 10),
  ('kalshi', 'weather', 1000, 55, 2, 10),
  ('kalshi', 'entertainment', 1000, 55, 2, 10),
  ('kalshi', 'sports', 1000, 55, 2, 10),
  ('kalshi', 'world', 1000, 55, 2, 10),
  ('kalshi', 'unknown', 1000, 55, 2, 10),
  ('kalshi', 'derivatives', 1000, 55, 2, 10),
  ('kalshi', 'value', 1000, 55, 2, 10),
  ('kalshi', 'momentum', 1000, 55, 2, 10)
ON CONFLICT (platform, bot_category) 
DO UPDATE SET
  daily_spending_limit = 1000,
  updated_at = NOW();

-- ============================================
-- PART 5: VERIFY FIXES
-- ============================================
SELECT '=== VERIFICATION ===' as info;

-- Show final position counts
SELECT 
  COALESCE(outcome::text, 'NULL') as outcome_status,
  COUNT(*) as count
FROM trade_history
WHERE platform = 'kalshi'
GROUP BY outcome
ORDER BY count DESC;

-- Show final open positions count
SELECT 
  'FINAL OPEN POSITIONS' as info,
  COUNT(*) as open_positions
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open';

-- Show spending limits
SELECT 
  'bot_config' as source,
  config_value->>'dailySpendingLimit' as daily_limit
FROM bot_config
WHERE config_key = 'trading';

SELECT 
  'bot_strategy_params' as source,
  bot_category,
  daily_spending_limit
FROM bot_strategy_params
WHERE platform = 'kalshi'
ORDER BY bot_category;

-- ============================================
-- SUMMARY
-- ============================================
SELECT '=== SUMMARY ===' as info;
SELECT 
  'After running this script:' as step,
  '1. Restart the bot to sync positions' as action
UNION ALL
SELECT 
  '2. Bot should see correct open positions (not 171)' as step,
  '3. Daily limit should be $1000 (not $50)' as action;
