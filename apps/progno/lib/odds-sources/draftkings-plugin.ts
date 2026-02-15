/**
 * DraftKings Odds Plugin
 * Scrapes odds from DraftKings sportsbook
 */

import { OddsSourcePlugin, OddsData } from './index';

export const DraftKingsPlugin: OddsSourcePlugin = {
  name: 'DraftKings',
  priority: 1, // Highest priority - try first
  supportedSports: ['nhl', 'nba', 'nfl', 'mlb', 'ncaab', 'ncaaf', 'nascar', 'college-baseball'],

  async fetchOdds(sport: string, date?: string): Promise<OddsData[]> {
    console.log(`[DraftKings] Fetching ${sport} odds...`);

    const sportMapping: Record<string, string> = {
      'nhl': 'icehockey/nhl',
      'nba': 'basketball/nba',
      'nfl': 'football/nfl',
      'mlb': 'baseball/mlb',
      'ncaab': 'basketball/ncaab',
      'ncaaf': 'football/ncaaf',
      'nascar': 'motorsports/nascar',
      'college-baseball': 'baseball/ncaa',
    };

    const dkSport = sportMapping[sport.toLowerCase()];
    if (!dkSport) {
      throw new Error(`Sport ${sport} not supported by DraftKings`);
    }

    try {
      // Use DraftKings public API with proper headers
      const url = `https://sportsbook.draftkings.com/sites/US-SB/api/v5/eventgroups/${dkSport}?format=json`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://sportsbook.draftkings.com/',
          'Origin': 'https://sportsbook.draftkings.com',
        },
        next: { revalidate: 0 }, // Don't cache
      });

      if (!response.ok) {
        const text = await response.text();
        console.log(`[DraftKings] Response preview: ${text.substring(0, 200)}`);
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await response.text();
        console.log(`[DraftKings] Non-JSON response: ${text.substring(0, 200)}`);
        throw new Error('Non-JSON response - likely blocked by cloudflare');
      }

      const data = await response.json();

      // Transform DraftKings data - their API structure uses eventGroup offers
      const events = data.eventGroup?.offerCategories?.flatMap((cat: any) =>
        cat.offerSubcategoryDescriptors?.flatMap((sub: any) =>
          sub.offers || []
        ) || []
      ) || [];

      console.log(`[DraftKings] Raw events found: ${events.length}`);

      const odds: OddsData[] = events.map((event: any) => ({
        id: event.eventId || `dk-${event.id}`,
        sport: sport.toLowerCase(),
        homeTeam: event.homeTeamName,
        awayTeam: event.awayTeamName,
        startTime: event.startDate,
        venue: event.venue?.name || 'Unknown',
        odds: {
          moneyline: {
            home: event.markets?.moneyline?.home?.odds || null,
            away: event.markets?.moneyline?.away?.odds || null,
          },
          spread: {
            home: event.markets?.spread?.home?.odds || null,
            away: event.markets?.spread?.away?.odds || null,
            line: event.markets?.spread?.home?.line || null,
          },
          total: {
            line: event.markets?.total?.line || null,
            over: event.markets?.total?.over?.odds || null,
            under: event.markets?.total?.under?.odds || null,
          },
        },
        source: 'draftkings',
        lastUpdated: new Date().toISOString(),
      })) || [];

      console.log(`[DraftKings] Found ${odds.length} ${sport} games`);
      return odds;

    } catch (error) {
      console.error(`[DraftKings] Error:`, error);
      throw error;
    }
  },
};
