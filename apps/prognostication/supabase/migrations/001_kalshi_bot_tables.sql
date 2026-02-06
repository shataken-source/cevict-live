-- Kalshi / Alpha-Hunter tables for Prognostication + Progno
-- Run in Supabase SQL Editor (or via migration) on the same project used by prognostication and alpha-hunter.
--
-- NOTE: If bot_predictions already exists with an older schema (e.g. no predicted_at),
-- CREATE TABLE IF NOT EXISTS does nothing, so indexes on new columns would fail.
-- This script therefore (1) creates the table for new DBs, (2) adds any missing
-- columns on existing bot_predictions, then (3) creates indexes.

-- =============================================================================
-- 1. bot_predictions — Kalshi (and other) predictions; feeds /api/kalshi/picks
-- =============================================================================
CREATE TABLE IF NOT EXISTS bot_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL DEFAULT 'kalshi',
  market_id TEXT NOT NULL,
  market_title TEXT,
  bot_category TEXT,
  prediction TEXT NOT NULL,
  probability NUMERIC(5,2),
  confidence NUMERIC(5,2),
  edge NUMERIC(10,4),
  reasoning JSONB,
  factors JSONB,
  learned_from JSONB,
  market_price NUMERIC(5,2),
  predicted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  actual_outcome TEXT,
  pnl NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- If table already existed with older schema, add missing columns (no-op if they exist)
ALTER TABLE bot_predictions
  ADD COLUMN IF NOT EXISTS predicted_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS prediction text,
  ADD COLUMN IF NOT EXISTS probability numeric(5,2),
  ADD COLUMN IF NOT EXISTS reasoning jsonb,
  ADD COLUMN IF NOT EXISTS factors jsonb,
  ADD COLUMN IF NOT EXISTS learned_from jsonb,
  ADD COLUMN IF NOT EXISTS market_price numeric(5,2),
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS actual_outcome text,
  ADD COLUMN IF NOT EXISTS pnl numeric(12,2);

CREATE INDEX IF NOT EXISTS idx_bot_predictions_platform ON bot_predictions(platform);
CREATE INDEX IF NOT EXISTS idx_bot_predictions_market_id ON bot_predictions(market_id);
CREATE INDEX IF NOT EXISTS idx_bot_predictions_predicted_at ON bot_predictions(predicted_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_predictions_actual_outcome ON bot_predictions(actual_outcome) WHERE actual_outcome IS NULL;
CREATE INDEX IF NOT EXISTS idx_bot_predictions_bot_category ON bot_predictions(bot_category);

-- =============================================================================
-- 2. trade_history — Executed trades; feeds homepage /api/trades/kalshi + /api/stats/live
-- =============================================================================
CREATE TABLE IF NOT EXISTS trade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL DEFAULT 'kalshi',  -- 'kalshi' | 'coinbase'
  trade_type TEXT NOT NULL,  -- 'yes' | 'no' (Kalshi)
  symbol TEXT,
  market_id TEXT,
  entry_price NUMERIC(12,4),  -- cents for Kalshi
  exit_price NUMERIC(12,4),
  amount NUMERIC(12,4) NOT NULL DEFAULT 0,  -- dollars
  contracts NUMERIC(12,4),
  pnl NUMERIC(12,4),
  fees NUMERIC(12,4) DEFAULT 0,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  bot_category TEXT,
  confidence NUMERIC(5,2),
  edge NUMERIC(10,4),
  outcome TEXT  -- 'open' | 'win' | 'loss'
);

CREATE INDEX IF NOT EXISTS idx_trade_history_platform ON trade_history(platform);
CREATE INDEX IF NOT EXISTS idx_trade_history_opened_at ON trade_history(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_history_outcome ON trade_history(outcome);

-- =============================================================================
-- 3. bot_metrics — Aggregated performance per category; used by admin & stats
-- =============================================================================
CREATE TABLE IF NOT EXISTS bot_metrics (
  bot_category TEXT PRIMARY KEY,
  total_predictions INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  accuracy NUMERIC(8,2) DEFAULT 0,
  total_pnl NUMERIC(12,4) DEFAULT 0,
  avg_edge NUMERIC(10,4) DEFAULT 0,
  avg_confidence NUMERIC(5,2) DEFAULT 0,
  best_pattern TEXT,
  last_updated TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 4. bot_learnings — Learned patterns; used by admin bot-status
-- =============================================================================
CREATE TABLE IF NOT EXISTS bot_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_category TEXT NOT NULL,
  pattern_type TEXT,
  pattern_description TEXT,
  confidence NUMERIC(5,2),
  times_observed INTEGER DEFAULT 1,
  success_rate NUMERIC(5,4),
  learned_at TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_bot_learnings_bot_category ON bot_learnings(bot_category);
CREATE INDEX IF NOT EXISTS idx_bot_learnings_success_rate ON bot_learnings(success_rate DESC);

-- Optional: RLS (enable if you want row-level security; adjust policies per app)
-- ALTER TABLE bot_predictions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE trade_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bot_metrics ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bot_learnings ENABLE ROW LEVEL SECURITY;
