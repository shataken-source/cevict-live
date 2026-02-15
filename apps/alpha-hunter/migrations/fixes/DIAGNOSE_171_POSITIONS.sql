-- CRITICAL: Diagnose why bot sees 171 positions
-- Run this FIRST to understand the issue

-- 1. Count by outcome (this is what matters)
SELECT 
  COALESCE(outcome::text, 'NULL') as outcome_status,
  COUNT(*) as count
FROM trade_history
WHERE platform = 'kalshi'
GROUP BY outcome
ORDER BY count DESC;

-- 2. Check if Supabase client might be including NULLs
-- The query uses .eq('outcome', 'open') which should exclude NULLs
-- But let's verify what's actually there
SELECT COUNT(*) as total_with_open_outcome
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open';

SELECT COUNT(*) as total_with_null_outcome
FROM trade_history
WHERE platform = 'kalshi' AND outcome IS NULL;

-- 3. Check for any other outcome values that might be counted
SELECT DISTINCT outcome
FROM trade_history
WHERE platform = 'kalshi';

-- 4. Check total records (all outcomes)
SELECT COUNT(*) as total_kalshi_records
FROM trade_history
WHERE platform = 'kalshi';

-- 5. If there are 171 records with outcome='open', show them
SELECT 
  id,
  market_id,
  symbol,
  outcome,
  opened_at,
  closed_at,
  EXTRACT(EPOCH FROM (NOW() - opened_at))/3600 as hours_open
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open'
ORDER BY opened_at DESC
LIMIT 20;

-- 6. Check for positions that should be closed (have closed_at but outcome='open')
SELECT COUNT(*) as should_be_closed
FROM trade_history
WHERE platform = 'kalshi' 
  AND outcome = 'open'
  AND closed_at IS NOT NULL;
