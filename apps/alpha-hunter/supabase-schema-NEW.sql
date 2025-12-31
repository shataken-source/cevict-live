-- ============================================================================
-- ALPHA HUNTER BOT LEARNING SYSTEM - SUPABASE SCHEMA
-- ============================================================================
-- This schema supports the bot's learning memory system
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- DROP EXISTING TABLES (if they exist with old schema)
-- ============================================================================
-- WARNING: This will delete all existing data in these tables!
-- Comment out these lines if you want to preserve existing data

DROP TABLE IF EXISTS bot_predictions CASCADE;
DROP TABLE IF EXISTS trade_history CASCADE;
DROP TABLE IF EXISTS bot_learnings CASCADE;
DROP TABLE IF EXISTS bot_metrics CASCADE;

-- ============================================================================
-- BOT PREDICTIONS TABLE
-- ============================================================================
-- Stores all predictions made by category-specific bots
CREATE TABLE bot_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_category TEXT NOT NULL, -- 'crypto', 'politics', 'sports', 'entertainment', etc.
  market_id TEXT NOT NULL,
  market_title TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('kalshi', 'coinbase')),
  prediction TEXT NOT NULL, -- 'yes', 'no', 'buy', 'sell'
  probability DECIMAL(5, 2) NOT NULL, -- 0-100
  confidence DECIMAL(5, 2) NOT NULL, -- 0-100
  edge DECIMAL(5, 2) NOT NULL, -- percentage edge
  reasoning JSONB DEFAULT '[]'::jsonb,
  factors JSONB DEFAULT '[]'::jsonb,
  learned_from JSONB DEFAULT '[]'::jsonb,
  market_price DECIMAL(8, 2) NOT NULL,
  predicted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  actual_outcome TEXT CHECK (actual_outcome IN ('win', 'loss', NULL)),
  pnl DECIMAL(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_predictions_category ON bot_predictions(bot_category);
CREATE INDEX IF NOT EXISTS idx_bot_predictions_platform ON bot_predictions(platform);
CREATE INDEX IF NOT EXISTS idx_bot_predictions_predicted_at ON bot_predictions(predicted_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_predictions_outcome ON bot_predictions(actual_outcome);

-- ============================================================================
-- TRADE HISTORY TABLE
-- ============================================================================
-- Stores all actual trades executed by the bot
CREATE TABLE trade_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL CHECK (platform IN ('kalshi', 'coinbase')),
  trade_type TEXT NOT NULL, -- 'buy', 'sell', 'yes', 'no'
  symbol TEXT NOT NULL,
  market_id TEXT,
  entry_price DECIMAL(12, 4) NOT NULL,
  exit_price DECIMAL(12, 4),
  amount DECIMAL(12, 4) NOT NULL,
  pnl DECIMAL(12, 2),
  fees DECIMAL(12, 4) NOT NULL,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL,
  closed_at TIMESTAMP WITH TIME ZONE,
  bot_category TEXT,
  confidence DECIMAL(5, 2),
  edge DECIMAL(5, 2),
  outcome TEXT CHECK (outcome IN ('win', 'loss', 'open')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_history_platform ON trade_history(platform);
CREATE INDEX IF NOT EXISTS idx_trade_history_outcome ON trade_history(outcome);
CREATE INDEX IF NOT EXISTS idx_trade_history_opened_at ON trade_history(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_history_bot_category ON trade_history(bot_category);

-- ============================================================================
-- BOT LEARNINGS TABLE
-- ============================================================================
-- Stores learned patterns and insights from each category bot
CREATE TABLE bot_learnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_category TEXT NOT NULL,
  pattern_type TEXT NOT NULL, -- 'winning_pattern', 'losing_pattern', 'market_insight'
  pattern_description TEXT NOT NULL,
  confidence DECIMAL(5, 2) NOT NULL,
  times_observed INTEGER DEFAULT 1,
  success_rate DECIMAL(5, 2) NOT NULL,
  learned_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bot_category, pattern_description)
);

CREATE INDEX IF NOT EXISTS idx_bot_learnings_category ON bot_learnings(bot_category);
CREATE INDEX IF NOT EXISTS idx_bot_learnings_success_rate ON bot_learnings(success_rate DESC);
CREATE INDEX IF NOT EXISTS idx_bot_learnings_pattern_type ON bot_learnings(pattern_type);

-- ============================================================================
-- BOT METRICS TABLE
-- ============================================================================
-- Aggregated performance metrics for each bot category
CREATE TABLE bot_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_category TEXT NOT NULL UNIQUE,
  total_predictions INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  accuracy DECIMAL(5, 2) DEFAULT 0,
  total_pnl DECIMAL(12, 2) DEFAULT 0,
  avg_edge DECIMAL(5, 2) DEFAULT 0,
  avg_confidence DECIMAL(5, 2) DEFAULT 0,
  best_pattern TEXT,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_metrics_accuracy ON bot_metrics(accuracy DESC);
CREATE INDEX IF NOT EXISTS idx_bot_metrics_total_pnl ON bot_metrics(total_pnl DESC);

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bot_predictions_updated_at ON bot_predictions;
CREATE TRIGGER update_bot_predictions_updated_at
  BEFORE UPDATE ON bot_predictions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trade_history_updated_at ON trade_history;
CREATE TRIGGER update_trade_history_updated_at
  BEFORE UPDATE ON trade_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bot_learnings_updated_at ON bot_learnings;
CREATE TRIGGER update_bot_learnings_updated_at
  BEFORE UPDATE ON bot_learnings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- USEFUL VIEWS
-- ============================================================================

-- View: Bot Performance Summary
CREATE OR REPLACE VIEW bot_performance_summary AS
SELECT 
  bot_category,
  COUNT(*) as total_predictions,
  COUNT(*) FILTER (WHERE actual_outcome = 'win') as wins,
  COUNT(*) FILTER (WHERE actual_outcome = 'loss') as losses,
  ROUND(
    (COUNT(*) FILTER (WHERE actual_outcome = 'win')::DECIMAL / 
     NULLIF(COUNT(*) FILTER (WHERE actual_outcome IS NOT NULL), 0)) * 100, 
    2
  ) as win_rate,
  ROUND(AVG(confidence), 2) as avg_confidence,
  ROUND(AVG(edge), 2) as avg_edge,
  SUM(pnl) as total_pnl
FROM bot_predictions
WHERE actual_outcome IS NOT NULL
GROUP BY bot_category
ORDER BY win_rate DESC NULLS LAST;

-- View: Recent Learning Patterns
CREATE OR REPLACE VIEW recent_learning_patterns AS
SELECT 
  bot_category,
  pattern_type,
  pattern_description,
  confidence,
  times_observed,
  success_rate,
  last_seen
FROM bot_learnings
ORDER BY last_seen DESC NULLS LAST, success_rate DESC
LIMIT 50;

-- View: Trade Performance by Platform
CREATE OR REPLACE VIEW trade_performance_by_platform AS
SELECT 
  platform,
  COUNT(*) as total_trades,
  COUNT(*) FILTER (WHERE outcome = 'win') as wins,
  COUNT(*) FILTER (WHERE outcome = 'loss') as losses,
  ROUND(
    (COUNT(*) FILTER (WHERE outcome = 'win')::DECIMAL / 
     NULLIF(COUNT(*) FILTER (WHERE outcome IN ('win', 'loss')), 0)) * 100, 
    2
  ) as win_rate,
  SUM(pnl) as total_pnl,
  SUM(fees) as total_fees,
  ROUND(AVG(amount), 2) as avg_trade_size
FROM trade_history
WHERE outcome IN ('win', 'loss')
GROUP BY platform;

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================

-- Insert sample bot metrics for testing
INSERT INTO bot_metrics (bot_category, total_predictions, correct_predictions, accuracy, total_pnl, avg_edge, avg_confidence, last_updated)
VALUES 
  ('crypto', 0, 0, 0, 0, 0, 0, NOW()),
  ('politics', 0, 0, 0, 0, 0, 0, NOW()),
  ('sports', 0, 0, 0, 0, 0, 0, NOW()),
  ('entertainment', 0, 0, 0, 0, 0, 0, NOW()),
  ('economics', 0, 0, 0, 0, 0, 0, NOW())
ON CONFLICT (bot_category) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE bot_predictions IS 'All predictions made by category-specific bots';
COMMENT ON TABLE trade_history IS 'Complete history of all trades executed by the bot';
COMMENT ON TABLE bot_learnings IS 'Learned patterns and insights that improve bot decisions';
COMMENT ON TABLE bot_metrics IS 'Aggregated performance metrics per bot category';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if tables exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bot_predictions') THEN
    RAISE NOTICE '✅ bot_predictions table created';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'trade_history') THEN
    RAISE NOTICE '✅ trade_history table created';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bot_learnings') THEN
    RAISE NOTICE '✅ bot_learnings table created';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bot_metrics') THEN
    RAISE NOTICE '✅ bot_metrics table created';
  END IF;
END $$;

