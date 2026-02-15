-- Alpha Hunter Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main account table
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions log
CREATE TABLE IF NOT EXISTS alpha_hunter_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id TEXT REFERENCES alpha_hunter_accounts(id),
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'profit', 'loss', 'fee')),
  amount DECIMAL(12, 2) NOT NULL,
  source TEXT,
  balance_after DECIMAL(12, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trades tracking
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
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  settled_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Opportunities found (for analysis)
CREATE TABLE IF NOT EXISTS alpha_hunter_opportunities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  confidence INTEGER,
  expected_value DECIMAL(8, 2),
  risk_level TEXT,
  timeframe TEXT,
  required_capital DECIMAL(12, 2),
  potential_return DECIMAL(12, 2),
  reasoning JSONB,
  data_points JSONB,
  action JSONB,
  taken BOOLEAN DEFAULT false,
  outcome TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Learning data for AI improvement
CREATE TABLE IF NOT EXISTS alpha_hunter_learnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_type TEXT NOT NULL,
  confidence INTEGER,
  outcome TEXT CHECK (outcome IN ('success', 'failure')),
  actual_return DECIMAL(12, 2),
  expected_return DECIMAL(12, 2),
  factors JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily reports
CREATE TABLE IF NOT EXISTS alpha_hunter_daily_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE UNIQUE NOT NULL,
  opportunities_found INTEGER DEFAULT 0,
  opportunities_taken INTEGER DEFAULT 0,
  trades_executed INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  win_rate DECIMAL(5, 2) DEFAULT 0,
  total_profit DECIMAL(12, 2) DEFAULT 0,
  best_trade DECIMAL(12, 2) DEFAULT 0,
  worst_trade DECIMAL(12, 2) DEFAULT 0,
  market_conditions TEXT,
  news_impact JSONB,
  learnings JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- News items tracked
CREATE TABLE IF NOT EXISTS alpha_hunter_news (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  source TEXT,
  url TEXT,
  summary TEXT,
  sentiment TEXT,
  relevance INTEGER,
  relevant_to JSONB,
  acted_on BOOLEAN DEFAULT false,
  outcome TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_trades_status ON alpha_hunter_trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_date ON alpha_hunter_trades(executed_at);
CREATE INDEX IF NOT EXISTS idx_opportunities_date ON alpha_hunter_opportunities(created_at);
CREATE INDEX IF NOT EXISTS idx_learnings_type ON alpha_hunter_learnings(opportunity_type);
CREATE INDEX IF NOT EXISTS idx_news_date ON alpha_hunter_news(published_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for accounts table
DROP TRIGGER IF EXISTS update_alpha_hunter_accounts_updated_at ON alpha_hunter_accounts;
CREATE TRIGGER update_alpha_hunter_accounts_updated_at
  BEFORE UPDATE ON alpha_hunter_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default account if not exists
INSERT INTO alpha_hunter_accounts (id, balance, available_funds)
VALUES ('alpha_hunter_main', 0, 0)
ON CONFLICT (id) DO NOTHING;

-- View for daily performance
CREATE OR REPLACE VIEW alpha_hunter_performance AS
SELECT 
  DATE(executed_at) as date,
  COUNT(*) as trades,
  COUNT(*) FILTER (WHERE status = 'won') as wins,
  COUNT(*) FILTER (WHERE status = 'lost') as losses,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'won')::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE status IN ('won', 'lost')), 0)) * 100, 
    2
  ) as win_rate,
  SUM(profit) as total_profit,
  AVG(profit) FILTER (WHERE status = 'won') as avg_win,
  AVG(profit) FILTER (WHERE status = 'lost') as avg_loss,
  MAX(profit) as best_trade,
  MIN(profit) as worst_trade
FROM alpha_hunter_trades
WHERE status IN ('won', 'lost')
GROUP BY DATE(executed_at)
ORDER BY date DESC;

-- View for opportunity analysis
CREATE OR REPLACE VIEW alpha_hunter_opportunity_analysis AS
SELECT 
  type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE taken = true) as taken,
  COUNT(*) FILTER (WHERE outcome = 'success') as successful,
  AVG(confidence) as avg_confidence,
  AVG(expected_value) as avg_expected_value,
  ROUND(
    (COUNT(*) FILTER (WHERE outcome = 'success')::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE outcome IS NOT NULL), 0)) * 100,
    2
  ) as success_rate
FROM alpha_hunter_opportunities
GROUP BY type
ORDER BY success_rate DESC NULLS LAST;

COMMENT ON TABLE alpha_hunter_accounts IS 'Main trading account for Alpha Hunter bot';
COMMENT ON TABLE alpha_hunter_trades IS 'All trades executed by the bot';
COMMENT ON TABLE alpha_hunter_learnings IS 'Learning data used to improve AI predictions';
COMMENT ON TABLE alpha_hunter_opportunities IS 'All opportunities identified by the bot';

