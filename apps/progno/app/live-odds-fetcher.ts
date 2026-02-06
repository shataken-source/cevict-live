// Live Odds Fetcher Module for Progno Sports Prediction Platform

import { getPrimaryKey } from './keys-store';

export interface LiveOdds {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  moneyline: {
    home: number;
    away: number;
  };
  spread?: {
    home: number;
    away: number;
    homeOdds: number;
    awayOdds: number;
  };
  total?: {
    line: number;
    overOdds: number;
    underOdds: number;
  };
  sportsbook: string;
  lastUpdate: Date;
  movement: {
    moneylineChange: number;
    spreadChange: number;
    totalChange: number;
  };
}

export interface OddsComparison {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  bestMoneyline: {
    sportsbook: string;
    home: number;
    away: number;
  };
  bestSpread: {
    sportsbook: string;
    line: number;
    homeOdds: number;
    awayOdds: number;
  };
  bestTotal: {
    sportsbook: string;
    line: number;
    overOdds: number;
    underOdds: number;
  };
  arbitrageOpportunities: {
    type: 'moneyline' | 'spread' | 'total';
    profit: number;
    bets: { sportsbook: string; selection: string; odds: number }[];
  }[];
}

class LiveOddsFetcher {
  private readonly API_KEYS = {
    theOddsApi: '', // set via ctor
    oddsJam: '',
    betMGM: ''
  };

  private readonly SPORT_MAPPINGS = {
    'NFL': 'americanfootball_nfl',
    'NBA': 'basketball_nba',
    'MLB': 'baseball_mlb',
    'NHL': 'icehockey_nhl',
    'NCAAF': 'americanfootball_ncaaf',
    'NCAAB': 'basketball_ncaab'
  };

  constructor(apiKeys?: Partial<typeof this.API_KEYS>) {
    if (apiKeys) {
      this.API_KEYS = { ...this.API_KEYS, ...apiKeys };
    }
  }

  // Fetch live odds from The Odds API
  async fetchOddsFromTheOddsApi(apiKey: string, sport: string): Promise<LiveOdds[]> {
    try {
      const sportKey = this.SPORT_MAPPINGS[sport as keyof typeof this.SPORT_MAPPINGS];

      if (!apiKey || !sportKey) {
        throw new Error('Missing API key or invalid sport');
      }

      const response = await fetch(
        `https://api.the-odds-api.com/v4/sports/${sportKey}/odds-live/?regions=us&markets=h2h,spreads,totals&apiKey=${apiKey}`
      );

      if (!response.ok) {
        throw new Error(`The Odds API error: ${response.status}`);
      }

      const data = await response.json();

      return data.map((game: any) => this.transformTheOddsApiData(game, sport));

    } catch (error) {
      console.warn('Failed to fetch odds from The Odds API:', error);
      return [];
    }
  }

  // Fetch live odds from OddsJam
  async fetchOddsFromOddsJam(sport: string): Promise<LiveOdds[]> {
    try {
      const apiKey = this.API_KEYS.oddsJam;

      if (!apiKey) {
        throw new Error('Missing OddsJam API key');
      }

      const response = await fetch(
        `https://api OddsJam.com/v4/sports/${sport.toLowerCase()}/odds?apiKey=${apiKey}`
      );

      if (!response.ok) {
        throw new Error(`OddsJam API error: ${response.status}`);
      }

      const data = await response.json();

      return data.map((game: any) => this.transformOddsJamData(game, sport));

    } catch (error) {
      console.warn('Failed to fetch odds from OddsJam:', error);
      return [];
    }
  }

  // Transform The Odds API data to our format
  private transformTheOddsApiData(game: any, sport: string): LiveOdds {
    const homeTeam = game.home_team;
    const awayTeam = game.away_team;
    const bookmakers = game.bookmakers || [];

    // Find best moneyline odds
    const h2hMarket = bookmakers?.[0]?.markets?.find((m: any) => m.key === 'h2h');
    const homeOdds = h2hMarket?.outcomes?.find((o: any) => o.name === homeTeam)?.price || -110;
    const awayOdds = h2hMarket?.outcomes?.find((o: any) => o.name === awayTeam)?.price || -110;

    // Find spread odds
    const spreadMarket = bookmakers?.[0]?.markets?.find((m: any) => m.key === 'spreads');
    const spreadOutcome = spreadMarket?.outcomes?.find((o: any) => o.name === homeTeam);
    const spread = spreadOutcome?.point || 0;
    const spreadHomeOdds = spreadOutcome?.price || -110;
    const spreadAwayOdds = spreadMarket?.outcomes?.find((o: any) => o.name !== homeTeam)?.price || -110;

    // Find total odds
    const totalMarket = bookmakers?.[0]?.markets?.find((m: any) => m.key === 'totals');
    const totalOutcome = totalMarket?.outcomes?.find((o: any) => o.name === 'Over');
    const total = totalOutcome?.point || 0;
    const totalOverOdds = totalOutcome?.price || -110;
    const totalUnderOdds = totalMarket?.outcomes?.find((o: any) => o.name !== 'Over')?.price || -110;

    return {
      gameId: game.id,
      sport,
      homeTeam,
      awayTeam,
      moneyline: {
        home: homeOdds,
        away: awayOdds
      },
      spread: {
        home: spread,
        away: -spread,
        homeOdds: spreadHomeOdds,
        awayOdds: spreadAwayOdds
      },
      total: {
        line: total,
        overOdds: totalOverOdds,
        underOdds: totalUnderOdds
      },
      sportsbook: bookmakers?.[0]?.title || 'Unknown',
      lastUpdate: new Date(game.commence_time),
      movement: {
        moneylineChange: 0, // Would need historical data for this
        spreadChange: 0,
        totalChange: 0
      }
    };
  }

  // Transform OddsJam data to our format
  private transformOddsJamData(game: any, sport: string): LiveOdds {
    return {
      gameId: game.id,
      sport,
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      moneyline: {
        home: game.moneyline_home || -110,
        away: game.moneyline_away || -110
      },
      spread: game.spread ? {
        home: game.spread,
        away: -game.spread,
        homeOdds: game.spread_home_odds || -110,
        awayOdds: game.spread_away_odds || -110
      } : undefined,
      total: game.total ? {
        line: game.total,
        overOdds: game.total_over_odds || -110,
        underOdds: game.total_under_odds || -110
      } : undefined,
      sportsbook: 'OddsJam',
      lastUpdate: new Date(),
      movement: {
        moneylineChange: 0,
        spreadChange: 0,
        totalChange: 0
      }
    };
  }

  // Fetch odds from multiple sources and compare
  async fetchAndCompareOdds(sport: string): Promise<OddsComparison[]> {
    try {
      const apiKey = getPrimaryKey() ?? '';
      const [theOddsApiData, oddsJamData] = await Promise.all([
        this.fetchOddsFromTheOddsApi(apiKey, sport),
        this.fetchOddsFromOddsJam(sport)
      ]);

      const allOdds = [...theOddsApiData, ...oddsJamData];
      const groupedOdds = this.groupOddsByGame(allOdds);

      return Object.values(groupedOdds).map(oddsGroup =>
        this.compareOddsForGame(oddsGroup)
      );

    } catch (error) {
      console.error('Failed to fetch and compare odds:', error);
      return [];
    }
  }

  // Group odds by game
  private groupOddsByGame(odds: LiveOdds[]): Record<string, LiveOdds[]> {
    return odds.reduce((groups, odd) => {
      const key = `${odd.homeTeam}_${odd.awayTeam}_${odd.sport}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(odd);
      return groups;
    }, {} as Record<string, LiveOdds[]>);
  }

  // Compare odds for a single game
  private compareOddsForGame(oddsGroup: LiveOdds[]): OddsComparison {
    if (oddsGroup.length === 0) {
      throw new Error('No odds provided for comparison');
    }

    const firstOdd = oddsGroup[0];

    // Find best moneyline
    const bestMoneyline = oddsGroup.reduce((best, current) => {
      if (current.moneyline.home > best.moneyline.home && current.moneyline.away > best.moneyline.away) {
        return current;
      }
      return best;
    });

    // Find best spread
    const bestSpread = oddsGroup.reduce((best, current) => {
      if (current.spread && best.spread && current.spread.homeOdds > best.spread.homeOdds) {
        return current;
      }
      return best;
    });

    // Find best total
    const bestTotal = oddsGroup.reduce((best, current) => {
      if (current.total && best.total && current.total.overOdds > best.total.overOdds) {
        return current;
      }
      return best;
    });

    // Find arbitrage opportunities
    const arbitrageOpportunities = this.findArbitrageOpportunities(oddsGroup);

    return {
      gameId: firstOdd.gameId,
      sport: firstOdd.sport,
      homeTeam: firstOdd.homeTeam,
      awayTeam: firstOdd.awayTeam,
      bestMoneyline: {
        sportsbook: bestMoneyline.sportsbook,
        home: bestMoneyline.moneyline.home,
        away: bestMoneyline.moneyline.away
      },
      bestSpread: bestSpread.spread ? {
        sportsbook: bestSpread.sportsbook,
        line: bestSpread.spread.home,
        homeOdds: bestSpread.spread.homeOdds,
        awayOdds: bestSpread.spread.awayOdds
      } : {
        sportsbook: 'N/A',
        line: 0,
        homeOdds: -110,
        awayOdds: -110
      },
      bestTotal: bestTotal.total ? {
        sportsbook: bestTotal.sportsbook,
        line: bestTotal.total.line,
        overOdds: bestTotal.total.overOdds,
        underOdds: bestTotal.total.underOdds
      } : {
        sportsbook: 'N/A',
        line: 0,
        overOdds: -110,
        underOdds: -110
      },
      arbitrageOpportunities
    };
  }

  // Find arbitrage opportunities
  private findArbitrageOpportunities(oddsGroup: LiveOdds[]): OddsComparison['arbitrageOpportunities'] {
    const opportunities: OddsComparison['arbitrageOpportunities'] = [];

    // Check for moneyline arbitrage
    const bestHomeOdds = Math.max(...oddsGroup.map(o => o.moneyline.home));
    const bestAwayOdds = Math.max(...oddsGroup.map(o => o.moneyline.away));

    const homeImpliedProb = 1 / (bestHomeOdds / 100 + 1);
    const awayImpliedProb = 1 / (bestAwayOdds / 100 + 1);
    const totalImpliedProb = homeImpliedProb + awayImpliedProb;

    if (totalImpliedProb < 1) {
      const profit = (1 - totalImpliedProb) * 100;
      opportunities.push({
        type: 'moneyline',
        profit,
        bets: [
          {
            sportsbook: oddsGroup.find(o => o.moneyline.home === bestHomeOdds)?.sportsbook || 'Unknown',
            selection: 'Home',
            odds: bestHomeOdds
          },
          {
            sportsbook: oddsGroup.find(o => o.moneyline.away === bestAwayOdds)?.sportsbook || 'Unknown',
            selection: 'Away',
            odds: bestAwayOdds
          }
        ]
      });
    }

    return opportunities;
  }

  // Get live odds updates for specific games
  async getLiveOddsUpdates(gameIds: string[]): Promise<LiveOdds[]> {
    try {
      // This would typically use WebSocket connections or polling
      // For now, we'll simulate with API calls
      const allOdds: LiveOdds[] = [];

      for (const gameId of gameIds) {
        // In a real implementation, you'd fetch specific game odds
        // For now, return empty array
      }

      return allOdds;
    } catch (error) {
      console.error('Failed to get live odds updates:', error);
      return [];
    }
  }
}

// Global odds fetcher instance
export const liveOddsFetcher = new LiveOddsFetcher();

// Export functions for external use (uses getPrimaryKey from keys-store)
export const fetchLiveOdds = (sport: string) => {
  const apiKey = getPrimaryKey() ?? '';
  return liveOddsFetcher.fetchOddsFromTheOddsApi(apiKey, sport);
};
export const fetchAndCompareOdds = (sport: string) => liveOddsFetcher.fetchAndCompareOdds(sport);
export const getLiveOddsUpdates = (gameIds: string[]) => liveOddsFetcher.getLiveOddsUpdates(gameIds);
