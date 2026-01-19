// SportsBlaze NFL data fetcher + light adapters into Progno's Game model.
// This keeps all SportsBlaze-specific wiring in one place so we can safely
// plug it into cron jobs and sims without touching the core engine.

import { Game } from "./weekly-analyzer";

export type SportsBlazeLeagueId = "nfl" | "nba" | "nhl" | "mlb";

const BASE_URLS: Record<SportsBlazeLeagueId, string> = {
  nfl: "https://api.sportsblaze.com/nfl/v1",
  nba: "https://api.sportsblaze.com/nba/v1",
  nhl: "https://api.sportsblaze.com/nhl/v1",
  mlb: "https://api.sportsblaze.com/mlb/v1"
};

const SPORT_LABELS: Record<SportsBlazeLeagueId, Game["sport"]> = {
  nfl: "NFL",
  nba: "NBA",
  nhl: "NHL",
  mlb: "MLB"
};

export interface SportsBlazeLeague {
  id: string;
  name: string;
  sport: string;
}

export interface SportsBlazeSeason {
  year: number;
  type: string;
  week?: number;
}

export interface SportsBlazeTeamRef {
  id: string;
  name: string;
  abbreviation?: string;
  location?: string;
  nickname?: string;
  division?: string;
  conference?: "AFC" | "NFC" | string;
}

export interface SportsBlazeScoreTotals {
  // Different leagues use different keys (points, goals, runs, etc.), so we
  // keep this loose and normalize when we map into Progno's Game model.
  away: Record<string, number>;
  home: Record<string, number>;
}

export interface SportsBlazeScores {
  periods?: Array<{
    number: number;
    type: string;
    away: { points: number };
    home: { points: number };
  }>;
  total?: SportsBlazeScoreTotals;
}

export interface SportsBlazeGame {
  season: SportsBlazeSeason;
  id: string;
  teams: {
    away: SportsBlazeTeamRef;
    home: SportsBlazeTeamRef;
  };
  date: string; // ISO
  status: string;
  venue?: {
    name?: string;
    location?: string;
  };
  scores?: SportsBlazeScores;
}

export interface SportsBlazeDailyScheduleResponse {
  league: SportsBlazeLeague;
  games: SportsBlazeGame[];
  updated: string;
}

export interface SportsBlazeSeasonScheduleResponse {
  league: SportsBlazeLeague;
  games: SportsBlazeGame[];
  updated: string;
}

export interface SportsBlazeBoxscoreResponse extends SportsBlazeGame {
  // Full boxscore extends the schedule game payload with stats + rosters.
  stats?: unknown;
  rosters?: unknown;
}

export interface SportsBlazeStandingsRecord {
  split: string;
  games: number;
  wins: number;
  losses: number;
  ties: number;
  pct: number;
}

export interface SportsBlazeStandingsTeam extends SportsBlazeTeamRef {
  logo?: string;
  standings?: Array<{ name: string; sequence: number }>;
  records?: SportsBlazeStandingsRecord[];
}

export interface SportsBlazeStandingsResponse {
  league: SportsBlazeLeague;
  season: { year: number; type: string };
  teams: SportsBlazeStandingsTeam[];
  updated: string;
}

type QueryParams = Record<string, string | number | undefined>;

function buildUrl(league: SportsBlazeLeagueId, path: string, params: QueryParams): string {
  const base = BASE_URLS[league];
  const url = new URL(`${base}${path}`);
  // key is always required for these helpers
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    url.searchParams.set(k, String(v));
  });
  return url.toString();
}

async function safeFetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`SportsBlaze request failed ${res.status} for ${url}`);
  }
  return (await res.json()) as T;
}

// ---- Raw SportsBlaze fetchers ----

export interface DailyScheduleFilters {
  type?: string;
  id?: string;
  team?: string;
  status?: string;
}

export async function fetchSportsBlazeDailySchedule(
  apiKey: string,
  date: string, // YYYY-MM-DD
  filters: DailyScheduleFilters = {},
  league: SportsBlazeLeagueId = "nfl"
): Promise<SportsBlazeDailyScheduleResponse> {
  if (!apiKey) {
    throw new Error("SportsBlaze API key is required");
  }
  const url = buildUrl(league, `/schedule/daily/${date}.json`, {
    key: apiKey,
    type: filters.type,
    id: filters.id,
    team: filters.team,
    status: filters.status
  });
  return safeFetchJson<SportsBlazeDailyScheduleResponse>(url);
}

export interface SeasonScheduleFilters {
  type?: string;
  id?: string;
  team?: string;
  status?: string;
}

export async function fetchSportsBlazeSeasonSchedule(
  apiKey: string,
  season: number | string,
  filters: SeasonScheduleFilters = {},
  league: SportsBlazeLeagueId = "nfl"
): Promise<SportsBlazeSeasonScheduleResponse> {
  if (!apiKey) {
    throw new Error("SportsBlaze API key is required");
  }
  const url = buildUrl(league, `/schedule/season/${season}.json`, {
    key: apiKey,
    type: filters.type,
    id: filters.id,
    team: filters.team,
    status: filters.status
  });
  return safeFetchJson<SportsBlazeSeasonScheduleResponse>(url);
}

export async function fetchSportsBlazeBoxscore(
  apiKey: string,
  gameId: string,
  league: SportsBlazeLeagueId = "nfl"
): Promise<SportsBlazeBoxscoreResponse> {
  if (!apiKey) {
    throw new Error("SportsBlaze API key is required");
  }
  if (!gameId) {
    throw new Error("SportsBlaze game id is required");
  }
  const url = buildUrl(league, `/boxscores/game/${gameId}.json`, { key: apiKey });
  return safeFetchJson<SportsBlazeBoxscoreResponse>(url);
}

export interface StandingsFilters {
  team?: string;
  division?: string;
  conference?: string;
}

export async function fetchSportsBlazeStandings(
  apiKey: string,
  season: number | string,
  filters: StandingsFilters = {},
  league: SportsBlazeLeagueId = "nfl"
): Promise<SportsBlazeStandingsResponse> {
  if (!apiKey) {
    throw new Error("SportsBlaze API key is required");
  }
  const url = buildUrl(league, `/standings/${season}.json`, {
    key: apiKey,
    team: filters.team,
    division: filters.division,
    conference: filters.conference
  });
  return safeFetchJson<SportsBlazeStandingsResponse>(url);
}

// ---- Adapters into Progno Game model ----

function parseDateOrNow(iso: string | undefined): Date {
  if (!iso) return new Date();
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function neutralOdds(league: SportsBlazeLeagueId): Game["odds"] {
  // When SportsBlaze doesn't include betting lines, fall back to a neutral
  // 50/50 line so the engine still runs (spread/total math still works).
  let total: number;
  switch (league) {
    case "nba":
      total = 224;
      break;
    case "mlb":
      total = 8.5;
      break;
    case "nhl":
      total = 6.0;
      break;
    case "nfl":
    default:
      total = 44;
      break;
  }
  return {
    home: -110,
    away: -110,
    spread: 0,
    total
  };
}

function extractScore(total?: SportsBlazeScoreTotals): { home?: number; away?: number } {
  if (!total) return {};
  const home = (total.home as any)?.points ?? (total.home as any)?.goals ?? (total.home as any)?.runs;
  const away = (total.away as any)?.points ?? (total.away as any)?.goals ?? (total.away as any)?.runs;
  return {
    home: typeof home === "number" ? home : undefined,
    away: typeof away === "number" ? away : undefined
  };
}

export function mapSportsBlazeGameToPrognoGame(
  game: SportsBlazeGame,
  league: SportsBlazeLeagueId = "nfl"
): Game {
  const homeName = game.teams.home?.name ?? "Home";
  const awayName = game.teams.away?.name ?? "Away";
  const venueName = game.venue?.name || "TBD";

  const total = game.scores?.total;
  const { home: homePoints, away: awayPoints } = extractScore(total);
  const isCompleted = game.status?.toLowerCase() === "final";

  const mapped: Game = {
    id: game.id,
    homeTeam: homeName,
    awayTeam: awayName,
    sport: SPORT_LABELS[league],
    date: parseDateOrNow(game.date),
    odds: neutralOdds(league),
    venue: venueName,
    gameStatus: isCompleted ? "post" : "scheduled",
    isCompleted,
    isInProgress: !isCompleted && game.status?.toLowerCase() !== "scheduled",
    lastUpdate: parseDateOrNow(game.date)
  };

  if (typeof homePoints === "number" && typeof awayPoints === "number") {
    mapped.liveScore = { home: homePoints, away: awayPoints };
  }

  return mapped;
}

export function mapSportsBlazeGamesToPrognoGames(
  games: SportsBlazeGame[],
  league: SportsBlazeLeagueId = "nfl"
): Game[] {
  return (games || []).map(g => mapSportsBlazeGameToPrognoGame(g, league));
}


