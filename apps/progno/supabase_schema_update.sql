-- Create table for storing historical odds to fix PGRST205 errors
CREATE TABLE IF NOT EXISTS historical_odds (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  game_id TEXT NOT NULL,
  sport TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  commence_time TIMESTAMPTZ NOT NULL,
  bookmaker TEXT NOT NULL,
  market_type TEXT NOT NULL,
  home_odds INTEGER,
  away_odds INTEGER,
  home_spread NUMERIC(5,2),
  away_spread NUMERIC(5,2),
  total_line NUMERIC(5,1),
  over_odds INTEGER,
  under_odds INTEGER,
  captured_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, bookmaker, market_type, captured_at)
);

CREATE INDEX IF NOT EXISTS idx_historical_odds_game ON historical_odds(game_id);
CREATE INDEX IF NOT EXISTS idx_historical_odds_sport ON historical_odds(sport);
CREATE INDEX IF NOT EXISTS idx_historical_odds_captured ON historical_odds(captured_at);

-- Create table for syndicated picks (webhook storage)
CREATE TABLE IF NOT EXISTS syndicated_picks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  batch_id TEXT NOT NULL,
  tier TEXT NOT NULL,
  pick_index INTEGER,
  game_id TEXT,
  sport TEXT,
  home_team TEXT,
  away_team TEXT,
  pick_selection TEXT,
  confidence NUMERIC(5,2),
  odds INTEGER,
  expected_value NUMERIC(10,2),
  edge NUMERIC(5,2),
  analysis TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_syndicated_picks_batch ON syndicated_picks(batch_id);

-- Create table for syndication audit log
CREATE TABLE IF NOT EXISTS syndication_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  batch_id TEXT NOT NULL UNIQUE,
  tier TEXT,
  pick_count INTEGER,
  success BOOLEAN,
  errors TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
