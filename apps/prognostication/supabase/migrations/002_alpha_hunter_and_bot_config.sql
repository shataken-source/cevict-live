-- Alpha Hunter tables + bot_config (for fund-manager and health check)
-- Run in same Supabase project as 001_kalshi_bot_tables.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fund-manager tables
CREATE TABLE IF NOT EXISTS alpha_hunter_accounts (
  id TEXT PRIMARY KEY DEFAULT 'alpha_hunter_main',
  balance DECIMAL(12, 2) DEFAULT 0,
  allocated_funds DECIMAL(12, 2) DEFAULT 0,
  available_funds DECIMAL(12, 2) DEFAULT 0,
  daily_limit DECIMAL(12, 2) DEFAULT 100,
  max_risk_per_trade DECIMAL(12, 2) DEFAULT 50,
  today_spent DECIMAL(12, 2) DEFAULT 0,
  today_profit DECIMAL(12, 2) DEFAULT 0,
  total_profit DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alpha_hunter_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id TEXT REFERENCES alpha_hunter_accounts(id),
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'profit', 'loss', 'fee')),
  amount DECIMAL(12, 2) NOT NULL,
  source TEXT,
  balance_after DECIMAL(12, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alpha_hunter_trades (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sports_bet', 'prediction_market', 'arbitrage', 'news_play', 'crypto', 'event')),
  platform TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  target TEXT NOT NULL,
  entry_price DECIMAL(12, 4),
  exit_price DECIMAL(12, 4),
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'won', 'lost', 'cancelled')),
  profit DECIMAL(12, 2) DEFAULT 0,
  reasoning TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  settled_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

INSERT INTO alpha_hunter_accounts (id, balance, available_funds)
VALUES ('alpha_hunter_main', 0, 0)
ON CONFLICT (id) DO NOTHING;

-- bot_config: use config_key/config_value (existing alpha-hunter schema). Create only if missing.
CREATE TABLE IF NOT EXISTS bot_config (
  config_key TEXT PRIMARY KEY,
  config_value JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO bot_config (config_key, config_value)
VALUES ('health_check', '{}'::jsonb)
ON CONFLICT (config_key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_alpha_hunter_trades_status ON alpha_hunter_trades(status);
CREATE INDEX IF NOT EXISTS idx_alpha_hunter_trades_executed_at ON alpha_hunter_trades(executed_at);
