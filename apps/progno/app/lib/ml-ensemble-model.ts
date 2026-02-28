/**
 * ML Ensemble Model Service
 * Weighted ensemble combining all prediction factors
 */

// Type stubs — modules don't exist yet
type MonteCarloEngine = any;
type PredictionEngine = any;

export interface ModelPrediction {
  factorName: string;
  homeWinProb: number;
  awayWinProb: number;
  expectedTotal: number;
  confidence: number;
  weight: number;
}

export interface EnsembleResult {
  homeWinProb: number;
  awayWinProb: number;
  expectedTotal: number;
  confidence: number;
  pick: string;
  edge: number;
  modelContributions: ModelPrediction[];
  consensus: 'strong' | 'moderate' | 'weak';
  disagreement: number;
}

export class MLEnsembleModel {
  private factorWeights: Map<string, number> = new Map();
  private historicalPerformance: Map<string, { wins: number; total: number }> = new Map();

  constructor() {
    this.initializeDefaultWeights();
  }

  /**
   * Run ensemble prediction combining multiple factors
   */
  async predict(
    gameData: any,
    factors: {
      monteCarlo?: { homeWinProb: number; expectedTotal: number };
      weather?: { homeAdvantageAdjustment: number; totalAdjustment: number };
      altitude?: { homeAdvantageBoost: number };
      injury?: { homeTeamAdjustment: number; awayTeamAdjustment: number };
      splits?: { recommendation: string; fadeConfidence: number };
      sentiment?: { sentimentScore: number };
      claude?: { score: number; confidence: number };
    }
  ): Promise<EnsembleResult> {
    const predictions: ModelPrediction[] = [];

    // Monte Carlo simulation
    if (factors.monteCarlo) {
      const mcWeight = this.getFactorWeight('monte_carlo');
      predictions.push({
        factorName: 'Monte Carlo',
        homeWinProb: factors.monteCarlo.homeWinProb,
        awayWinProb: 1 - factors.monteCarlo.homeWinProb,
        expectedTotal: factors.monteCarlo.expectedTotal,
        confidence: 70,
        weight: mcWeight,
      });
    }

    // Weather impact
    if (factors.weather) {
      const weatherWeight = this.getFactorWeight('weather');
      const baseProb = factors.monteCarlo?.homeWinProb || 0.5;
      const adjustment = factors.weather.homeAdvantageAdjustment / 100;

      predictions.push({
        factorName: 'Weather',
        homeWinProb: Math.max(0.1, Math.min(0.9, baseProb + adjustment)),
        awayWinProb: Math.max(0.1, Math.min(0.9, 1 - baseProb - adjustment)),
        expectedTotal: (factors.monteCarlo?.expectedTotal || 44) + factors.weather.totalAdjustment,
        confidence: Math.abs(adjustment) > 0.03 ? 65 : 55,
        weight: weatherWeight,
      });
    }

    // Altitude impact
    if (factors.altitude) {
      const altitudeWeight = this.getFactorWeight('altitude');
      const baseProb = factors.monteCarlo?.homeWinProb || 0.5;
      const boost = factors.altitude.homeAdvantageBoost / 100;

      predictions.push({
        factorName: 'Altitude',
        homeWinProb: Math.max(0.1, Math.min(0.9, baseProb + boost)),
        awayWinProb: Math.max(0.1, Math.min(0.9, 1 - baseProb - boost)),
        expectedTotal: factors.monteCarlo?.expectedTotal || 44,
        confidence: Math.abs(boost) > 0.02 ? 62 : 52,
        weight: altitudeWeight,
      });
    }

    // Injury impact
    if (factors.injury) {
      const injuryWeight = this.getFactorWeight('injury');
      const baseProb = factors.monteCarlo?.homeWinProb || 0.5;
      const netImpact = (factors.injury.awayTeamAdjustment - factors.injury.homeTeamAdjustment) / 100;

      predictions.push({
        factorName: 'Injuries',
        homeWinProb: Math.max(0.1, Math.min(0.9, baseProb + netImpact)),
        awayWinProb: Math.max(0.1, Math.min(0.9, 1 - baseProb - netImpact)),
        expectedTotal: factors.monteCarlo?.expectedTotal || 44,
        confidence: Math.abs(netImpact) > 0.03 ? 68 : 58,
        weight: injuryWeight,
      });
    }

    // Betting splits (fade public)
    if (factors.splits && factors.splits.fadeConfidence > 60) {
      const splitsWeight = this.getFactorWeight('splits');
      const isFadingHome = factors.splits.recommendation.includes('fade');
      const fadeAdjustment = factors.splits.fadeConfidence > 70 ? 0.05 : 0.03;

      predictions.push({
        factorName: 'Betting Splits',
        homeWinProb: isFadingHome ? 0.5 - fadeAdjustment : 0.5 + fadeAdjustment,
        awayWinProb: isFadingHome ? 0.5 + fadeAdjustment : 0.5 - fadeAdjustment,
        expectedTotal: factors.monteCarlo?.expectedTotal || 44,
        confidence: factors.splits.fadeConfidence,
        weight: splitsWeight,
      });
    }

    // Social sentiment
    if (factors.sentiment && Math.abs(factors.sentiment.sentimentScore) > 0.3) {
      const sentimentWeight = this.getFactorWeight('sentiment');
      const sentimentAdjustment = factors.sentiment.sentimentScore * 0.05;

      predictions.push({
        factorName: 'Sentiment',
        homeWinProb: Math.max(0.1, Math.min(0.9, 0.5 + sentimentAdjustment)),
        awayWinProb: Math.max(0.1, Math.min(0.9, 0.5 - sentimentAdjustment)),
        expectedTotal: factors.monteCarlo?.expectedTotal || 44,
        confidence: 55,
        weight: sentimentWeight,
      });
    }

    // Claude Effect
    if (factors.claude) {
      const claudeWeight = this.getFactorWeight('claude');
      const claudeProb = (factors.claude.score + 1) / 2; // Convert -1 to 1 range to 0 to 1

      predictions.push({
        factorName: 'Claude AI',
        homeWinProb: claudeProb,
        awayWinProb: 1 - claudeProb,
        expectedTotal: factors.monteCarlo?.expectedTotal || 44,
        confidence: factors.claude.confidence,
        weight: claudeWeight,
      });
    }

    // Calculate weighted ensemble
    return this.calculateEnsemble(predictions, gameData);
  }

  /**
   * Calculate weighted ensemble from multiple model predictions
   */
  private calculateEnsemble(predictions: ModelPrediction[], gameData: any): EnsembleResult {
    if (predictions.length === 0) {
      return {
        homeWinProb: 0.5,
        awayWinProb: 0.5,
        expectedTotal: 44,
        confidence: 50,
        pick: 'No prediction',
        edge: 0,
        modelContributions: [],
        consensus: 'weak',
        disagreement: 0,
      };
    }

    // Normalize weights
    const totalWeight = predictions.reduce((sum, p) => sum + p.weight, 0);
    const normalized = predictions.map(p => ({
      ...p,
      normalizedWeight: p.weight / totalWeight,
    }));

    // Weighted average for win probabilities
    const weightedHomeProb = normalized.reduce(
      (sum, p) => sum + p.homeWinProb * p.normalizedWeight,
      0
    );
    const weightedAwayProb = 1 - weightedHomeProb;

    // Weighted average for totals
    const weightedTotal = normalized.reduce(
      (sum, p) => sum + p.expectedTotal * p.normalizedWeight,
      0
    );

    // Confidence based on agreement between models
    const probs = predictions.map(p => p.homeWinProb);
    const avgProb = probs.reduce((a, b) => a + b, 0) / probs.length;
    const variance = probs.reduce((sum, p) => sum + Math.pow(p - avgProb, 2), 0) / probs.length;
    const disagreement = Math.sqrt(variance);

    // Higher agreement = higher confidence
    let confidence = normalized.reduce(
      (sum, p) => sum + p.confidence * p.normalizedWeight,
      0
    );

    // Reduce confidence if models disagree significantly
    if (disagreement > 0.15) {
      confidence *= 0.8;
    } else if (disagreement < 0.05) {
      confidence = Math.min(95, confidence * 1.1);
    }

    // Determine consensus strength
    let consensus: EnsembleResult['consensus'] = 'moderate';
    if (disagreement < 0.08) consensus = 'strong';
    if (disagreement > 0.12) consensus = 'weak';

    // Determine pick and edge
    const homeEdge = (weightedHomeProb - 0.5) * 100;
    const pick = weightedHomeProb > 0.5 ? gameData.homeTeam : gameData.awayTeam;
    const edge = Math.abs(homeEdge);

    return {
      homeWinProb: Math.round(weightedHomeProb * 100) / 100,
      awayWinProb: Math.round(weightedAwayProb * 100) / 100,
      expectedTotal: Math.round(weightedTotal * 10) / 10,
      confidence: Math.round(confidence * 10) / 10,
      pick,
      edge: Math.round(edge * 10) / 10,
      modelContributions: predictions,
      consensus,
      disagreement: Math.round(disagreement * 100) / 100,
    };
  }

  /**
   * Update factor weights based on performance
   */
  updateWeights(performance: Record<string, { wins: number; total: number }>): void {
    for (const [factor, stats] of Object.entries(performance)) {
      const winRate = stats.total > 0 ? stats.wins / stats.total : 0.5;

      // Boost weight for winning factors, reduce for losing
      const currentWeight = this.factorWeights.get(factor) || 1.0;
      let newWeight = currentWeight;

      if (winRate > 0.55) {
        newWeight = Math.min(2.0, currentWeight * 1.1);
      } else if (winRate < 0.48) {
        newWeight = Math.max(0.5, currentWeight * 0.9);
      }

      this.factorWeights.set(factor, newWeight);
      this.historicalPerformance.set(factor, stats);
    }

    // Normalize so average weight is 1.0
    const avgWeight = Array.from(this.factorWeights.values()).reduce((a, b) => a + b, 0) / this.factorWeights.size;
    for (const [factor, weight] of this.factorWeights) {
      this.factorWeights.set(factor, weight / avgWeight);
    }
  }

  /**
   * Get current factor weights
   */
  getWeights(): Record<string, number> {
    return Object.fromEntries(this.factorWeights);
  }

  /**
   * Get feature importance rankings
   */
  getFeatureImportance(): Array<{ factor: string; weight: number; performance: number }> {
    return Array.from(this.factorWeights.entries())
      .map(([factor, weight]) => {
        const perf = this.historicalPerformance.get(factor);
        const winRate = perf ? perf.wins / perf.total : 0.5;
        return { factor, weight, performance: winRate };
      })
      .sort((a, b) => b.weight * b.performance - a.weight * a.performance);
  }

  private getFactorWeight(factor: string): number {
    return this.factorWeights.get(factor) || 1.0;
  }

  private initializeDefaultWeights(): void {
    const defaults: Record<string, number> = {
      monte_carlo: 1.5,    // Most reliable
      claude: 1.3,         // AI insights valuable
      injury: 1.2,         // Important when available
      weather: 1.1,        // Moderate impact
      altitude: 1.0,       // Situational
      splits: 0.9,         // Contrarian signal
      sentiment: 0.7,      // Lower confidence
    };

    for (const [factor, weight] of Object.entries(defaults)) {
      this.factorWeights.set(factor, weight);
    }
  }
}

export default MLEnsembleModel;
