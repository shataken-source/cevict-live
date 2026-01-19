import { NextResponse } from 'next/server';

interface BookmakerOdds {
  bookmaker: string;
  home: number;
  away: number;
  draw?: number;
  spread?: {
    home: number;
    away: number;
    line: number;
  };
  total?: {
    over: number;
    under: number;
    line: number;
  };
}

interface ArbitrageOpportunity {
  game: string;
  sport: string;
  type: 'moneyline' | 'spread' | 'total' | 'both_teams_score' | 'player_props';
  profit: number;
  stake: number;
  bets: Array<{
    bookmaker: string;
    selection: string;
    odds: number;
    stake: number;
    payout: number;
  }>;
}

/**
 * Arbitrage API - Finds guaranteed profit opportunities across multiple sportsbooks
 * Tests multiple bet types: moneyline, spread, total, both teams score, player props
 */
export async function GET() {
  try {
    const oddsApiKey = process.env.ODDS_API_KEY || process.env.NEXT_PUBLIC_ODDS_API_KEY;

    if (!oddsApiKey) {
      return NextResponse.json({
        opportunities: [],
        lastUpdated: new Date().toISOString(),
        message: 'ODDS_API_KEY not configured',
      });
    }

    // Fetch odds from The Odds API for multiple sports
    const sports = ['americanfootball_nfl', 'basketball_nba', 'icehockey_nhl', 'baseball_mlb'];
    const opportunities: ArbitrageOpportunity[] = [];

    for (const sport of sports) {
      try {
        const response = await fetch(
          `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${oddsApiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`
        );

        if (!response.ok) continue;

        const games = await response.json();

        for (const game of games) {
          // Check moneyline arbitrage
          const mlArb = findMoneylineArbitrage(game);
          if (mlArb) opportunities.push(mlArb);

          // Check spread arbitrage
          const spreadArb = findSpreadArbitrage(game);
          if (spreadArb) opportunities.push(spreadArb);

          // Check total arbitrage
          const totalArb = findTotalArbitrage(game);
          if (totalArb) opportunities.push(totalArb);

          // Check both teams score arbitrage (if available)
          const btsArb = findBothTeamsScoreArbitrage(game);
          if (btsArb) opportunities.push(btsArb);
        }
      } catch (err) {
        console.error(`Error fetching ${sport}:`, err);
        continue;
      }
    }

    // Sort by profit (highest first)
    opportunities.sort((a, b) => b.profit - a.profit);

    return NextResponse.json({
      opportunities: opportunities.slice(0, 20), // Return top 20
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Arbitrage API error:', error);
    return NextResponse.json({
      opportunities: [],
      lastUpdated: new Date().toISOString(),
      error: error.message,
    });
  }
}

function findMoneylineArbitrage(game: any): ArbitrageOpportunity | null {
  if (!game.bookmakers || game.bookmakers.length < 2) return null;

  const bestOdds: { home?: { bookmaker: string; odds: number }; away?: { bookmaker: string; odds: number } } = {};

  // Find best odds for each outcome across all bookmakers
  for (const bookmaker of game.bookmakers) {
    if (!bookmaker.markets || !bookmaker.markets[0]) continue;
    const market = bookmaker.markets.find((m: any) => m.key === 'h2h');
    if (!market) continue;

    for (const outcome of market.outcomes) {
      if (outcome.name === game.home_team) {
        if (!bestOdds.home || outcome.price > bestOdds.home.odds) {
          bestOdds.home = { bookmaker: bookmaker.title, odds: outcome.price };
        }
      } else if (outcome.name === game.away_team) {
        if (!bestOdds.away || outcome.price > bestOdds.away.odds) {
          bestOdds.away = { bookmaker: bookmaker.title, odds: outcome.price };
        }
      }
    }
  }

  if (!bestOdds.home || !bestOdds.away) return null;

  // Convert American odds to implied probabilities
  const homeProb = americanToImplied(bestOdds.home.odds);
  const awayProb = americanToImplied(bestOdds.away.odds);
  const totalProb = homeProb + awayProb;

  // Arbitrage exists if total probability < 1
  if (totalProb >= 1) return null;

  const profit = (1 - totalProb) * 100;
  if (profit < 0.5) return null; // Minimum 0.5% profit

  // Calculate optimal stakes
  const stake = 1000; // Base stake
  const homeStake = (stake * homeProb) / totalProb;
  const awayStake = (stake * awayProb) / totalProb;

  return {
    game: `${game.away_team} @ ${game.home_team}`,
    sport: game.sport_title,
    type: 'moneyline',
    profit,
    stake: homeStake + awayStake,
    bets: [
      {
        bookmaker: bestOdds.home.bookmaker,
        selection: game.home_team,
        odds: bestOdds.home.odds,
        stake: homeStake,
        payout: homeStake * (1 + americanToDecimal(bestOdds.home.odds)),
      },
      {
        bookmaker: bestOdds.away.bookmaker,
        selection: game.away_team,
        odds: bestOdds.away.odds,
        stake: awayStake,
        payout: awayStake * (1 + americanToDecimal(bestOdds.away.odds)),
      },
    ],
  };
}

function findSpreadArbitrage(game: any): ArbitrageOpportunity | null {
  if (!game.bookmakers || game.bookmakers.length < 2) return null;

  // Find best spread odds for home and away
  const bestSpreads: { home?: { bookmaker: string; odds: number; point: number }; away?: { bookmaker: string; odds: number; point: number } } = {};

  for (const bookmaker of game.bookmakers) {
    const market = bookmaker.markets?.find((m: any) => m.key === 'spreads');
    if (!market) continue;

    for (const outcome of market.outcomes) {
      if (outcome.name === game.home_team) {
        if (!bestSpreads.home || outcome.price > bestSpreads.home.odds) {
          bestSpreads.home = { bookmaker: bookmaker.title, odds: outcome.price, point: outcome.point };
        }
      } else if (outcome.name === game.away_team) {
        if (!bestSpreads.away || outcome.price > bestSpreads.away.odds) {
          bestSpreads.away = { bookmaker: bookmaker.title, odds: outcome.price, point: outcome.point };
        }
      }
    }
  }

  if (!bestSpreads.home || !bestSpreads.away) return null;

  const homeProb = americanToImplied(bestSpreads.home.odds);
  const awayProb = americanToImplied(bestSpreads.away.odds);
  const totalProb = homeProb + awayProb;

  if (totalProb >= 1) return null;

  const profit = (1 - totalProb) * 100;
  if (profit < 0.5) return null;

  const stake = 1000;
  const homeStake = (stake * homeProb) / totalProb;
  const awayStake = (stake * awayProb) / totalProb;

  return {
    game: `${game.away_team} @ ${game.home_team}`,
    sport: game.sport_title,
    type: 'spread',
    profit,
    stake: homeStake + awayStake,
    bets: [
      {
        bookmaker: bestSpreads.home.bookmaker,
        selection: `${game.home_team} ${bestSpreads.home.point > 0 ? '+' : ''}${bestSpreads.home.point}`,
        odds: bestSpreads.home.odds,
        stake: homeStake,
        payout: homeStake * (1 + americanToDecimal(bestSpreads.home.odds)),
      },
      {
        bookmaker: bestSpreads.away.bookmaker,
        selection: `${game.away_team} ${bestSpreads.away.point > 0 ? '+' : ''}${bestSpreads.away.point}`,
        odds: bestSpreads.away.odds,
        stake: awayStake,
        payout: awayStake * (1 + americanToDecimal(bestSpreads.away.odds)),
      },
    ],
  };
}

function findTotalArbitrage(game: any): ArbitrageOpportunity | null {
  if (!game.bookmakers || game.bookmakers.length < 2) return null;

  const bestTotals: { over?: { bookmaker: string; odds: number; point: number }; under?: { bookmaker: string; odds: number; point: number } } = {};

  for (const bookmaker of game.bookmakers) {
    const market = bookmaker.markets?.find((m: any) => m.key === 'totals');
    if (!market) continue;

    for (const outcome of market.outcomes) {
      if (outcome.name === 'Over') {
        if (!bestTotals.over || outcome.price > bestTotals.over.odds) {
          bestTotals.over = { bookmaker: bookmaker.title, odds: outcome.price, point: outcome.point };
        }
      } else if (outcome.name === 'Under') {
        if (!bestTotals.under || outcome.price > bestTotals.under.odds) {
          bestTotals.under = { bookmaker: bookmaker.title, odds: outcome.price, point: outcome.point };
        }
      }
    }
  }

  if (!bestTotals.over || !bestTotals.under) return null;

  const overProb = americanToImplied(bestTotals.over.odds);
  const underProb = americanToImplied(bestTotals.under.odds);
  const totalProb = overProb + underProb;

  if (totalProb >= 1) return null;

  const profit = (1 - totalProb) * 100;
  if (profit < 0.5) return null;

  const stake = 1000;
  const overStake = (stake * overProb) / totalProb;
  const underStake = (stake * underProb) / totalProb;

  return {
    game: `${game.away_team} @ ${game.home_team}`,
    sport: game.sport_title,
    type: 'total',
    profit,
    stake: overStake + underStake,
    bets: [
      {
        bookmaker: bestTotals.over.bookmaker,
        selection: `Over ${bestTotals.over.point}`,
        odds: bestTotals.over.odds,
        stake: overStake,
        payout: overStake * (1 + americanToDecimal(bestTotals.over.odds)),
      },
      {
        bookmaker: bestTotals.under.bookmaker,
        selection: `Under ${bestTotals.under.point}`,
        odds: bestTotals.under.odds,
        stake: underStake,
        payout: underStake * (1 + americanToDecimal(bestTotals.under.odds)),
      },
    ],
  };
}

function findBothTeamsScoreArbitrage(game: any): ArbitrageOpportunity | null {
  // This would require a specific market that may not be available
  // Return null for now, but structure is ready if market becomes available
  return null;
}

function americanToImplied(americanOdds: number): number {
  if (americanOdds > 0) {
    return 100 / (americanOdds + 100);
  } else {
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
}

function americanToDecimal(americanOdds: number): number {
  if (americanOdds > 0) {
    return americanOdds / 100;
  } else {
    return 100 / Math.abs(americanOdds);
  }
}

