/**
 * Automated Backtesting Service
 * Tests new features and models on historical data
 */

import { createClient } from '@supabase/supabase-js';
import { PredictionEngine } from '../prediction-engine';

export interface BacktestConfig {
  featureName: string;
  startDate: string;
  endDate: string;
  sports: string[];
  minConfidence: number;
  maxConfidence: number;
  sampleSize: number;
}

export interface BacktestResult {
  featureName: string;
  totalGames: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
  roi: number;
  profit: number;
  avgConfidence: number;
  confidenceCorrelation: number;
  vsBaseline: {
    baselineWinRate: number;
    improvement: number;
    statisticallySignificant: boolean;
  };
  sportBreakdown: Record<string, { games: number; winRate: number }>;
  recommendations: string[];
}

export class AutomatedBacktestingService {
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Supabase credentials required');
    }
    this.supabase = createClient(url, key);
  }

  /**
   * Run backtest for a specific feature
   */
  async runBacktest(config: BacktestConfig): Promise<BacktestResult> {
    console.log(`[Backtest] Running ${config.featureName} from ${config.startDate} to ${config.endDate}`);

    // Fetch historical predictions with this feature
    const historicalData = await this.fetchHistoricalData(config);
    
    if (historicalData.length === 0) {
      throw new Error('No historical data found for backtest criteria');
    }

    // Run simulation
    const results = await this.simulatePredictions(historicalData, config);
    
    // Get baseline for comparison
    const baseline = await this.getBaselineResults(config);
    
    // Calculate statistical significance
    const significance = this.calculateSignificance(results, baseline);

    return {
      featureName: config.featureName,
      ...results,
      vsBaseline: {
        baselineWinRate: baseline.winRate,
        improvement: results.winRate - baseline.winRate,
        statisticallySignificant: significance,
      },
      sportBreakdown: this.calculateSportBreakdown(historicalData),
      recommendations: this.generateRecommendations(results, significance),
    };
  }

  /**
   * Compare two features head-to-head
   */
  async compareFeatures(
    featureA: string,
    featureB: string,
    config: Omit<BacktestConfig, 'featureName'>
  ): Promise<{
    featureA: BacktestResult;
    featureB: BacktestResult;
    winner: string;
    confidence: number;
  }> {
    const [resultA, resultB] = await Promise.all([
      this.runBacktest({ ...config, featureName: featureA }),
      this.runBacktest({ ...config, featureName: featureB }),
    ]);

    const winner = resultA.winRate > resultB.winRate ? featureA : featureB;
    const winMargin = Math.abs(resultA.winRate - resultB.winRate);
    
    return {
      featureA: resultA,
      featureB: resultB,
      winner,
      confidence: Math.min(95, winMargin * 5),
    };
  }

  /**
   * Validate a new feature before production deployment
   */
  async validateFeature(
    featureName: string,
    requiredImprovement: number = 2
  ): Promise<{
    approved: boolean;
    results: BacktestResult;
    reasons: string[];
  }> {
    const config: BacktestConfig = {
      featureName,
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      sports: ['nfl', 'nba', 'nhl', 'mlb'],
      minConfidence: 60,
      maxConfidence: 95,
      sampleSize: 100,
    };

    const results = await this.runBacktest(config);
    
    const approved = 
      results.vsBaseline.improvement >= requiredImprovement &&
      results.vsBaseline.statisticallySignificant &&
      results.totalGames >= 50 &&
      results.winRate >= 53;

    const reasons: string[] = [];
    
    if (results.vsBaseline.improvement < requiredImprovement) {
      reasons.push(`Improvement (${results.vsBaseline.improvement.toFixed(1)}%) below threshold (${requiredImprovement}%)`);
    }
    if (!results.vsBaseline.statisticallySignificant) {
      reasons.push('Results not statistically significant (sample size too small or variance too high)');
    }
    if (results.totalGames < 50) {
      reasons.push(`Insufficient sample size: ${results.totalGames} games (need 50+)`);
    }
    if (results.winRate < 53) {
      reasons.push(`Win rate (${results.winRate}%) below profitable threshold (53%)`);
    }

    if (approved) {
      reasons.push(`✅ Feature approved: ${results.winRate}% win rate, +${results.vsBaseline.improvement}% improvement`);
    }

    return { approved, results, reasons };
  }

  /**
   * Run weekly backtest report for all active features
   */
  async runWeeklyReport(): Promise<Array<{
    feature: string;
    status: 'improving' | 'stable' | 'declining';
    performance: BacktestResult;
    action: 'increase_weight' | 'maintain' | 'investigate' | 'deprecate';
  }>> {
    const features = [
      'weather_impact',
      'altitude_adjustment',
      'injury_factor',
      'betting_splits',
      'monte_carlo_v2',
      'claude_enhanced',
    ];

    const report = [];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    for (const feature of features) {
      try {
        const config: BacktestConfig = {
          featureName: feature,
          startDate,
          endDate,
          sports: ['nfl', 'nba', 'nhl', 'mlb'],
          minConfidence: 60,
          maxConfidence: 95,
          sampleSize: 100,
        };

        const results = await this.runBacktest(config);
        
        let status: 'improving' | 'stable' | 'declining' = 'stable';
        if (results.vsBaseline.improvement > 3) status = 'improving';
        else if (results.vsBaseline.improvement < -2) status = 'declining';

        let action: 'increase_weight' | 'maintain' | 'investigate' | 'deprecate' = 'maintain';
        if (status === 'improving' && results.vsBaseline.statisticallySignificant) {
          action = 'increase_weight';
        } else if (status === 'declining' && results.winRate < 50) {
          action = 'deprecate';
        } else if (status === 'declining') {
          action = 'investigate';
        }

        report.push({ feature, status, performance: results, action });
      } catch (e) {
        console.error(`[Backtest] Error running report for ${feature}:`, e);
      }
    }

    return report.sort((a, b) => b.performance.winRate - a.performance.winRate);
  }

  private async fetchHistoricalData(config: BacktestConfig): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('graded_predictions')
      .select('*, factors')
      .gte('created_at', config.startDate)
      .lte('created_at', config.endDate)
      .in('sport', config.sports)
      .gte('confidence', config.minConfidence)
      .lte('confidence', config.maxConfidence)
      .not('result', 'is', null);

    if (error) throw error;
    
    // Filter for predictions that used this feature
    return (data || []).filter(pred => 
      pred.factors?.includes(config.featureName)
    );
  }

  private async simulatePredictions(data: any[], config: BacktestConfig): Promise<Omit<BacktestResult, 'featureName' | 'vsBaseline' | 'sportBreakdown' | 'recommendations'>> {
    let wins = 0, losses = 0, pushes = 0, totalProfit = 0, totalConfidence = 0;

    for (const pred of data) {
      if (pred.result === 'win') {
        wins++;
        const odds = pred.odds || -110;
        totalProfit += odds > 0 ? odds / 100 : 100 / Math.abs(odds);
      } else if (pred.result === 'loss') {
        losses++;
        totalProfit -= 1;
      } else {
        pushes++;
      }

      totalConfidence += pred.confidence || 70;
    }

    const total = wins + losses;
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    const roi = total > 0 ? (totalProfit / total) * 100 : 0;

    // Calculate confidence correlation
    const confidenceCorrelation = this.calculateConfidenceCorrelation(data);

    return {
      totalGames: data.length,
      wins,
      losses,
      pushes,
      winRate: Math.round(winRate * 10) / 10,
      roi: Math.round(roi * 10) / 10,
      profit: Math.round(totalProfit * 100) / 100,
      avgConfidence: data.length > 0 ? Math.round((totalConfidence / data.length) * 10) / 10 : 0,
      confidenceCorrelation,
    };
  }

  private async getBaselineResults(config: BacktestConfig): Promise<{ winRate: number; roi: number }> {
    const { data } = await this.supabase
      .from('graded_predictions')
      .select('result, odds')
      .gte('created_at', config.startDate)
      .lte('created_at', config.endDate)
      .in('sport', config.sports)
      .not('result', 'is', null);

    if (!data || data.length === 0) {
      return { winRate: 52.4, roi: 0 }; // Break-even baseline
    }

    const wins = data.filter(d => d.result === 'win').length;
    const total = data.filter(d => d.result !== 'push').length;

    let profit = 0;
    for (const pred of data) {
      if (pred.result === 'win') {
        const odds = pred.odds || -110;
        profit += odds > 0 ? odds / 100 : 100 / Math.abs(odds);
      } else if (pred.result === 'loss') {
        profit -= 1;
      }
    }

    return {
      winRate: total > 0 ? Math.round((wins / total) * 1000) / 10 : 52.4,
      roi: total > 0 ? Math.round((profit / total) * 1000) / 10 : 0,
    };
  }

  private calculateSignificance(results: any, baseline: any): boolean {
    // Simplified statistical significance check
    const sampleSize = results.totalGames;
    const improvement = results.vsBaseline?.improvement || (results.winRate - baseline.winRate);
    
    // Need at least 30 samples and 2% improvement for significance
    return sampleSize >= 30 && improvement >= 2;
  }

  private calculateConfidenceCorrelation(data: any[]): number {
    if (data.length < 10) return 0;

    // Simple correlation: do higher confidence picks win more?
    const highConf = data.filter(d => d.confidence >= 75);
    const lowConf = data.filter(d => d.confidence < 75);

    const highWinRate = highConf.length > 0 
      ? (highConf.filter(d => d.result === 'win').length / highConf.filter(d => d.result !== 'push').length) * 100 
      : 0;
    const lowWinRate = lowConf.length > 0 
      ? (lowConf.filter(d => d.result === 'win').length / lowConf.filter(d => d.result !== 'push').length) * 100 
      : 0;

    return Math.round((highWinRate - lowWinRate) * 10) / 10;
  }

  private calculateSportBreakdown(data: any[]): Record<string, { games: number; winRate: number }> {
    const breakdown: Record<string, { games: number; wins: number }> = {};

    for (const pred of data) {
      const sport = pred.sport || 'unknown';
      if (!breakdown[sport]) {
        breakdown[sport] = { games: 0, wins: 0 };
      }
      breakdown[sport].games++;
      if (pred.result === 'win') breakdown[sport].wins++;
    }

    const result: Record<string, { games: number; winRate: number }> = {};
    for (const [sport, stats] of Object.entries(breakdown)) {
      result[sport] = {
        games: stats.games,
        winRate: Math.round((stats.wins / stats.games) * 1000) / 10,
      };
    }

    return result;
  }

  private generateRecommendations(results: any, significance: boolean): string[] {
    const recs: string[] = [];

    if (results.winRate >= 58) {
      recs.push(`🎯 Excellent performance: ${results.winRate}% win rate - consider increasing weight`);
    } else if (results.winRate >= 55) {
      recs.push(`✅ Solid performance: ${results.winRate}% win rate - maintain current usage`);
    } else if (results.winRate >= 52) {
      recs.push(`⚠️ Marginal performance: ${results.winRate}% win rate - review feature logic`);
    } else {
      recs.push(`❌ Poor performance: ${results.winRate}% win rate - consider removing`);
    }

    if (significance) {
      recs.push(`📊 Statistically significant with ${results.totalGames} games`);
    } else {
      recs.push(`⚠️ Results not yet statistically significant - need more data`);
    }

    if (results.confidenceCorrelation > 5) {
      recs.push(`📈 Good confidence calibration: high confidence picks win ${results.confidenceCorrelation}% more`);
    }

    return recs;
  }
}

export default AutomatedBacktestingService;
