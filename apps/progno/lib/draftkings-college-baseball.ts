/**
 * DraftKings NCAA Baseball (College Baseball) API Client
 * Scrapes odds from sportsbook.draftkings.com
 */

export interface CollegeBaseballGame {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  venue: string;
  odds: {
    moneyline: { home: number | null; away: number | null };
    spread: { home: number | null; away: number | null };
    total: { line: number | null };
  };
  source: string;
}

/**
 * Fetch NCAA Baseball games from DraftKings
 * Event Group ID for college baseball: 112
 */
export async function fetchDraftKingsCollegeBaseball(): Promise<CollegeBaseballGame[]> {
  try {
    console.log('[DraftKings] Fetching NCAA Baseball odds...');

    // DraftKings API endpoint for NCAA Baseball
    const url = 'https://sportsbook.draftkings.com/api/sports/v3/eventgroups/112?format=json';

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://sportsbook.draftkings.com/',
        'Origin': 'https://sportsbook.draftkings.com',
      },
    });

    if (!response.ok) {
      console.warn(`[DraftKings College Baseball] HTTP ${response.status}`);
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Parse DraftKings response
    const games = parseDraftKingsCollegeBaseball(data);

    console.log(`[DraftKings College Baseball] Found ${games.length} games`);
    return games;

  } catch (error) {
    console.error('[DraftKings College Baseball] Error:', error);
    return [];
  }
}

/**
 * Parse DraftKings API response for college baseball
 */
function parseDraftKingsCollegeBaseball(data: any): CollegeBaseballGame[] {
  const games: CollegeBaseballGame[] = [];

  const eventGroup = data.eventGroup || {};
  const rawEvents = eventGroup.events || [];

  rawEvents.forEach((event: any) => {
    const eventId = event.eventId;
    const eventName = event.name || '';
    const startTime = event.startDate || new Date().toISOString();

    // Parse team names from event name (format: "Team A @ Team B")
    const teams = eventName.split('@').map((t: string) => t.trim());
    if (teams.length !== 2) return;

    const [awayTeam, homeTeam] = teams;

    // Find markets
    const markets = event.markets || [];

    // Moneyline
    const moneylineMarket = markets.find((m: any) => m.marketType === 'MONEYLINE');
    let homeMoneyline: number | null = null;
    let awayMoneyline: number | null = null;

    if (moneylineMarket && moneylineMarket.selections) {
      const homeSelection = moneylineMarket.selections.find((s: any) => s.label === homeTeam);
      const awaySelection = moneylineMarket.selections.find((s: any) => s.label === awayTeam);

      if (homeSelection?.odds?.decimal) {
        homeMoneyline = decimalToAmerican(parseFloat(homeSelection.odds.decimal));
      }
      if (awaySelection?.odds?.decimal) {
        awayMoneyline = decimalToAmerican(parseFloat(awaySelection.odds.decimal));
      }
    }

    // Spread
    const spreadMarket = markets.find((m: any) => m.marketType === 'SPREAD');
    let homeSpread: number | null = null;
    let awaySpread: number | null = null;

    if (spreadMarket && spreadMarket.selections) {
      const homeSelection = spreadMarket.selections.find((s: any) => s.label === homeTeam);
      const awaySelection = spreadMarket.selections.find((s: any) => s.label === awayTeam);

      homeSpread = homeSelection?.points || null;
      awaySpread = awaySelection?.points || (homeSpread ? -homeSpread : null);
    }

    // Total
    const totalMarket = markets.find((m: any) => m.marketType === 'TOTAL');
    let totalLine: number | null = null;

    if (totalMarket && totalMarket.selections && totalMarket.selections[0]) {
      totalLine = totalMarket.selections[0].points || null;
    }

    games.push({
      id: `dk-cbb-${eventId}`,
      sport: 'cbb',
      homeTeam,
      awayTeam,
      startTime,
      venue: 'College Baseball Stadium',
      odds: {
        moneyline: { home: homeMoneyline, away: awayMoneyline },
        spread: { home: homeSpread, away: awaySpread },
        total: { line: totalLine },
      },
      source: 'draftkings',
    });
  });

  return games;
}

/**
 * Convert decimal odds to American format
 */
function decimalToAmerican(decimal: number): number {
  if (decimal >= 2) {
    return Math.round((decimal - 1) * 100);
  } else {
    return Math.round(-100 / (decimal - 1));
  }
}
