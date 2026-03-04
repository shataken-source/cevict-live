-- Elo ratings table for NFL/NCAAF signal module
-- Persists ratings across Vercel cold starts
CREATE TABLE IF NOT EXISTS elo_ratings (
  team TEXT NOT NULL,
  sport TEXT NOT NULL DEFAULT 'americanfootball_nfl',
  elo REAL NOT NULL DEFAULT 1500,
  games_played INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team, sport)
);

-- Index for fast bulk load
CREATE INDEX IF NOT EXISTS idx_elo_ratings_sport ON elo_ratings (sport);
