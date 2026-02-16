// Types for odds cache database table

export interface OddsCacheRecord {
  id: string;
  external_id: string;
  sport: string;
  sport_key: string;
  home_team: string;
  away_team: string;
  home_team_normalized?: string;
  away_team_normalized?: string;
  commence_time: string;
  game_date: string;
  venue?: string;
  odds_data: Record<string, any>;
  home_moneyline?: number;
  away_moneyline?: number;
  home_spread?: number;
  away_spread?: number;
  spread_line?: number;
  over_line?: number;
  under_line?: number;
  total_line?: number;
  source: string;
  bookmaker?: string;
  fetched_at: string;
  updated_at: string;
}

export interface OddsData {
  moneyline: {
    home: number | null;
    away: number | null;
  };
  spread: {
    home: number | null;
    away: number | null;
    line?: number | null;
  };
  total: {
    line: number | null;
    over?: number | null;
    under?: number | null;
  };
}

export interface GameOdds {
  id: string;
  external_id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamNormalized?: string;
  awayTeamNormalized?: string;
  startTime: string;
  gameDate: string;
  venue?: string;
  odds: OddsData;
  source: string;
  bookmaker?: string;
  fetchedAt: string;
}

export interface OddsSyncResult {
  sport: string;
  date: string;
  gamesInserted: number;
  gamesUpdated: number;
  errors: string[];
  duration: number;
}

export interface OddsSyncStatus {
  lastSync: string;
  syncs: OddsSyncResult[];
  totalGames: number;
}

// Sports list for sync
export const SYNC_SPORTS = [
  { alias: 'nhl', key: 'icehockey_nhl', name: 'NHL' },
  { alias: 'nba', key: 'basketball_nba', name: 'NBA' },
  { alias: 'nfl', key: 'americanfootball_nfl', name: 'NFL' },
  { alias: 'mlb', key: 'baseball_mlb', name: 'MLB' },
  { alias: 'ncaab', key: 'basketball_ncaab', name: 'NCAAB' },
  { alias: 'ncaaf', key: 'americanfootball_ncaaf', name: 'NCAAF' },
  { alias: 'cbb', key: 'baseball_ncaa', name: 'College Baseball' },
] as const;

export type SyncSport = typeof SYNC_SPORTS[number]['alias'];
