/**
 * Mock/Cached Odds Fallback
 * Provides realistic odds when both The-Odds API and Vegas Insider fail
 * This is temporary until Vegas Insider scraper is fully implemented
 */

interface MockGame {
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

// Realistic odds based on current season data (Feb 15, 2026)
const MOCK_ODDS: Record<string, MockGame[]> = {
  nhl: [
    {
      id: 'nhl-2026-02-15-1',
      sport: 'nhl',
      homeTeam: 'Edmonton Oilers',
      awayTeam: 'Toronto Maple Leafs',
      startTime: '2026-02-15T19:00:00Z',
      venue: 'Rogers Place',
      odds: {
        moneyline: { home: -140, away: 120 },
        spread: { home: -1.5, away: 1.5 },
        total: { line: 6.5 }
      }
    },
    {
      id: 'nhl-2026-02-15-2',
      sport: 'nhl',
      homeTeam: 'Colorado Avalanche',
      awayTeam: 'Dallas Stars',
      startTime: '2026-02-15T21:00:00Z',
      venue: 'Ball Arena',
      odds: {
        moneyline: { home: -125, away: 105 },
        spread: { home: -1.5, away: 1.5 },
        total: { line: 6 }
      }
    },
    {
      id: 'nhl-2026-02-15-3',
      sport: 'nhl',
      homeTeam: 'Boston Bruins',
      awayTeam: 'Florida Panthers',
      startTime: '2026-02-15T18:00:00Z',
      venue: 'TD Garden',
      odds: {
        moneyline: { home: 110, away: -130 },
        spread: { home: 1.5, away: -1.5 },
        total: { line: 5.5 }
      }
    }
  ],
  nba: [
    {
      id: 'nba-2026-02-15-1',
      sport: 'nba',
      homeTeam: 'Boston Celtics',
      awayTeam: 'Milwaukee Bucks',
      startTime: '2026-02-15T20:00:00Z',
      venue: 'TD Garden',
      odds: {
        moneyline: { home: -180, away: 150 },
        spread: { home: -4.5, away: 4.5 },
        total: { line: 225.5 }
      }
    },
    {
      id: 'nba-2026-02-15-2',
      sport: 'nba',
      homeTeam: 'Denver Nuggets',
      awayTeam: 'Phoenix Suns',
      startTime: '2026-02-15T22:00:00Z',
      venue: 'Ball Arena',
      odds: {
        moneyline: { home: -160, away: 135 },
        spread: { home: -3.5, away: 3.5 },
        total: { line: 230 }
      }
    },
    {
      id: 'nba-2026-02-15-3',
      sport: 'nba',
      homeTeam: 'LA Lakers',
      awayTeam: 'Golden State Warriors',
      startTime: '2026-02-15T19:30:00Z',
      venue: 'Crypto.com Arena',
      odds: {
        moneyline: { home: -110, away: -110 },
        spread: { home: -1, away: 1 },
        total: { line: 235 }
      }
    }
  ],
  nfl: [
    {
      id: 'nfl-2026-02-15-1',
      sport: 'nfl',
      homeTeam: 'Kansas City Chiefs',
      awayTeam: 'Philadelphia Eagles',
      startTime: '2026-02-15T23:30:00Z',
      venue: 'Allegiant Stadium',
      odds: {
        moneyline: { home: -145, away: 125 },
        spread: { home: -3, away: 3 },
        total: { line: 47.5 }
      }
    }
  ],
  mlb: [
    {
      id: 'mlb-2026-02-15-1',
      sport: 'mlb',
      homeTeam: 'New York Yankees',
      awayTeam: 'Boston Red Sox',
      startTime: '2026-03-15T17:00:00Z',
      venue: 'Yankee Stadium',
      odds: {
        moneyline: { home: -150, away: 130 },
        spread: { home: -1.5, away: 1.5 },
        total: { line: 8.5 }
      }
    }
  ],
  ncaab: [
    {
      id: 'ncaab-2026-02-15-1',
      sport: 'ncaab',
      homeTeam: 'Duke Blue Devils',
      awayTeam: 'North Carolina Tar Heels',
      startTime: '2026-02-15T21:00:00Z',
      venue: 'Cameron Indoor',
      odds: {
        moneyline: { home: -200, away: 170 },
        spread: { home: -5.5, away: 5.5 },
        total: { line: 145.5 }
      }
    },
    {
      id: 'ncaab-2026-02-15-2',
      sport: 'ncaab',
      homeTeam: 'UConn Huskies',
      awayTeam: 'Marquette Golden Eagles',
      startTime: '2026-02-15T19:00:00Z',
      venue: 'XL Center',
      odds: {
        moneyline: { home: -140, away: 120 },
        spread: { home: -3, away: 3 },
        total: { line: 138.5 }
      }
    }
  ],
  ncaaf: [
    {
      id: 'ncaaf-2026-02-15-1',
      sport: 'ncaaf',
      homeTeam: 'Ohio State Buckeyes',
      awayTeam: 'Alabama Crimson Tide',
      startTime: '2026-08-30T19:00:00Z',
      venue: 'Ohio Stadium',
      odds: {
        moneyline: { home: -130, away: 110 },
        spread: { home: -2.5, away: 2.5 },
        total: { line: 52.5 }
      }
    }
  ],
  nascar: [
    {
      id: 'nascar-daytona-500-2026',
      sport: 'nascar',
      homeTeam: 'Daytona 500 Field',
      awayTeam: 'Christopher Bell',
      startTime: '2026-02-15T19:00:00Z',
      venue: 'Daytona International Speedway',
      odds: {
        moneyline: { home: 550, away: null as any },
        spread: { home: null as any, away: null as any },
        total: { line: null as any }
      }
    }
  ]
};

/**
 * Get mock odds for a sport
 */
export function getMockOdds(sport: string): MockGame[] {
  const lowerSport = sport.toLowerCase();
  const games = MOCK_ODDS[lowerSport] || [];
  
  // Update timestamps to current date
  const today = new Date();
  return games.map(game => ({
    ...game,
    startTime: today.toISOString(),
    id: `${lowerSport}-${today.toISOString().split('T')[0]}-${game.id.split('-').pop()}`
  }));
}

/**
 * Get all sports mock odds
 */
export function getAllMockOdds(): Record<string, MockGame[]> {
  const result: Record<string, MockGame[]> = {};
  for (const sport of Object.keys(MOCK_ODDS)) {
    result[sport] = getMockOdds(sport);
  }
  return result;
}

export { MockGame };
