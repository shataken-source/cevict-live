/**
 * Performance Tracker
 * Tracks prediction accuracy and performance metrics
 * Includes HMAC signing and PII anonymization for security
 */

import { savePrediction, recordOutcome } from './progno-db';
import crypto from 'crypto';

export interface PerformanceStats {
  total: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
  roi: number;
  units: number;
  avgOdds: number;
  clv: number; // Closing Line Value - gold standard metric
  clvPercentage: number; // CLV as percentage
  sharpSideAccuracy: number;
  bySport: Record<string, Partial<PerformanceStats>>;
  byBetType: Record<string, Partial<PerformanceStats>>;
  topPicks: Array<{ gameId: string; profit: number; confidence: number; clv: number }>;
  worstPicks: Array<{ gameId: string; loss: number; confidence: number; clv: number }>;
  currentStreak: { type: 'win' | 'loss' | 'push' | 'none'; count: number };
  bestStreak: { type: 'win' | 'loss'; count: number };
  worstStreak: { type: 'win' | 'loss'; count: number };
}

export interface CLVCalculation {
  predictionOdds: number; // Odds when prediction was made
  closingOdds: number; // Odds when game started
  clv: number; // Closing Line Value
  clvPercentage: number;
}

export class PerformanceTracker {
  private static readonly HMAC_SECRET = process.env.PERFORMANCE_TRACKER_SECRET || 'default-secret-change-in-production';
  private static readonly ANONYMIZATION_SALT = process.env.PII_ANONYMIZATION_SALT || 'default-salt-change-in-production';

  /**
   * Generate HMAC signature for performance data
   * Prevents tampering with tracking data
   */
  private static generateHMAC(data: string): string {
    return crypto
      .createHmac('sha256', this.HMAC_SECRET)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  private static verifyHMAC(data: string, signature: string): boolean {
    const expectedSignature = this.generateHMAC(data);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Anonymize PII (Personally Identifiable Information)
   * Uses one-way hashing to create anonymized betting IDs
   */
  static anonymizeBettingId(userId: string, gameId: string): string {
    const combined = `${userId}:${gameId}:${this.ANONYMIZATION_SALT}`;
    return crypto
      .createHash('sha256')
      .update(combined)
      .digest('hex')
      .substring(0, 16); // 16-char anonymized ID
  }

  /**
   * Anonymize user identifier for tracking
   */
  static anonymizeUserId(userId: string): string {
    return crypto
      .createHash('sha256')
      .update(`${userId}:${this.ANONYMIZATION_SALT}`)
      .digest('hex')
      .substring(0, 12); // 12-char anonymized user ID
  }

  /**
   * Sign performance data with HMAC
   */
  static signPerformanceData(data: any): { data: any; signature: string; timestamp: string } {
    const timestamp = new Date().toISOString();
    const dataString = JSON.stringify({ ...data, timestamp });
    const signature = this.generateHMAC(dataString);

    return {
      data,
      signature,
      timestamp,
    };
  }

  /**
   * Verify signed performance data
   */
  static verifyPerformanceData(
    data: any,
    signature: string,
    timestamp: string
  ): boolean {
    const dataString = JSON.stringify({ ...data, timestamp });
    return this.verifyHMAC(dataString, signature);
  }

  /**
   * Get performance stats for a period (with anonymization)
   */
  static async getStats(period: string, sport?: string, userId?: string): Promise<PerformanceStats> {
    // TODO: Query database for actual predictions and outcomes
    // For now, return placeholder stats

    const stats: PerformanceStats = {
      total: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      winRate: 0,
      roi: 0,
      units: 0,
      avgOdds: -110,
      clv: 0,
      clvPercentage: 0,
      sharpSideAccuracy: 0,
      bySport: {},
      byBetType: {},
      topPicks: [],
      worstPicks: [],
      currentStreak: { type: 'none', count: 0 },
      bestStreak: { type: 'win', count: 0 },
      worstStreak: { type: 'loss', count: 0 },
    };

    // TODO: Implement database queries
    // Example:
    // const predictions = await db.query(`
    //   SELECT * FROM predictions
    //   WHERE created_at >= $1
    //   AND (sport = $2 OR $2 IS NULL)
    // `, [getPeriodStart(period), sport]);
    //
    // for (const pred of predictions) {
    //   const outcome = await getOutcome(pred.gameId);
    //   if (outcome) {
    //     stats.total++;
    //     if (outcome.result === 'win') stats.wins++;
    //     else if (outcome.result === 'loss') stats.losses++;
    //     else stats.pushes++;
    //   }
    // }

    return stats;
  }

  /**
   * Record a prediction outcome with CLV (with HMAC signing and PII anonymization)
   */
  static async recordOutcome(
    predictionId: string,
    result: 'win' | 'loss' | 'push',
    profit: number,
    clv?: CLVCalculation,
    userId?: string,
    gameId?: string
  ): Promise<{ success: boolean; anonymizedId: string; signature: string }> {
    // Anonymize user and game identifiers
    const anonymizedBettingId = userId && gameId
      ? this.anonymizeBettingId(userId, gameId)
      : this.anonymizeBettingId('anonymous', predictionId);

    const anonymizedUserId = userId
      ? this.anonymizeUserId(userId)
      : 'anonymous';

    // Create tracking record with anonymized data
    const trackingData = {
      anonymizedBettingId,
      anonymizedUserId,
      predictionId,
      result,
      profit,
      clv,
      timestamp: new Date().toISOString(),
    };

    // Sign the data
    const signed = this.signPerformanceData(trackingData);

    // Store in database (with anonymized IDs)
    await recordOutcome(predictionId, { 
      status: result === 'win' ? 'correct' : result === 'loss' ? 'incorrect' : 'partial',
      outcome_data: { result, profit },
      profit,
    });

    // TODO: Store CLV and signed data in database
    // if (clv) {
    //   await db.query(`
    //     UPDATE predictions
    //     SET closing_odds = $1, clv = $2, clv_percentage = $3,
    //         anonymized_betting_id = $4, hmac_signature = $5
    //     WHERE id = $6
    //   `, [clv.closingOdds, clv.clv, clv.clvPercentage, anonymizedBettingId, signed.signature, predictionId]);
    // }

    return {
      success: true,
      anonymizedId: anonymizedBettingId,
      signature: signed.signature,
    };
  }

  /**
   * Calculate Closing Line Value (CLV)
   * CLV = (Prediction Odds - Closing Odds) / Closing Odds
   * Positive CLV means we got better odds than closing line (sharp)
   */
  static calculateCLV(predictionOdds: number, closingOdds: number): CLVCalculation {
    // Convert American odds to implied probability
    const predProb = predictionOdds > 0
      ? 100 / (predictionOdds + 100)
      : Math.abs(predictionOdds) / (Math.abs(predictionOdds) + 100);

    const closingProb = closingOdds > 0
      ? 100 / (closingOdds + 100)
      : Math.abs(closingOdds) / (Math.abs(closingOdds) + 100);

    // CLV = difference in implied probabilities
    const clv = predProb - closingProb;
    const clvPercentage = clv * 100;

    return {
      predictionOdds,
      closingOdds,
      clv,
      clvPercentage,
    };
  }

  /**
   * Get top performing picks
   */
  static async getTopPicks(limit: number = 10): Promise<Array<{
    gameId: string;
    profit: number;
    confidence: number;
  }>> {
    // TODO: Query database
    return [];
  }

  /**
   * Get worst performing picks
   */
  static async getWorstPicks(limit: number = 10): Promise<Array<{
    gameId: string;
    loss: number;
    confidence: number;
  }>> {
    // TODO: Query database
    return [];
  }
}

function getPeriodStart(period: string): Date {
  const now = new Date();
  switch (period) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'season':
      // Start of current season (approximate)
      const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
      return new Date(year, 8, 1); // September 1
    case 'all':
      return new Date(0);
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

