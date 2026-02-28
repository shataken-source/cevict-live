/**
 * Model Performance Dashboard Service
 * Tracks which prediction factors actually improve accuracy
 */

import { createClient } from '@supabase/supabase-js';

export interface FactorPerformance {
  factorName: string;
  category: 'weather' | 'injury' | 'altitude' | 'splits' | 'monte_carlo' | 'claude' | 'ensemble';
  totalPredictions: number;
  correctPredictions: number;
  winRate: number;
  avgConfidence: number;
  roi: number;
  impact: 'high' | 'medium' | 'low' | 'negative';
  trend: 'improving' | 'stable' | 'declining';
}

export interface SportPerformance {
  sport: string;
  totalPicks: number;
  winRate: number;
  roi: number;
  bestFactor: string;
  worstFactor: string;
}

export interface ModelDashboard {
  overall: {
    totalPicks: number;
    winRate: number;
    roi: number;
    profit: number;
  };
  byFactor: FactorPerformance[];
  bySport: SportPerformance[];
  recentTrend: {
    last7Days: { winRate: number; picks: number };
    last30Days: { winRate: number; picks: number };
    last90Days: { winRate: number; picks: number };
  };
  recommendations: string[];
}

export class ModelPerformanceDashboard {
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('Supabase credentials required');
    }
    this.supabase = createClient(url, key);
  }

  /**
   * Get complete model performance dashboard
   */
  async getDashboard(days: number = 90): Promise<ModelDashboard> {
    const [overall, byFactor, bySport, recentTrend] = await Promise.all([
      this.getOverallPerformance(days),
      this.getFactorPerformance(days),
      this.getSportPerformance(days),
      this.getRecentTrend(),
    ]);

    const recommendations = this.generateRecommendations(byFactor, bySport);

    return {
      overall,
      byFactor,
      bySport,
      recentTrend,
      recommendations,
    };
  }

  /**
   * Track individual prediction with all factors used
   */
  async trackPrediction(
    predictionId: string,
    factors: string[],
    sport: string,
    confidence: number,
    result?: 'win' | 'loss' | 'push'
  ): Promise<void> {
    const { error } = await this.supabase
      .from('prediction_factors')
      .upsert({
        prediction_id: predictionId,
        factors,
        sport,
        confidence,
        result,
        created_at: new Date().toISOString(),
        graded_at: result ? new Date().toISOString() : null,
      });

    if (error) {
      console.error('[ModelDashboard] Error tracking prediction:', error);
    }
  }

  /**
   * Update factor weights based on performance
   */
  async optimizeFactorWeights(): Promise<Record<string, number>> {
    const performance = await this.getFactorPerformance(90);

    // Calculate weights based on win rates
    const weights: Record<string, number> = {};
    let totalWinRate = 0;

    for (const factor of performance) {
      if (factor.totalPredictions >= 20) { // Minimum sample size
        weights[factor.factorName] = Math.max(0.1, factor.winRate / 100);
        totalWinRate += factor.winRate;
      }
    }

    // Normalize weights
    for (const key in weights) {
      weights[key] = weights[key] / (totalWinRate / 100);
    }

    return weights;
  }

  private async getOverallPerformance(days: number): Promise<ModelDashboard['overall']> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('graded_predictions')
      .select('result, odds, confidence')
      .gte('graded_at', startDate.toISOString())
      .not('result', 'is', null);

    if (error || !data) {
      return { totalPicks: 0, winRate: 0, roi: 0, profit: 0 };
    }

    const wins = (data as any[]).filter((d: any) => d.result === 'win').length;
    const losses = (data as any[]).filter((d: any) => d.result === 'loss').length;
    const total = wins + losses;

    // Calculate profit/ROI
    let profit = 0;
    for (const pick of data as any[]) {
      if (pick.result === 'win') {
        const odds = pick.odds || -110;
        profit += odds > 0 ? odds / 100 : 100 / Math.abs(odds);
      } else if (pick.result === 'loss') {
        profit -= 1;
      }
    }

    return {
      totalPicks: total,
      winRate: total > 0 ? Math.round((wins / total) * 1000) / 10 : 0,
      roi: total > 0 ? Math.round((profit / total) * 1000) / 10 : 0,
      profit: Math.round(profit * 100) / 100,
    };
  }

  private async getFactorPerformance(days: number): Promise<FactorPerformance[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Query predictions with their factors and results
    const { data, error } = await this.supabase
      .from('prediction_factors')
      .select('factors, result, confidence, created_at')
      .gte('created_at', startDate.toISOString())
      .not('result', 'is', null);

    if (error || !data) return [];

    // Aggregate by factor
    const factorStats: Record<string, {
      total: number;
      wins: number;
      confidenceSum: number;
      recent30Days: { total: number; wins: number };
    }> = {};

    for (const row of data as any[]) {
      const factors = row.factors || [];
      const isWin = row.result === 'win';
      const isRecent = new Date(row.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      for (const factor of factors) {
        if (!factorStats[factor]) {
          factorStats[factor] = { total: 0, wins: 0, confidenceSum: 0, recent30Days: { total: 0, wins: 0 } };
        }

        factorStats[factor].total++;
        factorStats[factor].confidenceSum += row.confidence || 70;
        if (isWin) factorStats[factor].wins++;

        if (isRecent) {
          factorStats[factor].recent30Days.total++;
          if (isWin) factorStats[factor].recent30Days.wins++;
        }
      }
    }

    // Calculate performance metrics
    return Object.entries(factorStats).map(([name, stats]) => {
      const winRate = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;
      const recentWinRate = stats.recent30Days.total > 0
        ? (stats.recent30Days.wins / stats.recent30Days.total) * 100
        : winRate;

      let impact: FactorPerformance['impact'] = 'low';
      if (winRate >= 58) impact = 'high';
      else if (winRate >= 53) impact = 'medium';
      else if (winRate < 48) impact = 'negative';

      let trend: FactorPerformance['trend'] = 'stable';
      if (recentWinRate > winRate + 3) trend = 'improving';
      else if (recentWinRate < winRate - 3) trend = 'declining';

      return {
        factorName: name,
        category: this.categorizeFactor(name),
        totalPredictions: stats.total,
        correctPredictions: stats.wins,
        winRate: Math.round(winRate * 10) / 10,
        avgConfidence: Math.round((stats.confidenceSum / stats.total) * 10) / 10,
        roi: Math.round((winRate - 52.4) * 2.38 * 10) / 10, // Approximate
        impact,
        trend,
      };
    }).sort((a, b) => b.winRate - a.winRate);
  }

  private async getSportPerformance(days: number): Promise<SportPerformance[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('graded_predictions')
      .select('sport, result, factors')
      .gte('graded_at', startDate.toISOString())
      .not('result', 'is', null);

    if (error || !data) return [];

    const sportStats: Record<string, {
      total: number;
      wins: number;
      factorCounts: Record<string, number>;
    }> = {};

    for (const row of data as any[]) {
      const sport = row.sport?.toLowerCase() || 'unknown';
      if (!sportStats[sport]) {
        sportStats[sport] = { total: 0, wins: 0, factorCounts: {} };
      }

      sportStats[sport].total++;
      if (row.result === 'win') sportStats[sport].wins++;

      // Track factor usage
      const factors = row.factors || [];
      for (const factor of factors) {
        sportStats[sport].factorCounts[factor] = (sportStats[sport].factorCounts[factor] || 0) + 1;
      }
    }

    return Object.entries(sportStats).map(([sport, stats]) => {
      const winRate = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;

      // Find best/worst factors for this sport
      const sortedFactors = Object.entries(stats.factorCounts)
        .sort((a, b) => b[1] - a[1]);

      return {
        sport: sport.toUpperCase(),
        totalPicks: stats.total,
        winRate: Math.round(winRate * 10) / 10,
        roi: Math.round((winRate - 52.4) * 2.38 * 10) / 10,
        bestFactor: sortedFactors[0]?.[0] || 'N/A',
        worstFactor: sortedFactors[sortedFactors.length - 1]?.[0] || 'N/A',
      };
    });
  }

  private async getRecentTrend(): Promise<ModelDashboard['recentTrend']> {
    const now = Date.now();
    const periods = {
      last7Days: now - 7 * 24 * 60 * 60 * 1000,
      last30Days: now - 30 * 24 * 60 * 60 * 1000,
      last90Days: now - 90 * 24 * 60 * 60 * 1000,
    };

    const results: ModelDashboard['recentTrend'] = {
      last7Days: { winRate: 0, picks: 0 },
      last30Days: { winRate: 0, picks: 0 },
      last90Days: { winRate: 0, picks: 0 },
    };

    for (const [period, startTime] of Object.entries(periods)) {
      const { data } = await this.supabase
        .from('graded_predictions')
        .select('result')
        .gte('graded_at', new Date(startTime).toISOString())
        .not('result', 'is', null);

      if (data) {
        const wins = (data as any[]).filter((d: any) => d.result === 'win').length;
        const total = (data as any[]).filter((d: any) => d.result !== 'push').length;
        results[period as keyof typeof results] = {
          winRate: total > 0 ? Math.round((wins / total) * 1000) / 10 : 0,
          picks: total,
        };
      }
    }

    return results;
  }

  private categorizeFactor(factor: string): FactorPerformance['category'] {
    const f = factor.toLowerCase();
    if (f.includes('weather') || f.includes('temp') || f.includes('wind')) return 'weather';
    if (f.includes('injury') || f.includes('player')) return 'injury';
    if (f.includes('altitude') || f.includes('stadium')) return 'altitude';
    if (f.includes('split') || f.includes('public') || f.includes('sharp')) return 'splits';
    if (f.includes('monte') || f.includes('carlo') || f.includes('simulation')) return 'monte_carlo';
    if (f.includes('claude') || f.includes('ai') || f.includes('llm')) return 'claude';
    if (f.includes('ensemble') || f.includes('combined') || f.includes('weighted')) return 'ensemble';
    return 'monte_carlo'; // Default
  }

  private generateRecommendations(
    factors: FactorPerformance[],
    sports: SportPerformance[]
  ): string[] {
    const recommendations: string[] = [];

    // Factor-based recommendations
    const highImpactFactors = factors.filter(f => f.impact === 'high' && f.totalPredictions >= 20);
    const negativeFactors = factors.filter(f => f.impact === 'negative' && f.totalPredictions >= 20);
    const improvingFactors = factors.filter(f => f.trend === 'improving');

    if (highImpactFactors.length > 0) {
      recommendations.push(`Double down on: ${highImpactFactors.slice(0, 3).map(f => f.factorName).join(', ')}`);
    }

    if (negativeFactors.length > 0) {
      recommendations.push(`Consider reducing weight on: ${negativeFactors.map(f => f.factorName).join(', ')}`);
    }

    if (improvingFactors.length > 0) {
      recommendations.push(`Emerging factors showing improvement: ${improvingFactors.slice(0, 2).map(f => f.factorName).join(', ')}`);
    }

    // Sport-based recommendations
    const bestSport = sports.sort((a, b) => b.winRate - a.winRate)[0];
    if (bestSport && bestSport.winRate > 55) {
      recommendations.push(`Focus on ${bestSport.sport} - showing ${bestSport.winRate}% win rate`);
    }

    // Sample size warnings
    const lowSampleFactors = factors.filter(f => f.totalPredictions < 10 && f.impact === 'high');
    if (lowSampleFactors.length > 0) {
      recommendations.push(`Warning: High-performing factors with low sample sizes need more data: ${lowSampleFactors.map(f => f.factorName).join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Get A/B test results comparing factor combinations
   */
  async getABTestResults(
    factorA: string,
    factorB: string,
    days: number = 60
  ): Promise<{
    factorA: FactorPerformance;
    factorB: FactorPerformance;
    winner: string;
    significance: 'high' | 'medium' | 'low';
  } | null> {
    const allFactors = await this.getFactorPerformance(days);

    const perfA = allFactors.find(f => f.factorName === factorA);
    const perfB = allFactors.find(f => f.factorName === factorB);

    if (!perfA || !perfB) return null;

    const winner = perfA.winRate > perfB.winRate ? factorA : factorB;
    const minSample = Math.min(perfA.totalPredictions, perfB.totalPredictions);

    let significance: 'high' | 'medium' | 'low' = 'low';
    if (minSample >= 50) significance = 'high';
    else if (minSample >= 20) significance = 'medium';

    return {
      factorA: perfA,
      factorB: perfB,
      winner,
      significance,
    };
  }
}

export default ModelPerformanceDashboard;
