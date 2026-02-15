/**
 * API-Sports Plugin (Fallback)
 * Used when odds sites don't have data
 */

import { OddsSourcePlugin, OddsData } from './index';
import { fetchApiSportsOdds } from '../api-sports-client';

export const ApiSportsPlugin: OddsSourcePlugin = {
  name: 'API-Sports',
  priority: 10, // Low priority - fallback
  supportedSports: ['nhl', 'nba', 'nfl', 'mlb', 'ncaab', 'ncaaf', 'nascar', 'college-baseball'],
  
  async fetchOdds(sport: string, date?: string): Promise<OddsData[]> {
    console.log(`[API-Sports] Fetching ${sport} odds (fallback)...`);
    
    try {
      // Use the existing API-Sports client
      const games = await fetchApiSportsOdds(sport, date);
      
      // Transform to standard format
      const odds: OddsData[] = games.map(game => ({
        id: `apisports-${game.id}`,
        sport: game.sport,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        startTime: game.startTime,
        venue: game.venue,
        odds: game.odds,
        source: 'api-sports',
        lastUpdated: new Date().toISOString(),
      }));

      console.log(`[API-Sports] Found ${odds.length} ${sport} games`);
      return odds;

    } catch (error) {
      console.error(`[API-Sports] Error:`, error);
      throw error;
    }
  },
};
