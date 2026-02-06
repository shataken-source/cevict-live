// lib/odds-service.ts
import { getPrimaryKey } from '../app/keys-store';

const API_BASE = 'https://api.the-odds-api.com/v4';

const SPORT_MAP: Record<string, string> = {
  nfl: 'americanfootball_nfl',
  nba: 'basketball_nba',
  nhl: 'icehockey_nhl',
  mlb: 'baseball_mlb',
  ncaab: 'basketball_ncaab',
  cbb: 'basketball_ncaab',
  cfb: 'americanfootball_ncaaf',
  ncaaf: 'americanfootball_ncaaf'
};

/** Normalize team names per sport when the API returns wrong or alternate names. Official NHL list includes Utah Mammoth. */
const TEAM_NAME_NORMALIZE: Record<string, Record<string, string>> = {
  nhl: {
    // Only add mappings when API returns non-official names (e.g. typos or legacy). Utah Mammoth is official NHL.
  },
};

function normalizeTeamName(sport: string, name: string | null | undefined): string {
  if (!name) return name ?? '';
  const map = TEAM_NAME_NORMALIZE[sport?.toLowerCase()];
  return (map && map[name]) || name;
}

/** Get first non-null value for a market across all bookmakers (first book often missing h2h/totals). */
function firstFromBookmakers(event: any, marketKey: string, getValue: (market: any) => number | null): number | null {
  const bookmakers = event.bookmakers || []
  for (const book of bookmakers) {
    const market = book.markets?.find((m: any) => m.key === marketKey)
    const v = getValue(market)
    if (v != null) return v
  }
  return null
}

async function fetchFromOddsApi(endpoint: string, params: Record<string, string> = {}) {
  const apiKey = getPrimaryKey();
  if (!apiKey) {
    throw new Error('Odds API key not set. Set ODDS_API_KEY in .env or add key to .progno/keys.json');
  }
  const url = new URL(API_BASE + endpoint);

  url.searchParams.append('apiKey', apiKey);
  url.searchParams.append('regions', 'us');
  url.searchParams.append('markets', 'h2h,spreads,totals');
  url.searchParams.append('oddsFormat', 'american');
  url.searchParams.append('dateFormat', 'iso');

  Object.entries(params).forEach(([k, v]) => {
    if (v) url.searchParams.append(k, v);
  });

  console.log(`[OddsAPI] Fetching: ${url.toString()}`);

  const res = await fetch(url.toString(), { cache: 'no-store' });

  if (!res.ok) {
    console.warn(`[OddsAPI] HTTP ${res.status} for ${endpoint}`);
    return null;
  }

  const data = await res.json();
  console.log(`[OddsAPI] Received ${data?.length || 0} real events`);
  return data;
}

export class OddsService {
  static async getGames(params: { sport?: string; date?: string } = {}): Promise<any[]> {
    const lowerSport = params.sport?.toLowerCase() || 'nhl';
    const sportKey = SPORT_MAP[lowerSport] || 'icehockey_nhl';

    console.log(`[OddsService] Loading games for sport: ${lowerSport} (key: ${sportKey})`);

    const apiParams: Record<string, string> = {};

    if (params.date) {
      apiParams.date = params.date;
    }

    const data = await fetchFromOddsApi(`/sports/${sportKey}/odds`, apiParams);

    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log(`[OddsService] No games or odds for ${lowerSport}`);
      return [];
    }

    return data.map((event: any) => {
      const homeDisplay = normalizeTeamName(lowerSport, event.home_team);
      const awayDisplay = normalizeTeamName(lowerSport, event.away_team);
      const mlHome = firstFromBookmakers(event, 'h2h', (m) => m?.outcomes?.find((o: any) => o.name === event.home_team)?.price ?? null);
      const mlAway = firstFromBookmakers(event, 'h2h', (m) => m?.outcomes?.find((o: any) => o.name === event.away_team)?.price ?? null);
      const spreadHome = firstFromBookmakers(event, 'spreads', (m) => m?.outcomes?.find((o: any) => o.name === event.home_team)?.point ?? null);
      const spreadAway = firstFromBookmakers(event, 'spreads', (m) => m?.outcomes?.find((o: any) => o.name === event.away_team)?.point ?? null);
      const totalLine = firstFromBookmakers(event, 'totals', (m) => m?.outcomes?.[0]?.point ?? null);
      return {
        id: event.id,
        sport: lowerSport,
        homeTeam: homeDisplay,
        awayTeam: awayDisplay,
        startTime: event.commence_time,
        venue: event.venue || 'Unknown',
        odds: {
          moneyline: { home: mlHome, away: mlAway },
          spread: { home: spreadHome, away: spreadAway },
          total: { line: totalLine }
        }
      };
    });
  }

  static async getGame(gameId: string): Promise<any | null> {
    console.log(`[OddsService] Searching for game ID: ${gameId}`);

    for (const [sportAlias, sportKey] of Object.entries(SPORT_MAP)) {
      console.log(`[OddsService] Checking sport: ${sportAlias} (key: ${sportKey})`);
      const games = await this.getGames({ sport: sportAlias });
      const found = games.find(g => g.id === gameId);
      if (found) {
        console.log(`[OddsService] Game found in ${sportAlias}`);
        return found;
      }
    }
    console.warn(`[OddsService] Game not found: ${gameId}`);
    return null;
  }

  static async getLiveScores(sport?: string): Promise<any[]> {
    const lowerSport = sport?.toLowerCase() || 'nhl';
    const sportKey = SPORT_MAP[lowerSport] || 'icehockey_nhl';

    console.log(`[OddsService] Loading live scores for sport: ${lowerSport} (key: ${sportKey})`);

    const data = await fetchFromOddsApi(`/sports/${sportKey}/scores`, {
      daysFrom: '1'
    });

    if (!data || !Array.isArray(data)) {
      console.warn(`[OddsService] No live scores returned for ${lowerSport}`);
      return [];
    }

    console.log(`[OddsService] Live scores loaded: ${data.length} events for ${lowerSport}`);

    return data.map((event: any) => {
      const homeDisplay = normalizeTeamName(lowerSport, event.home_team);
      const awayDisplay = normalizeTeamName(lowerSport, event.away_team);
      return {
        id: event.id,
        sport: lowerSport,
        homeTeam: homeDisplay,
        awayTeam: awayDisplay,
        completed: event.completed,
        lastUpdate: event.last_update,
        scores: event.scores?.reduce((acc: any, s: any) => {
          acc[s.name] = s.score;
          return acc;
        }, {}) || null,
        homeScore: event.scores?.find((s: any) => s.name === event.home_team)?.score || null,
        awayScore: event.scores?.find((s: any) => s.name === event.away_team)?.score || null
      };
    });
  }

  static async getStandings(sport: string): Promise<any[]> {
    return [];
  }
}
