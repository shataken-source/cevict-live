/**
 * Arbitrage Detection Service
 * Detects arbitrage opportunities across sportsbooks
 */

export interface SportsbookOdds {
  bookmaker: string;
  homeOdds: number;
  awayOdds: number;
  homeSpread?: number;
  awaySpread?: number;
  overOdds?: number;
  underOdds?: number;
  totalLine?: number;
}

export interface ArbitrageOpportunity {
  id: string;
  sport: string;
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  market: 'moneyline' | 'spread' | 'total';
  type: 'straight' | 'middle';
  profitPercent: number;
  stakeHome: number;
  stakeAway: number;
  totalStake: number;
  bookHome: string;
  bookAway: string;
  oddsHome: number;
  oddsAway: number;
  pick: string;
  confidence: number;
  gameTime: string;
  detectedAt: string;
  expiresAt?: string;
  isLive: boolean;
  reasoning: string[];
}

export class ArbitrageDetectionService {
  private static readonly MIN_PROFIT_PERCENT = 1; // Minimum 1% profit
  private static readonly MAX_STAKE_PERCENT = 100; // Maximum stake per side

  /**
   * Detect arbitrage opportunities from odds data
   */
  static detectArbitrage(
    gameId: string,
    sport: string,
    homeTeam: string,
    awayTeam: string,
    gameTime: string,
    allOdds: SportsbookOdds[]
  ): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];

    // Check moneyline arbs
    const moneylineArb = this.findMoneylineArbitrage(gameId, sport, homeTeam, awayTeam, gameTime, allOdds);
    if (moneylineArb) opportunities.push(moneylineArb);

    // Check spread arbs
    const spreadArb = this.findSpreadArbitrage(gameId, sport, homeTeam, awayTeam, gameTime, allOdds);
    if (spreadArb) opportunities.push(spreadArb);

    // Check total arbs
    const totalArb = this.findTotalArbitrage(gameId, sport, homeTeam, awayTeam, gameTime, allOdds);
    if (totalArb) opportunities.push(totalArb);

    return opportunities.sort((a, b) => b.profitPercent - a.profitPercent);
  }

  /**
   * Find moneyline arbitrage opportunities
   */
  private static findMoneylineArbitrage(
    gameId: string,
    sport: string,
    homeTeam: string,
    awayTeam: string,
    gameTime: string,
    allOdds: SportsbookOdds[]
  ): ArbitrageOpportunity | null {
    // Find best home and away odds
    let bestHome: SportsbookOdds | null = null;
    let bestAway: SportsbookOdds | null = null;

    for (const odds of allOdds) {
      if (bestHome === null || odds.homeOdds > bestHome.homeOdds) {
        bestHome = odds;
      }
      if (bestAway === null || odds.awayOdds > bestAway.awayOdds) {
        bestAway = odds;
      }
    }

    if (!bestHome || !bestAway) return null;

    // Calculate implied probabilities
    const probHome = this.americanToImpliedProb(bestHome.homeOdds);
    const probAway = this.americanToImpliedProb(bestAway.awayOdds);
    const totalProb = probHome + probAway;

    // Check if arbitrage exists (total implied probability < 1)
    if (totalProb >= 1) return null;

    const profitPercent = (1 / totalProb - 1) * 100;
    if (profitPercent < this.MIN_PROFIT_PERCENT) return null;

    // Calculate stakes for $100 total bet
    const totalStake = 100;
    const stakeHome = (probHome / totalProb) * totalStake;
    const stakeAway = (probAway / totalProb) * totalStake;

    return {
      id: `arb-${gameId}-ml`,
      sport,
      gameId,
      homeTeam,
      awayTeam,
      market: 'moneyline',
      type: 'straight',
      profitPercent,
      stakeHome,
      stakeAway,
      totalStake,
      bookHome: bestHome.bookmaker,
      bookAway: bestAway.bookmaker,
      oddsHome: bestHome.homeOdds,
      oddsAway: bestAway.awayOdds,
      pick: `${homeTeam} (via ${bestHome.bookmaker}) + ${awayTeam} (via ${bestAway.bookmaker})`,
      confidence: 95, // Arbitrage is guaranteed
      gameTime,
      detectedAt: new Date().toISOString(),
      isLive: false,
      reasoning: [
        `Guaranteed ${profitPercent.toFixed(2)}% profit`,
        `Bet $${stakeHome.toFixed(2)} on ${homeTeam} at ${bestHome.bookmaker} (${this.formatAmerican(bestHome.homeOdds)})`,
        `Bet $${stakeAway.toFixed(2)} on ${awayTeam} at ${bestAway.bookmaker} (${this.formatAmerican(bestAway.awayOdds)})`,
        `Total implied probability: ${(totalProb * 100).toFixed(1)}%`,
      ],
    };
  }

  /**
   * Find spread arbitrage opportunities
   */
  private static findSpreadArbitrage(
    gameId: string,
    sport: string,
    homeTeam: string,
    awayTeam: string,
    gameTime: string,
    allOdds: SportsbookOdds[]
  ): ArbitrageOpportunity | null {
    // Filter odds that have spread lines
    const spreadOdds = allOdds.filter(o => o.homeSpread !== undefined);
    if (spreadOdds.length === 0) return null;

    // For spread arbs, we need opposite lines (e.g., +3 and -3)
    // This creates a "middle" opportunity
    for (const odds1 of spreadOdds) {
      for (const odds2 of spreadOdds) {
        if (odds1.bookmaker === odds2.bookmaker) continue;

        const spread1 = odds1.homeSpread!;
        const spread2 = odds2.awaySpread!;

        // Check if spreads are opposites (creates middle opportunity)
        if (spread1 > 0 && spread2 < 0 && Math.abs(spread1 + spread2) < 0.5) {
          const profitPercent = this.calculateMiddleProfit(odds1.homeOdds, odds2.awayOdds);

          if (profitPercent >= this.MIN_PROFIT_PERCENT) {
            return {
              id: `arb-${gameId}-spread`,
              sport,
              gameId,
              homeTeam,
              awayTeam,
              market: 'spread',
              type: 'middle',
              profitPercent,
              stakeHome: 50,
              stakeAway: 50,
              totalStake: 100,
              bookHome: odds1.bookmaker,
              bookAway: odds2.bookmaker,
              oddsHome: odds1.homeOdds,
              oddsAway: odds2.awayOdds,
              pick: `${homeTeam} +${spread1} at ${odds1.bookmaker} + ${awayTeam} ${spread2} at ${odds2.bookmaker}`,
              confidence: 90,
              gameTime,
              detectedAt: new Date().toISOString(),
              isLive: false,
              reasoning: [
                `Middle opportunity: ${spread1} and ${spread2}`,
                `Potential ${profitPercent.toFixed(2)}% profit`,
                `Win both bets if final margin is between ${Math.min(spread1, Math.abs(spread2))} and ${Math.max(spread1, Math.abs(spread2))}`,
              ],
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Find total arbitrage opportunities
   */
  private static findTotalArbitrage(
    gameId: string,
    sport: string,
    homeTeam: string,
    awayTeam: string,
    gameTime: string,
    allOdds: SportsbookOdds[]
  ): ArbitrageOpportunity | null {
    // Filter odds that have totals
    const totalOdds = allOdds.filter(o => o.totalLine !== undefined);
    if (totalOdds.length === 0) return null;

    // Find best over and under odds for same total line
    const lines = new Set(totalOdds.map(o => o.totalLine));

    for (const line of lines) {
      const lineOdds = totalOdds.filter(o => o.totalLine === line);
      if (lineOdds.length < 2) continue;

      let bestOver: SportsbookOdds | null = null;
      let bestUnder: SportsbookOdds | null = null;

      for (const odds of lineOdds) {
        if (odds.overOdds && (bestOver === null || odds.overOdds > bestOver.overOdds!)) {
          bestOver = odds;
        }
        if (odds.underOdds && (bestUnder === null || odds.underOdds > bestUnder.underOdds!)) {
          bestUnder = odds;
        }
      }

      if (!bestOver || !bestUnder) continue;
      if (bestOver.bookmaker === bestUnder.bookmaker) continue;

      const probOver = this.americanToImpliedProb(bestOver.overOdds!);
      const probUnder = this.americanToImpliedProb(bestUnder.underOdds!);
      const totalProb = probOver + probUnder;

      if (totalProb >= 1) continue;

      const profitPercent = (1 / totalProb - 1) * 100;
      if (profitPercent < this.MIN_PROFIT_PERCENT) continue;

      const totalStake = 100;
      const stakeOver = (probOver / totalProb) * totalStake;
      const stakeUnder = (probUnder / totalProb) * totalStake;

      return {
        id: `arb-${gameId}-total`,
        sport,
        gameId,
        homeTeam,
        awayTeam,
        market: 'total',
        type: 'straight',
        profitPercent,
        stakeHome: stakeOver,
        stakeAway: stakeUnder,
        totalStake,
        bookHome: bestOver.bookmaker,
        bookAway: bestUnder.bookmaker,
        oddsHome: bestOver.overOdds!,
        oddsAway: bestUnder.underOdds!,
        pick: `Over ${line} at ${bestOver.bookmaker} + Under ${line} at ${bestUnder.bookmaker}`,
        confidence: 95,
        gameTime,
        detectedAt: new Date().toISOString(),
        isLive: false,
        reasoning: [
          `Guaranteed ${profitPercent.toFixed(2)}% profit on total ${line}`,
          `Bet $${stakeOver.toFixed(2)} on Over at ${bestOver.bookmaker} (${this.formatAmerican(bestOver.overOdds!)})`,
          `Bet $${stakeUnder.toFixed(2)} on Under at ${bestUnder.bookmaker} (${this.formatAmerican(bestUnder.underOdds!)})`,
        ],
      };
    }

    return null;
  }

  /**
   * Calculate middle opportunity profit
   */
  private static calculateMiddleProfit(odds1: number, odds2: number): number {
    // Estimate profit potential for middle opportunities
    const prob1 = this.americanToImpliedProb(odds1);
    const prob2 = this.americanToImpliedProb(odds2);
    const totalProb = prob1 + prob2;

    // Middle has higher variance but good profit potential
    return (2 - totalProb) * 50; // Rough estimate
  }

  /**
   * Convert American odds to implied probability
   */
  private static americanToImpliedProb(american: number): number {
    if (american > 0) {
      return 100 / (american + 100);
    } else {
      return Math.abs(american) / (Math.abs(american) + 100);
    }
  }

  /**
   * Format American odds for display
   */
  private static formatAmerican(odds: number): string {
    return odds > 0 ? `+${odds}` : `${odds}`;
  }

  /**
   * Get optimal stake allocation
   */
  static calculateStakes(
    opportunity: ArbitrageOpportunity,
    totalBankroll: number,
    maxPercent: number = 5
  ): { home: number; away: number; total: number } {
    const maxStake = totalBankroll * (maxPercent / 100);
    const ratio = opportunity.stakeHome / opportunity.totalStake;

    const homeStake = maxStake * ratio;
    const awayStake = maxStake * (1 - ratio);

    return {
      home: Math.round(homeStake * 100) / 100,
      away: Math.round(awayStake * 100) / 100,
      total: Math.round(maxStake * 100) / 100,
    };
  }

  /**
   * Validate if arbitrage is still valid
   */
  static isValid(opportunity: ArbitrageOpportunity): boolean {
    // Check if game hasn't started
    const gameTime = new Date(opportunity.gameTime);
    if (gameTime <= new Date()) return false;

    // Check if not expired
    if (opportunity.expiresAt) {
      const expires = new Date(opportunity.expiresAt);
      if (expires <= new Date()) return false;
    }

    return true;
  }

  /**
   * Convert arbitrage opportunity to pick format
   */
  static toPick(opportunity: ArbitrageOpportunity): {
    id: string;
    sport: string;
    pick: string;
    confidence: number;
    isArbitrage: boolean;
    arbitrageProfit: number;
    analysis: string;
  } {
    return {
      id: opportunity.id,
      sport: opportunity.sport,
      pick: opportunity.pick,
      confidence: opportunity.confidence,
      isArbitrage: true,
      arbitrageProfit: opportunity.profitPercent,
      analysis: opportunity.reasoning.join('. '),
    };
  }
}

export default ArbitrageDetectionService;
