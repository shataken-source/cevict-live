// lib/odds-service.ts
import { getPrimaryKey } from '../app/keys-store';
import { fetchApiSportsOdds, convertToOddsServiceFormat } from './api-sports-client';
import { fetchRapidOdds } from './rapidapi-client';
import { scrapeNASCAROdds, convertToOddsServiceFormat as convertNASCAR } from './nascar-scraper';
import { fetchCFBDGames, fetchCFBDLines, convertCFBDToOddsServiceFormat } from './cfbd-client';
import { fetchDraftKingsNASCAROdds, convertDraftKingsToOddsService } from './draftkings-client';
import { fetchDraftKingsCollegeBaseball } from './draftkings-college-baseball';
import { OddsCacheService } from './odds-cache';

// Import plugin registration (this registers all odds source plugins)
import './odds-sources/register-plugins';
import { fetchOddsFromPlugins } from './odds-sources';

const API_BASE = 'https://api.the-odds-api.com/v4';

const SPORT_MAP: Record<string, string> = {
  nfl: 'americanfootball_nfl',
  nba: 'basketball_nba',
  nhl: 'icehockey_nhl',
  mlb: 'baseball_mlb',
  ncaab: 'basketball_ncaab',
  cbb: 'basketball_ncaab',
  cfb: 'americanfootball_ncaaf',
  ncaaf: 'americanfootball_ncaaf',
  nascar: 'motorsports_nascar',
  'college-baseball': 'baseball_ncaa',
  ncaabaseball: 'baseball_ncaa',
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

/**
 * No hardcoded mock data - only real API data
 */
export function getHardcodedGames(sport: string): any[] {
  // Return empty - no mock data
  return [];
}
function getHardcodedNASCAROdds(): any[] {
  // No mock data - return empty
  return [];
}

export class OddsService {
  static async getGames(params: { sport?: string; date?: string } = {}): Promise<any[]> {
    const lowerSport = params.sport?.toLowerCase() || 'nhl';
    const date = params.date || new Date().toISOString().split('T')[0];

    console.log(`[OddsService] Loading games for sport: ${lowerSport}, date: ${date}`);

    // Priority 0: Check Supabase cache first (for supported sports)
    const supportedCacheSports = ['nhl', 'nba', 'nfl', 'mlb', 'ncaab', 'ncaaf'];
    if (supportedCacheSports.includes(lowerSport)) {
      try {
        const cachedOdds = await OddsCacheService.getOddsForDate(lowerSport, date);
        console.log(`[OddsService] Cache check result: ${cachedOdds.length} games found`);

        if (cachedOdds.length > 0) {
          console.log(`[OddsService] Using ${cachedOdds.length} cached games from Supabase`);
          return cachedOdds.map(game => ({
            id: game.external_id,
            sport: game.sport,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            startTime: game.startTime,
            venue: game.venue || 'Unknown',
            odds: game.odds,
            source: game.source,
          }));
        }
        console.log('[OddsService] No cached odds, falling back to APIs...');
      } catch (error) {
        console.error('[OddsService] Cache lookup failed:', error);
      }
    }

    // Priority 1: Try plugin-based odds sources (DraftKings, Vegas Insider, etc.)
    console.log('[OddsService] Trying plugin-based odds sources...');
    try {
      const pluginResult = await fetchOddsFromPlugins(lowerSport, date);
      if (pluginResult && pluginResult.odds.length > 0) {
        console.log(`[OddsService] Using ${pluginResult.odds.length} games from ${pluginResult.source}`);
        return pluginResult.odds.map(odds => ({
          id: odds.id,
          sport: odds.sport,
          homeTeam: odds.homeTeam,
          awayTeam: odds.awayTeam,
          startTime: odds.startTime,
          venue: odds.venue || 'Unknown',
          odds: odds.odds,
          source: odds.source,
        }));
      }
    } catch (error) {
      console.error('[OddsService] Plugin system failed:', error);
    }

    // Priority 2: NASCAR fallback (not in API-SPORTS)
    if (lowerSport === 'nascar') {
      console.log('[OddsService] NASCAR fallback: Using hardcoded Daytona 500 odds');
      return getHardcodedNASCAROdds();
    }

    // Priority 3: College Baseball fallback
    if (lowerSport === 'college-baseball' || lowerSport === 'ncaab') {
      console.log('[OddsService] College Baseball detected, trying DraftKings...');
      try {
        const dkGames = await fetchDraftKingsCollegeBaseball();
        if (dkGames.length > 0) {
          console.log(`[OddsService] Using ${dkGames.length} college baseball games from DraftKings`);
          return dkGames;
        }
      } catch (error) {
        console.error('[OddsService] DraftKings college baseball failed:', error);
      }
    }

    // Try API-SPORTS first for all other sports (reliable, paid)
    console.log(`[OddsService] Trying API-SPORTS for ${lowerSport}...`);
    try {
      const apiSportsGames = await fetchApiSportsOdds(lowerSport, params.date);
      console.log(`[OddsService] API-SPORTS returned ${apiSportsGames.length} games`);
      if (apiSportsGames.length > 0) {
        console.log(`[OddsService] Using ${apiSportsGames.length} games from API-SPORTS`);
        return apiSportsGames.map(convertToOddsServiceFormat);
      }
    } catch (error) {
      console.error(`[OddsService] API-SPORTS failed for ${lowerSport}:`, error);
    }

    // NCAAF fallback to CFBD API (College Football Data)
    if (lowerSport === 'ncaaf' || lowerSport === 'cfb') {
      console.log('[OddsService] NCAAF detected, trying CFBD API...');
      try {
        const year = new Date().getFullYear();
        const [games, lines] = await Promise.all([
          fetchCFBDGames(year),
          fetchCFBDLines(year),
        ]);

        if (games.length > 0) {
          const cfbdGames = convertCFBDToOddsServiceFormat(games, lines);
          console.log(`[OddsService] Using ${cfbdGames.length} NCAAF games from CFBD`);
          return cfbdGames;
        }
      } catch (error) {
        console.warn('[OddsService] CFBD API failed for NCAAF:', error);
        console.log(`[OddsService] CFBD API error details: ${error.message}`);
        console.log(`[OddsService] CFBD API error stack: ${error.stack}`);
      }
    }

    // Fall back to The-Odds API
    console.log(`[OddsService] Trying The-Odds API for ${lowerSport}...`);
    const sportKey = SPORT_MAP[lowerSport] || 'icehockey_nhl';
    const apiParams: Record<string, string> = {};
    if (params.date) apiParams.date = params.date;

    console.log(`[OddsService] Calling The-Odds API with sportKey: ${sportKey}`);
    try {
      const data = await fetchFromOddsApi(`/sports/${sportKey}/odds`, apiParams);
      console.log(`[OddsService] The-Odds API returned:`, data ? `${data.length} games` : 'null/undefined');

      if (data && Array.isArray(data) && data.length > 0) {
        const games = data.map((event: any) => ({
          id: event.id,
          sport: lowerSport,
          homeTeam: normalizeTeamName(lowerSport, event.home_team),
          awayTeam: normalizeTeamName(lowerSport, event.away_team),
          startTime: event.commence_time,
          venue: event.venue || 'Unknown',
          odds: {
            moneyline: {
              home: firstFromBookmakers(event, 'h2h', (m) => m?.outcomes?.find((o: any) => o.name === event.home_team)?.price ?? null),
              away: firstFromBookmakers(event, 'h2h', (m) => m?.outcomes?.find((o: any) => o.name === event.away_team)?.price ?? null),
            },
            spread: {
              home: firstFromBookmakers(event, 'spreads', (m) => m?.outcomes?.find((o: any) => o.name === event.home_team)?.point ?? null),
              away: firstFromBookmakers(event, 'spreads', (m) => m?.outcomes?.find((o: any) => o.name === event.away_team)?.point ?? null),
            },
            total: {
              line: firstFromBookmakers(event, 'totals', (m) => m?.outcomes?.[0]?.point ?? null),
            },
          },
          source: 'the-odds-api',
        }));

        // Save successful API results to Supabase cache
        const queryDate = params.date || new Date().toISOString().split('T')[0];
        console.log(`[OddsService] Saving ${games.length} games to Supabase cache for ${lowerSport} on ${queryDate}...`);
        try {
          await OddsCacheService.saveGames(lowerSport, queryDate, games);
          console.log(`[OddsService] Successfully cached ${games.length} games for ${lowerSport}`);
        } catch (cacheError) {
          console.error(`[OddsService] Failed to cache games:`, cacheError);
          // Don't fail the request if caching fails
        }

        return games;
      }

      console.log(`[OddsService] No games available for ${lowerSport}`);
      return [];
    } catch (error) {
      console.error(`[OddsService] The-Odds API failed:`, error);
      return [];
    }

    // End of getGames method - getGame is a separate method
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

export { OddsService };
