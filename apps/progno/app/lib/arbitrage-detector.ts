/**
 * Arbitrage Detector
 * Finds guaranteed profit opportunities across multiple sportsbooks
 */

import { getPrimaryKey } from '../keys-store';

// In-memory cache: 10-minute TTL to avoid burning API quota
const _arbCache: Map<string, { data: any; ts: number }> = new Map();
const _ARB_CACHE_TTL = 10 * 60 * 1000;

export interface ArbitrageOpportunity {
  id: string;
  gameId: string;
  type: 'moneyline' | 'spread' | 'total';
  side1: {
    sportsbook: string;
    side: string;
    odds: number;
    stake: number;
  };
  side2: {
    sportsbook: string;
    side: string;
    odds: number;
    stake: number;
  };
  stakeHome: number;
  stakeAway: number;
  totalStake: number;
  guaranteedProfit: number;
  profitPercentage: number;
  confidence: number;
  freshnessTimestamp: Date;
  isStale: boolean;
  ageSeconds: number;
}

export class ArbitrageDetector {
  private static apiKey: string | null = null;

  // Input slop protection: tolerance for rounding errors, stale data, and API inconsistencies
  private static readonly INPUT_SLOP = {
    probabilityTolerance: 0.001, // 0.1% tolerance for probability calculations
    oddsTolerance: 0.5, // 0.5% tolerance for odds differences
    staleDataThreshold: 60, // Consider data stale after 60 seconds
    minConfidenceForArb: 0.98, // Require 98% confidence to account for slop
  };

  private static getApiKey(): string {
    if (!this.apiKey) {
      this.apiKey = getPrimaryKey() || '';
    }
    if (!this.apiKey) {
      throw new Error('ODDS_API_KEY not configured');
    }
    return this.apiKey;
  }

  /**
   * Find arbitrage opportunities with input slop protection
   */
  static async findOpportunities(options: {
    sport?: string;
    minProfit?: number;
    maxAge?: number;
  }): Promise<ArbitrageOpportunity[]> {
    const { sport, minProfit = 0.5, maxAge = 30 } = options;
    const detectionTime = new Date();
    const apiKey = this.getApiKey();

    const sports = sport
      ? [sport]
      : ['americanfootball_nfl', 'basketball_nba', 'icehockey_nhl', 'baseball_mlb'];

    const opportunities: ArbitrageOpportunity[] = [];

    for (const sportKey of sports) {
      try {
        // Check cache first
        const ck = `arb_${sportKey}`;
        const hit = _arbCache.get(ck);
        let games: any[];
        if (hit && (Date.now() - hit.ts) < _ARB_CACHE_TTL) {
          games = hit.data;
        } else {
          const response = await fetch(
            `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`
          );
          if (!response.ok) continue;
          games = await response.json();
          _arbCache.set(ck, { data: games, ts: Date.now() });
        }

        for (const game of games) {
          // Check moneyline arbitrage
          const mlArb = this.findMoneylineArbitrage(game, minProfit, detectionTime, maxAge);
          if (mlArb) opportunities.push(mlArb);

          // Check spread arbitrage
          const spreadArb = this.findSpreadArbitrage(game, minProfit, detectionTime, maxAge);
          if (spreadArb) opportunities.push(spreadArb);

          // Check total arbitrage
          const totalArb = this.findTotalArbitrage(game, minProfit, detectionTime, maxAge);
          if (totalArb) opportunities.push(totalArb);
        }
      } catch (err) {
        console.error(`[ArbitrageDetector] Error fetching ${sportKey}:`, err);
        continue;
      }
    }

    // Sort by profit (highest first)
    opportunities.sort((a, b) => b.profitPercentage - a.profitPercentage);

    return opportunities;
  }

  private static findMoneylineArbitrage(
    game: any,
    minProfit: number,
    detectionTime: Date = new Date(),
    maxAge: number = 30
  ): ArbitrageOpportunity | null {
    if (!game.bookmakers || game.bookmakers.length < 2) return null;

    const bestOdds: { home?: { bookmaker: string; odds: number; timestamp?: Date }; away?: { bookmaker: string; odds: number; timestamp?: Date } } = {};

    // Collect odds with timestamp checking for stale data
    for (const bookmaker of game.bookmakers) {
      const market = bookmaker.markets?.find((m: any) => m.key === 'h2h');
      if (!market) continue;

      // Check if market data is stale
      const marketAge = market.last_update ?
        (Date.now() - new Date(market.last_update).getTime()) / 1000 : 0;
      if (marketAge > this.INPUT_SLOP.staleDataThreshold) {
        continue; // Skip stale data
      }

      for (const outcome of market.outcomes) {
        // Validate odds are reasonable (not 0, not extreme)
        if (!outcome.price || outcome.price < -10000 || outcome.price > 10000) {
          continue; // Skip invalid odds
        }

        if (outcome.name === game.home_team) {
          if (!bestOdds.home || outcome.price > bestOdds.home.odds) {
            bestOdds.home = {
              bookmaker: bookmaker.title,
              odds: outcome.price,
              timestamp: market.last_update ? new Date(market.last_update) : new Date(),
            };
          }
        } else if (outcome.name === game.away_team) {
          if (!bestOdds.away || outcome.price > bestOdds.away.odds) {
            bestOdds.away = {
              bookmaker: bookmaker.title,
              odds: outcome.price,
              timestamp: market.last_update ? new Date(market.last_update) : new Date(),
            };
          }
        }
      }
    }

    if (!bestOdds.home || !bestOdds.away) return null;

    // Apply input slop protection: validate odds are from different books
    if (bestOdds.home.bookmaker === bestOdds.away.bookmaker) {
      return null; // Can't arbitrage with same bookmaker
    }

    const homeProb = this.americanToImplied(bestOdds.home.odds);
    const awayProb = this.americanToImplied(bestOdds.away.odds);
    const totalProb = homeProb + awayProb;

    // Apply slop tolerance: require totalProb < (1 - tolerance) to account for rounding errors
    if (totalProb >= (1 - this.INPUT_SLOP.probabilityTolerance)) return null;

    const profit = (1 - totalProb) * 100;

    // Apply slop protection: require profit to exceed minProfit + tolerance
    if (profit < (minProfit + this.INPUT_SLOP.oddsTolerance)) return null;

    // Calculate stakes with rounding protection
    const stake = 1000;
    const homeStake = Math.round((stake * homeProb) / totalProb * 100) / 100;
    const awayStake = Math.round((stake * awayProb) / totalProb * 100) / 100;

    // Verify profit calculation with slop tolerance
    const homeReturn = homeStake * (bestOdds.home.odds > 0 ? (bestOdds.home.odds / 100 + 1) : (100 / Math.abs(bestOdds.home.odds) + 1));
    const awayReturn = awayStake * (bestOdds.away.odds > 0 ? (bestOdds.away.odds / 100 + 1) : (100 / Math.abs(bestOdds.away.odds) + 1));
    const minReturn = Math.min(homeReturn, awayReturn);
    const actualProfit = minReturn - (homeStake + awayStake);

    // Require actual profit to exceed minimum after accounting for slop
    if (actualProfit < (minProfit * stake / 100 * this.INPUT_SLOP.minConfidenceForArb)) {
      return null;
    }

    const ageSeconds = Math.floor((Date.now() - detectionTime.getTime()) / 1000);
    const confidence = Math.min(0.99, this.INPUT_SLOP.minConfidenceForArb * (actualProfit / (profit * stake / 100)));

    return {
      id: `arb_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      gameId: `${game.sport_key}_${game.id}`,
      type: 'moneyline',
      side1: {
        sportsbook: bestOdds.home.bookmaker,
        side: game.home_team,
        odds: bestOdds.home.odds,
        stake: homeStake,
      },
      side2: {
        sportsbook: bestOdds.away.bookmaker,
        side: game.away_team,
        odds: bestOdds.away.odds,
        stake: awayStake,
      },
      stakeHome: homeStake,
      stakeAway: awayStake,
      totalStake: homeStake + awayStake,
      guaranteedProfit: actualProfit,
      profitPercentage: (actualProfit / (homeStake + awayStake)) * 100,
      confidence,
      freshnessTimestamp: detectionTime,
      isStale: ageSeconds > maxAge,
      ageSeconds,
    };
  }

  private static findSpreadArbitrage(
    game: any,
    minProfit: number,
    detectionTime: Date = new Date(),
    maxAge: number = 30
  ): ArbitrageOpportunity | null {
    if (!game.bookmakers || game.bookmakers.length < 2) return null;

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

    // Apply input slop protection: validate spreads are from different books
    if (bestSpreads.home.bookmaker === bestSpreads.away.bookmaker) {
      return null;
    }

    // Validate spread points are reasonable (not extreme)
    if (Math.abs(bestSpreads.home.point) > 30 || Math.abs(bestSpreads.away.point) > 30) {
      return null; // Skip extreme spreads
    }

    const homeProb = this.americanToImplied(bestSpreads.home.odds);
    const awayProb = this.americanToImplied(bestSpreads.away.odds);
    const totalProb = homeProb + awayProb;

    // Apply slop tolerance
    if (totalProb >= (1 - this.INPUT_SLOP.probabilityTolerance)) return null;

    const profit = (1 - totalProb) * 100;
    if (profit < (minProfit + this.INPUT_SLOP.oddsTolerance)) return null;

    const stake = 1000;
    const homeStake = Math.round((stake * homeProb) / totalProb * 100) / 100;
    const awayStake = Math.round((stake * awayProb) / totalProb * 100) / 100;

    const ageSeconds = Math.floor((Date.now() - detectionTime.getTime()) / 1000);
    return {
      id: `arb_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      gameId: `${game.sport_key}_${game.id}`,
      type: 'spread',
      side1: {
        sportsbook: bestSpreads.home.bookmaker,
        side: `${game.home_team} ${bestSpreads.home.point > 0 ? '+' : ''}${bestSpreads.home.point}`,
        odds: bestSpreads.home.odds,
        stake: homeStake,
      },
      side2: {
        sportsbook: bestSpreads.away.bookmaker,
        side: `${game.away_team} ${bestSpreads.away.point > 0 ? '+' : ''}${bestSpreads.away.point}`,
        odds: bestSpreads.away.odds,
        stake: awayStake,
      },
      stakeHome: homeStake,
      stakeAway: awayStake,
      totalStake: homeStake + awayStake,
      guaranteedProfit: profit * (homeStake + awayStake) / 100,
      profitPercentage: profit,
      confidence: Math.min(0.99, this.INPUT_SLOP.minConfidenceForArb),
      freshnessTimestamp: detectionTime,
      isStale: ageSeconds > maxAge,
      ageSeconds,
    };
  }

  private static findTotalArbitrage(
    game: any,
    minProfit: number,
    detectionTime: Date = new Date(),
    maxAge: number = 30
  ): ArbitrageOpportunity | null {
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

    // Apply input slop protection: validate totals are from different books
    if (bestTotals.over.bookmaker === bestTotals.under.bookmaker) {
      return null;
    }

    // Validate total points are reasonable
    if (bestTotals.over.point < 20 || bestTotals.over.point > 100) {
      return null; // Skip extreme totals
    }

    const overProb = this.americanToImplied(bestTotals.over.odds);
    const underProb = this.americanToImplied(bestTotals.under.odds);
    const totalProb = overProb + underProb;

    // Apply slop tolerance
    if (totalProb >= (1 - this.INPUT_SLOP.probabilityTolerance)) return null;

    const profit = (1 - totalProb) * 100;
    if (profit < (minProfit + this.INPUT_SLOP.oddsTolerance)) return null;

    const stake = 1000;
    const overStake = Math.round((stake * overProb) / totalProb * 100) / 100;
    const underStake = Math.round((stake * underProb) / totalProb * 100) / 100;

    const ageSeconds = Math.floor((Date.now() - detectionTime.getTime()) / 1000);
    return {
      id: `arb_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      gameId: `${game.sport_key}_${game.id}`,
      type: 'total',
      side1: {
        sportsbook: bestTotals.over.bookmaker,
        side: `Over ${bestTotals.over.point}`,
        odds: bestTotals.over.odds,
        stake: overStake,
      },
      side2: {
        sportsbook: bestTotals.under.bookmaker,
        side: `Under ${bestTotals.under.point}`,
        odds: bestTotals.under.odds,
        stake: underStake,
      },
      stakeHome: overStake,
      stakeAway: underStake,
      totalStake: overStake + underStake,
      guaranteedProfit: profit * (overStake + underStake) / 100,
      profitPercentage: profit,
      confidence: Math.min(0.99, this.INPUT_SLOP.minConfidenceForArb),
      freshnessTimestamp: detectionTime,
      isStale: ageSeconds > maxAge,
      ageSeconds,
    };
  }

  private static americanToImplied(americanOdds: number): number {
    if (americanOdds > 0) {
      return 100 / (americanOdds + 100);
    } else {
      return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
    }
  }
}

