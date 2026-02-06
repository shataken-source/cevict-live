-- Debug why bot sees 171 open positions but query shows only 2

-- 1. Check what getOpenTradeRecords actually queries
-- It uses: .eq('platform', 'kalshi').eq('outcome', 'open')
SELECT COUNT(*) as total_open
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open';

-- 2. Check for NULL outcomes (might be counted as "open")
SELECT COUNT(*) as null_outcome
FROM trade_history
WHERE platform = 'kalshi' AND outcome IS NULL;

-- 3. Check all outcome values
SELECT 
  COALESCE(outcome::text, 'NULL') as outcome,
  COUNT(*) as count
FROM trade_history
WHERE platform = 'kalshi'
GROUP BY outcome
ORDER BY count DESC;

-- 4. Check if there are positions without outcome set
SELECT 
  id,
  market_id,
  symbol,
  outcome,
  opened_at,
  closed_at
FROM trade_history
WHERE platform = 'kalshi'
  AND (outcome IS NULL OR outcome != 'open')
ORDER BY opened_at DESC
LIMIT 20;

-- 5. Check total count of ALL kalshi trades (regardless of outcome)
SELECT COUNT(*) as total_kalshi_trades
FROM trade_history
WHERE platform = 'kalshi';

-- 6. Check if there are duplicate market_ids (same position counted multiple times)
SELECT 
  market_id,
  COUNT(*) as position_count,
  array_agg(id) as trade_ids,
  array_agg(outcome) as outcomes
FROM trade_history
WHERE platform = 'kalshi'
GROUP BY market_id
HAVING COUNT(*) > 1
ORDER BY position_count DESC
LIMIT 20;
