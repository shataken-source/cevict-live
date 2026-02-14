-- Alpha Hunter: Kalshi Learning Loop
-- Tracks every trade outcome to build calibration data per market category
-- After 100+ trades per category, replaces synthetic edge with learned calibration

-- Main learning table
CREATE TABLE IF NOT EXISTS kalshi_learning_data (
  id BIGSERIAL PRIMARY KEY,
  trade_id TEXT UNIQUE NOT NULL,
  market_ticker TEXT NOT NULL,
  market_title TEXT NOT NULL,
  market_category TEXT NOT NULL, -- 'sports', 'crypto', 'politics', 'weather', etc.
  
  -- Prediction data
  predicted_probability DECIMAL(5,4) NOT NULL, -- Our model's prediction (0-1)
  market_probability DECIMAL(5,4) NOT NULL,    -- Market implied probability at trade time
  edge DECIMAL(5,4) NOT NULL,                   -- predicted - market
  confidence_score DECIMAL(5,4),                 -- Model confidence (0-1)
  
  -- Trade details
  position TEXT NOT NULL CHECK (position IN ('YES', 'NO')),
  entry_price DECIMAL(10,2) NOT NULL,
  contracts INTEGER NOT NULL,
  investment DECIMAL(10,2) NOT NULL,
  
  -- Outcome
  actual_outcome BOOLEAN, -- NULL if not settled yet, TRUE/FALSE when settled
  profit_loss DECIMAL(10,2), -- NULL until settled
  roi DECIMAL(6,4), -- profit_loss / investment
  
  -- Timestamps
  trade_opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  market_close_time TIMESTAMPTZ NOT NULL,
  settled_at TIMESTAMPTZ,
  
  -- Metadata
  model_version TEXT,
  notes JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Calibration per category
CREATE TABLE IF NOT EXISTS kalshi_calibration (
  id BIGSERIAL PRIMARY KEY,
  category TEXT NOT NULL UNIQUE,
  
  -- Calibration stats
  total_trades INTEGER NOT NULL DEFAULT 0,
  settled_trades INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  win_rate DECIMAL(5,4),
  
  -- Probability buckets (for calibration curve)
  bucket_50_60_predicted DECIMAL(5,4), -- Avg predicted prob in 50-60% bucket
  bucket_50_60_actual DECIMAL(5,4),    -- Actual win rate in that bucket
  bucket_50_60_count INTEGER,
  
  bucket_60_70_predicted DECIMAL(5,4),
  bucket_60_70_actual DECIMAL(5,4),
  bucket_60_70_count INTEGER,
  
  bucket_70_80_predicted DECIMAL(5,4),
  bucket_70_80_actual DECIMAL(5,4),
  bucket_70_80_count INTEGER,
  
  bucket_80_90_predicted DECIMAL(5,4),
  bucket_80_90_actual DECIMAL(5,4),
  bucket_80_90_count INTEGER,
  
  bucket_90_100_predicted DECIMAL(5,4),
  bucket_90_100_actual DECIMAL(5,4),
  bucket_90_100_count INTEGER,
  
  -- Performance metrics
  total_profit_loss DECIMAL(12,2),
  total_roi DECIMAL(6,4),
  sharpe_ratio DECIMAL(6,4),
  max_drawdown DECIMAL(6,4),
  
  -- Edge analysis
  avg_edge DECIMAL(5,4),
  edge_accuracy DECIMAL(5,4), -- How often our edge prediction was correct direction
  
  -- Status
  is_calibrated BOOLEAN DEFAULT FALSE, -- TRUE when we have 100+ settled trades
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance over time
CREATE TABLE IF NOT EXISTS kalshi_performance_log (
  id BIGSERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  
  -- Daily stats
  trades_opened INTEGER DEFAULT 0,
  trades_settled INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  
  daily_profit_loss DECIMAL(10,2),
  daily_roi DECIMAL(6,4),
  
  -- Running totals
  cumulative_profit_loss DECIMAL(12,2),
  cumulative_roi DECIMAL(6,4),
  current_win_rate DECIMAL(5,4),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(category, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kalshi_learning_category ON kalshi_learning_data(market_category);
CREATE INDEX IF NOT EXISTS idx_kalshi_learning_settled ON kalshi_learning_data(actual_outcome) WHERE actual_outcome IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kalshi_learning_opened ON kalshi_learning_data(trade_opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_kalshi_learning_ticker ON kalshi_learning_data(market_ticker);
CREATE INDEX IF NOT EXISTS idx_kalshi_perf_category_date ON kalshi_performance_log(category, date DESC);

-- RLS (basic - Alpha Hunter can enable auth later)
ALTER TABLE kalshi_learning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE kalshi_calibration ENABLE ROW LEVEL SECURITY;
ALTER TABLE kalshi_performance_log ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for bot automation)
CREATE POLICY "Service role full access on learning_data"
  ON kalshi_learning_data FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on calibration"
  ON kalshi_calibration FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on performance_log"
  ON kalshi_performance_log FOR ALL
  USING (auth.role() = 'service_role');

-- Function to update calibration after each settled trade
CREATE OR REPLACE FUNCTION update_kalshi_calibration()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when trade is settled
  IF NEW.actual_outcome IS NOT NULL AND OLD.actual_outcome IS NULL THEN
    -- Insert or update calibration for this category
    INSERT INTO kalshi_calibration (category, total_trades, settled_trades, wins, losses)
    VALUES (NEW.market_category, 1, 1, 
      CASE WHEN NEW.actual_outcome THEN 1 ELSE 0 END,
      CASE WHEN NEW.actual_outcome THEN 0 ELSE 1 END
    )
    ON CONFLICT (category) DO UPDATE SET
      settled_trades = kalshi_calibration.settled_trades + 1,
      wins = kalshi_calibration.wins + CASE WHEN NEW.actual_outcome THEN 1 ELSE 0 END,
      losses = kalshi_calibration.losses + CASE WHEN NEW.actual_outcome THEN 0 ELSE 1 END,
      win_rate = (kalshi_calibration.wins + CASE WHEN NEW.actual_outcome THEN 1 ELSE 0 END)::DECIMAL / 
                 (kalshi_calibration.settled_trades + 1),
      total_profit_loss = COALESCE(kalshi_calibration.total_profit_loss, 0) + NEW.profit_loss,
      total_roi = (COALESCE(kalshi_calibration.total_profit_loss, 0) + NEW.profit_loss) / 
                  NULLIF((SELECT SUM(investment) FROM kalshi_learning_data WHERE market_category = NEW.market_category), 0),
      is_calibrated = (kalshi_calibration.settled_trades + 1) >= 100,
      last_updated = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_update_calibration ON kalshi_learning_data;
CREATE TRIGGER trigger_update_calibration
  AFTER UPDATE ON kalshi_learning_data
  FOR EACH ROW
  EXECUTE FUNCTION update_kalshi_calibration();

-- Function to get calibration adjustment for a category
CREATE OR REPLACE FUNCTION get_kalshi_calibration_adjustment(
  p_category TEXT,
  p_predicted_prob DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  v_adjustment DECIMAL := 0;
  v_calibration_rec RECORD;
BEGIN
  -- Get calibration data for category
  SELECT * INTO v_calibration_rec
  FROM kalshi_calibration
  WHERE category = p_category AND is_calibrated = TRUE;
  
  IF NOT FOUND THEN
    RETURN 0; -- No adjustment if not calibrated yet
  END IF;
  
  -- Apply adjustment based on probability bucket
  IF p_predicted_prob >= 0.9 THEN
    v_adjustment := COALESCE(v_calibration_rec.bucket_90_100_actual - v_calibration_rec.bucket_90_100_predicted, 0);
  ELSIF p_predicted_prob >= 0.8 THEN
    v_adjustment := COALESCE(v_calibration_rec.bucket_80_90_actual - v_calibration_rec.bucket_80_90_predicted, 0);
  ELSIF p_predicted_prob >= 0.7 THEN
    v_adjustment := COALESCE(v_calibration_rec.bucket_70_80_actual - v_calibration_rec.bucket_70_80_predicted, 0);
  ELSIF p_predicted_prob >= 0.6 THEN
    v_adjustment := COALESCE(v_calibration_rec.bucket_60_70_actual - v_calibration_rec.bucket_60_70_predicted, 0);
  ELSIF p_predicted_prob >= 0.5 THEN
    v_adjustment := COALESCE(v_calibration_rec.bucket_50_60_actual - v_calibration_rec.bucket_50_60_predicted, 0);
  END IF;
  
  RETURN v_adjustment;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE kalshi_learning_data IS 'Tracks every Kalshi trade for learning/calibration. After 100+ trades per category, we replace synthetic edge with learned calibration.';
COMMENT ON TABLE kalshi_calibration IS 'Per-category calibration data. Shows how accurate our predictions are vs reality.';
COMMENT ON FUNCTION get_kalshi_calibration_adjustment IS 'Returns calibration adjustment to add to predicted probability based on historical performance in that bucket.';
