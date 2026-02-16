/**
 * Model Calibration Tracker
 * Tracks prediction accuracy vs confidence levels for calibration
 */

export interface CalibrationEntry {
  sport: string
  confidenceBucket: number // 50-60, 60-70, 70-80, 80-90, 90-100
  predictedProb: number
  actualResult: 0 | 1 // 0 = loss, 1 = win
  timestamp: string
  gameId: string
  pick: string
  odds: number
  edge: number
}

// Expected win rates by confidence bucket (from historical data)
export const EXPECTED_WIN_RATES: Record<number, number> = {
  55: 0.55,  // 50-60 bucket
  65: 0.65,  // 60-70 bucket
  75: 0.72,  // 70-80 bucket (calibrated from backtest)
  85: 0.78,  // 80-90 bucket
  92: 0.82,  // 90-100 bucket
}

export class ModelCalibrationTracker {
  private calibrationData: CalibrationEntry[] = []
  private readonly STORAGE_KEY = 'progno_calibration_data'

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        this.calibrationData = JSON.parse(stored)
      }
    } catch (e) {
      console.warn('[Calibration] Could not load from storage')
    }
  }

  private saveToStorage() {
    try {
      // Keep last 1000 entries to prevent storage bloat
      const trimmed = this.calibrationData.slice(-1000)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed))
    } catch (e) {
      console.warn('[Calibration] Could not save to storage')
    }
  }

  recordPrediction(entry: CalibrationEntry) {
    this.calibrationData.push(entry)
    this.saveToStorage()
  }

  getCalibrationReport(): {
    bucket: number
    totalPredictions: number
    actualWinRate: number
    expectedWinRate: number
    calibrationError: number
  }[] {
    const buckets = [55, 65, 75, 85, 92]
    
    return buckets.map(bucket => {
      const bucketEntries = this.calibrationData.filter(
        e => Math.abs(e.confidenceBucket - bucket) < 5
      )
      
      if (bucketEntries.length === 0) {
        return {
          bucket,
          totalPredictions: 0,
          actualWinRate: 0,
          expectedWinRate: EXPECTED_WIN_RATES[bucket],
          calibrationError: 0
        }
      }
      
      const wins = bucketEntries.filter(e => e.actualResult === 1).length
      const actualWinRate = wins / bucketEntries.length
      const expectedWinRate = EXPECTED_WIN_RATES[bucket]
      
      return {
        bucket,
        totalPredictions: bucketEntries.length,
        actualWinRate,
        expectedWinRate,
        calibrationError: Math.abs(actualWinRate - expectedWinRate)
      }
    })
  }

  // Get adjusted confidence based on calibration
  getCalibratedConfidence(rawConfidence: number, sport: string): number {
    const bucket = this.getConfidenceBucket(rawConfidence)
    const report = this.getCalibrationReport().find(r => r.bucket === bucket)
    
    if (!report || report.totalPredictions < 50) {
      // Not enough data, return slightly dampened confidence
      return rawConfidence * 0.95
    }
    
    // Adjust confidence based on historical calibration
    const adjustment = report.expectedWinRate - report.actualWinRate
    return Math.max(50, Math.min(92, rawConfidence - adjustment * 100))
  }

  private getConfidenceBucket(confidence: number): number {
    if (confidence < 60) return 55
    if (confidence < 70) return 65
    if (confidence < 80) return 75
    if (confidence < 90) return 85
    return 92
  }
}

// Sport-specific variance multipliers (from backtest analysis)
export const SPORT_VARIANCE: Record<string, number> = {
  'NFL': 0.90,      // Lower variance, more predictable
  'NBA': 1.00,      // Baseline
  'NHL': 1.05,      // Slightly higher variance
  'MLB': 0.95,      // Lower variance (starting pitchers)
  'NCAAF': 1.10,    // Higher variance (college football)
  'NCAAB': 1.15,    // Highest variance (college basketball)
}

// Apply sport-specific variance adjustment to stake
export function applySportVariance(stake: number, sport: string): number {
  const variance = SPORT_VARIANCE[sport.toUpperCase()] ?? 1.0
  return stake * variance
}

// Confidence calibration based on historical performance
export function getCalibratedWinProbability(rawConfidence: number): number {
  // From backtest: 90% confidence → 72% actual win rate
  // Apply dampening factor based on backtest results
  if (rawConfidence >= 90) return rawConfidence * 0.80  // 90% → 72%
  if (rawConfidence >= 80) return rawConfidence * 0.85  // 80% → 68%
  if (rawConfidence >= 70) return rawConfidence * 0.90  // 70% → 63%
  return rawConfidence * 0.95  // Lower confidence less affected
}

// Export singleton for global use
export const calibrationTracker = new ModelCalibrationTracker()
