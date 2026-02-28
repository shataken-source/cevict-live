/**
 * Real Sports Data APIs Integration
 * Supports: SportsData.io, ESPN API, and other real data sources
 * NO MOCK DATA - Only real odds from real APIs
 */

// SportsData.io API Integration
const SPORTSDATA_API_KEY = process.env.SPORTSDATA_API_KEY || '';
const SPORTSDATA_BASE_URL = 'https://api.sportsdata.io/v3';

// ESPN API (free, no key required for basic odds)
const ESPN_BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports';

interface RealOddsGame {
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
  source: string; // Which API provided this data
}

/**
 * ESPN API - Free, no API key required
 * Fetches real game data and odds from ESPN
 */
export async function fetchESPNOdds(sport: string): Promise<RealOddsGame[]> {
  try {
    // ESPN sport mappings
    const espnSportMap: Record<string, string> = {
      nfl: 'football/nfl',
      nba: 'basketball/nba',
      nhl: 'hockey/nhl',
      mlb: 'baseball/mlb',
      ncaab: 'basketball/mens-college-basketball',
      ncaaf: 'football/college-football',
    };

    const espnSport = espnSportMap[sport.toLowerCase()];
    if (!espnSport) {
      console.log(`[ESPN] Sport ${sport} not supported`);
      return [];
    }

    // ESPN scoreboard API - includes betting odds when available
    const url = `${ESPN_BASE_URL}/${espnSport}/scoreboard`;
    console.log(`[ESPN] Fetching odds from ${url}`);

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 } // Cache 5 min
    });

    if (!response.ok) {
      console.warn(`[ESPN] HTTP ${response.status} for ${sport}`);
      return [];
    }

    const data = await response.json();
    const events = data.events || [];

    console.log(`[ESPN] ${sport}: ${events.length} events found`);

    const games: RealOddsGame[] = [];

    for (const event of events) {
      // Extract teams
      const competitors = event.competitions?.[0]?.competitors || [];
      const homeTeam = competitors.find((c: any) => c.homeAway === 'home');
      const awayTeam = competitors.find((c: any) => c.homeAway === 'away');

      if (!homeTeam || !awayTeam) continue;

      const comp = event.competitions?.[0];

      // Log first event structure for debugging
      if (games.length === 0) {
        console.log(`[ESPN] First event keys:`, Object.keys(event));
        console.log(`[ESPN] Competition keys:`, Object.keys(comp || {}));
        console.log(`[ESPN] Odds data:`, JSON.stringify(comp?.odds, null, 2));
      }

      // Extract odds from ESPN - try multiple paths
      let homeOdds = null, awayOdds = null, spread = null, overUnder = null;

      if (comp?.odds?.[0]) {
        const odds = comp.odds[0];
        homeOdds = odds.homeTeamOdds?.moneyLine || odds.homeMoneyLine || odds.moneyline?.home;
        awayOdds = odds.awayTeamOdds?.moneyLine || odds.awayMoneyLine || odds.moneyline?.away;
        spread = odds.spread || odds.pointSpread;
        overUnder = odds.overUnder || odds.total;
      }

      // Skip games without odds
      if (!homeOdds && !awayOdds && !spread) {
        continue;
      }

      games.push({
        id: event.id,
        sport: sport.toLowerCase(),
        homeTeam: homeTeam.team?.displayName || homeTeam.team?.name,
        awayTeam: awayTeam.team?.displayName || awayTeam.team?.name,
        startTime: event.date,
        venue: event.competitions?.[0]?.venue?.fullName || 'TBD',
        odds: {
          moneyline: {
            home: homeOdds ? parseInt(homeOdds) : null,
            away: awayOdds ? parseInt(awayOdds) : null
          },
          spread: {
            home: spread ? parseFloat(spread) : null,
            away: spread ? -parseFloat(spread) : null
          },
          total: {
            line: overUnder ? parseFloat(overUnder) : null
          }
        },
        source: 'ESPN'
      });
    }

    console.log(`[ESPN] Found ${games.length} games with odds for ${sport}`);
    return games;

  } catch (error) {
    console.error(`[ESPN] Error fetching ${sport}:`, error);
    return [];
  }
}

/**
 * SportsData.io API - Requires API key
 * Premium data provider with comprehensive odds
 */
export async function fetchSportsDataIOOdds(sport: string): Promise<RealOddsGame[]> {
  if (!SPORTSDATA_API_KEY) {
    console.log('[SportsData.io] No API key configured');
    return [];
  }

  try {
    // SportsData.io sport mappings
    const sportMap: Record<string, { league: string; season: string }> = {
      nfl: { league: 'nfl', season: '2025REG' },
      nba: { league: 'nba', season: '2026' },
      nhl: { league: 'nhl', season: '2026' },
      mlb: { league: 'mlb', season: '2026' },
      ncaab: { league: 'cbb', season: '2025' },
      ncaaf: { league: 'cfb', season: '2025' },
    };

    const config = sportMap[sport.toLowerCase()];
    if (!config) {
      console.log(`[SportsData.io] Sport ${sport} not supported`);
      return [];
    }

    // SportsData.io odds endpoint
    const url = `${SPORTSDATA_BASE_URL}/${config.league}/odds/json/GameOddsByDate/${new Date().toISOString().split('T')[0]}?key=${SPORTSDATA_API_KEY}`;

    console.log(`[SportsData.io] Fetching odds for ${sport}`);

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      console.warn(`[SportsData.io] HTTP ${response.status} for ${sport}`);
      return [];
    }

    const data = await response.json();

    const games: RealOddsGame[] = data.map((game: any) => ({
      id: game.GameID?.toString() || `sd-${Date.now()}`,
      sport: sport.toLowerCase(),
      homeTeam: game.HomeTeamName,
      awayTeam: game.AwayTeamName,
      startTime: game.DateTime || new Date().toISOString(),
      venue: game.Stadium?.Name || 'TBD',
      odds: {
        moneyline: {
          home: game.PregameOdds?.[0]?.HomeMoneyLine || null,
          away: game.PregameOdds?.[0]?.AwayMoneyLine || null
        },
        spread: {
          home: game.PregameOdds?.[0]?.HomePointSpread || null,
          away: game.PregameOdds?.[0]?.HomePointSpread ? -game.PregameOdds[0].HomePointSpread : null
        },
        total: {
          line: game.PregameOdds?.[0]?.OverUnder || null
        }
      },
      source: 'SportsData.io'
    }));

    console.log(`[SportsData.io] Found ${games.length} games for ${sport}`);
    return games;

  } catch (error) {
    console.error(`[SportsData.io] Error fetching ${sport}:`, error);
    return [];
  }
}

/**
 * Aggregate real odds from all available sources
 * Priority: ESPN (free) -> SportsData.io (paid) -> The-Odds API (existing)
 */
export async function fetchRealOdds(sport: string): Promise<RealOddsGame[]> {
  console.log(`[RealOdds] Fetching real odds for ${sport}...`);

  // Try ESPN first (free, reliable)
  const espnOdds = await fetchESPNOdds(sport);
  if (espnOdds.length > 0) {
    console.log(`[RealOdds] Using ESPN data for ${sport}`);
    return espnOdds;
  }

  // Try SportsData.io if ESPN fails
  const sdOdds = await fetchSportsDataIOOdds(sport);
  if (sdOdds.length > 0) {
    console.log(`[RealOdds] Using SportsData.io for ${sport}`);
    return sdOdds;
  }

  console.log(`[RealOdds] No real odds available for ${sport}`);
  return [];
}

/**
 * Get all 7 sports with real odds
 */
export async function fetchAllRealOdds(): Promise<Record<string, RealOddsGame[]>> {
  const sports = ['nhl', 'nba', 'nfl', 'mlb', 'ncaab', 'ncaaf'];
  const results: Record<string, RealOddsGame[]> = {};

  for (const sport of sports) {
    results[sport] = await fetchRealOdds(sport);
  }

  return results;
}

export type { RealOddsGame };
