/**
 * Odds Service
 * Centralized service for fetching games and odds from The Odds API
 */

import { getPrimaryKey, getSportsBlazeKey } from '../keys-store';
import { fetchScheduleFromOddsApi, fetchLiveOddsTheOddsApi } from '../weekly-page.helpers';
import type { Game } from '../weekly-analyzer';
import { cacheManager } from './cache-manager';
import { circuitBreakers } from './circuit-breaker';
import {
  fetchSportsBlazeDailySchedule,
  mapSportsBlazeGamesToPrognoGames,
  SportsBlazeLeagueId
} from '../sportsblaze-fetcher';

const USE_SPORTS_BLAZE_ONLY = process.env.USE_SPORTS_BLAZE_ONLY === 'true';

const SPORT_KEY_MAP: Record<string, string> = {
  'nfl': 'NFL',
  'nba': 'NBA',
  'mlb': 'MLB',
  'nhl': 'NHL',
  'cfb': 'NCAAF',
  'cbb': 'NCAAB',
  'soccer': 'soccer',
  'mma': 'mma',
  'tennis': 'tennis',
};

// The Odds API sport keys for college sports
const ODDS_API_SPORT_KEYS: Record<string, string> = {
  'nfl': 'americanfootball_nfl',
  'nba': 'basketball_nba',
  'mlb': 'baseball_mlb',
  'nhl': 'icehockey_nhl',
  'cfb': 'americanfootball_ncaaf',
  'cbb': 'basketball_ncaab',
};

// College sports that SportsBlaze doesn't support
const COLLEGE_SPORTS: Sport[] = ['cfb', 'cbb'];

export type Sport = 'nfl' | 'nba' | 'mlb' | 'nhl' | 'cfb' | 'cbb' | 'soccer' | 'mma' | 'tennis';

export interface Odds {
  sportsbook: string;
  spread: { home: number; homeOdds: number; away: number; awayOdds: number };
  moneyline: { home: number; away: number };
  total: { line: number; overOdds: number; underOdds: number };
  timestamp: Date;
}

export interface GameWithOdds {
  id: string;
  sport: Sport;
  homeTeam: {
    id: string;
    name: string;
    abbreviation: string;
  };
  awayTeam: {
    id: string;
    name: string;
    abbreviation: string;
  };
  startTime: Date;
  venue: string;
  odds: Odds;
}

export interface ProviderHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  lastChecked: Date;
  error?: string;
}

export class OddsService {
  private static apiKey: string | null = null;
  private static sportsBlazeKey: string | null = null;

  private static getApiKey(): string {
    if (!this.apiKey) {
      this.apiKey = getPrimaryKey() || '';
    }
    if (!this.apiKey) {
      throw new Error('ODDS_API_KEY not configured');
    }
    return this.apiKey;
  }

  private static getSportsBlazeApiKey(): string | null {
    if (!this.sportsBlazeKey) {
      this.sportsBlazeKey = getSportsBlazeKey() || process.env.SPORTS_BLAZE_API_KEY || null;
    }
    return this.sportsBlazeKey;
  }

  /**
   * Health check for odds providers
   */
  static async checkHealth(): Promise<ProviderHealth> {
    const startTime = Date.now();

    // If we are intentionally running SportsBlaze-only, validate that path
    if (USE_SPORTS_BLAZE_ONLY) {
      const sbKey = this.getSportsBlazeApiKey();
      if (!sbKey) {
        return {
          name: 'SportsBlaze',
          status: 'down',
          lastChecked: new Date(),
          error: 'SportsBlaze key missing',
        };
      }
      try {
        const today = new Date().toISOString().split('T')[0];
        const daily = await fetchSportsBlazeDailySchedule(sbKey, today, {}, 'nfl');
        const responseTime = Date.now() - startTime;
        const hasData = Array.isArray(daily?.games) && daily.games.length > 0;
        return {
          name: 'SportsBlaze',
          status: hasData ? 'healthy' : 'degraded',
          responseTime,
          lastChecked: new Date(),
          error: hasData ? undefined : 'No data returned',
        };
      } catch (err: any) {
        const responseTime = Date.now() - startTime;
        return {
          name: 'SportsBlaze',
          status: 'down',
          responseTime,
          lastChecked: new Date(),
          error: err?.message || 'Unknown error',
        };
      }
    }

    const apiKey = this.getApiKey();

    try {
      // Test with a simple API call (NFL games for today)
      const testUrl = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds/?apiKey=${apiKey}&regions=us&markets=spreads&oddsFormat=american`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      try {
        const response = await fetch(testUrl, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            return {
              name: 'The Odds API',
              status: 'down',
              responseTime,
              lastChecked: new Date(),
              error: 'Authentication failed - invalid API key',
            };
          }

          return {
            name: 'The Odds API',
            status: 'degraded',
            responseTime,
            lastChecked: new Date(),
            error: `HTTP ${response.status}: ${response.statusText}`,
          };
        }

        // Check if response has data
        const data = await response.json();
        const hasData = Array.isArray(data) && data.length > 0;

        return {
          name: 'The Odds API',
          status: hasData ? 'healthy' : 'degraded',
          responseTime,
          lastChecked: new Date(),
          error: hasData ? undefined : 'No data returned',
        };
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        if (fetchError.name === 'AbortError') {
          return {
            name: 'The Odds API',
            status: 'down',
            responseTime,
            lastChecked: new Date(),
            error: 'Request timeout (>5s)',
          };
        }

        return {
          name: 'The Odds API',
          status: 'down',
          responseTime,
          lastChecked: new Date(),
          error: fetchError.message || 'Network error',
        };
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        name: 'The Odds API',
        status: 'down',
        responseTime,
        lastChecked: new Date(),
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Get games for a specific sport and date
   */
  static async getGames(options: {
    sport?: Sport;
    date?: string;
  }): Promise<GameWithOdds[]> {
    const sport = options.sport || 'nfl';
    const date = options.date || new Date().toISOString().split('T')[0];

    // Check cache first
    const cacheKey = cacheManager.generateKey('games', { sport, date });
    const cached = cacheManager.get<GameWithOdds[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const sportKey = SPORT_KEY_MAP[sport];
    if (!sportKey) {
      throw new Error(`Unsupported sport: ${sport}`);
    }

    // SportsBlaze-only short-circuit (temporary) - but NOT for college sports
    // SportsBlaze doesn't support NCAAF/NCAAB, so we always use The Odds API for those
    if (USE_SPORTS_BLAZE_ONLY && !COLLEGE_SPORTS.includes(sport)) {
      return this.fetchSportsBlazeGames(cacheKey, sport, date);
    }

    // For college sports, use The Odds API
    if (COLLEGE_SPORTS.includes(sport)) {
      return this.fetchOddsApiGames(cacheKey, sport, date);
    }

    // Primary provider: The Odds API
    try {
      const apiKey = this.getApiKey();
      const games = await circuitBreakers.oddsApi.execute(async () => {
        return await fetchScheduleFromOddsApi(apiKey, sportKey as any);
      });

      const result = games.map((game): GameWithOdds => ({
        id: game.id || `${game.homeTeam}-${game.awayTeam}-${game.date}`,
        sport: sport,
        homeTeam: {
          id: game.homeTeam.toLowerCase().replace(/\s+/g, '-'),
          name: game.homeTeam,
          abbreviation: game.homeTeam.substring(0, 3).toUpperCase(),
        },
        awayTeam: {
          id: game.awayTeam.toLowerCase().replace(/\s+/g, '-'),
          name: game.awayTeam,
          abbreviation: game.awayTeam.substring(0, 3).toUpperCase(),
        },
        startTime: new Date(game.date),
        venue: game.venue || 'TBD',
        odds: {
          sportsbook: 'consensus',
          spread: {
            home: game.odds?.spread || 0,
            homeOdds: -110,
            away: -(game.odds?.spread || 0),
            awayOdds: -110,
          },
          moneyline: {
            home: game.odds?.home || -110,
            away: game.odds?.away || -110,
          },
          total: {
            line: game.odds?.total || 44.5,
            overOdds: -110,
            underOdds: -110,
          },
          timestamp: new Date(),
        },
      }));

      cacheManager.set(cacheKey, result, 60 * 1000);
      return result;
    } catch (error: any) {
      console.warn('[OddsService] Primary odds provider failed, trying SportsBlaze fallback:', error?.message || error);
    }

    // Fallback provider: SportsBlaze schedules with neutral odds
    return this.fetchSportsBlazeGames(cacheKey, sport, date);
  }

  /**
   * Get odds for a specific game
   */
  static async getOdds(gameId: string): Promise<Odds | null> {
    // Try to extract sport from gameId (sport-prefixed), otherwise default to nfl when in fallback mode.
    const parts = gameId.split('-');
    const sport = (parts.length >= 2 ? (parts[0] as Sport) : 'nfl');
    const sportKey = SPORT_KEY_MAP[sport];

    if (!sportKey) {
      throw new Error(`Unsupported sport: ${sport}`);
    }

    // Check cache first
    const cacheKey = cacheManager.generateKey('odds', { gameId });
    const cached = cacheManager.get<Odds>(cacheKey);
    if (cached) {
      return cached;
    }

    // SportsBlaze-only short-circuit (skip for college sports since SportsBlaze doesn't support them)
    if (USE_SPORTS_BLAZE_ONLY && !COLLEGE_SPORTS.includes(sport)) {
      const games = await this.getGames({ sport });
      const match = games.find(g => g.id === gameId);
      const odds = match ? match.odds : buildNeutralOdds(sport);
      cacheManager.set(cacheKey, odds, 30 * 1000);
      return odds;
    }

    // For college sports, fetch from The Odds API
    if (COLLEGE_SPORTS.includes(sport)) {
      const games = await this.fetchOddsApiGames(cacheKey, sport, new Date().toISOString().split('T')[0]);
      const match = games.find(g => g.id === gameId);
      const odds = match ? match.odds : buildNeutralOdds(sport);
      cacheManager.set(cacheKey, odds, 30 * 1000);
      return odds;
    }

    const apiKey = this.getApiKey();

    try {
      // Use circuit breaker
      const odds = await circuitBreakers.oddsApi.execute(async () => {
        return await fetchLiveOddsTheOddsApi(apiKey, sportKey as any);
      });

      // Find matching game
      const game = odds.find(o => {
        const gameIdMatch = `${sport}-${o.homeTeam.toLowerCase().replace(/\s+/g, '-')}-${o.awayTeam.toLowerCase().replace(/\s+/g, '-')}`;
        return gameIdMatch === gameId || gameId.includes(o.homeTeam) || gameId.includes(o.awayTeam);
      });

      if (!game) {
        return null;
      }

      return {
        sportsbook: 'consensus',
        spread: {
          home: game.spread || 0,
          homeOdds: -110,
          away: -(game.spread || 0),
          awayOdds: -110,
        },
        moneyline: {
          home: game.moneyline?.home || -110,
          away: game.moneyline?.away || -110,
        },
        total: {
          line: game.total || 44.5,
          overOdds: -110,
          underOdds: -110,
        },
        timestamp: new Date(),
      };

    } catch (error: any) {
      console.error('[OddsService] Error fetching odds:', error);
      return null;
    }
  }

  /**
   * Get a single game by ID
   */
  static async getGame(gameId: string): Promise<GameWithOdds | null> {
    const parts = gameId.split('-');
    if (parts.length < 2) {
      throw new Error(`Invalid gameId format: ${gameId}`);
    }

    const sport = parts[0] as Sport;
    const games = await this.getGames({ sport });

    return games.find(g => g.id === gameId) || null;
  }

  private static async fetchSportsBlazeGames(cacheKey: string, sport: Sport, date: string): Promise<GameWithOdds[]> {
    const sbKey = this.getSportsBlazeApiKey();
    const leagueMap: Partial<Record<Sport, SportsBlazeLeagueId>> = {
      nfl: 'nfl',
      nba: 'nba',
      nhl: 'nhl',
      mlb: 'mlb',
    };
    const league = leagueMap[sport];
    if (!sbKey || !league) {
      console.warn('[OddsService] SportsBlaze fallback skipped: missing key or unsupported sport', { sport, hasKey: !!sbKey });
      return [];
    }

    const daily = await fetchSportsBlazeDailySchedule(sbKey, date, {}, league);
    const mappedGames = mapSportsBlazeGamesToPrognoGames(daily.games || [], league);

    const result = mappedGames.map((game): GameWithOdds => ({
      id: `${sport}-${(game.id || `${game.homeTeam}-${game.awayTeam}-${game.date}`)}`,
      sport: sport,
      homeTeam: {
        id: game.homeTeam.toLowerCase().replace(/\s+/g, '-'),
        name: game.homeTeam,
        abbreviation: game.homeTeam.substring(0, 3).toUpperCase(),
      },
      awayTeam: {
        id: game.awayTeam.toLowerCase().replace(/\s+/g, '-'),
        name: game.awayTeam,
        abbreviation: game.awayTeam.substring(0, 3).toUpperCase(),
      },
      startTime: new Date(game.date),
      venue: game.venue || 'TBD',
      odds: buildNeutralOdds(sport),
    }));

    cacheManager.set(cacheKey, result, 60 * 1000);
    return result;
  }

  /**
   * Fetch games from The Odds API (used for college sports and as primary provider)
   */
  private static async fetchOddsApiGames(cacheKey: string, sport: Sport, date: string): Promise<GameWithOdds[]> {
    const apiKey = this.getApiKey();
    const oddsApiSportKey = ODDS_API_SPORT_KEYS[sport];
    
    if (!oddsApiSportKey) {
      console.warn('[OddsService] No Odds API sport key for:', sport);
      return [];
    }

    try {
      const url = `https://api.the-odds-api.com/v4/sports/${oddsApiSportKey}/odds/?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        console.error(`[OddsService] The Odds API failed for ${sport}: ${response.status}`);
        return [];
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        console.warn('[OddsService] Unexpected response format from The Odds API');
        return [];
      }

      const result = data.map((game: any): GameWithOdds => {
        // Extract odds from bookmakers
        let spread = 0;
        let homeMoneyline = -110;
        let awayMoneyline = -110;
        let total = sport === 'cfb' ? 55 : sport === 'cbb' ? 145 : 44;

        if (game.bookmakers && game.bookmakers.length > 0) {
          const book = game.bookmakers[0];
          
          // Find h2h (moneyline) market
          const h2hMarket = book.markets?.find((m: any) => m.key === 'h2h');
          if (h2hMarket?.outcomes) {
            const homeOutcome = h2hMarket.outcomes.find((o: any) => o.name === game.home_team);
            const awayOutcome = h2hMarket.outcomes.find((o: any) => o.name === game.away_team);
            if (homeOutcome) homeMoneyline = homeOutcome.price;
            if (awayOutcome) awayMoneyline = awayOutcome.price;
          }

          // Find spreads market
          const spreadsMarket = book.markets?.find((m: any) => m.key === 'spreads');
          if (spreadsMarket?.outcomes) {
            const homeSpread = spreadsMarket.outcomes.find((o: any) => o.name === game.home_team);
            if (homeSpread) spread = homeSpread.point || 0;
          }

          // Find totals market
          const totalsMarket = book.markets?.find((m: any) => m.key === 'totals');
          if (totalsMarket?.outcomes) {
            const overOutcome = totalsMarket.outcomes.find((o: any) => o.name === 'Over');
            if (overOutcome) total = overOutcome.point || total;
          }
        }

        return {
          id: `${sport}-${game.home_team.toLowerCase().replace(/\s+/g, '-')}-${game.away_team.toLowerCase().replace(/\s+/g, '-')}`,
          sport: sport,
          homeTeam: {
            id: game.home_team.toLowerCase().replace(/\s+/g, '-'),
            name: game.home_team,
            abbreviation: game.home_team.substring(0, 3).toUpperCase(),
          },
          awayTeam: {
            id: game.away_team.toLowerCase().replace(/\s+/g, '-'),
            name: game.away_team,
            abbreviation: game.away_team.substring(0, 3).toUpperCase(),
          },
          startTime: new Date(game.commence_time),
          venue: 'TBD',
          odds: {
            sportsbook: 'The Odds API',
            spread: {
              home: spread,
              homeOdds: -110,
              away: -spread,
              awayOdds: -110,
            },
            moneyline: {
              home: homeMoneyline,
              away: awayMoneyline,
            },
            total: {
              line: total,
              overOdds: -110,
              underOdds: -110,
            },
            timestamp: new Date(),
          },
        };
      });

      cacheManager.set(cacheKey, result, 60 * 1000);
      return result;
    } catch (error: any) {
      console.error('[OddsService] Error fetching from The Odds API:', error?.message || error);
      return [];
    }
  }
}

function buildNeutralOdds(sport: Sport): Odds {
  const totals: Partial<Record<Sport, number>> = {
    nfl: 44,
    nba: 220,
    nhl: 6,
    mlb: 8.5,
    cfb: 55,
    cbb: 145,
    soccer: 2.5,
    mma: 3,
    tennis: 22,
  };
  const total = totals[sport] ?? 44;
  return {
    sportsbook: 'SportsBlaze (neutral)',
    spread: {
      home: 0,
      homeOdds: -110,
      away: 0,
      awayOdds: -110,
    },
    moneyline: {
      home: -110,
      away: -110,
    },
    total: {
      line: total,
      overOdds: -110,
      underOdds: -110,
    },
    timestamp: new Date(),
  };
}

