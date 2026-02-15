/**
 * API-Sports Client for Real Odds
 * Replaces The-Odds API with API-Sports for all 7 sports
 */

const API_KEY = process.env.API_SPORTS_KEY || '55ec5171c639766087f9fea40d9cb215';

// API-Sports sport configurations - using environment variables for hosts
// NOTE: Free plan allows dates from 2026-02-14 to 2026-02-16 per error message
const SPORT_CONFIG: Record<string, {
  host: string;
  league: number;
  season: string;
}> = {
  nhl: { host: process.env.API_SPORTS_NHL_HOST || 'v1.hockey.api-sports.io', league: 57, season: '2025' },
  nba: { host: process.env.API_SPORTS_NBA_HOST || 'v1.basketball.api-sports.io', league: 12, season: '2024-2025' },
  nfl: { host: process.env.API_SPORTS_NFL_HOST || 'v1.american-football.api-sports.io', league: 1, season: '2024' },
  mlb: { host: process.env.API_SPORTS_MLB_HOST || 'v1.baseball.api-sports.io', league: 1, season: '2025' },
  ncaab: { host: process.env.API_SPORTS_NCAAB_HOST || 'v1.basketball.api-sports.io', league: 116, season: '2024-2025' },
  ncaaf: { host: process.env.API_SPORTS_NCAAF_HOST || 'v1.american-football.api-sports.io', league: 1, season: '2024' },
  ncaabaseball: { host: process.env.API_SPORTS_NCAA_BASEBALL_HOST || 'v1.baseball.api-sports.io', league: 108, season: '2025' },
};

export interface ApiSportsGame {
  id: number;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  venue: string;
  odds: {
    moneyline: { home: number | null; away: number | null };
    spread: { home: number | null; away: number | null };
    total: { line: number | null; over: number | null; under: number | null };
  };
  status: string;
}

/**
 * Fetch games with odds from API-Sports
 */
export async function fetchApiSportsOdds(sport: string, date?: string): Promise<ApiSportsGame[]> {
  const config = SPORT_CONFIG[sport.toLowerCase()];
  if (!config) {
    console.log(`[API-Sports] Sport ${sport} not configured`);
    return [];
  }

  let targetDate = date || new Date().toISOString().split('T')[0];

  try {
    // Try the requested date first
    let games = await fetchGamesForDate(sport, config, targetDate);

    // If no games and no specific date was requested, try the last 7 days
    if (games.length === 0 && !date) {
      console.log(`[API-Sports] No games for ${sport} on ${targetDate}, trying recent dates...`);

      for (let i = 1; i <= 7; i++) {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - i);
        const pastDateStr = pastDate.toISOString().split('T')[0];

        console.log(`[API-Sports] Trying ${sport} on ${pastDateStr}...`);
        games = await fetchGamesForDate(sport, config, pastDateStr);

        if (games.length > 0) {
          console.log(`[API-Sports] Found ${games.length} games for ${sport} on ${pastDateStr}`);
          return games;
        }
      }

      console.log(`[API-Sports] No games found for ${sport} in the last 7 days`);
    }

    return games;

  } catch (error) {
    console.error(`[API-Sports] Error fetching ${sport}:`, error);
    return [];
  }
}

async function fetchGamesForDate(sport: string, config: any, targetDate: string): Promise<ApiSportsGame[]> {
  // Fetch games for the date (API-Sports expects YYYY-MM-DD)
  const gamesUrl = `https://${config.host}/games?league=${config.league}&season=${config.season}&date=${targetDate}`;

  const gamesRes = await fetch(gamesUrl, {
    headers: {
      'x-apisports-key': API_KEY,
      'Accept': 'application/json',
    },
    next: { revalidate: 300 },
  });

  if (!gamesRes.ok) {
    console.warn(`[API-Sports] HTTP ${gamesRes.status} for ${sport} on ${targetDate}`);
    return [];
  }

  const gamesData = await gamesRes.json();

  if (gamesData.errors && Object.keys(gamesData.errors).length > 0) {
    console.warn(`[API-Sports] Errors for ${sport}:`, gamesData.errors);
  }

  const games = gamesData.response || [];

  if (games.length === 0) {
    return [];
  }

  // Fetch odds for each game
  const gamesWithOdds: ApiSportsGame[] = [];

  for (const game of games) {
    const gameId = game.id;

    const oddsUrl = `https://${config.host}/odds?game=${gameId}`;
    const oddsRes = await fetch(oddsUrl, {
      headers: {
        'x-apisports-key': API_KEY,
        'Accept': 'application/json',
      },
      next: { revalidate: 300 },
    });

    let odds = {
      moneyline: { home: null as number | null, away: null as number | null },
      spread: { home: null as number | null, away: null as number | null },
      total: { line: null as number | null, over: null as number | null, under: null as number | null },
    };

    if (oddsRes.ok) {
      const oddsData = await oddsRes.json();
      const bookmakers = oddsData.response || [];

      if (bookmakers.length > 0) {
        const firstBookmaker = bookmakers[0];
        const bets = firstBookmaker.bets || [];

        const moneylineBet = bets.find((b: any) => b.id === 1);
        if (moneylineBet) {
          const homeOdd = moneylineBet.values?.find((v: any) => v.value === 'Home');
          const awayOdd = moneylineBet.values?.find((v: any) => v.value === 'Away');
          odds.moneyline.home = homeOdd ? parseFloat(homeOdd.odd) : null;
          odds.moneyline.away = awayOdd ? parseFloat(awayOdd.odd) : null;
        }

        const spreadBet = bets.find((b: any) => b.id === 2);
        if (spreadBet) {
          const homeSpread = spreadBet.values?.find((v: any) => v.value === 'Home');
          const awaySpread = spreadBet.values?.find((v: any) => v.value === 'Away');
          if (homeSpread) odds.spread.home = parseFloat(homeSpread.odd);
          if (awaySpread) odds.spread.away = parseFloat(awaySpread.odd);
        }

        const totalBet = bets.find((b: any) => b.id === 3);
        if (totalBet) {
          const over = totalBet.values?.find((v: any) => v.value === 'Over');
          const under = totalBet.values?.find((v: any) => v.value === 'Under');
          odds.total.line = over ? parseFloat(over.odd) : null;
          odds.total.over = over ? parseFloat(over.odd) : null;
          odds.total.under = under ? parseFloat(under.odd) : null;
        }
      }
    }

    gamesWithOdds.push({
      id: gameId,
      sport: sport.toLowerCase(),
      homeTeam: game.teams?.home?.name || 'Unknown',
      awayTeam: game.teams?.away?.name || 'Unknown',
      startTime: game.date || targetDate,
      venue: game.venue?.name || 'Unknown',
      odds,
      status: game.status?.short || 'NS',
    });
  }

  return gamesWithOdds;
}

/**
 * Convert API-Sports game format to OddsService format
 */
export function convertToOddsServiceFormat(game: ApiSportsGame): any {
  return {
    id: game.id.toString(),
    sport: game.sport,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    startTime: game.startTime,
    venue: game.venue,
    odds: game.odds,
    source: 'api-sports',
  };
}
