-- Optional: store Kalshi resolution (result + expiration_value e.g. final score) when closing a trade.
-- Run only if you want to persist "final score" / resolution_detail from GET /markets/{ticker}.
-- Safe to run multiple times (ADD COLUMN IF NOT EXISTS).

ALTER TABLE trade_history
  ADD COLUMN IF NOT EXISTS resolution_detail TEXT;

COMMENT ON COLUMN trade_history.resolution_detail IS 'Kalshi resolution: result + expiration_value (e.g. final score) from GET /markets/{ticker} at settlement';
