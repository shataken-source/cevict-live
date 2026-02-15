/**
 * CFBD (College Football Data) API Client
 * Free tier: 1,000 requests/month
 * Docs: https://collegefootballdata.com/
 */

const CFBD_API_KEY = process.env.CFBD_API_KEY || 'YOFKBE6/cqRj5f1GwhOpnjGQBP/u5d5wpsdB9/pBQoG0OXqVLckvTtScVjMjjcx6';
const CFBD_BASE_URL = 'https://api.collegefootballdata.com';

export interface CFBDGame {
  id: number;
  season: number;
  week: number;
  season_type: string;
  start_date: string;
  start_time_tbd: boolean;
  neutral_site: boolean;
  conference_game: boolean;
  attendance: number | null;
  venue_id: number | null;
  venue: string | null;
  home_id: number;
  home_team: string;
  home_conference: string | null;
  home_division: string | null;
  home_points: number | null;
  home_line_scores: number[] | null;
  home_post_win_prob: number | null;
  home_pregame_elo: number | null;
  home_postgame_elo: number | null;
  away_id: number;
  away_team: string;
  away_conference: string | null;
  away_division: string | null;
  away_points: number | null;
  away_line_scores: number[] | null;
  away_post_win_prob: number | null;
  away_pregame_elo: number | null;
  away_postgame_elo: number | null;
  excitement_index: number | null;
  highlights_url: string | null;
  spread: number | null;
  over_under: number | null;
}

export interface CFBDBettingLine {
  gameId: number;
  season: number;
  seasonType: string;
  week: number;
  startDate: string;
  homeTeam: string;
  awayTeam: string;
  lines: {
    provider: string;
    spread: number | null;
    overUnder: number | null;
    homeMoneyline: number | null;
    awayMoneyline: number | null;
    spreadOpen: number | null;
    overUnderOpen: number | null;
  }[];
}

/**
 * Fetch NCAAF games from CFBD
 */
export async function fetchCFBDGames(
  year: number = new Date().getFullYear(),
  week?: number,
  seasonType: string = 'regular'
): Promise<CFBDGame[]> {
  try {
    console.log(`[CFBD] Fetching games for ${year}...`);
    
    const params = new URLSearchParams();
    params.append('year', year.toString());
    if (week) params.append('week', week.toString());
    params.append('seasonType', seasonType);
    
    const response = await fetch(`${CFBD_BASE_URL}/games?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${CFBD_API_KEY}`,
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      console.warn(`[CFBD] HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();
    console.log(`[CFBD] Found ${data.length} games`);
    
    return data;

  } catch (error) {
    console.error('[CFBD] Error fetching games:', error);
    return [];
  }
}

/**
 * Fetch betting lines from CFBD
 */
export async function fetchCFBDLines(
  year: number = new Date().getFullYear(),
  week?: number
): Promise<CFBDBettingLine[]> {
  try {
    console.log(`[CFBD] Fetching betting lines for ${year}...`);
    
    const params = new URLSearchParams();
    params.append('year', year.toString());
    if (week) params.append('week', week.toString());
    
    const response = await fetch(`${CFBD_BASE_URL}/lines?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${CFBD_API_KEY}`,
        'Accept': 'application/json',
      },
      next: { revalidate: 1800 }, // Cache for 30 min
    });

    if (!response.ok) {
      console.warn(`[CFBD] Lines HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();
    console.log(`[CFBD] Found ${data.length} betting lines`);
    
    return data;

  } catch (error) {
    console.error('[CFBD] Error fetching lines:', error);
    return [];
  }
}

/**
 * Convert CFBD data to OddsService format
 */
export function convertCFBDToOddsServiceFormat(games: CFBDGame[], lines: CFBDBettingLine[]): any[] {
  // Create a map of gameId to lines
  const linesMap = new Map(lines.map(l => [l.gameId, l]));
  
  return games.map(game => {
    const gameLines = linesMap.get(game.id);
    const firstLine = gameLines?.lines?.[0];
    
    return {
      id: `cfbd-${game.id}`,
      sport: 'ncaaf',
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      startTime: game.start_date,
      venue: game.venue || 'Unknown',
      odds: {
        moneyline: {
          home: firstLine?.homeMoneyline || null,
          away: firstLine?.awayMoneyline || null,
        },
        spread: {
          home: firstLine?.spread || game.spread || null,
          away: firstLine?.spread ? -firstLine.spread : null,
        },
        total: {
          line: firstLine?.overUnder || game.over_under || null,
        },
      },
      source: 'cfbd',
      week: game.week,
      season: game.season,
    };
  });
}
