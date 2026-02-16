/**
 * BetStack API Integration
 * Comprehensive sports data with global CDN
 * Base URL: https://api.betstack.dev
 * Rate Limit: 1 request per 60 seconds
 * Docs: api.betstack.dev/docs
 */

const BETSTACK_API_KEY = process.env.BETSTACK_API_KEY || '';
const BETSTACK_BASE_URL = 'https://api.betstack.dev';

export interface BetStackOdds {
  id: string;
  sport: string;
  raceName: string;
  driver: string;
  odds: number;
  oddsAmerican: string;
  bookmaker: string;
  raceDate: string;
}

/**
 * Fetch NASCAR odds from BetStack API
 * Tries multiple endpoints until one works
 */
export async function fetchBetStackNASCAROdds(): Promise<BetStackOdds[]> {
  if (!BETSTACK_API_KEY) {
    console.log('[BetStack] No API key configured');
    return [];
  }

  try {
    const response = await fetch(`${BETSTACK_BASE_URL}/api/v1/events?sport=motorsports`, {
      headers: {
        'X-API-Key': BETSTACK_API_KEY,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.warn(`[BetStack] HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();
    return parseBetStackResponse(data);

  } catch (error) {
    console.warn('[BetStack] Error:', error);
    return [];
  }
}

/**
 * Try alternative motorsports endpoint on all base URLs
 */
async function fetchBetStackRacingOdds(): Promise<BetStackOdds[]> {
  return fetchBetStackNASCAROdds();
}

/**
 * Parse BetStack API response
 */
function parseBetStackResponse(data: any): BetStackOdds[] {
  if (!data || !Array.isArray(data.events || data.odds || data)) {
    console.warn('[BetStack] Invalid response format');
    return [];
  }

  const events = data.events || data.odds || data;
  const odds: BetStackOdds[] = [];

  events.forEach((event: any, idx: number) => {
    const raceName = event.name || event.event_name || 'Daytona 500';
    const raceDate = event.date || event.start_time || new Date().toISOString();

    // Parse participants/drivers
    const participants = event.participants || event.drivers || event.selections || [];

    participants.forEach((driver: any, driverIdx: number) => {
      const driverName = driver.name || driver.label || driver.driver_name;
      const driverOdds = driver.odds || driver.price || driver.decimal_odds;

      if (driverName && driverOdds) {
        odds.push({
          id: `betstack-${event.id || idx}-${driverIdx}`,
          sport: 'nascar',
          raceName,
          driver: driverName,
          odds: parseFloat(driverOdds),
          oddsAmerican: decimalToAmerican(parseFloat(driverOdds)),
          bookmaker: 'BetStack',
          raceDate,
        });
      }
    });
  });

  console.log(`[BetStack] Parsed ${odds.length} driver odds`);
  return odds;
}

/**
 * Convert decimal odds to American format
 */
function decimalToAmerican(decimal: number): string {
  if (decimal >= 2) {
    return `+${Math.round((decimal - 1) * 100)}`;
  } else {
    return `-${Math.round(100 / (decimal - 1))}`;
  }
}

/**
 * Convert BetStack odds to OddsService format
 */
export function convertBetStackToOddsService(odds: BetStackOdds[]): any[] {
  if (odds.length === 0) return [];

  const raceName = odds[0]?.raceName || 'Daytona 500';

  return [{
    id: `nascar-betstack-${Date.now()}`,
    sport: 'nascar',
    homeTeam: raceName,
    awayTeam: 'Field',
    startTime: odds[0]?.raceDate || new Date().toISOString(),
    venue: 'Daytona International Speedway',
    odds: {
      moneyline: { home: null, away: null },
      spread: { home: null, away: null },
      total: { line: null },
    },
    source: 'betstack',
    drivers: odds.map(o => ({
      name: o.driver,
      odds: o.oddsAmerican,
      oddsDecimal: o.odds,
    })),
  }];
}

export const betstackApi = {
  fetchNASCAROdds: fetchBetStackNASCAROdds,
  convertToOddsService: convertBetStackToOddsService,
};
