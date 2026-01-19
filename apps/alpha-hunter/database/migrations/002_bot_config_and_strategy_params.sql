-- ============================================================================
-- Alpha Hunter Bot Config + Strategy Params
-- Adds missing bot_config table and per-category strategy parameter storage.
-- ============================================================================

-- Bot Config Table (key/value JSON)
CREATE TABLE IF NOT EXISTS bot_config (
  config_key TEXT PRIMARY KEY,
  config_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed defaults (idempotent)
INSERT INTO bot_config (config_key, config_value)
VALUES
  ('trading', jsonb_build_object(
    'maxTradeSize', 5,
    'minConfidence', 55,
    'minEdge', 2,
    'dailySpendingLimit', 50,
    'dailyLossLimit', 25,
    'maxOpenPositions', 5,
    'cryptoInterval', 30000,
    'kalshiInterval', 60000
  )),
  ('picks', jsonb_build_object(
    'maxPicksDisplay', 20,
    'minConfidenceDisplay', 50
  ))
ON CONFLICT (config_key) DO NOTHING;

-- Strategy Params Table (learned, bounded)
-- Stores the bot's adaptive thresholds/sizing per category+platform.
CREATE TABLE IF NOT EXISTS bot_strategy_params (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('kalshi', 'coinbase')),
  bot_category TEXT NOT NULL,
  min_confidence NUMERIC NOT NULL DEFAULT 55,
  min_edge NUMERIC NOT NULL DEFAULT 2,
  max_trade_usd NUMERIC NOT NULL DEFAULT 5,
  daily_spending_limit NUMERIC NOT NULL DEFAULT 50,
  max_open_positions INTEGER NOT NULL DEFAULT 5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(platform, bot_category)
);

-- Ensure trade_history has contracts for accurate PnL math (idempotent)
ALTER TABLE trade_history
  ADD COLUMN IF NOT EXISTS contracts INTEGER;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_bot_config_updated_at ON bot_config(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_strategy_params_platform_cat ON bot_strategy_params(platform, bot_category);

