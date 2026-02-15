-- Backtesting Tables for PROGNO
-- Run this in Supabase SQL Editor

-- Table 1: game_outcomes - Stores actual game results for backtesting
CREATE TABLE IF NOT EXISTS game_outcomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT NOT NULL,
  sport TEXT NOT NULL,
  sport_key TEXT,
  home_team TEXT,
  away_team TEXT,
  game_date DATE NOT NULL,
  commence_time TIMESTAMPTZ,
  
  -- Actual scores
  home_score INTEGER,
  away_score INTEGER,
  
  -- Winner (home, away, or push for spreads)
  winner TEXT,
  
  -- Total points (for over/under grading)
  total_points INTEGER,
  
  -- Result status
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  
  -- Source of the outcome data
  source TEXT DEFAULT 'the-odds-api',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(external_id, sport, game_date)
);

-- Index for quick lookups
CREATE INDEX idx_game_outcomes_sport_date ON game_outcomes(sport, game_date);
CREATE INDEX idx_game_outcomes_external_id ON game_outcomes(external_id);
CREATE INDEX idx_game_outcomes_completed ON game_outcomes(completed);

-- Enable RLS (adjust policies as needed)
ALTER TABLE game_outcomes ENABLE ROW LEVEL SECURITY;

-- Table 2: odds_line_movement - Tracks odds changes over time
CREATE TABLE IF NOT EXISTS odds_line_movement (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT NOT NULL,
  sport TEXT NOT NULL,
  game_date DATE NOT NULL,
  
  -- Odds snapshot data
  home_moneyline INTEGER,
  away_moneyline INTEGER,
  home_spread NUMERIC,
  away_spread NUMERIC,
  spread_line NUMERIC,
  over_line NUMERIC,
  under_line NUMERIC,
  total_line NUMERIC,
  
  -- Full odds JSON for reference
  odds_data JSONB,
  
  -- Timing information
  snapshot_type TEXT NOT NULL, -- 'opening', 'morning', 'afternoon', 'closing', 'custom'
  hours_before_game NUMERIC, -- Hours before game start
  snapshot_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Bookmaker info
  bookmaker TEXT,
  market_count INTEGER,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Index for deduplication
  UNIQUE(external_id, sport, game_date, snapshot_type, bookmaker)
);

-- Indexes for line movement queries
CREATE INDEX idx_line_movement_sport_date ON odds_line_movement(sport, game_date);
CREATE INDEX idx_line_movement_external_id ON odds_line_movement(external_id);
CREATE INDEX idx_line_movement_snapshot ON odds_line_movement(snapshot_type);
CREATE INDEX idx_line_movement_time ON odds_line_movement(snapshot_at);

-- Enable RLS
ALTER TABLE odds_line_movement ENABLE ROW LEVEL SECURITY;

-- Table 3: prediction_factors - Enhanced tracking of what influenced each prediction
CREATE TABLE IF NOT EXISTS prediction_factors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prediction_id UUID NOT NULL REFERENCES progno_predictions(id) ON DELETE CASCADE,
  
  -- Model/Algorithm info
  model_version TEXT,
  algorithm_name TEXT,
  
  -- Feature weights/factors used (JSON for flexibility)
  factors JSONB, -- e.g., {"weather_impact": 0.15, "home_field": 0.20, "momentum": 0.10}
  
  -- Key data points that influenced prediction
  key_metrics JSONB, -- e.g., {"recent_form_home": "5-2", "rest_days": 2, "weather": "clear"}
  
  -- External data sources used
  data_sources JSONB, -- e.g., ["api-sports", "the-odds-api", "weather-api"]
  
  -- Odds at time of prediction
  odds_snapshot_id UUID REFERENCES odds_line_movement(id),
  
  -- Confidence breakdown
  confidence_breakdown JSONB, -- e.g., {"base": 65, "weather_adj": 5, "home_field": 4}
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_prediction_factors_prediction_id ON prediction_factors(prediction_id);
CREATE INDEX idx_prediction_factors_model ON prediction_factors(model_version, algorithm_name);

-- Enable RLS
ALTER TABLE prediction_factors ENABLE ROW LEVEL SECURITY;

-- Table 4: graded_predictions - Enhanced with all grading data
-- Note: This extends existing progno_predictions, adding outcome relation

-- First, alter existing progno_predictions if needed
ALTER TABLE progno_predictions ADD COLUMN IF NOT EXISTS game_outcome_id UUID REFERENCES game_outcomes(id);
ALTER TABLE progno_predictions ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;
ALTER TABLE progno_predictions ADD COLUMN IF NOT EXISTS result TEXT; -- 'win', 'loss', 'push'
ALTER TABLE progno_predictions ADD COLUMN IF NOT EXISTS profit NUMERIC; -- Actual profit/loss
ALTER TABLE progno_predictions ADD COLUMN IF NOT EXISTS odds_at_prediction NUMERIC; -- What odds we got

-- Add indexes for backtesting queries
CREATE INDEX IF NOT EXISTS idx_progno_predictions_result ON progno_predictions(result);
CREATE INDEX IF NOT EXISTS idx_progno_predictions_graded ON progno_predictions(graded_at);
CREATE INDEX IF NOT EXISTS idx_progno_predictions_confidence ON progno_predictions(confidence);

-- Create view for easy backtesting queries
CREATE OR REPLACE VIEW backtest_ready_predictions AS
SELECT 
  p.id,
  p.prediction_type,
  p.category as sport,
  p.question,
  p.prediction_data,
  p.confidence,
  p.edge_pct,
  p.result,
  p.profit,
  p.odds_at_prediction,
  p.created_at,
  p.graded_at,
  go.home_score,
  go.away_score,
  go.winner as actual_winner,
  go.total_points,
  go.completed,
  pf.factors,
  pf.model_version,
  pf.algorithm_name
FROM progno_predictions p
LEFT JOIN game_outcomes go ON p.game_outcome_id = go.id
LEFT JOIN prediction_factors pf ON p.id = pf.prediction_id
WHERE p.result IS NOT NULL;

-- Create function to grade a prediction
CREATE OR REPLACE FUNCTION grade_prediction(
  prediction_id UUID,
  actual_outcome TEXT, -- 'win', 'loss', 'push'
  actual_profit NUMERIC,
  game_outcome_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE progno_predictions
  SET 
    result = actual_outcome,
    profit = actual_profit,
    graded_at = NOW(),
    game_outcome_id = game_outcome_id,
    updated_at = NOW()
  WHERE id = prediction_id;
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate win rate for backtesting
CREATE OR REPLACE FUNCTION calculate_win_rate(
  sport_filter TEXT DEFAULT NULL,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  min_confidence INTEGER DEFAULT 0,
  model_version_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_predictions BIGINT,
  wins BIGINT,
  losses BIGINT,
  pushes BIGINT,
  win_rate NUMERIC,
  total_profit NUMERIC,
  avg_confidence NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_predictions,
    COUNT(*) FILTER (WHERE p.result = 'win')::BIGINT as wins,
    COUNT(*) FILTER (WHERE p.result = 'loss')::BIGINT as losses,
    COUNT(*) FILTER (WHERE p.result = 'push')::BIGINT as pushes,
    ROUND(
      (COUNT(*) FILTER (WHERE p.result = 'win')::NUMERIC / 
       NULLIF(COUNT(*) FILTER (WHERE p.result IN ('win', 'loss')), 0)) * 100, 
      2
    ) as win_rate,
    ROUND(SUM(p.profit), 2) as total_profit,
    ROUND(AVG(p.confidence), 2) as avg_confidence
  FROM progno_predictions p
  LEFT JOIN prediction_factors pf ON p.id = pf.prediction_id
  WHERE 
    p.result IS NOT NULL
    AND (sport_filter IS NULL OR p.category = sport_filter)
    AND (start_date IS NULL OR p.created_at::DATE >= start_date)
    AND (end_date IS NULL OR p.created_at::DATE <= end_date)
    AND p.confidence >= min_confidence
    AND (model_version_filter IS NULL OR pf.model_version = model_version_filter);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed for your setup)
GRANT ALL ON game_outcomes TO authenticated;
GRANT ALL ON odds_line_movement TO authenticated;
GRANT ALL ON prediction_factors TO authenticated;
GRANT ALL ON backtest_ready_predictions TO authenticated;

COMMENT ON TABLE game_outcomes IS 'Stores actual game results for backtesting predictions';
COMMENT ON TABLE odds_line_movement IS 'Tracks odds line movement throughout the day for timing analysis';
COMMENT ON TABLE prediction_factors IS 'Stores detailed factors/features used for each prediction';
COMMENT ON VIEW backtest_ready_predictions IS 'Combined view of predictions with outcomes and factors for backtesting';
