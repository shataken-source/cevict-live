-- Fix all position statuses to resolve 171 vs 2 discrepancy
-- Run this to clean up and sync positions properly

-- 1. First, see what we're dealing with
SELECT 
  COALESCE(outcome::text, 'NULL') as outcome_status,
  COUNT(*) as count
FROM trade_history
WHERE platform = 'kalshi'
GROUP BY outcome
ORDER BY count DESC;

-- 2. Fix NULL outcomes - set to 'closed' if they have closed_at
UPDATE trade_history
SET 
  outcome = 'closed',
  updated_at = NOW()
WHERE platform = 'kalshi'
  AND outcome IS NULL
  AND closed_at IS NOT NULL;

-- 3. Fix NULL outcomes - set to 'open' if they don't have closed_at
UPDATE trade_history
SET 
  outcome = 'open',
  updated_at = NOW()
WHERE platform = 'kalshi'
  AND outcome IS NULL
  AND closed_at IS NULL;

-- 4. Verify the fix - should show only 2 open now
SELECT 
  outcome,
  COUNT(*) as count
FROM trade_history
WHERE platform = 'kalshi'
GROUP BY outcome
ORDER BY count DESC;

-- 5. Final verification - open positions count
SELECT COUNT(*) as open_positions
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open';

-- 6. Show the 2 open positions
SELECT 
  id,
  market_id,
  symbol,
  bot_category,
  opened_at,
  amount
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open'
ORDER BY opened_at ASC;
