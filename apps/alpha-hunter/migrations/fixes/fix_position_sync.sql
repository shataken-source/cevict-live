-- Fix position sync issue - Bot sees 171 but database shows 2
-- This will help identify and fix the discrepancy

-- 1. Check ALL positions (including NULL outcomes)
SELECT 
  COALESCE(outcome::text, 'NULL') as outcome_status,
  COUNT(*) as count
FROM trade_history
WHERE platform = 'kalshi'
GROUP BY outcome
ORDER BY count DESC;

-- 2. Check if there are positions with NULL outcome (these might be counted as "open")
SELECT 
  id,
  market_id,
  symbol,
  outcome,
  opened_at,
  closed_at
FROM trade_history
WHERE platform = 'kalshi'
  AND outcome IS NULL
ORDER BY opened_at DESC
LIMIT 20;

-- 3. Set NULL outcomes to 'closed' if they have a closed_at date
UPDATE trade_history
SET outcome = 'closed'
WHERE platform = 'kalshi'
  AND outcome IS NULL
  AND closed_at IS NOT NULL;

-- 4. Set NULL outcomes to 'open' if they don't have closed_at (these are truly open)
UPDATE trade_history
SET outcome = 'open'
WHERE platform = 'kalshi'
  AND outcome IS NULL
  AND closed_at IS NULL;

-- 5. Verify the fix
SELECT 
  outcome,
  COUNT(*) as count
FROM trade_history
WHERE platform = 'kalshi'
GROUP BY outcome
ORDER BY count DESC;

-- 6. Final count of open positions (should match bot after restart)
SELECT COUNT(*) as open_positions
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open';
