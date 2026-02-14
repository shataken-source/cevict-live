/**
 * Elite Picks Enhancer Service
 * Provides advanced analysis and enhancement for Elite tier picks
 */

import { Pick } from './tier-assignment-service';

export interface EliteEnhancedPick extends Pick {
  enhancedAnalysis: {
    confidenceFactors: string[];
    riskAssessment: 'low' | 'medium' | 'high';
    expectedValue: number;
    kellyCriterion: number;
    optimalStake: number;
    marketEfficiency: number;
    sharpMoneyIndicator: 'heavy' | 'moderate' | 'light' | 'none';
    steamMoves: string[];
    reverseLineMovement: boolean;
    publicBettingPercentage: number;
    sharpBettingPercentage: number;
  };
  advancedMetrics: {
    clv: number; // Closing line value
    evPerUnit: number;
    roi: number;
    variance: number;
    bankrollGrowth: number;
  };
  historicalContext: {
    similarSituations: Array<{
      result: 'win' | 'loss' | 'push';
      date: string;
      profit: number;
    }>;
    trendStrength: number;
    momentumScore: number;
  };
  alternativeLines: Array<{
    type: 'spread' | 'total' | 'moneyline';
    line: number;
    odds: number;
    confidence: number;
    expectedValue: number;
  }>;
  liveBetting: {
    preGameRecommended: boolean;
    liveEntryPoints: string[];
    liveHedgingStrategy?: string;
  };
}

export interface EnhancementConfig {
  enableKellyCriterion: boolean;
  enableCLV: boolean;
  enableSharpMoney: boolean;
  enableAlternativeLines: boolean;
  enableLiveBetting: boolean;
  bankrollSize: number;
  maxStakePercent: number;
}

export class ElitePicksEnhancer {
  private config: EnhancementConfig;

  constructor(config: Partial<EnhancementConfig> = {}) {
    this.config = {
      enableKellyCriterion: true,
      enableCLV: true,
      enableSharpMoney: true,
      enableAlternativeLines: true,
      enableLiveBetting: true,
      bankrollSize: 10000,
      maxStakePercent: 3,
      ...config,
    };
  }

  /**
   * Enhance Elite tier picks with advanced analysis
   */
  async enhance(picks: Pick[]): Promise<EliteEnhancedPick[]> {
    const enhanced: EliteEnhancedPick[] = [];

    for (const pick of picks) {
      // Only enhance Elite tier picks
      if (pick.tier !== 'elite' && !pick.isArbitrage) {
        enhanced.push({
          ...pick,
          enhancedAnalysis: this.getDefaultEnhancedAnalysis(),
          advancedMetrics: this.getDefaultAdvancedMetrics(),
          historicalContext: this.getDefaultHistoricalContext(),
          alternativeLines: [],
          liveBetting: { preGameRecommended: true, liveEntryPoints: [] },
        } as EliteEnhancedPick);
        continue;
      }

      const enhancedPick: EliteEnhancedPick = {
        ...pick,
        enhancedAnalysis: await this.generateEnhancedAnalysis(pick),
        advancedMetrics: await this.calculateAdvancedMetrics(pick),
        historicalContext: await this.fetchHistoricalContext(pick),
        alternativeLines: this.generateAlternativeLines(pick),
        liveBetting: this.generateLiveBettingStrategy(pick),
      };

      enhanced.push(enhancedPick);
    }

    return enhanced;
  }

  /**
   * Generate enhanced analysis for Elite pick
   */
  private async generateEnhancedAnalysis(pick: Pick): Promise<EliteEnhancedPick['enhancedAnalysis']> {
    const baseConfidence = pick.confidence / 100;
    const edge = pick.edge || 0;

    // Calculate confidence factors
    const confidenceFactors: string[] = [];

    if (pick.confidence >= 90) {
      confidenceFactors.push('Elite-level confidence (>90%)');
    }
    if (edge > 5) {
      confidenceFactors.push(`Strong edge: +${edge.toFixed(1)}%`);
    }
    if (pick.isArbitrage) {
      confidenceFactors.push('Guaranteed arbitrage opportunity');
    }
    if (pick.isEarlyBet && (pick.lineMovement ?? 0) > 2) {
      confidenceFactors.push(`Favorable line movement: ${pick.lineMovement} points`);
    }

    // Risk assessment
    let riskAssessment: 'low' | 'medium' | 'high';
    if (pick.isArbitrage) {
      riskAssessment = 'low';
    } else if (pick.confidence >= 90) {
      riskAssessment = 'low';
    } else if (pick.confidence >= 80) {
      riskAssessment = 'medium';
    } else {
      riskAssessment = 'high';
    }

    // Calculate expected value
    const expectedValue = this.calculateExpectedValue(pick);

    // Kelly Criterion
    const kellyCriterion = this.calculateKellyCriterion(pick);

    // Optimal stake
    const optimalStake = Math.min(
      this.config.bankrollSize * (kellyCriterion / 100),
      this.config.bankrollSize * (this.config.maxStakePercent / 100)
    );

    // Market efficiency (placeholder - would integrate with market data)
    const marketEfficiency = 0.75 + (Math.random() * 0.15); // 0.75-0.90

    // Sharp money indicator
    const sharpMoneyIndicator = pick.isArbitrage ? 'heavy' :
      pick.confidence > 88 ? 'moderate' : 'light';

    // Steam moves (rapid line movements)
    const steamMoves: string[] = [];
    if (pick.isEarlyBet && (pick.lineMovement ?? 0) > 3) {
      steamMoves.push(`Strong steam: ${pick.lineMovement} point move`);
    }

    // Public vs sharp betting (placeholder)
    const publicBettingPercentage = 60 + (Math.random() * 20); // 60-80%
    const sharpBettingPercentage = 100 - publicBettingPercentage;

    // Reverse line movement
    const reverseLineMovement = pick.isEarlyBet &&
      (pick.lineMovement ?? 0) > 0 &&
      publicBettingPercentage < 50;

    return {
      confidenceFactors,
      riskAssessment,
      expectedValue,
      kellyCriterion,
      optimalStake: Math.round(optimalStake * 100) / 100,
      marketEfficiency: Math.round(marketEfficiency * 100) / 100,
      sharpMoneyIndicator,
      steamMoves,
      reverseLineMovement,
      publicBettingPercentage: Math.round(publicBettingPercentage),
      sharpBettingPercentage: Math.round(sharpBettingPercentage),
    };
  }

  /**
   * Calculate advanced metrics
   */
  private async calculateAdvancedMetrics(pick: Pick): Promise<EliteEnhancedPick['advancedMetrics']> {
    const baseEv = this.calculateExpectedValue(pick);
    const edge = pick.edge || 0;

    // Closing line value (placeholder)
    const clv = edge * 0.8; // Assume 80% of edge is CLV

    // EV per unit staked
    const evPerUnit = baseEv / 100;

    // ROI estimate
    const roi = baseEv;

    // Variance (lower for arbitrage)
    const variance = pick.isArbitrage ? 0.01 : 0.15 + ((100 - pick.confidence) / 100) * 0.1;

    // Bankroll growth (Kelly * ROI)
    const kelly = this.calculateKellyCriterion(pick);
    const bankrollGrowth = (kelly / 100) * (roi / 100) * 100;

    return {
      clv: Math.round(clv * 100) / 100,
      evPerUnit: Math.round(evPerUnit * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      bankrollGrowth: Math.round(bankrollGrowth * 100) / 100,
    };
  }

  /**
   * Fetch historical context (placeholder)
   */
  private async fetchHistoricalContext(pick: Pick): Promise<EliteEnhancedPick['historicalContext']> {
    // This would fetch from database
    return {
      similarSituations: [],
      trendStrength: 0.7 + (Math.random() * 0.2), // 0.7-0.9
      momentumScore: pick.confidence / 100,
    };
  }

  /**
   * Generate alternative lines
   */
  private generateAlternativeLines(pick: Pick): EliteEnhancedPick['alternativeLines'] {
    const alternatives: EliteEnhancedPick['alternativeLines'] = [];

    if (!pick.spread && !pick.total) return alternatives;

    // Generate spread alternatives
    if (pick.spread) {
      const baseLine = pick.spread.line;
      const altLines = [baseLine - 1.5, baseLine + 1.5];

      for (const line of altLines) {
        const confidence = pick.confidence - Math.abs(line - baseLine) * 3;
        const expectedValue = this.calculateExpectedValue({ ...pick, confidence });

        if (confidence >= 70) {
          alternatives.push({
            type: 'spread',
            line: Math.round(line * 10) / 10,
            odds: pick.spread.odds - 15,
            confidence: Math.round(confidence),
            expectedValue: Math.round(expectedValue * 100) / 100,
          });
        }
      }
    }

    return alternatives.sort((a, b) => b.expectedValue - a.expectedValue);
  }

  /**
   * Generate live betting strategy
   */
  private generateLiveBettingStrategy(pick: Pick): EliteEnhancedPick['liveBetting'] {
    const strategy: EliteEnhancedPick['liveBetting'] = {
      preGameRecommended: true,
      liveEntryPoints: [],
    };

    if (pick.pickType === 'total') {
      strategy.liveEntryPoints.push('Wait for 2-3 points scored, re-evaluate live total');
    }

    if (pick.pickType === 'spread' && pick.spread) {
      const fav = pick.spread.line < 0;
      strategy.liveEntryPoints.push(
        fav
          ? `If ${pick.homeTeam} goes down by 7+, consider live entry at better spread`
          : `If ${pick.homeTeam} goes up by 7+, consider live entry at better spread`
      );
    }

    // Hedging for high-confidence picks
    if (pick.confidence >= 90 && !pick.isArbitrage) {
      strategy.liveHedgingStrategy = 'Monitor for live hedge opportunity if lead extends significantly';
    }

    return strategy;
  }

  /**
   * Calculate expected value
   */
  private calculateExpectedValue(pick: Pick): number {
    if (pick.edge) return pick.edge;

    const prob = pick.confidence / 100;
    const odds = pick.odds?.decimal || 2.0;

    // EV = (Probability * (Odds - 1)) - (1 - Probability)
    return (prob * (odds - 1) - (1 - prob)) * 100;
  }

  /**
   * Calculate Kelly Criterion percentage
   */
  private calculateKellyCriterion(pick: Pick): number {
    const prob = pick.confidence / 100;
    const odds = pick.odds?.decimal || 2.0;

    // Kelly = (bp - q) / b
    // where b = odds - 1, p = probability, q = 1 - p
    const b = odds - 1;
    const q = 1 - prob;

    const kelly = ((b * prob) - q) / b;

    // Use half Kelly for safety
    return Math.max(0, kelly * 50 * 100); // Convert to percentage
  }

  private getDefaultEnhancedAnalysis(): EliteEnhancedPick['enhancedAnalysis'] {
    return {
      confidenceFactors: [],
      riskAssessment: 'medium',
      expectedValue: 0,
      kellyCriterion: 0,
      optimalStake: 0,
      marketEfficiency: 0.8,
      sharpMoneyIndicator: 'none',
      steamMoves: [],
      reverseLineMovement: false,
      publicBettingPercentage: 50,
      sharpBettingPercentage: 50,
    };
  }

  private getDefaultAdvancedMetrics(): EliteEnhancedPick['advancedMetrics'] {
    return {
      clv: 0,
      evPerUnit: 0,
      roi: 0,
      variance: 0.2,
      bankrollGrowth: 0,
    };
  }

  private getDefaultHistoricalContext(): EliteEnhancedPick['historicalContext'] {
    return {
      similarSituations: [],
      trendStrength: 0.5,
      momentumScore: 0.5,
    };
  }
}

export default ElitePicksEnhancer;
