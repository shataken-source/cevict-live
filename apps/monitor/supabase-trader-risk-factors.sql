-- Create trader_risk_factors table with ALL logic parameters
-- This stores the actual sophisticated logic parameters, not just basic thresholds

CREATE TABLE IF NOT EXISTS public.trader_risk_factors (
  trader TEXT PRIMARY KEY,
  
  -- Basic thresholds
  min_confidence NUMERIC NOT NULL DEFAULT 65,
  min_edge NUMERIC NOT NULL DEFAULT 2,
  max_trade_size NUMERIC,
  max_bet_size NUMERIC,
  max_positions INTEGER,
  
  -- Advanced logic parameters (Microcap)
  rsi_extreme_oversold NUMERIC, -- RSI < this = +2.5 edge, +12% conf
  rsi_oversold NUMERIC, -- RSI < this = +1.5 edge, +8% conf
  rsi_overbought NUMERIC, -- RSI > this = -1.0 edge, +6% conf
  rsi_neutral_min NUMERIC, -- RSI > this && < neutral_max = -5% conf
  rsi_neutral_max NUMERIC,
  
  trend_strength_strong NUMERIC, -- Trend > this = +1.5 edge, +8% conf
  trend_strength_moderate NUMERIC, -- Trend > this = +5% conf
  trend_strength_weak NUMERIC, -- Trend < this = -5% conf
  
  edge_blend_calculated NUMERIC, -- Weight for calculated edge (0-1)
  edge_blend_ai NUMERIC, -- Weight for AI edge (0-1)
  
  edge_boost_strong NUMERIC, -- Edge >= this = +5% conf
  edge_boost_weak NUMERIC, -- Edge < this = -5% conf
  
  volume_low NUMERIC, -- Volume < this = -12% conf
  volume_high NUMERIC, -- Volume > this = +3% conf
  
  -- AI Brain confidence caps
  confidence_cap NUMERIC,
  edge_calibration_high NUMERIC, -- Edge > this = +5% conf
  edge_calibration_low NUMERIC, -- Edge < this = -5% conf
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_trader_risk_factors_trader ON public.trader_risk_factors(trader);

-- Insert default values with actual logic parameters
INSERT INTO public.trader_risk_factors (
  trader, min_confidence, min_edge, max_trade_size, max_bet_size, max_positions,
  rsi_extreme_oversold, rsi_oversold, rsi_overbought, rsi_neutral_min, rsi_neutral_max,
  trend_strength_strong, trend_strength_moderate, trend_strength_weak,
  edge_blend_calculated, edge_blend_ai, edge_boost_strong, edge_boost_weak,
  volume_low, volume_high, confidence_cap, edge_calibration_high, edge_calibration_low
)
VALUES
  ('crypto-main', 60, 1, 10, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 75, NULL, NULL),
  ('microcap', 65, 2, 10, NULL, 3, 25, 30, 75, 50, 55, 80, 70, 30, 0.4, 0.6, 4, 1, 10000, 50000, 80, NULL, NULL),
  ('kalshi-politics', 70, 2, NULL, 10, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 75, 10, 5),
  ('kalshi-sports', 65, 1.5, NULL, 15, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 80, 10, 5),
  ('kalshi-economics', 68, 1.5, NULL, 12, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 75, 10, 5),
  ('kalshi-weather', 70, 2, NULL, 10, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 70, 10, 5),
  ('kalshi-entertainment', 65, 1.5, NULL, 12, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 85, 10, 5)
ON CONFLICT (trader) DO NOTHING;

-- Add comment
COMMENT ON TABLE public.trader_risk_factors IS 'Stores sophisticated logic parameters for each trading specialist. Includes RSI thresholds, edge blending weights, confidence adjustments, and AI Brain calibration parameters.';
