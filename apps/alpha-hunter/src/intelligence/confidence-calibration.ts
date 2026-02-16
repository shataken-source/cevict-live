/**
 * Confidence Calibration Tracker
 * Tracks prediction accuracy vs confidence levels to detect over/under-confidence
 */

import { getBotPredictions, getTradeHistory, supabaseMemory } from '../lib/supabase-memory';

interface CalibrationData {
  confidenceBucket: number; // 50-55, 55-60, etc.
  predictions: number;
  wins: number;
  losses: number;
  actualWinRate: number;
  expectedWinRate: number;
  calibration: number; // 1.0 = perfect, >1 = underconfident, <1 = overconfident
}

interface SportCalibration {
  sport: string;
  buckets: CalibrationData[];
  overallCalibration: number;
  recommendation: string;
}

export class ConfidenceCalibrationTracker {
  private readonly BUCKET_SIZE = 5; // 5% confidence buckets
  
  /**
   * Calculate calibration for all sports
   */
  async calculateCalibration(): Promise<SportCalibration[]> {
    const predictions = await getBotPredictions(undefined, 'kalshi', 500);
    const trades = await getTradeHistory('kalshi', 500);
    
    // Group by sport
    const bySport = new Map<string, { pred: any[]; trades: any[] }>();
    
    for (const pred of predictions) {
      const sport = this.extractSport(pred.market_title);
      if (!bySport.has(sport)) bySport.set(sport, { pred: [], trades: [] });
      bySport.get(sport)!.pred.push(pred);
    }
    
    for (const trade of trades) {
      const sport = this.extractSport(trade.symbol);
      if (!bySport.has(sport)) bySport.set(sport, { pred: [], trades: [] });
      bySport.get(sport)!.trades.push(trade);
    }
    
    const results: SportCalibration[] = [];
    
    for (const [sport, data] of bySport) {
      const buckets = this.analyzeBuckets(data.pred, data.trades);
      const overallCalibration = this.calculateOverallCalibration(buckets);
      
      results.push({
        sport,
        buckets,
        overallCalibration,
        recommendation: this.generateRecommendation(overallCalibration, buckets)
      });
    }
    
    return results.sort((a, b) => Math.abs(b.overallCalibration - 1) - Math.abs(a.overallCalibration - 1));
  }
  
  /**
   * Get calibrated confidence for a prediction
   * Adjusts raw confidence based on historical calibration
   */
  async getCalibratedConfidence(sport: string, rawConfidence: number): Promise<number> {
    const calibrations = await this.calculateCalibration();
    const sportCal = calibrations.find(c => c.sport === sport);
    
    if (!sportCal || sportCal.buckets.length === 0) {
      return rawConfidence; // No data, use raw
    }
    
    // Find the bucket for this confidence
    const bucket = sportCal.buckets.find(b => 
      rawConfidence >= b.confidenceBucket && 
      rawConfidence < b.confidenceBucket + this.BUCKET_SIZE
    );
    
    if (!bucket || bucket.predictions < 10) {
      return rawConfidence; // Not enough data in bucket
    }
    
    // Adjust confidence based on calibration
    // If we've been overconfident, reduce the confidence
    // If we've been underconfident, increase the confidence
    const adjusted = rawConfidence * bucket.calibration;
    
    // Clamp to reasonable bounds
    return Math.max(50, Math.min(95, adjusted));
  }
  
  /**
   * Generate calibration report
   */
  async generateReport(): Promise<string> {
    const calibrations = await this.calculateCalibration();
    
    if (calibrations.length === 0) {
      return '📊 No calibration data available yet. Need at least 10 resolved predictions per sport.';
    }
    
    const lines = [
      '📊 CONFIDENCE CALIBRATION REPORT',
      '═'.repeat(60),
      ''
    ];
    
    for (const cal of calibrations) {
      const status = cal.overallCalibration > 1.1 ? '🟡 Underconfident' :
                     cal.overallCalibration < 0.9 ? '🔴 Overconfident' :
                     '🟢 Well Calibrated';
      
      lines.push(`${cal.sport.toUpperCase()}: ${status} (factor: ${cal.overallCalibration.toFixed(2)})`);
      lines.push(`   ${cal.recommendation}`);
      
      // Show bucket details if concerning
      if (Math.abs(cal.overallCalibration - 1) > 0.15) {
        for (const bucket of cal.buckets.slice(0, 3)) {
          if (bucket.predictions >= 5) {
            lines.push(`   ${bucket.confidenceBucket}-${bucket.confidenceBucket + this.BUCKET_SIZE}%: ` +
              `Predicted ${bucket.expectedWinRate.toFixed(0)}%, Actual ${bucket.actualWinRate.toFixed(0)}% ` +
              `(${bucket.wins}W/${bucket.losses}L)`);
          }
        }
      }
      lines.push('');
    }
    
    return lines.join('\n');
  }
  
  private analyzeBuckets(predictions: any[], trades: any[]): CalibrationData[] {
    const buckets = new Map<number, { pred: any[]; actual: any[] }>();
    
    // Initialize buckets
    for (let i = 50; i < 95; i += this.BUCKET_SIZE) {
      buckets.set(i, { pred: [], actual: [] });
    }
    
    // Group predictions
    for (const pred of predictions) {
      const bucketKey = Math.floor(pred.confidence / this.BUCKET_SIZE) * this.BUCKET_SIZE;
      if (buckets.has(bucketKey)) {
        buckets.get(bucketKey)!.pred.push(pred);
      }
    }
    
    // Match with actual outcomes
    for (const trade of trades) {
      if (trade.outcome === 'win' || trade.outcome === 'loss') {
        // Find matching prediction
        const matchingPred = predictions.find(p => 
          p.market_id === trade.market_id && 
          p.platform === trade.platform
        );
        
        if (matchingPred) {
          const bucketKey = Math.floor(matchingPred.confidence / this.BUCKET_SIZE) * this.BUCKET_SIZE;
          if (buckets.has(bucketKey)) {
            buckets.get(bucketKey)!.actual.push(trade);
          }
        }
      }
    }
    
    // Calculate calibration for each bucket
    const results: CalibrationData[] = [];
    
    for (const [bucketKey, data] of buckets) {
      if (data.actual.length < 3) continue; // Need at least 3 outcomes
      
      const wins = data.actual.filter((t: any) => t.outcome === 'win').length;
      const losses = data.actual.filter((t: any) => t.outcome === 'loss').length;
      const total = wins + losses;
      
      const expectedWinRate = bucketKey + (this.BUCKET_SIZE / 2); // midpoint of bucket
      const actualWinRate = (wins / total) * 100;
      
      // Calibration = actual / expected
      // > 1 means we're underconfident (winning more than expected)
      // < 1 means we're overconfident (winning less than expected)
      const calibration = actualWinRate / expectedWinRate;
      
      results.push({
        confidenceBucket: bucketKey,
        predictions: data.pred.length,
        wins,
        losses,
        actualWinRate,
        expectedWinRate,
        calibration
      });
    }
    
    return results.sort((a, b) => a.confidenceBucket - b.confidenceBucket);
  }
  
  private calculateOverallCalibration(buckets: CalibrationData[]): number {
    if (buckets.length === 0) return 1;
    
    // Weight by number of predictions
    const totalWeight = buckets.reduce((sum, b) => sum + b.predictions, 0);
    const weightedSum = buckets.reduce((sum, b) => sum + (b.calibration * b.predictions), 0);
    
    return weightedSum / totalWeight;
  }
  
  private generateRecommendation(calibration: number, buckets: CalibrationData[]): string {
    if (calibration > 1.15) {
      return 'System is underconfident. Can increase stake sizes or lower confidence thresholds.';
    } else if (calibration < 0.85) {
      return 'System is overconfident. Reduce stake sizes or raise confidence thresholds.';
    } else if (buckets.some(b => b.predictions > 10 && Math.abs(b.calibration - 1) > 0.3)) {
      return 'Some confidence buckets miscalibrated. Review specific ranges.';
    }
    return 'Calibration looks good. Continue current strategy.';
  }
  
  private extractSport(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('nba') || lower.includes('basketball')) return 'NBA';
    if (lower.includes('nfl') || lower.includes('football')) return 'NFL';
    if (lower.includes('nhl') || lower.includes('hockey')) return 'NHL';
    if (lower.includes('mlb') || lower.includes('baseball')) return 'MLB';
    if (lower.includes('ncaa') || lower.includes('college')) return 'NCAA';
    if (lower.includes('soccer') || lower.includes('premier')) return 'SOCCER';
    return 'OTHER';
  }
}

export const calibrationTracker = new ConfidenceCalibrationTracker();
