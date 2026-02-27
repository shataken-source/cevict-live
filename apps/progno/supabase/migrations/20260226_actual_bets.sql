-- actual_bets: tracks real money bets placed through the admin UI
-- separate from prediction picks — these are YOUR actual submitted bets

CREATE TABLE IF NOT EXISTS actual_bets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Pick info (from Progno predictions)
  pick TEXT NOT NULL,                    -- e.g. "Boston Celtics"
  home_team TEXT,
  away_team TEXT,
  sport TEXT,                            -- e.g. "NBA", "NHL"
  league TEXT,
  confidence INTEGER,                    -- Progno confidence %
  game_date DATE NOT NULL,               -- date of the game

  -- Kalshi order info
  ticker TEXT,                           -- Kalshi market ticker
  market_title TEXT,                     -- Kalshi market title
  side TEXT CHECK (side IN ('yes', 'no')),
  price_cents INTEGER,                   -- price per contract in cents
  contracts INTEGER,                     -- number of contracts
  stake_cents INTEGER,                   -- total cost in cents (price * contracts)
  order_id TEXT,                         -- Kalshi order ID returned

  -- Status tracking
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'filled', 'won', 'lost', 'cancelled', 'error')),
  result TEXT,                           -- 'win', 'loss', or NULL if pending
  payout_cents INTEGER,                  -- payout in cents if won (contracts * 100)
  profit_cents INTEGER,                  -- profit = payout - stake (can be negative)
  settled_at TIMESTAMPTZ,               -- when the bet was settled

  -- Metadata
  source TEXT DEFAULT 'admin_ui',        -- where the bet was placed from
  notes TEXT,
  dry_run BOOLEAN DEFAULT false
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_actual_bets_game_date ON actual_bets(game_date);
CREATE INDEX IF NOT EXISTS idx_actual_bets_status ON actual_bets(status);
CREATE INDEX IF NOT EXISTS idx_actual_bets_sport ON actual_bets(sport);
CREATE INDEX IF NOT EXISTS idx_actual_bets_created ON actual_bets(created_at DESC);
