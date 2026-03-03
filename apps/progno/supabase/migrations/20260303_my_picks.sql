-- Manual picks table: tracks user's own bets placed from the admin LIVE ODDS tab.
-- Graded by the same daily-results logic that grades Progno picks.

CREATE TABLE IF NOT EXISTS my_picks (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  game_date     date NOT NULL,
  sport         text NOT NULL,              -- e.g. 'basketball_nba', 'icehockey_nhl'
  league        text NOT NULL,              -- e.g. 'NBA', 'NHL'
  home_team     text NOT NULL,
  away_team     text NOT NULL,
  pick          text NOT NULL,              -- team name the user picked to win
  is_home_pick  boolean NOT NULL,
  odds          integer,                    -- moneyline odds at time of pick (e.g. -150, +120)
  commence_time timestamptz,                -- game start time
  notes         text,                       -- optional user notes
  -- result fields (filled in by grading)
  status        text NOT NULL DEFAULT 'pending',  -- 'pending', 'win', 'lose'
  actual_winner text,
  home_score    integer,
  away_score    integer,
  graded_at     timestamptz,
  -- metadata
  created_at    timestamptz DEFAULT now(),
  UNIQUE(game_date, home_team, away_team)
);

-- Index for fast lookups by date
CREATE INDEX IF NOT EXISTS idx_my_picks_game_date ON my_picks(game_date);
CREATE INDEX IF NOT EXISTS idx_my_picks_status ON my_picks(status);
