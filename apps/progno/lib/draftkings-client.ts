/**
 * DraftKings NASCAR Odds Scraper
 * Scrapes from sportsbook.draftkings.com
 */

export interface NASCARDriver {
  id: string;
  name: string;
  odds: number; // Decimal odds
  oddsAmerican: string;
}

export interface DraftKingsNASCAREvent {
  id: string;
  name: string;
  startTime: string;
  venue: string;
  drivers: NASCARDriver[];
}

/**
 * Fetch NASCAR odds from DraftKings
 */
export async function fetchDraftKingsNASCAROdds(): Promise<DraftKingsNASCAREvent[]> {
  try {
    console.log('[DraftKings] Fetching NASCAR odds...');
    
    // DraftKings API endpoint for NASCAR Cup Series
    // Event Group ID 402 is NASCAR, subcategory 5001 is Cup Series
    const url = 'https://sportsbook.draftkings.com/api/sports/v3/eventgroups/402/5001?format=json';
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://sportsbook.draftkings.com/',
        'Origin': 'https://sportsbook.draftkings.com',
      },
    });

    if (!response.ok) {
      console.warn(`[DraftKings] HTTP ${response.status}`);
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    // Parse DraftKings response
    const events = parseDraftKingsResponse(data);
    
    console.log(`[DraftKings] Found ${events.length} NASCAR events`);
    return events;

  } catch (error) {
    console.error('[DraftKings] Error:', error);
    return [];
  }
}

/**
 * Parse DraftKings API response
 */
function parseDraftKingsResponse(data: any): DraftKingsNASCAREvent[] {
  const events: DraftKingsNASCAREvent[] = [];
  
  const eventGroup = data.eventGroup || {};
  const eventGroupName = eventGroup.name || 'NASCAR Cup Series';
  const rawEvents = eventGroup.events || [];
  
  rawEvents.forEach((event: any) => {
    const eventId = event.eventId;
    const eventName = event.name || 'Daytona 500';
    const startTime = event.startDate || new Date().toISOString();
    
    // Find outright/futures market
    const markets = event.markets || [];
    const outrightMarket = markets.find((m: any) => 
      m.marketType === 'OUTRIGHT' || 
      m.marketType === 'FUTURE' ||
      m.name?.toLowerCase().includes('winner')
    );
    
    if (!outrightMarket) {
      console.log(`[DraftKings] No outright market for ${eventName}`);
      return;
    }
    
    const drivers: NASCARDriver[] = [];
    const selections = outrightMarket.selections || [];
    
    selections.forEach((selection: any, idx: number) => {
      if (selection.odds && selection.label) {
        const decimalOdds = parseFloat(selection.odds.decimal);
        const americanOdds = selection.odds.american || decimalToAmerican(decimalOdds);
        
        drivers.push({
          id: `dk-${eventId}-${idx}`,
          name: selection.label.trim(),
          odds: decimalOdds,
          oddsAmerican: americanOdds,
        });
      }
    });
    
    if (drivers.length > 0) {
      events.push({
        id: `dk-${eventId}`,
        name: eventName,
        startTime,
        venue: 'Daytona International Speedway',
        drivers,
      });
    }
  });
  
  return events;
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
 * Convert DraftKings format to OddsService format
 */
export function convertDraftKingsToOddsService(events: DraftKingsNASCAREvent[]): any[] {
  return events.map(event => ({
    id: event.id,
    sport: 'nascar',
    homeTeam: event.name,
    awayTeam: 'Field',
    startTime: event.startTime,
    venue: event.venue,
    odds: {
      moneyline: { home: null, away: null },
      spread: { home: null, away: null },
      total: { line: null },
    },
    source: 'draftkings',
    drivers: event.drivers.map(d => ({
      name: d.name,
      odds: d.oddsAmerican,
      oddsDecimal: d.odds,
    })),
  }));
}
