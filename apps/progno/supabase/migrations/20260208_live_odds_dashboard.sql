-- Live Odds Dashboard: Real-time line movement tracking
-- Alerts on line freezes, RLM (Reverse Line Movement), sharp money detection

CREATE TABLE IF NOT EXISTS odds_snapshots (
  id BIGSERIAL PRIMARY KEY,
  game_id TEXT NOT NULL,
  league TEXT NOT NULL,
  game_date DATE NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  
  -- Odds at this snapshot
  home_spread DECIMAL(4,1),
  home_spread_odds INTEGER,
  away_spread DECIMAL(4,1),
  away_spread_odds INTEGER,
  home_ml INTEGER,
  away_ml INTEGER,
  total DECIMAL(4,1),
  over_odds INTEGER,
  under_odds INTEGER,
  
  -- Betting percentages (public)
  home_spread_pct DECIMAL(5,2),
  away_spread_pct DECIMAL(5,2),
  home_ml_pct DECIMAL(5,2),
  away_ml_pct DECIMAL(5,2),
  over_pct DECIMAL(5,2),
  under_pct DECIMAL(5,2),
  
  -- Money percentages (if available - indicates sharp action)
  home_spread_money_pct DECIMAL(5,2),
  away_spread_money_pct DECIMAL(5,2),
  
  -- Source
  sportsbook TEXT NOT NULL, -- 'consensus', 'pinnacle', 'bovada', etc.
  
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS line_movements (
  id BIGSERIAL PRIMARY KEY,
  game_id TEXT NOT NULL,
  league TEXT NOT NULL,
  
  -- What moved
  movement_type TEXT NOT NULL CHECK (movement_type IN ('spread', 'total', 'moneyline')),
  
  -- From → To
  old_value DECIMAL(10,2) NOT NULL,
  new_value DECIMAL(10,2) NOT NULL,
  change DECIMAL(10,2) NOT NULL, -- new - old
  
  -- Direction
  direction TEXT NOT NULL CHECK (direction IN ('up', 'down', 'unchanged')),
  
  -- Magnitude
  magnitude TEXT CHECK (magnitude IN ('small', 'medium', 'large', 'huge')),
  -- small: 0.5pt, medium: 1pt, large: 1.5-2pt, huge: 2.5pt+
  
  -- Context
  time_to_game_hours DECIMAL(6,2),
  public_bet_pct DECIMAL(5,2), -- What % of public is on the side that moved
  
  -- Detection flags
  is_reverse_line_movement BOOLEAN DEFAULT FALSE, -- Line moved AGAINST public
  is_line_freeze BOOLEAN DEFAULT FALSE, -- Public hammering, line didn't move
  is_sharp_indicator BOOLEAN DEFAULT FALSE, -- Money % >> bet %
  
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sharp_money_alerts (
  id BIGSERIAL PRIMARY KEY,
  game_id TEXT NOT NULL,
  league TEXT NOT NULL,
  game_date DATE NOT NULL,
  teams TEXT NOT NULL,
  
  -- Alert type
  alert_type TEXT NOT NULL CHECK (alert_type IN ('RLM', 'line_freeze', 'steam_move', 'sharp_split')),
  
  -- Details
  bet_type TEXT NOT NULL, -- 'spread', 'total', 'moneyline'
  sharp_side TEXT NOT NULL, -- 'home', 'away', 'over', 'under'
  
  -- Evidence
  line_movement DECIMAL(10,2),
  public_pct DECIMAL(5,2),
  money_pct DECIMAL(5,2),
  movement_description TEXT,
  
  -- Confidence
  confidence_score DECIMAL(4,2), -- 0-100
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sent', 'expired')),
  
  -- Notifications
  sms_sent_to TEXT[], -- Array of phone numbers that received SMS
  sms_sent_at TIMESTAMPTZ,
  
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Game time
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS premium_alert_subscribers (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  phone_number TEXT NOT NULL,
  
  -- Preferences
  alert_types TEXT[] DEFAULT ARRAY['RLM', 'line_freeze', 'steam_move'],
  leagues TEXT[] DEFAULT ARRAY['NFL', 'NBA', 'NHL', 'MLB'],
  min_confidence INTEGER DEFAULT 70,
  max_alerts_per_day INTEGER DEFAULT 10,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  subscription_tier TEXT DEFAULT 'premium' CHECK (subscription_tier IN ('basic', 'premium', 'elite')),
  
  -- Usage
  alerts_sent_today INTEGER DEFAULT 0,
  last_alert_sent_at TIMESTAMPTZ,
  total_alerts_received INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_odds_snapshots_game ON odds_snapshots(game_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_odds_snapshots_date ON odds_snapshots(game_date DESC);
CREATE INDEX IF NOT EXISTS idx_line_movements_game ON line_movements(game_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_line_movements_rlm ON line_movements(is_reverse_line_movement) WHERE is_reverse_line_movement = TRUE;
CREATE INDEX IF NOT EXISTS idx_line_movements_freeze ON line_movements(is_line_freeze) WHERE is_line_freeze = TRUE;
CREATE INDEX IF NOT EXISTS idx_sharp_alerts_active ON sharp_money_alerts(status, detected_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_sharp_alerts_game_date ON sharp_money_alerts(game_date DESC, confidence_score DESC);

-- RLS
ALTER TABLE odds_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sharp_money_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_alert_subscribers ENABLE ROW LEVEL SECURITY;

-- Public read for odds data (it's public info anyway)
CREATE POLICY "Anyone can read odds snapshots"
  ON odds_snapshots FOR SELECT
  USING (TRUE);

CREATE POLICY "Anyone can read line movements"
  ON line_movements FOR SELECT
  USING (TRUE);

CREATE POLICY "Anyone can read active alerts"
  ON sharp_money_alerts FOR SELECT
  USING (status = 'active');

CREATE POLICY "Users manage own subscriptions"
  ON premium_alert_subscribers FOR ALL
  USING (auth.uid() = user_id);

-- Service role can write (for cron jobs)
CREATE POLICY "Service role full access on snapshots"
  ON odds_snapshots FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on movements"
  ON line_movements FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on alerts"
  ON sharp_money_alerts FOR ALL
  USING (auth.role() = 'service_role');

-- Function to detect RLM
CREATE OR REPLACE FUNCTION detect_reverse_line_movement(
  p_game_id TEXT,
  p_old_line DECIMAL,
  p_new_line DECIMAL,
  p_public_pct DECIMAL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- RLM: Line moved AGAINST the public
  -- Example: 70% on Favorites, line moves FROM -7 to -6.5 (helping underdogs)
  
  IF p_public_pct > 60 THEN
    -- Public on favorites
    IF p_new_line > p_old_line THEN
      -- Line got worse for favorites = RLM
      RETURN TRUE;
    END IF;
  ELSIF p_public_pct < 40 THEN
    -- Public on underdogs
    IF p_new_line < p_old_line THEN
      -- Line got worse for underdogs = RLM
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to detect line freeze
CREATE OR REPLACE FUNCTION detect_line_freeze(
  p_game_id TEXT,
  p_hours_since_open INTEGER,
  p_public_pct DECIMAL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Line freeze: Public heavily on one side (65%+), but line hasn't moved
  -- Check if we have multiple snapshots with same line despite high public %
  
  IF p_public_pct >= 65 OR p_public_pct <= 35 THEN
    -- Check if line hasn't moved in last 4 hours despite lopsided action
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate confidence score
CREATE OR REPLACE FUNCTION calculate_sharp_confidence(
  p_line_movement DECIMAL,
  p_public_pct DECIMAL,
  p_money_pct DECIMAL,
  p_time_to_game_hours DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  v_score DECIMAL := 50; -- Base score
BEGIN
  -- Bigger line movement = more confidence
  v_score := v_score + (ABS(p_line_movement) * 10);
  
  -- RLM adds confidence
  IF (p_public_pct > 60 AND p_line_movement < 0) OR (p_public_pct < 40 AND p_line_movement > 0) THEN
    v_score := v_score + 20;
  END IF;
  
  -- Money % split from bet % adds confidence (sharp action)
  IF p_money_pct IS NOT NULL THEN
    v_score := v_score + ABS(p_money_pct - p_public_pct);
  END IF;
  
  -- Closer to game time = more reliable
  IF p_time_to_game_hours < 24 THEN
    v_score := v_score + 10;
  END IF;
  
  -- Cap at 100
  RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE odds_snapshots IS 'Periodic snapshots of odds for line movement tracking. Updated every 15-30 minutes.';
COMMENT ON TABLE line_movements IS 'Detected line movements with RLM/freeze analysis.';
COMMENT ON TABLE sharp_money_alerts IS 'High-confidence sharp money alerts. Premium users get SMS.';
COMMENT ON TABLE premium_alert_subscribers IS 'Users who opted in for SMS alerts on sharp money detection.';
