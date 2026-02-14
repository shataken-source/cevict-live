/**
 * EV Calculator Service
 * Calculates expected value with 3% edge filter
 */

export interface EVCalculation {
  pickId: string;
  modelProbability: number;
  impliedProbability: number;
  edge: number;
  expectedValue: number;
  kellyCriterion: number;
  recommendedStake: number;
  passFilter: boolean;
}

export class EVCalculator {
  private readonly MIN_EDGE_PERCENT = 3;

  /**
   * Calculate EV for a pick
   */
  calculate(
    pickId: string,
    modelProbability: number, // 0-1
    odds: number, // American odds
    bankroll: number = 10000,
    maxStakePercent: number = 3
  ): EVCalculation {
    const impliedProb = this.americanToImpliedProb(odds);
    const decimalOdds = this.americanToDecimal(odds);

    // Edge = Model probability - Implied probability
    const edge = (modelProbability - impliedProb) * 100;

    // EV = (Probability * (Odds - 1)) - (1 - Probability)
    const expectedValue = (modelProbability * (decimalOdds - 1) - (1 - modelProbability)) * 100;

    // Kelly Criterion
    const kelly = this.calculateKelly(modelProbability, decimalOdds);

    // Recommended stake (Half Kelly for safety)
    const recommendedStake = Math.min(
      bankroll * (kelly / 100) * 0.5,
      bankroll * (maxStakePercent / 100)
    );

    return {
      pickId,
      modelProbability,
      impliedProbability: impliedProb,
      edge: Math.round(edge * 100) / 100,
      expectedValue: Math.round(expectedValue * 100) / 100,
      kellyCriterion: Math.round(kelly * 100) / 100,
      recommendedStake: Math.round(recommendedStake * 100) / 100,
      passFilter: edge >= this.MIN_EDGE_PERCENT,
    };
  }

  /**
   * Batch calculate EV for multiple picks
   */
  calculateBatch(
    picks: Array<{
      id: string;
      probability: number;
      odds: number;
    }>,
    bankroll: number = 10000
  ): EVCalculation[] {
    return picks.map(p => this.calculate(p.id, p.probability, p.odds, bankroll));
  }

  /**
   * Filter picks by minimum edge
   */
  filterByEdge(calculations: EVCalculation[], minEdge: number = 3): EVCalculation[] {
    return calculations.filter(c => c.edge >= minEdge);
  }

  /**
   * Get best value picks sorted by EV
   */
  getBestValue(calculations: EVCalculation[], limit: number = 10): EVCalculation[] {
    return calculations
      .filter(c => c.passFilter)
      .sort((a, b) => b.expectedValue - a.expectedValue)
      .slice(0, limit);
  }

  private americanToImpliedProb(american: number): number {
    if (american > 0) {
      return 100 / (american + 100);
    } else {
      return Math.abs(american) / (Math.abs(american) + 100);
    }
  }

  private americanToDecimal(american: number): number {
    if (american > 0) {
      return (american / 100) + 1;
    } else {
      return (100 / Math.abs(american)) + 1;
    }
  }

  private calculateKelly(probability: number, decimalOdds: number): number {
    // Kelly = (bp - q) / b
    // where b = odds - 1, p = probability, q = 1 - p
    const b = decimalOdds - 1;
    const q = 1 - probability;
    const kelly = ((b * probability) - q) / b;
    return Math.max(0, kelly * 100); // Return as percentage
  }
}

export default EVCalculator;
