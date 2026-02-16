/**
 * Mock Odds - DEPRECATED
 *
 * This file previously contained mock odds data.
 * All mock data has been removed. The application now exclusively
 * uses real API data from The-Odds API, API-SPORTS, and other live sources.
 *
 * For any future needs, use the OddsCacheService in lib/odds-cache.ts
 * or the OddsService in lib/odds-service.ts for real data.
 */

export interface MockGame {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  venue: string;
  odds: {
    moneyline: { home: number; away: number };
    spread: { home: number; away: number };
    total: { line: number };
  };
}

/**
 * @deprecated Use OddsService.getGames() for real data
 */
export function getMockOdds(sport: string): MockGame[] {
  console.warn('[MockOdds] DEPRECATED: Use OddsService for real data');
  return [];
}

/**
 * @deprecated Use OddsService.getGames() for real data
 */
export function getAllMockOdds(): Record<string, MockGame[]> {
  console.warn('[MockOdds] DEPRECATED: Use OddsService for real data');
  return {};
}
