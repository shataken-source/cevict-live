-- Close old Kalshi positions to free up correlation slots
-- This helps the bot place new trades

-- 1. First, see what we're about to close (positions open >7 days)
SELECT 
  th.id,
  th.market_id,
  COALESCE(bp.market_title, th.symbol) as market_title,
  th.bot_category,
  th.opened_at,
  EXTRACT(EPOCH FROM (NOW() - th.opened_at))/24/3600 as days_open,
  th.amount,
  th.trade_type
FROM trade_history th
LEFT JOIN bot_predictions bp ON bp.market_id = th.market_id AND bp.platform = 'kalshi'
WHERE th.platform = 'kalshi'
  AND th.outcome = 'open'
  AND th.opened_at < NOW() - INTERVAL '7 days'
ORDER BY th.opened_at ASC;

-- 2. Close positions open for more than 7 days
-- UNCOMMENT BELOW TO EXECUTE:
/*
UPDATE trade_history
SET 
  outcome = 'closed_manual',
  closed_at = NOW(),
  updated_at = NOW()
WHERE platform = 'kalshi'
  AND outcome = 'open'
  AND opened_at < NOW() - INTERVAL '7 days';
*/

-- 3. Or close ALL open positions (more aggressive - use with caution)
-- UNCOMMENT BELOW TO EXECUTE:
/*
UPDATE trade_history
SET 
  outcome = 'closed_manual',
  closed_at = NOW(),
  updated_at = NOW()
WHERE platform = 'kalshi'
  AND outcome = 'open';
*/

-- 4. Verify after closing
SELECT 
  outcome,
  COUNT(*) as count
FROM trade_history
WHERE platform = 'kalshi'
GROUP BY outcome;
