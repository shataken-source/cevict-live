/**
 * BetStack API Client for NASCAR Odds
 * Uses BetStack API for real-time sports betting odds
 */

const BETSTACK_API_KEY = process.env.BETSTACK_API_KEY || '68059a48f052f3f6cb3687a67fc03f3cce36f1c896810cf46f23f380802a6d49';
// Try multiple possible BetStack API endpoints
const BETSTACK_BASE_URLS = [
  'https://api.betstack.com/v1',
  'https://api.betstack.io/v1',
  'https://betstack.com/api/v1',
  'https://www.betstack.com/api/v1',
  'https://api.betstack.co/v1',
];

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
  for (const baseUrl of BETSTACK_BASE_URLS) {
    try {
      console.log(`[BetStack] Trying ${baseUrl}...`);

      const response = await fetch(`${baseUrl}/odds/nascar`, {
        headers: {
          'Authorization': `Bearer ${BETSTACK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        next: { revalidate: 300 },
      });

      if (!response.ok) {
        console.warn(`[BetStack] ${baseUrl} HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      console.log(`[BetStack] ${baseUrl} success:`, JSON.stringify(data).slice(0, 200));
      return parseBetStackResponse(data);

    } catch (error) {
      console.warn(`[BetStack] ${baseUrl} failed:`, (error as Error).message);
    }
  }

  console.error('[BetStack] All endpoints failed');
  return [];
}

/**
 * Try alternative motorsports endpoint on all base URLs
 */
async function fetchBetStackRacingOdds(): Promise<BetStackOdds[]> {
  for (const baseUrl of BETSTACK_BASE_URLS) {
    try {
      const response = await fetch(`${baseUrl}/odds/motorsports`, {
        headers: {
          'Authorization': `Bearer ${BETSTACK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        next: { revalidate: 300 },
      });

      if (response.ok) {
        const data = await response.json();
        return parseBetStackResponse(data);
      }
    } catch (error) {
      // Continue to next URL
    }
  }
  return [];
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
