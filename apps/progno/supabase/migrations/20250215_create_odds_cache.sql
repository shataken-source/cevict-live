-- Migration: Create odds_cache table for storing historical odds
-- This table stores odds from all sports to reduce API calls and build history

CREATE TABLE IF NOT EXISTS odds_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Game identification
  external_id VARCHAR(255) NOT NULL,
  sport VARCHAR(50) NOT NULL,
  sport_key VARCHAR(100) NOT NULL,
  
  -- Teams
  home_team VARCHAR(255) NOT NULL,
  away_team VARCHAR(255) NOT NULL,
  home_team_normalized VARCHAR(255),
  away_team_normalized VARCHAR(255),
  
  -- Game details
  commence_time TIMESTAMP WITH TIME ZONE NOT NULL,
  game_date DATE NOT NULL,
  venue VARCHAR(255),
  
  -- Odds data (stored as JSONB for flexibility across sports)
  odds_data JSONB NOT NULL DEFAULT '{}',
  
  -- Moneyline odds
  home_moneyline DECIMAL(10, 3),
  away_moneyline DECIMAL(10, 3),
  
  -- Spread
  home_spread DECIMAL(5, 2),
  away_spread DECIMAL(5, 2),
  spread_line DECIMAL(5, 2),
  
  -- Totals
  over_line DECIMAL(5, 2),
  under_line DECIMAL(5, 2),
  total_line DECIMAL(5, 2),
  
  -- Source tracking
  source VARCHAR(50) NOT NULL DEFAULT 'api-sports',
  bookmaker VARCHAR(100),
  
  -- Metadata
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(external_id, game_date, source)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_odds_cache_sport ON odds_cache(sport);
CREATE INDEX IF NOT EXISTS idx_odds_cache_game_date ON odds_cache(game_date);
CREATE INDEX IF NOT EXISTS idx_odds_cache_commence_time ON odds_cache(commence_time);
CREATE INDEX IF NOT EXISTS idx_odds_cache_external_id ON odds_cache(external_id);
CREATE INDEX IF NOT EXISTS idx_odds_cache_fetched_at ON odds_cache(fetched_at);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_odds_cache_sport_date ON odds_cache(sport, game_date);
CREATE INDEX IF NOT EXISTS idx_odds_cache_teams ON odds_cache(home_team, away_team);

-- Enable RLS (Row Level Security) - read-only for public
ALTER TABLE odds_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON odds_cache
  FOR SELECT USING (true);

-- Allow service role to insert/update
CREATE POLICY "Allow service role insert" ON odds_cache
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow service role update" ON odds_cache
  FOR UPDATE USING (true);

-- Comments for documentation
COMMENT ON TABLE odds_cache IS 'Cached odds data from various sportsbooks and APIs to reduce API calls and build historical database';
COMMENT ON COLUMN odds_cache.external_id IS 'Original ID from the odds provider (e.g., game ID from API-SPORTS or The-Odds-API)';
COMMENT ON COLUMN odds_cache.sport IS 'Normalized sport name (nhl, nba, nfl, mlb, ncaab, ncaaf, nascar, college-baseball)';
COMMENT ON COLUMN odds_cache.sport_key IS 'Full API key (e.g., icehockey_nhl, basketball_nba)';
COMMENT ON COLUMN odds_cache.odds_data IS 'Complete odds object as JSON for flexibility across different sports formats';
COMMENT ON COLUMN odds_cache.source IS 'Where these odds came from (api-sports, the-odds-api, draftkings, cfbd, etc.)';
