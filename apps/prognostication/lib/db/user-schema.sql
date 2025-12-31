-- =====================================================
-- USER MANAGEMENT & PERFORMANCE TRACKING SCHEMA
-- For Prognostication Platform
-- =====================================================

-- Users table with Stripe integration
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255) UNIQUE,
  
  -- Tier information
  tier VARCHAR(20) DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'elite')),
  tier_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Subscription info
  subscription_id VARCHAR(255),
  subscription_status VARCHAR(50),
  billing_cycle VARCHAR(20), -- 'weekly' or 'monthly'
  
  -- User preferences
  sms_enabled BOOLEAN DEFAULT FALSE,
  phone_number VARCHAR(20),
  email_notifications BOOLEAN DEFAULT TRUE,
  
  -- Account timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  
  -- For analytics
  referral_source VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_source VARCHAR(255)
);

-- User picks (which picks they received)
CREATE TABLE IF NOT EXISTS user_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pick_id VARCHAR(255) NOT NULL, -- Reference to the pick/game
  
  -- Pick details
  game_id VARCHAR(255) NOT NULL,
  sport VARCHAR(50) NOT NULL,
  pick_type VARCHAR(50) NOT NULL, -- 'moneyline', 'spread', 'total'
  pick_value VARCHAR(255) NOT NULL, -- Team name or 'over/under X'
  confidence_pct DECIMAL(5,2) NOT NULL,
  edge_pct DECIMAL(5,2),
  
  -- Result tracking
  result VARCHAR(20), -- 'win', 'loss', 'push', 'pending'
  actual_score_home INTEGER,
  actual_score_away INTEGER,
  settled_at TIMESTAMP WITH TIME ZONE,
  
  -- Bet tracking (if user provides)
  bet_amount DECIMAL(10,2),
  potential_payout DECIMAL(10,2),
  actual_payout DECIMAL(10,2),
  
  -- Tier at time of pick
  tier_at_pick VARCHAR(20) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User performance summary (pre-calculated for fast queries)
CREATE TABLE IF NOT EXISTS user_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Time period
  period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'all_time'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Performance metrics
  total_picks INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  pushes INTEGER DEFAULT 0,
  pending INTEGER DEFAULT 0,
  
  -- Win rate
  win_rate DECIMAL(5,2), -- As percentage
  
  -- Financial tracking
  total_wagered DECIMAL(12,2) DEFAULT 0,
  total_won DECIMAL(12,2) DEFAULT 0,
  total_lost DECIMAL(12,2) DEFAULT 0,
  net_profit DECIMAL(12,2) DEFAULT 0,
  roi DECIMAL(5,2), -- Return on investment %
  
  -- Streaks
  current_streak INTEGER DEFAULT 0, -- Positive = wins, negative = losses
  best_win_streak INTEGER DEFAULT 0,
  worst_loss_streak INTEGER DEFAULT 0,
  
  -- By sport breakdown (JSON)
  by_sport JSONB DEFAULT '{}',
  
  -- By confidence level breakdown (JSON)
  by_confidence JSONB DEFAULT '{}',
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, period_type, period_start)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);
CREATE INDEX IF NOT EXISTS idx_user_picks_user ON user_picks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_picks_game ON user_picks(game_id);
CREATE INDEX IF NOT EXISTS idx_user_picks_result ON user_picks(result);
CREATE INDEX IF NOT EXISTS idx_user_picks_created ON user_picks(created_at);
CREATE INDEX IF NOT EXISTS idx_user_performance_user ON user_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_user_performance_period ON user_performance(period_type, period_start);

-- Function to update user_performance after pick settlement
CREATE OR REPLACE FUNCTION update_user_performance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all-time performance
  INSERT INTO user_performance (
    user_id, period_type, period_start, period_end,
    total_picks, wins, losses, pushes
  )
  SELECT
    NEW.user_id,
    'all_time',
    '2020-01-01'::DATE,
    CURRENT_DATE,
    COUNT(*),
    SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END),
    SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END),
    SUM(CASE WHEN result = 'push' THEN 1 ELSE 0 END)
  FROM user_picks
  WHERE user_id = NEW.user_id AND result IS NOT NULL
  ON CONFLICT (user_id, period_type, period_start)
  DO UPDATE SET
    total_picks = EXCLUDED.total_picks,
    wins = EXCLUDED.wins,
    losses = EXCLUDED.losses,
    pushes = EXCLUDED.pushes,
    win_rate = CASE 
      WHEN EXCLUDED.wins + EXCLUDED.losses > 0 
      THEN ROUND((EXCLUDED.wins::DECIMAL / (EXCLUDED.wins + EXCLUDED.losses)) * 100, 2)
      ELSE 0 
    END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update performance on pick settlement
DROP TRIGGER IF EXISTS trigger_update_user_performance ON user_picks;
CREATE TRIGGER trigger_update_user_performance
AFTER UPDATE OF result ON user_picks
FOR EACH ROW
WHEN (NEW.result IS NOT NULL AND OLD.result IS NULL)
EXECUTE FUNCTION update_user_performance();

-- Session tokens for auth (optional, if not using Stripe-only auth)
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address VARCHAR(50),
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);

