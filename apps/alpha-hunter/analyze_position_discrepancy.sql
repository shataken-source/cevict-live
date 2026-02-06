-- Analyze position discrepancy
-- Bot shows 171 open positions, but category count shows only 2

-- 1. Total count of open Kalshi positions
SELECT COUNT(*) as total_open_positions
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open';

-- 2. Count by outcome status
SELECT 
  outcome,
  COUNT(*) as count
FROM trade_history
WHERE platform = 'kalshi'
GROUP BY outcome
ORDER BY count DESC;

-- 3. Check if there are positions with NULL or different outcome values
SELECT 
  COALESCE(outcome, 'NULL') as outcome_status,
  COUNT(*) as count
FROM trade_history
WHERE platform = 'kalshi'
GROUP BY outcome
ORDER BY count DESC;

-- 4. Full category breakdown (should match what you saw)
SELECT 
  bot_category,
  COUNT(*) as open_positions,
  SUM(amount) as total_exposure,
  MIN(opened_at) as oldest_position,
  MAX(opened_at) as newest_position
FROM trade_history
WHERE platform = 'kalshi'
  AND outcome = 'open'
GROUP BY bot_category
ORDER BY open_positions DESC;

-- 5. Check for positions with missing categories
SELECT 
  COALESCE(bot_category, 'NULL') as category,
  COUNT(*) as count
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open'
GROUP BY bot_category
ORDER BY count DESC;
