/**
 * Vegas Insider Odds Plugin
 * Scrapes odds from Vegas Insider
 */

import { OddsSourcePlugin, OddsData } from './index';

export const VegasInsiderPlugin: OddsSourcePlugin = {
  name: 'VegasInsider',
  priority: 2, // Second priority
  supportedSports: ['nhl', 'nba', 'nfl', 'mlb', 'ncaab', 'ncaaf'],
  
  async fetchOdds(sport: string, date?: string): Promise<OddsData[]> {
    console.log(`[VegasInsider] Fetching ${sport} odds...`);
    
    const sportMapping: Record<string, string> = {
      'nhl': 'nhl/odds/',
      'nba': 'nba/odds/',
      'nfl': 'nfl/odds/',
      'mlb': 'mlb/odds/',
      'ncaab': 'college-basketball/odds/',
      'ncaaf': 'college-football/odds/',
    };

    const viSport = sportMapping[sport.toLowerCase()];
    if (!viSport) {
      throw new Error(`Sport ${sport} not supported by Vegas Insider`);
    }

    try {
      const response = await fetch(`https://www.vegasinsider.com/${viSport}`, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        next: { revalidate: 60 },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Note: This is a placeholder - actual implementation would parse the HTML
      // For now, return empty to trigger fallback
      console.log(`[VegasInsider] HTML scraping not implemented yet, returning empty`);
      return [];

    } catch (error) {
      console.error(`[VegasInsider] Error:`, error);
      throw error;
    }
  },
};
