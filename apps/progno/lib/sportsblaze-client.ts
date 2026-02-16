/**
 * SportsBlaze API Integration
 * Free sports data API for scores, boxscores, and betting odds
 * API Key: sbf556ejht8g2wvxf3bbeby (expires March 15, 10 req/min)
 * Docs: https://docs.sportsblaze.com/
 */

const SPORTSBLAZE_API_KEY = process.env.SPORTS_BLAZE_API_KEY || '';
const SPORTSBLAZE_BASE_URL = 'https://api.sportsblaze.com';

export interface SportsBlazeGame {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  gameDate: string;
  status: string;
  venue?: string;
  odds?: {
    moneyline?: { home: number; away: number };
    spread?: { home: number; away: number; line: number };
    total?: { over: number; under: number; line: number };
  };
  scores?: {
    home: number;
    away: number;
  };
}

/**
 * Fetch daily games for a sport
 * Endpoint: /{sport}/v1/boxscores/daily/{date}.json
 */
export async function fetchSportsBlazeGames(
  sport: 'nfl' | 'nba' | 'nhl' | 'mlb' | 'ncaaf' | 'ncaab',
  date: string // YYYY-MM-DD
): Promise<SportsBlazeGame[]> {
  if (!SPORTSBLAZE_API_KEY) {
    console.log('[SportsBlaze] No API key configured');
    return [];
  }

  try {
    const url = `${SPORTSBLAZE_BASE_URL}/${sport}/v1/boxscores/daily/${date}.json?key=${SPORTSBLAZE_API_KEY}`;
    console.log(`[SportsBlaze] Fetching ${sport} games for ${date}`);

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 } // Cache 5 min
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('[SportsBlaze] Rate limit exceeded (10 req/min)');
      } else if (response.status === 401) {
        console.warn('[SportsBlaze] API key expired or invalid');
      } else {
        console.warn(`[SportsBlaze] HTTP ${response.status} for ${sport}`);
      }
      return [];
    }

    const data = await response.json();
    
    // Transform to standard format
    const games: SportsBlazeGame[] = (data.games || []).map((game: any) => ({
      id: game.id || `${sport}-${game.homeTeam}-${game.awayTeam}-${date}`,
      sport: sport.toLowerCase(),
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      gameDate: date,
      status: game.status || 'scheduled',
      venue: game.venue,
      odds: game.odds || undefined,
      scores: game.scores || undefined
    }));

    console.log(`[SportsBlaze] Found ${games.length} games for ${sport}`);
    return games;

  } catch (error) {
    console.error(`[SportsBlaze] Error fetching ${sport}:`, error);
    return [];
  }
}

/**
 * Fetch odds only (if available in separate endpoint)
 */
export async function fetchSportsBlazeOdds(
  sport: string,
  date: string
): Promise<SportsBlazeGame[]> {
  // SportsBlaze includes odds in boxscores endpoint
  return fetchSportsBlazeGames(sport as any, date);
}

/**
 * Get live scores for in-progress games
 */
export async function fetchSportsBlazeLiveScores(
  sport: string
): Promise<SportsBlazeGame[]> {
  const today = new Date().toISOString().split('T')[0];
  const games = await fetchSportsBlazeGames(sport as any, today);
  
  // Filter to in-progress games
  return games.filter(g => 
    g.status === 'in_progress' || 
    g.status === 'live' ||
    g.status === '1st' ||
    g.status === '2nd' ||
    g.status === '3rd' ||
    g.status === '4th'
  );
}

/**
 * Convert SportsBlaze format to our standard GameOdds format
 */
export function convertSportsBlazeToGameOdds(game: SportsBlazeGame): any {
  return {
    id: game.id,
    sport: game.sport,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    startTime: game.gameDate,
    venue: game.venue,
    odds: {
      moneyline: {
        home: game.odds?.moneyline?.home || null,
        away: game.odds?.moneyline?.away || null
      },
      spread: {
        home: game.odds?.spread?.home || null,
        away: game.odds?.spread?.away || null,
        line: game.odds?.spread?.line || null
      },
      total: {
        over: game.odds?.total?.over || null,
        under: game.odds?.total?.under || null,
        line: game.odds?.total?.line || null
      }
    },
    source: 'sportsblaze',
    scores: game.scores
  };
}

/**
 * Fetch all supported sports
 */
export async function fetchAllSportsBlazeOdds(date?: string): Promise<Record<string, SportsBlazeGame[]>> {
  const queryDate = date || new Date().toISOString().split('T')[0];
  const sports = ['nfl', 'nba', 'nhl', 'mlb', 'ncaaf', 'ncaab'];
  const results: Record<string, SportsBlazeGame[]> = {};

  // Rate limit: 10 req/min, so add delays
  for (let i = 0; i < sports.length; i++) {
    const sport = sports[i];
    results[sport] = await fetchSportsBlazeGames(sport as any, queryDate);
    
    // Wait 6 seconds between requests to stay under 10 req/min
    if (i < sports.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 6000));
    }
  }

  return results;
}

// Export singleton
export const sportsblazeApi = {
  fetchGames: fetchSportsBlazeGames,
  fetchOdds: fetchSportsBlazeOdds,
  fetchLiveScores: fetchSportsBlazeLiveScores,
  fetchAll: fetchAllSportsBlazeOdds,
  convertToGameOdds: convertSportsBlazeToGameOdds
};
