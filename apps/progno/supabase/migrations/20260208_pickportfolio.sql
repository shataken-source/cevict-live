-- PickPortfolio: Track Progno picks like a stock portfolio
-- Chart performance over time, compare strategies, social features

CREATE TABLE IF NOT EXISTS pick_portfolios (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Portfolio',
  description TEXT,
  
  -- Stats
  starting_bankroll DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
  current_bankroll DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
  total_profit_loss DECIMAL(10,2) NOT NULL DEFAULT 0,
  roi DECIMAL(6,4), -- total_profit_loss / starting_bankroll
  
  -- Record
  total_picks INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  pushes INTEGER NOT NULL DEFAULT 0,
  pending INTEGER NOT NULL DEFAULT 0,
  win_rate DECIMAL(5,4),
  
  -- Performance metrics
  sharpe_ratio DECIMAL(6,4),
  max_drawdown DECIMAL(6,4),
  current_drawdown DECIMAL(6,4),
  longest_win_streak INTEGER DEFAULT 0,
  longest_loss_streak INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  current_streak_type TEXT CHECK (current_streak_type IN ('win', 'loss', 'none')),
  
  -- Visibility
  is_public BOOLEAN DEFAULT FALSE,
  allow_followers BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio_picks (
  id BIGSERIAL PRIMARY KEY,
  portfolio_id BIGINT NOT NULL REFERENCES pick_portfolios(id) ON DELETE CASCADE,
  
  -- Pick details
  game_id TEXT NOT NULL,
  league TEXT NOT NULL, -- NBA, NFL, NHL, etc.
  game_date DATE NOT NULL,
  team TEXT NOT NULL,
  pick_type TEXT NOT NULL, -- 'spread', 'moneyline', 'over', 'under', 'parlay'
  
  -- Odds & probability
  odds DECIMAL(10,2) NOT NULL,
  predicted_prob DECIMAL(5,4), -- Our model's prediction
  market_prob DECIMAL(5,4),    -- Market implied
  edge DECIMAL(5,4),           -- predicted - market
  confidence_score DECIMAL(5,4),
  
  -- Bet details
  stake DECIMAL(10,2) NOT NULL,
  potential_payout DECIMAL(10,2),
  strategy TEXT, -- 'kelly', 'flat', 'custom'
  
  -- Result
  outcome TEXT CHECK (outcome IN ('win', 'loss', 'push', 'pending')),
  actual_payout DECIMAL(10,2),
  profit_loss DECIMAL(10,2),
  
  -- Timestamps
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  tags TEXT[],
  progno_prediction_id TEXT, -- Link to Progno prediction JSON
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio_daily_snapshot (
  id BIGSERIAL PRIMARY KEY,
  portfolio_id BIGINT NOT NULL REFERENCES pick_portfolios(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  
  -- Daily stats
  bankroll DECIMAL(10,2) NOT NULL,
  daily_profit_loss DECIMAL(10,2),
  cumulative_profit_loss DECIMAL(10,2),
  roi DECIMAL(6,4),
  
  picks_placed INTEGER DEFAULT 0,
  picks_settled INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  
  win_rate DECIMAL(5,4),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(portfolio_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS portfolio_followers (
  id BIGSERIAL PRIMARY KEY,
  portfolio_id BIGINT NOT NULL REFERENCES pick_portfolios(id) ON DELETE CASCADE,
  follower_user_id UUID NOT NULL,
  
  -- Notification preferences
  notify_on_new_pick BOOLEAN DEFAULT TRUE,
  notify_on_win BOOLEAN DEFAULT FALSE,
  notify_on_milestone BOOLEAN DEFAULT TRUE,
  
  followed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(portfolio_id, follower_user_id)
);

CREATE TABLE IF NOT EXISTS portfolio_comments (
  id BIGSERIAL PRIMARY KEY,
  portfolio_id BIGINT NOT NULL REFERENCES pick_portfolios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portfolios_user ON pick_portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_public ON pick_portfolios(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_portfolios_roi ON pick_portfolios(roi DESC) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_picks_portfolio ON portfolio_picks(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_picks_outcome ON portfolio_picks(outcome);
CREATE INDEX IF NOT EXISTS idx_picks_placed ON portfolio_picks(placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_portfolio_date ON portfolio_daily_snapshot(portfolio_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_followers_portfolio ON portfolio_followers(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_followers_user ON portfolio_followers(follower_user_id);

-- RLS
ALTER TABLE pick_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_daily_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_comments ENABLE ROW LEVEL SECURITY;

-- Policies: Users can see their own portfolios + public ones
CREATE POLICY "Users see own portfolios"
  ON pick_portfolios FOR SELECT
  USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY "Users manage own portfolios"
  ON pick_portfolios FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users see picks from visible portfolios"
  ON portfolio_picks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pick_portfolios
      WHERE pick_portfolios.id = portfolio_picks.portfolio_id
      AND (pick_portfolios.user_id = auth.uid() OR pick_portfolios.is_public = TRUE)
    )
  );

CREATE POLICY "Users manage own picks"
  ON portfolio_picks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pick_portfolios
      WHERE pick_portfolios.id = portfolio_picks.portfolio_id
      AND pick_portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users see snapshots from visible portfolios"
  ON portfolio_daily_snapshot FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pick_portfolios
      WHERE pick_portfolios.id = portfolio_daily_snapshot.portfolio_id
      AND (pick_portfolios.user_id = auth.uid() OR pick_portfolios.is_public = TRUE)
    )
  );

CREATE POLICY "Anyone can follow public portfolios"
  ON portfolio_followers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pick_portfolios
      WHERE pick_portfolios.id = portfolio_id
      AND pick_portfolios.is_public = TRUE
      AND pick_portfolios.allow_followers = TRUE
    )
  );

CREATE POLICY "Users manage own follows"
  ON portfolio_followers FOR ALL
  USING (auth.uid() = follower_user_id);

-- Function to update portfolio stats
CREATE OR REPLACE FUNCTION update_portfolio_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_portfolio RECORD;
  v_total_invested DECIMAL(10,2);
  v_total_returned DECIMAL(10,2);
BEGIN
  -- Only run when pick is settled
  IF NEW.outcome IS NOT NULL AND (OLD.outcome IS NULL OR OLD.outcome = 'pending') THEN
    -- Get current portfolio
    SELECT * INTO v_portfolio FROM pick_portfolios WHERE id = NEW.portfolio_id;
    
    -- Update portfolio stats
    UPDATE pick_portfolios SET
      total_picks = COALESCE(total_picks, 0) + 1,
      wins = wins + CASE WHEN NEW.outcome = 'win' THEN 1 ELSE 0 END,
      losses = losses + CASE WHEN NEW.outcome = 'loss' THEN 1 ELSE 0 END,
      pushes = pushes + CASE WHEN NEW.outcome = 'push' THEN 1 ELSE 0 END,
      pending = GREATEST(0, pending - 1),
      total_profit_loss = COALESCE(total_profit_loss, 0) + NEW.profit_loss,
      current_bankroll = current_bankroll + NEW.profit_loss,
      win_rate = (wins + CASE WHEN NEW.outcome = 'win' THEN 1 ELSE 0 END)::DECIMAL / 
                 NULLIF(wins + losses + CASE WHEN NEW.outcome IN ('win', 'loss') THEN 1 ELSE 0 END, 0),
      roi = (COALESCE(total_profit_loss, 0) + NEW.profit_loss) / NULLIF(starting_bankroll, 0),
      updated_at = NOW()
    WHERE id = NEW.portfolio_id;
  END IF;
  
  -- Update pending count when pick is placed
  IF TG_OP = 'INSERT' AND NEW.outcome = 'pending' THEN
    UPDATE pick_portfolios SET
      pending = COALESCE(pending, 0) + 1,
      updated_at = NOW()
    WHERE id = NEW.portfolio_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_portfolio_stats ON portfolio_picks;
CREATE TRIGGER trigger_update_portfolio_stats
  AFTER INSERT OR UPDATE ON portfolio_picks
  FOR EACH ROW
  EXECUTE FUNCTION update_portfolio_stats();

-- Function to create daily snapshot
CREATE OR REPLACE FUNCTION create_daily_snapshot(p_portfolio_id BIGINT)
RETURNS VOID AS $$
DECLARE
  v_portfolio RECORD;
  v_yesterday_snapshot RECORD;
BEGIN
  SELECT * INTO v_portfolio FROM pick_portfolios WHERE id = p_portfolio_id;
  
  SELECT * INTO v_yesterday_snapshot 
  FROM portfolio_daily_snapshot 
  WHERE portfolio_id = p_portfolio_id 
  ORDER BY snapshot_date DESC 
  LIMIT 1;
  
  INSERT INTO portfolio_daily_snapshot (
    portfolio_id, snapshot_date, bankroll, 
    cumulative_profit_loss, roi, win_rate,
    daily_profit_loss
  )
  VALUES (
    p_portfolio_id,
    CURRENT_DATE,
    v_portfolio.current_bankroll,
    v_portfolio.total_profit_loss,
    v_portfolio.roi,
    v_portfolio.win_rate,
    v_portfolio.total_profit_loss - COALESCE(v_yesterday_snapshot.cumulative_profit_loss, 0)
  )
  ON CONFLICT (portfolio_id, snapshot_date) DO UPDATE SET
    bankroll = EXCLUDED.bankroll,
    cumulative_profit_loss = EXCLUDED.cumulative_profit_loss,
    roi = EXCLUDED.roi,
    win_rate = EXCLUDED.win_rate,
    daily_profit_loss = EXCLUDED.daily_profit_loss;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE pick_portfolios IS 'Track Progno picks like a stock portfolio. Chart performance, compare strategies, share with community.';
COMMENT ON TABLE portfolio_picks IS 'Individual picks within a portfolio. Links to Progno predictions.';
COMMENT ON TABLE portfolio_daily_snapshot IS 'Daily performance snapshots for charting profit curves.';
COMMENT ON TABLE portfolio_followers IS 'Social: follow successful bettors.';
