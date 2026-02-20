/**
 * ESPN Team Stats Service
 * Fetches last N games of scoring data from ESPN's hidden API (no key required)
 * Used to calibrate Monte Carlo stdDev with real per-game variance
 *
 * Supports: NBA, NCAAB (mens-college-basketball)
 */

export interface TeamGame {
  date: string;           // YYYY-MM-DD
  opponent: string;
  pointsScored: number;
  pointsAllowed: number;
  isHome: boolean;
  won: boolean;
  margin: number;         // positive = win, negative = loss
}

export interface TeamCalibrationStats {
  teamName: string;
  espnId: string;
  league: 'nba' | 'ncaab';
  gamesAnalyzed: number;
  avgPointsScored: number;
  avgPointsAllowed: number;
  scoringStdDev: number;       // Use this to replace MC engine's fixed stdDev
  defenseStdDev: number;
  homeAvgScored: number;
  awayAvgScored: number;
  homeAvgAllowed: number;
  awayAvgAllowed: number;
  recentForm: number;          // Win % last N games (0-1)
  games: TeamGame[];
}

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball';

const LEAGUE_MAP: Record<string, string> = {
  nba: 'nba',
  ncaab: 'mens-college-basketball',
  NBA: 'nba',
  NCAAB: 'mens-college-basketball',
};

// Cache to avoid hammering ESPN on every pick
const statsCache = new Map<string, { data: TeamCalibrationStats; ts: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Sync-readable derived stats cache keyed by "league:teamName" for pick-engine path
// Populated by warmStatsCache() before runPickEngine is called
export const derivedStatsCache = new Map<string, {
  recentAvgPoints: number;
  recentAvgAllowed: number;
  scoringStdDev: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
}>();

// Secondary cache keyed by "homeOdds:awayOdds:spread:total" for when team names aren't passed
// pick-engine.ts calls estimateTeamStatsFromOdds(oddsObj, sport) without team names
export const oddsKeyedCache = new Map<string, {
  home: { recentAvgPoints: number; recentAvgAllowed: number; scoringStdDev: number; wins: number; losses: number; pointsFor: number; pointsAgainst: number };
  away: { recentAvgPoints: number; recentAvgAllowed: number; scoringStdDev: number; wins: number; losses: number; pointsFor: number; pointsAgainst: number };
}>();

export function makeOddsKey(odds: { home: number; away: number; spread?: number; total?: number }): string {
  return `${odds.home}:${odds.away}:${odds.spread ?? 0}:${odds.total ?? 0}`;
}

// Module-level context: set by route.ts before each runPickEngine call
// Allows estimateTeamStatsFromOdds to resolve team names without arg changes
let _currentGame: { homeTeam: string; awayTeam: string; league: 'nba' | 'ncaab' } | null = null;

export function setCurrentGameContext(homeTeam: string, awayTeam: string, league: 'nba' | 'ncaab') {
  _currentGame = { homeTeam, awayTeam, league };
}

export function clearCurrentGameContext() {
  _currentGame = null;
}

export function getCurrentGameContext() {
  return _currentGame;
}

/**
 * Synchronously read cached derived stats for a team by name.
 * Returns null if not yet warmed — pick-engine falls back to market-derived.
 */
export function syncGetCachedStats(teamName: string, league: 'nba' | 'ncaab') {
  return derivedStatsCache.get(`${league}:${teamName}`) ?? null;
}

/**
 * Synchronously read cached stats by odds key (used when team names not available).
 */
export function syncGetCachedStatsByOdds(oddsKey: string) {
  return oddsKeyedCache.get(oddsKey) ?? null;
}

/**
 * Pre-warm the ESPN stats cache for a list of games before runPickEngine is called.
 * Call this once per request in route.ts, then runPickEngine will find data synchronously.
 */
export async function warmStatsCache(
  games: Array<{ home_team: string; away_team: string; bookmakers?: any[] }>,
  league: 'nba' | 'ncaab'
): Promise<void> {
  await Promise.allSettled(
    games.map(async (game) => {
      const homeId = resolveEspnId(game.home_team, league);
      const awayId = resolveEspnId(game.away_team, league);
      if (!homeId || !awayId) return;

      const [homeStats, awayStats] = await Promise.all([
        fetchTeamCalibrationStats(homeId, league, 15),
        fetchTeamCalibrationStats(awayId, league, 15),
      ]);
      if (!homeStats || !awayStats) return;

      // Derive market spread/total from bookmakers if available
      let mktSpread = 0;
      let mktTotal = league === 'nba' ? 224 : 144;
      if (game.bookmakers?.length) {
        const book = game.bookmakers[0];
        const spreads = book.markets?.find((m: any) => m.key === 'spreads');
        const totals = book.markets?.find((m: any) => m.key === 'totals');
        const sHome = spreads?.outcomes?.find((o: any) => o.name === game.home_team);
        const tOver = totals?.outcomes?.find((o: any) => o.name === 'Over');
        if (sHome?.point != null) mktSpread = sHome.point;
        if (tOver?.point != null) mktTotal = tOver.point;
      }

      const marketHomeExp = (mktTotal - mktSpread) / 2;
      const marketAwayExp = (mktTotal + mktSpread) / 2;

      const homeEntry = {
        recentAvgPoints: (homeStats.homeAvgScored + marketHomeExp) / 2,
        recentAvgAllowed: (homeStats.homeAvgAllowed + marketAwayExp) / 2,
        scoringStdDev: Math.min(Math.max(homeStats.scoringStdDev, 5), 20),
        wins: Math.round(homeStats.recentForm * 15),
        losses: Math.round((1 - homeStats.recentForm) * 15),
        pointsFor: homeStats.avgPointsScored * 82,
        pointsAgainst: homeStats.avgPointsAllowed * 82,
      };
      const awayEntry = {
        recentAvgPoints: (awayStats.awayAvgScored + marketAwayExp) / 2,
        recentAvgAllowed: (awayStats.awayAvgAllowed + marketHomeExp) / 2,
        scoringStdDev: Math.min(Math.max(awayStats.scoringStdDev, 5), 20),
        wins: Math.round(awayStats.recentForm * 15),
        losses: Math.round((1 - awayStats.recentForm) * 15),
        pointsFor: awayStats.avgPointsScored * 82,
        pointsAgainst: awayStats.avgPointsAllowed * 82,
      };

      // Store by team name (used when team names are passed)
      derivedStatsCache.set(`${league}:${game.home_team}`, homeEntry);
      derivedStatsCache.set(`${league}:${game.away_team}`, awayEntry);

      // Also store by odds key so pick-engine (no team names) can find it
      if (game.bookmakers?.length) {
        const book = game.bookmakers[0];
        const h2h = book.markets?.find((m: any) => m.key === 'h2h');
        const hHome = h2h?.outcomes?.find((o: any) => o.name === game.home_team);
        const hAway = h2h?.outcomes?.find((o: any) => o.name === game.away_team);
        if (hHome?.price != null && hAway?.price != null) {
          const key = makeOddsKey({
            home: Math.round(hHome.price),
            away: Math.round(hAway.price),
            spread: mktSpread,
            total: mktTotal,
          });
          oddsKeyedCache.set(key, { home: homeEntry, away: awayEntry });
        }
      }
    })
  );
}

/**
 * Fetch last N completed games for a team from ESPN hidden API
 */
export async function fetchTeamCalibrationStats(
  espnTeamId: string,
  league: 'nba' | 'ncaab',
  lastN = 15
): Promise<TeamCalibrationStats | null> {
  const cacheKey = `${league}:${espnTeamId}`;
  const cached = statsCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  const leagueSlug = LEAGUE_MAP[league] ?? league;
  const url = `${ESPN_BASE}/${leagueSlug}/teams/${espnTeamId}/schedule`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.warn(`[ESPN_STATS] ${res.status} for team ${espnTeamId}`);
      return null;
    }

    const data = await res.json();
    const events: any[] = data?.events ?? [];

    // Filter completed games only — ESPN nests status differently across endpoints
    const completed = events.filter((e: any) => {
      const comp = e?.competitions?.[0];
      const statusType = comp?.status?.type ?? e?.status?.type;
      return statusType?.completed === true ||
        statusType?.state === 'post' ||
        statusType?.name === 'STATUS_FINAL';
    });

    // Take most recent N
    const recent = completed.slice(-lastN);
    if (recent.length === 0) return null;

    const games: TeamGame[] = [];

    for (const event of recent) {
      const comp = event?.competitions?.[0];
      if (!comp) continue;

      const competitors: any[] = comp.competitors ?? [];
      const teamComp = competitors.find((c: any) => c.id === String(espnTeamId));
      const oppComp = competitors.find((c: any) => c.id !== String(espnTeamId));
      if (!teamComp || !oppComp) continue;

      const scored = parseInt(teamComp?.score?.displayValue ?? teamComp?.score ?? '0', 10);
      const allowed = parseInt(oppComp?.score?.displayValue ?? oppComp?.score ?? '0', 10);
      if (isNaN(scored) || isNaN(allowed) || (scored === 0 && allowed === 0)) continue;

      games.push({
        date: (event.date ?? '').slice(0, 10),
        opponent: oppComp?.team?.displayName ?? 'Unknown',
        pointsScored: scored,
        pointsAllowed: allowed,
        isHome: teamComp.homeAway === 'home',
        won: teamComp.winner === true,
        margin: scored - allowed,
      });
    }

    if (games.length === 0) return null;

    const stats = computeCalibrationStats(espnTeamId, league, games, data?.team?.displayName ?? espnTeamId);
    statsCache.set(cacheKey, { data: stats, ts: Date.now() });
    return stats;

  } catch (err) {
    console.error(`[ESPN_STATS] Fetch failed for ${espnTeamId}:`, err);
    return null;
  }
}

function computeCalibrationStats(
  espnId: string,
  league: 'nba' | 'ncaab',
  games: TeamGame[],
  teamName: string
): TeamCalibrationStats {
  const scores = games.map(g => g.pointsScored);
  const allowed = games.map(g => g.pointsAllowed);
  const homeGames = games.filter(g => g.isHome);
  const awayGames = games.filter(g => !g.isHome);

  return {
    teamName,
    espnId,
    league,
    gamesAnalyzed: games.length,
    avgPointsScored: mean(scores),
    avgPointsAllowed: mean(allowed),
    scoringStdDev: stdDev(scores),
    defenseStdDev: stdDev(allowed),
    homeAvgScored: homeGames.length ? mean(homeGames.map(g => g.pointsScored)) : mean(scores),
    awayAvgScored: awayGames.length ? mean(awayGames.map(g => g.pointsScored)) : mean(scores),
    homeAvgAllowed: homeGames.length ? mean(homeGames.map(g => g.pointsAllowed)) : mean(allowed),
    awayAvgAllowed: awayGames.length ? mean(awayGames.map(g => g.pointsAllowed)) : mean(allowed),
    recentForm: games.filter(g => g.won).length / games.length,
    games,
  };
}

// ── Math helpers ──────────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const avg = mean(arr);
  const variance = arr.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

// ── ESPN Team ID lookup ───────────────────────────────────────────────────────
// Maps team name fragments to ESPN IDs for NBA and top NCAAB programs

export const NBA_TEAM_IDS: Record<string, string> = {
  'Atlanta Hawks': '1',
  'Boston Celtics': '2',
  'Brooklyn Nets': '17',
  'Charlotte Hornets': '30',
  'Chicago Bulls': '4',
  'Cleveland Cavaliers': '5',
  'Dallas Mavericks': '6',
  'Denver Nuggets': '7',
  'Detroit Pistons': '8',
  'Golden State Warriors': '9',
  'Houston Rockets': '10',
  'Indiana Pacers': '11',
  'Los Angeles Clippers': '12',
  'Los Angeles Lakers': '13',
  'Memphis Grizzlies': '29',
  'Miami Heat': '14',
  'Milwaukee Bucks': '15',
  'Minnesota Timberwolves': '16',
  'New Orleans Pelicans': '3',
  'New York Knicks': '18',
  'Oklahoma City Thunder': '25',
  'Orlando Magic': '19',
  'Philadelphia 76ers': '20',
  'Phoenix Suns': '21',
  'Portland Trail Blazers': '22',
  'Sacramento Kings': '23',
  'San Antonio Spurs': '24',
  'Toronto Raptors': '28',
  'Utah Jazz': '26',
  'Washington Wizards': '27',
};

export const NCAAB_TEAM_IDS: Record<string, string> = {
  'Duke Blue Devils': '150',
  'North Carolina Tar Heels': '153',
  'Kentucky Wildcats': '96',
  'Kansas Jayhawks': '2305',
  'Gonzaga Bulldogs': '2250',
  'Villanova Wildcats': '222',
  'Michigan State Spartans': '127',
  'Arizona Wildcats': '12',
  'Baylor Bears': '239',
  'Houston Cougars': '248',
  'UCLA Bruins': '26',
  'Tennessee Volunteers': '2633',
  'Purdue Boilermakers': '2509',
  'Auburn Tigers': '2Auburn',
  'Alabama Crimson Tide': '333',
  'Connecticut Huskies': '41',
  'Creighton Bluejays': '156',
  'St. John\'s Red Storm': '2599',
  'Marquette Golden Eagles': '269',
  'Texas Longhorns': '251',
  'Indiana Hoosiers': '84',
  'Ohio State Buckeyes': '194',
  'Wisconsin Badgers': '275',
  'Iowa Hawkeyes': '2294',
  'Illinois Fighting Illini': '356',
  'Arkansas Razorbacks': '8',
  'Florida Gators': '57',
  'Virginia Cavaliers': '258',
  'Louisville Cardinals': '97',
  'Oregon Ducks': '2483',
  'Vanderbilt Commodores': '238',
  'Nebraska Cornhuskers': '158',
  'Penn State Nittany Lions': '213',
  'Texas Tech Red Raiders': '2641',
  'Kansas St Wildcats': '2306',
  'Florida St Seminoles': '52',
  'Michigan Wolverines': '130',
  'Virginia Tech Hokies': '259',
  'Rutgers Scarlet Knights': '164',
};

/**
 * Fuzzy-match a team name to its ESPN ID
 * Handles "OKC Thunder" → "Oklahoma City Thunder" etc.
 */
export function resolveEspnId(
  teamName: string,
  league: 'nba' | 'ncaab'
): string | null {
  const map = league === 'nba' ? NBA_TEAM_IDS : NCAAB_TEAM_IDS;

  // Exact match first
  if (map[teamName]) return map[teamName];

  // Normalize: lowercase, remove common suffixes
  const normalize = (s: string) =>
    s.toLowerCase()
      .replace(/\b(university|college|state|st\.?|the)\b/g, '')
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const normTarget = normalize(teamName);

  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const [name, id] of Object.entries(map)) {
    const normName = normalize(name);
    const score = similarityScore(normTarget, normName);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = id;
    }
  }

  // Only return if reasonably confident
  return bestScore >= 0.6 ? bestMatch : null;
}

/**
 * Simple token overlap similarity (0-1)
 */
function similarityScore(a: string, b: string): number {
  const tokensA = new Set(a.split(' ').filter(Boolean));
  const tokensB = new Set(b.split(' ').filter(Boolean));
  if (!tokensA.size || !tokensB.size) return 0;
  let overlap = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) overlap++;
  }
  return (overlap * 2) / (tokensA.size + tokensB.size);
}
