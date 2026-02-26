-- Alpha Hunter: Crypto trade persistence for 24/7 Coinbase trader
-- Stores open and closed trades so positions survive bot restarts

CREATE TABLE IF NOT EXISTS alpha_hunter_trades (
  id TEXT PRIMARY KEY,
  pair TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  size NUMERIC NOT NULL,
  usd_value NUMERIC NOT NULL,
  profit NUMERIC,
  profit_percent NUMERIC,
  reason TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed BOOLEAN NOT NULL DEFAULT false,
  take_profit_price NUMERIC,
  stop_loss_price NUMERIC,
  platform TEXT NOT NULL DEFAULT 'coinbase',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for loading open positions on startup
CREATE INDEX IF NOT EXISTS idx_alpha_trades_open
  ON alpha_hunter_trades (closed, platform)
  WHERE closed = false;

-- Heartbeat / account state (upsert-friendly)
CREATE TABLE IF NOT EXISTS alpha_hunter_accounts (
  id TEXT PRIMARY KEY,
  data JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
