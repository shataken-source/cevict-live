-- ============================================================================
-- Alpha Hunter Bot Memory System - Supabase Tables
-- Run this migration in Supabase SQL Editor
-- ============================================================================

-- Bot Predictions Table
-- Stores all predictions made by category-specific bots
CREATE TABLE IF NOT EXISTS bot_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_category TEXT NOT NULL, -- crypto, politics, economics, entertainment, sports, weather, etc.
  market_id TEXT NOT NULL,
  market_title TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('kalshi', 'coinbase')),
  prediction TEXT NOT NULL, -- yes, no, buy, sell
  probability NUMERIC NOT NULL, -- 0-100
  confidence NUMERIC NOT NULL, -- 0-100
  edge NUMERIC NOT NULL, -- calculated edge percentage
  reasoning JSONB, -- array of reasoning strings
  factors JSONB, -- array of factors considered
  learned_from JSONB, -- array of sources (AI, Historical, etc.)
  market_price NUMERIC NOT NULL,
  predicted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  actual_outcome TEXT CHECK (actual_outcome IN ('win', 'loss', NULL)),
  pnl NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for bot_predictions
CREATE INDEX IF NOT EXISTS idx_bot_predictions_category ON bot_predictions(bot_category);
CREATE INDEX IF NOT EXISTS idx_bot_predictions_platform ON bot_predictions(platform);
CREATE INDEX IF NOT EXISTS idx_bot_predictions_predicted_at ON bot_predictions(predicted_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_predictions_market_id ON bot_predictions(market_id);
CREATE INDEX IF NOT EXISTS idx_bot_predictions_outcome ON bot_predictions(actual_outcome);

-- Trade History Table
-- Stores all executed trades with outcomes
CREATE TABLE IF NOT EXISTS trade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('kalshi', 'coinbase')),
  trade_type TEXT NOT NULL, -- buy, sell, yes, no
  symbol TEXT NOT NULL,
  market_id TEXT,
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  amount NUMERIC NOT NULL,
  pnl NUMERIC,
  fees NUMERIC DEFAULT 0,
  opened_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  bot_category TEXT,
  confidence NUMERIC,
  edge NUMERIC,
  outcome TEXT CHECK (outcome IN ('win', 'loss', 'open')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for trade_history
CREATE INDEX IF NOT EXISTS idx_trade_history_platform ON trade_history(platform);
CREATE INDEX IF NOT EXISTS idx_trade_history_opened_at ON trade_history(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_history_outcome ON trade_history(outcome);
CREATE INDEX IF NOT EXISTS idx_trade_history_bot_category ON trade_history(bot_category);

-- Bot Learnings Table
-- Stores patterns and insights learned by bots
CREATE TABLE IF NOT EXISTS bot_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_category TEXT NOT NULL,
  pattern_type TEXT NOT NULL, -- winning_pattern, losing_pattern, market_insight
  pattern_description TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  times_observed INTEGER DEFAULT 1,
  success_rate NUMERIC NOT NULL, -- 0-100
  learned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bot_category, pattern_description)
);

-- Indexes for bot_learnings
CREATE INDEX IF NOT EXISTS idx_bot_learnings_category ON bot_learnings(bot_category);
CREATE INDEX IF NOT EXISTS idx_bot_learnings_success_rate ON bot_learnings(success_rate DESC);
CREATE INDEX IF NOT EXISTS idx_bot_learnings_times_observed ON bot_learnings(times_observed DESC);

-- Bot Metrics Table
-- Aggregated performance metrics for each bot category
CREATE TABLE IF NOT EXISTS bot_metrics (
  bot_category TEXT PRIMARY KEY,
  total_predictions INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  accuracy NUMERIC DEFAULT 0, -- 0-100
  total_pnl NUMERIC DEFAULT 0,
  avg_edge NUMERIC DEFAULT 0,
  avg_confidence NUMERIC DEFAULT 0,
  best_pattern TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Session Stats Table
-- Track daily/session performance
CREATE TABLE IF NOT EXISTS trading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_start TIMESTAMPTZ NOT NULL,
  session_end TIMESTAMPTZ,
  total_trades INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  total_pnl NUMERIC DEFAULT 0,
  total_fees NUMERIC DEFAULT 0,
  daily_spending NUMERIC DEFAULT 0,
  coinbase_balance NUMERIC DEFAULT 0,
  kalshi_balance NUMERIC DEFAULT 0,
  crypto_positions INTEGER DEFAULT 0,
  kalshi_positions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trading_sessions_start ON trading_sessions(session_start DESC);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to calculate bot accuracy
CREATE OR REPLACE FUNCTION calculate_bot_accuracy(category_name TEXT)
RETURNS NUMERIC AS $$
DECLARE
  total INTEGER;
  correct INTEGER;
BEGIN
  SELECT COUNT(*) INTO total
  FROM bot_predictions
  WHERE bot_category = category_name
    AND actual_outcome IS NOT NULL;

  IF total = 0 THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO correct
  FROM bot_predictions
  WHERE bot_category = category_name
    AND actual_outcome = 'win';

  RETURN (correct::NUMERIC / total::NUMERIC) * 100;
END;
$$ LANGUAGE plpgsql;

-- Function to get top performing bot
CREATE OR REPLACE FUNCTION get_top_bot()
RETURNS TABLE(category TEXT, accuracy NUMERIC, total_predictions INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bot_category,
    (COUNT(CASE WHEN actual_outcome = 'win' THEN 1 END)::NUMERIC /
     NULLIF(COUNT(CASE WHEN actual_outcome IS NOT NULL THEN 1 END), 0) * 100) as accuracy,
    COUNT(*)::INTEGER as total_predictions
  FROM bot_predictions
  WHERE actual_outcome IS NOT NULL
  GROUP BY bot_category
  HAVING COUNT(CASE WHEN actual_outcome IS NOT NULL THEN 1 END) >= 5
  ORDER BY accuracy DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Row Level Security (RLS) - Optional, uncomment if needed
-- ============================================================================

-- Enable RLS if you want to restrict access
-- ALTER TABLE bot_predictions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE trade_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bot_learnings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bot_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies (example - modify as needed)
-- CREATE POLICY "Service role can do everything" ON bot_predictions
--   FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Initial Data
-- ============================================================================

-- Insert initial bot categories
INSERT INTO bot_metrics (bot_category, total_predictions, accuracy) VALUES
  ('crypto', 0, 0),
  ('politics', 0, 0),
  ('economics', 0, 0),
  ('entertainment', 0, 0),
  ('sports', 0, 0),
  ('weather', 0, 0),
  ('technology', 0, 0),
  ('health', 0, 0),
  ('world', 0, 0),
  ('companies', 0, 0),
  ('financials', 0, 0),
  ('climate', 0, 0),
  ('culture', 0, 0)
ON CONFLICT (bot_category) DO NOTHING;

-- ============================================================================
-- Views for Analytics
-- ============================================================================

-- View: Bot Performance Summary
CREATE OR REPLACE VIEW bot_performance_summary AS
SELECT
  bot_category,
  COUNT(*) as total_predictions,
  COUNT(CASE WHEN actual_outcome IS NOT NULL THEN 1 END) as completed_predictions,
  COUNT(CASE WHEN actual_outcome = 'win' THEN 1 END) as wins,
  COUNT(CASE WHEN actual_outcome = 'loss' THEN 1 END) as losses,
  (COUNT(CASE WHEN actual_outcome = 'win' THEN 1 END)::NUMERIC /
   NULLIF(COUNT(CASE WHEN actual_outcome IS NOT NULL THEN 1 END), 0) * 100) as accuracy,
  AVG(confidence) as avg_confidence,
  AVG(edge) as avg_edge,
  SUM(COALESCE(pnl, 0)) as total_pnl
FROM bot_predictions
GROUP BY bot_category;

-- View: Recent Trading Activity
CREATE OR REPLACE VIEW recent_trading_activity AS
SELECT
  th.platform,
  th.symbol,
  th.trade_type,
  th.entry_price,
  th.exit_price,
  th.pnl,
  th.fees,
  th.outcome,
  th.bot_category,
  th.opened_at,
  th.closed_at
FROM trade_history th
ORDER BY th.opened_at DESC
LIMIT 100;

-- View: Top Performing Patterns
CREATE OR REPLACE VIEW top_performing_patterns AS
SELECT
  bot_category,
  pattern_description,
  success_rate,
  times_observed,
  confidence,
  last_seen
FROM bot_learnings
WHERE times_observed >= 3
ORDER BY success_rate DESC, times_observed DESC
LIMIT 50;

-- ============================================================================
-- GRANT permissions to service role
-- ============================================================================

-- Grant all permissions to authenticated users (service role)
GRANT ALL ON bot_predictions TO authenticated;
GRANT ALL ON trade_history TO authenticated;
GRANT ALL ON bot_learnings TO authenticated;
GRANT ALL ON bot_metrics TO authenticated;
GRANT ALL ON trading_sessions TO authenticated;

-- Grant read access to views
GRANT SELECT ON bot_performance_summary TO authenticated;
GRANT SELECT ON recent_trading_activity TO authenticated;
GRANT SELECT ON top_performing_patterns TO authenticated;

-- ============================================================================
-- COMPLETE!
-- ============================================================================

-- Verify tables were created
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('bot_predictions', 'trade_history', 'bot_learnings', 'bot_metrics', 'trading_sessions')
ORDER BY table_name;

