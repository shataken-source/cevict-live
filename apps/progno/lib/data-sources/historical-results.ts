/**
 * Historical Results Data Loader
 * Loads and provides access to 2024 game results for fine-tuning
 *
 * NOTE: This file uses Node.js fs module which is only available server-side.
 * Functions will return empty data when called from client-side code.
 */

// Lazy-load fs and path only on server-side using a function
// This prevents Next.js from trying to bundle fs in client code
function getNodeModules() {
  if (typeof window !== 'undefined') {
    return { fs: null, path: null };
  }

  try {
    // Use indirect require to prevent webpack/Next.js from bundling fs
    // Access require through global or process to avoid static analysis
    const nodeRequire = typeof require !== 'undefined'
      ? require
      : (typeof global !== 'undefined' && (global as any).require)
      ? (global as any).require
      : null;

    if (!nodeRequire) {
      return { fs: null, path: null };
    }

    return {
      fs: nodeRequire('fs'),
      path: nodeRequire('path')
    };
  } catch (e) {
    return { fs: null, path: null };
  }
}

export interface GameResult {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  homeScore: number;
  awayScore: number;
  spread?: number;
  total?: number;
  homeCovered?: boolean;
  overHit?: boolean;
  winner: string;
}

interface ResultsData {
  [sport: string]: GameResult[];
}

let cachedResults: ResultsData | null = null;

/**
 * Load all historical results
 */
export function loadHistoricalResults(): ResultsData {
  if (cachedResults) {
    return cachedResults;
  }

  // Only load from filesystem on server-side
  if (typeof window !== 'undefined') {
    // Client-side - return empty data
    return cachedResults || {};
  }

  // Lazy-load Node modules
  const { fs, path } = getNodeModules();

  if (!fs || !path) {
    // fs not available - return empty data
    return cachedResults || {};
  }

  try {
    const prognoDir = path.join(process.cwd(), '.progno');
    const file = path.join(prognoDir, '2024-results-all-sports.json');

    if (!fs.existsSync(file)) {
      console.warn(`Historical results file not found: ${file}. Run fetch-2024-python.py first.`);
      return {};
    }

    const data = fs.readFileSync(file, 'utf8');
    cachedResults = JSON.parse(data);
    return cachedResults || {};
  } catch (error) {
    console.error('Failed to load historical results:', error);
    return {};
  }
}

/**
 * Get results for a specific sport
 */
export function getSportResults(sport: string): GameResult[] {
  const data = loadHistoricalResults();
  return data[sport] || [];
}

/**
 * Get results for a specific team
 */
export function getTeamResults(sport: string, teamName: string): GameResult[] {
  const results = getSportResults(sport);
  const normalizedTeam = normalizeTeamName(teamName);

  return results.filter(result => {
    const normalizedHome = normalizeTeamName(result.homeTeam);
    const normalizedAway = normalizeTeamName(result.awayTeam);
    return normalizedHome === normalizedTeam || normalizedAway === normalizedTeam;
  });
}

/**
 * Get head-to-head history between two teams
 */
export function getH2HResults(sport: string, team1: string, team2: string): GameResult[] {
  const results = getSportResults(sport);
  const normalized1 = normalizeTeamName(team1);
  const normalized2 = normalizeTeamName(team2);

  return results.filter(result => {
    const normalizedHome = normalizeTeamName(result.homeTeam);
    const normalizedAway = normalizeTeamName(result.awayTeam);

    return (normalizedHome === normalized1 && normalizedAway === normalized2) ||
           (normalizedHome === normalized2 && normalizedAway === normalized1);
  });
}

/**
 * Get recent team performance (last N games)
 */
export function getRecentTeamPerformance(sport: string, teamName: string, lastNGames: number = 5): {
  wins: number;
  losses: number;
  avgPointsFor: number;
  avgPointsAgainst: number;
  avgMargin: number;
} {
  const teamResults = getTeamResults(sport, teamName);
  const recent = teamResults
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, lastNGames);

  if (recent.length === 0) {
    return { wins: 0, losses: 0, avgPointsFor: 0, avgPointsAgainst: 0, avgMargin: 0 };
  }

  let wins = 0;
  let totalPointsFor = 0;
  let totalPointsAgainst = 0;

  for (const result of recent) {
    const isHome = normalizeTeamName(result.homeTeam) === normalizeTeamName(teamName);
    const pointsFor = isHome ? result.homeScore : result.awayScore;
    const pointsAgainst = isHome ? result.awayScore : result.homeScore;

    if (result.winner === teamName) wins++;
    totalPointsFor += pointsFor;
    totalPointsAgainst += pointsAgainst;
  }

  const avgPointsFor = totalPointsFor / recent.length;
  const avgPointsAgainst = totalPointsAgainst / recent.length;
  const avgMargin = avgPointsFor - avgPointsAgainst;

  return {
    wins,
    losses: recent.length - wins,
    avgPointsFor,
    avgPointsAgainst,
    avgMargin
  };
}

/**
 * Normalize team name for matching
 */
function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/^(the|a|an)\s+/i, '');
}

/**
 * Refresh results cache
 */
export function refreshResultsCache(): void {
  cachedResults = null;
  loadHistoricalResults();
}

