/**
 * External Sports Results APIs — Previous Day's Game Results
 * Integrates providers for NFL, NBA, NHL, MLB, NCAAB, NCAAF. Used for grading picks and backtesting.
 *
 * When keys are set, each provider is tried in order; results are merged and deduplicated.
 * ESPN (free, no key, near real-time) is tried first; then Rolling Insights, JsonOdds,
 * TheSportsDB, Score24, BALLDONTLIE. Existing: The Odds API (daily-results cron), API-Sports (fallback).
 */

import type { GameResult } from './historical-results';

const PROGNO_LEAGUES = ['NFL', 'NBA', 'NHL', 'MLB', 'NCAAB', 'NCAAF', 'NASCAR'] as const;
type SportKey = (typeof PROGNO_LEAGUES)[number];

/** Extra query params needed per league for ESPN scoreboard */
const LEAGUE_TO_ESPN_PARAMS: Record<string, string> = {
  NCAAB: 'groups=50',  // groups=50 = all D1 conferences; without this only ~2 games returned
  NCAAF: 'groups=80',  // groups=80 = all FBS conferences
};

/** Map league to provider sport/league identifiers where needed */
const LEAGUE_TO_JSONODDS: Record<string, string> = {
  NFL: 'NFL',
  NBA: 'NBA',
  NHL: 'NHL',
  MLB: 'MLB',
  NCAAF: 'NCAAF',
  NCAAB: 'NCAAB',
  NASCAR: 'NASCAR',
};

/** ESPN scoreboard API path per league (no key, near real-time). */
const LEAGUE_TO_ESPN_PATH: Record<string, string> = {
  NFL: 'football/nfl',
  NBA: 'basketball/nba',
  NHL: 'hockey/nhl',
  MLB: 'baseball/mlb',
  NCAAF: 'football/college-football',
  NCAAB: 'basketball/mens-college-basketball',
  NASCAR: 'racing/nascar',
};

/** Normalize for dedup: "Team Name" -> lowercase alphanumeric */
function norm(name: string): string {
  return (name ?? '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function toPrognoResult(
  sport: string,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  date: string,
  id?: string
): GameResult {
  const winner = homeScore > awayScore ? homeTeam : awayScore > homeScore ? awayTeam : 'TIE';
  return {
    id: id ?? `${sport}-${norm(homeTeam)}-${norm(awayTeam)}-${date}`,
    sport,
    homeTeam,
    awayTeam,
    date,
    homeScore,
    awayScore,
    winner,
  };
}

/** Rolling Insights — post-game data, NFL/NBA/NHL/MLB/NCAAF/NCAAB. $50/mo. Docs: rollinginsights.com */
async function fetchRollingInsights(
  sportKey: SportKey,
  date: string
): Promise<GameResult[]> {
  const key = process.env.ROLLING_INSIGHTS_API_KEY;
  if (!key) return [];

  try {
    // Typical pattern: /scores or /results?date= &league=
    const base = process.env.ROLLING_INSIGHTS_BASE_URL ?? 'https://api.rollinginsights.com';
    const url = `${base}/v1/scores?date=${date}&league=${sportKey}`;
    const res = await fetch(url, {
      headers: { 'X-API-Key': key, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    const games = Array.isArray(data?.games) ? data.games : Array.isArray(data) ? data : [];
    return games
      .filter(
        (g: any) =>
          g.home_team != null &&
          g.away_team != null &&
          typeof (g.home_score ?? g.homeScore) === 'number' &&
          typeof (g.away_score ?? g.awayScore) === 'number'
      )
      .map((g: any) =>
        toPrognoResult(
          sportKey,
          g.home_team ?? g.homeTeam,
          g.away_team ?? g.awayTeam,
          Number(g.home_score ?? g.homeScore),
          Number(g.away_score ?? g.awayScore),
          date,
          g.id ?? g.game_id
        )
      );
  } catch {
    return [];
  }
}

/** JsonOdds — results + odds, NFL/NCAAF/NCAAB/NBA/MLB/NHL. $29.99/mo. Docs: jsonodds.com */
async function fetchJsonOdds(sportKey: SportKey, date: string): Promise<GameResult[]> {
  const key = process.env.JSONODDS_API_KEY;
  if (!key) return [];

  const league = LEAGUE_TO_JSONODDS[sportKey];
  if (!league) return [];

  try {
    const base = process.env.JSONODDS_BASE_URL ?? 'https://api.jsonodds.com';
    const url = `${base}/api/results?date=${date}&league=${league}`;
    const res = await fetch(url, {
      headers: { 'x-api-key': key, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    const games = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
    return games
      .filter(
        (g: any) =>
          g.HomeTeam != null &&
          g.AwayTeam != null &&
          (g.HomeScore != null || g.HomeScore === 0) &&
          (g.AwayScore != null || g.AwayScore === 0)
      )
      .map((g: any) =>
        toPrognoResult(
          sportKey,
          g.HomeTeam ?? g.home_team,
          g.AwayTeam ?? g.away_team,
          Number(g.HomeScore ?? g.home_score ?? 0),
          Number(g.AwayScore ?? g.away_score ?? 0),
          date,
          g.EventID ?? g.id
        )
      );
  } catch {
    return [];
  }
}

/** TheSportsDB — free, schedules/scores/metadata. No key required. */
async function fetchTheSportsDB(sportKey: SportKey, date: string): Promise<GameResult[]> {
  try {
    // Free tier: events by date; league name varies (e.g. NBA, NFL)
    const base = 'https://www.thesportsdb.com/api/v1/json';
    const key = process.env.THESPORTSDB_API_KEY ?? '1'; // free tier can use '1'
    const url = `${base}/${key}/eventsday.php?d=${date}&l=${sportKey}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    const events = Array.isArray(data?.events) ? data.events : [];
    return events
      .filter(
        (e: any) =>
          e.strHomeTeam &&
          e.strAwayTeam &&
          (e.intHomeScore != null || e.intAwayScore != null)
      )
      .map((e: any) =>
        toPrognoResult(
          sportKey,
          e.strHomeTeam,
          e.strAwayTeam,
          Number(e.intHomeScore ?? 0),
          Number(e.intAwayScore ?? 0),
          date,
          e.idEvent
        )
      );
  } catch {
    return [];
  }
}

/** Score24 — free tier, fixtures/results/standings. 60+ sports, 5000+ leagues. */
async function fetchScore24(sportKey: SportKey, date: string): Promise<GameResult[]> {
  const key = process.env.SCORE24_API_KEY;
  if (!key) return [];

  try {
    const base = process.env.SCORE24_BASE_URL ?? 'https://api.score24.com';
    const url = `${base}/v1/results?date=${date}&sport=${sportKey}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    const games = Array.isArray(data?.data) ? data.data : Array.isArray(data?.results) ? data.results : [];
    return games
      .filter(
        (g: any) =>
          (g.home_team ?? g.homeTeam) != null &&
          (g.away_team ?? g.awayTeam) != null &&
          typeof (g.home_score ?? g.homeScore ?? g.home) === 'number' &&
          typeof (g.away_score ?? g.awayScore ?? g.away) === 'number'
      )
      .map((g: any) =>
        toPrognoResult(
          sportKey,
          g.home_team ?? g.homeTeam ?? g.home,
          g.away_team ?? g.awayTeam ?? g.away,
          Number(g.home_score ?? g.homeScore ?? g.home ?? 0),
          Number(g.away_score ?? g.awayScore ?? g.away ?? 0),
          date,
          g.id ?? g.event_id
        )
      );
  } catch {
    return [];
  }
}

/** BALLDONTLIE — free, NBA only. No API key. 60 req/min. */
async function fetchBallDontLie(sportKey: SportKey, date: string): Promise<GameResult[]> {
  if (sportKey !== 'NBA') return [];

  try {
    const url = `https://api.balldontlie.io/v1/games?dates[]=${date}`;
    const key = process.env.BALLDONTLIE_API_KEY;
    const res = await fetch(url, {
      headers: key ? { Authorization: key, Accept: 'application/json' } : { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    const games = Array.isArray(data?.data) ? data.data : [];
    return games
      .filter(
        (g: any) =>
          g.home_team?.full_name != null &&
          g.visitor_team?.full_name != null &&
          g.home_team_score != null &&
          g.visitor_team_score != null
      )
      .map((g: any) =>
        toPrognoResult(
          'NBA',
          g.home_team.full_name,
          g.visitor_team.full_name,
          Number(g.home_team_score),
          Number(g.visitor_team_score),
          date,
          String(g.id)
        )
      );
  } catch {
    return [];
  }
}

/** ESPN scoreboard — free, no key. Near real-time. NFL, NBA, NHL, MLB, NCAAB, NCAAF. */
async function fetchESPN(sportKey: SportKey, date: string): Promise<GameResult[]> {
  const path = LEAGUE_TO_ESPN_PATH[sportKey];
  if (!path) return [];

  try {
    const datesParam = date.replace(/-/g, '');
    const extraParams = LEAGUE_TO_ESPN_PARAMS[sportKey] ? `&${LEAGUE_TO_ESPN_PARAMS[sportKey]}` : '';
    const url = `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard?dates=${datesParam}&limit=300${extraParams}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    const events = Array.isArray(data?.events) ? data.events : [];
    const results: GameResult[] = [];
    for (const ev of events) {
      const completed = ev?.status?.type?.completed === true || ev?.status?.state === 'post';
      if (!completed) continue;
      const comp = ev?.competitions?.[0];
      const competitors = Array.isArray(comp?.competitors) ? comp.competitors : [];
      const home = competitors.find((c: any) => c.homeAway === 'home');
      const away = competitors.find((c: any) => c.homeAway === 'away');
      if (!home?.team?.displayName || !away?.team?.displayName) continue;
      const homeScore = Number(home.score);
      const awayScore = Number(away.score);
      if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) continue;
      // Use displayName as primary; also store shortDisplayName as alternate for matching
      const homeName = home.team.displayName;
      const awayName = away.team.displayName;
      results.push(
        toPrognoResult(
          sportKey,
          homeName,
          awayName,
          homeScore,
          awayScore,
          date,
          ev.id
        )
      );
    }
    return results;
  } catch {
    return [];
  }
}

/** Deduplicate by (sport, norm(home), norm(away), date); keep first. */
function dedupeResults(results: GameResult[]): GameResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = `${r.sport}|${norm(r.homeTeam)}|${norm(r.awayTeam)}|${r.date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Fetch previous day's (or given date's) game results from all configured providers.
 * Tries: ESPN (free) → Rolling Insights → JsonOdds → TheSportsDB → Score24 → BALLDONTLIE (NBA only).
 * Merges and deduplicates. Use when Odds API / API-Sports are missing data.
 */
export async function fetchPreviousDayResultsFromProviders(
  sportKey: SportKey,
  date: string
): Promise<GameResult[]> {
  const all: GameResult[] = [];
  const providers: Array<() => Promise<GameResult[]>> = [
    () => fetchESPN(sportKey, date),
    () => fetchRollingInsights(sportKey, date),
    () => fetchJsonOdds(sportKey, date),
    () => fetchTheSportsDB(sportKey, date),
    () => fetchScore24(sportKey, date),
    () => fetchBallDontLie(sportKey, date),
  ];

  for (const fn of providers) {
    try {
      const list = await fn();
      if (list.length > 0) {
        all.push(...list);
        // Optional: stop after first successful provider to save rate limits
        // break;
      }
    } catch {
      // continue to next provider
    }
  }

  return dedupeResults(all);
}

/**
 * Fetch results for all Progno leagues (NFL, NBA, NHL, MLB, NCAAB, NCAAF) for a given date.
 */
export async function fetchAllLeaguesResultsForDate(date: string): Promise<Record<string, GameResult[]>> {
  const out: Record<string, GameResult[]> = {};
  await Promise.all(
    PROGNO_LEAGUES.map(async (league) => {
      out[league] = await fetchPreviousDayResultsFromProviders(league, date);
    })
  );
  return out;
}

export { PROGNO_LEAGUES, LEAGUE_TO_JSONODDS };
