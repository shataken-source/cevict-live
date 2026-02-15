/**
 * RapidAPI ODDS-API Client for Real Odds
 * Fallback for sports not in API-SPORTS (like NASCAR)
 */

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '7ef3fb144dmshe8c25e6e3067f43p1b3b6djsna6f7ae896539';
const RAPIDAPI_HOST = process.env.RAPIDAPI_ODDS_HOST || 'odds-api1.p.rapidapi.com';

// Sport mappings for RapidAPI
const RAPID_SPORT_MAP: Record<string, string> = {
  nhl: 'icehockey_nhl',
  nba: 'basketball_nba',
  nfl: 'americanfootball_nfl',
  mlb: 'baseball_mlb',
  ncaab: 'basketball_ncaab',
  ncaaf: 'americanfootball_ncaaf',
  nascar: 'motorsport_nascar',
  formula1: 'motorsport_formula1',
};

export interface RapidOddsGame {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  odds: {
    moneyline: { home: number | null; away: number | null };
    spread: { home: number | null; away: number | null };
    total: { line: number | null; over: number | null; under: number | null };
  };
}

/**
 * Fetch odds from RapidAPI ODDS-API
 */
export async function fetchRapidOdds(sport: string, date?: string): Promise<RapidOddsGame[]> {
  const sportKey = RAPID_SPORT_MAP[sport.toLowerCase()];
  if (!sportKey) {
    console.log(`[RapidAPI] Sport ${sport} not mapped`);
    return [];
  }

  try {
    const url = `https://${RAPIDAPI_HOST}/v4/sports/${sportKey}/odds?regions=us&oddsFormat=decimal&markets=h2h,spreads,totals&dateFormat=iso`;
    
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.warn(`[RapidAPI] HTTP ${response.status} for ${sport}`);
      return [];
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      console.warn(`[RapidAPI] Invalid response for ${sport}:`, data);
      return [];
    }

    console.log(`[RapidAPI] ${sport}: ${data.length} games`);

    return data.map((event: any) => {
      const bookmaker = event.bookmakers?.[0];
      const h2h = bookmaker?.markets?.find((m: any) => m.key === 'h2h');
      const spreads = bookmaker?.markets?.find((m: any) => m.key === 'spreads');
      const totals = bookmaker?.markets?.find((m: any) => m.key === 'totals');

      const homeOutcome = h2h?.outcomes?.find((o: any) => o.name === event.home_team);
      const awayOutcome = h2h?.outcomes?.find((o: any) => o.name === event.away_team);
      
      const homeSpread = spreads?.outcomes?.find((o: any) => o.name === event.home_team);
      const awaySpread = spreads?.outcomes?.find((o: any) => o.name === event.away_team);
      
      const total = totals?.outcomes?.find((o: any) => o.name === 'Over');

      return {
        id: event.id,
        sport: sport.toLowerCase(),
        homeTeam: event.home_team,
        awayTeam: event.away_team,
        startTime: event.commence_time,
        odds: {
          moneyline: {
            home: homeOutcome?.price || null,
            away: awayOutcome?.price || null,
          },
          spread: {
            home: homeSpread?.point || null,
            away: awaySpread?.point || null,
          },
          total: {
            line: total?.point || null,
            over: total?.price || null,
            under: totals?.outcomes?.find((o: any) => o.name === 'Under')?.price || null,
          },
        },
      };
    });

  } catch (error) {
    console.error(`[RapidAPI] Error fetching ${sport}:`, error);
    return [];
  }
}
