-- Review and optionally close old Kalshi positions
-- This helps free up correlation slots for new trades

-- 1. View all open Kalshi positions (with market title from predictions if available)
SELECT 
  th.id,
  th.market_id,
  COALESCE(bp.market_title, th.symbol) as market_title,
  th.bot_category,
  th.trade_type as side,
  th.entry_price,
  th.amount,
  th.opened_at,
  EXTRACT(EPOCH FROM (NOW() - th.opened_at))/3600 as hours_open,
  th.confidence,
  th.edge
FROM trade_history th
LEFT JOIN bot_predictions bp ON bp.market_id = th.market_id AND bp.platform = 'kalshi'
WHERE th.platform = 'kalshi'
  AND th.outcome = 'open'
ORDER BY th.opened_at ASC
LIMIT 50;

-- 2. Find positions open for more than 7 days (might want to close these)
SELECT 
  th.id,
  th.market_id,
  COALESCE(bp.market_title, th.symbol) as market_title,
  th.bot_category,
  th.opened_at,
  EXTRACT(EPOCH FROM (NOW() - th.opened_at))/24/3600 as days_open,
  th.amount
FROM trade_history th
LEFT JOIN bot_predictions bp ON bp.market_id = th.market_id AND bp.platform = 'kalshi'
WHERE th.platform = 'kalshi'
  AND th.outcome = 'open'
  AND th.opened_at < NOW() - INTERVAL '7 days'
ORDER BY th.opened_at ASC;

-- 3. Count positions by category
SELECT 
  bot_category,
  COUNT(*) as open_positions,
  SUM(amount) as total_exposure
FROM trade_history
WHERE platform = 'kalshi'
  AND outcome = 'open'
GROUP BY bot_category
ORDER BY open_positions DESC;

-- 4. To close old positions manually (if needed):
-- UPDATE trade_history
-- SET outcome = 'closed_manual',
--     closed_at = NOW(),
--     updated_at = NOW()
-- WHERE platform = 'kalshi'
--   AND outcome = 'open'
--   AND opened_at < NOW() - INTERVAL '7 days'
--   AND id IN ('position-id-1', 'position-id-2', ...);

-- Note: In sandbox mode, positions will auto-settle when markets resolve
-- This is just for reviewing/managing if needed
