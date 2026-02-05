/**
 * Prediction Tracking and Auto-Calibration
 * Tracks prediction accuracy and automatically adjusts models
 */

export interface PredictionRecord {
  id: string;
  timestamp: Date;
  prediction: number;
  actual: number | null; // null if outcome not yet known
  confidence: number;
  factors: Record<string, number>;
  model: string;
  domain: 'sports' | 'fishing' | 'beach' | 'weather' | 'other';
}

export interface ModelPerformance {
  modelName: string;
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  brierScore: number; // Lower is better (0 = perfect)
  calibrationError: number; // How well calibrated (0 = perfect)
  recentAccuracy: number; // Last 50 predictions
  trend: 'improving' | 'declining' | 'stable';
}

export interface CalibrationAdjustment {
  modelName: string;
  adjustment: number; // Additive adjustment to predictions
  reason: string;
  confidence: number;
}

/**
 * Prediction tracker
 */
export class PredictionTracker {
  private records: PredictionRecord[] = [];
  private maxRecords = 10000; // Keep last 10k predictions
  
  /**
   * Record a prediction
   */
  recordPrediction(
    prediction: number,
    confidence: number,
    factors: Record<string, number>,
    model: string,
    domain: PredictionRecord['domain']
  ): string {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const record: PredictionRecord = {
      id,
      timestamp: new Date(),
      prediction,
      actual: null,
      confidence,
      factors,
      model,
      domain,
    };
    
    this.records.push(record);
    
    // Trim old records
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords);
    }
    
    return id;
  }
  
  /**
   * Update prediction with actual outcome
   */
  updateActual(id: string, actual: number): boolean {
    const record = this.records.find(r => r.id === id);
    if (record) {
      record.actual = actual;
      return true;
    }
    return false;
  }
  
  /**
   * Get model performance
   */
  getModelPerformance(modelName: string): ModelPerformance | null {
    const modelRecords = this.records.filter(
      r => r.model === modelName && r.actual !== null
    );
    
    if (modelRecords.length === 0) {
      return null;
    }
    
    // Calculate accuracy
    const correct = modelRecords.filter(r => {
      const predicted = r.prediction > 0.5 ? 1 : 0;
      const actual = (r.actual || 0) > 0.5 ? 1 : 0;
      return predicted === actual;
    }).length;
    
    const accuracy = correct / modelRecords.length;
    
    // Calculate Brier score (mean squared error)
    const brierScore = modelRecords.reduce((sum, r) => {
      const error = r.prediction - (r.actual || 0);
      return sum + error * error;
    }, 0) / modelRecords.length;
    
    // Calculate calibration error
    // Group predictions into bins and check if actual matches predicted probability
    const bins: Array<{ predicted: number; actual: number; count: number }> = [];
    for (let i = 0; i < 10; i++) {
      const binMin = i / 10;
      const binMax = (i + 1) / 10;
      const binRecords = modelRecords.filter(
        r => r.prediction >= binMin && r.prediction < binMax
      );
      
      if (binRecords.length > 0) {
        const avgPredicted = binRecords.reduce((s, r) => s + r.prediction, 0) / binRecords.length;
        const avgActual = binRecords.reduce((s, r) => s + (r.actual || 0), 0) / binRecords.length;
        bins.push({
          predicted: avgPredicted,
          actual: avgActual,
          count: binRecords.length,
        });
      }
    }
    
    const calibrationError = bins.reduce((sum, bin) => {
      return sum + Math.abs(bin.predicted - bin.actual) * bin.count;
    }, 0) / modelRecords.length;
    
    // Recent accuracy (last 50)
    const recentRecords = modelRecords.slice(-50);
    const recentCorrect = recentRecords.filter(r => {
      const predicted = r.prediction > 0.5 ? 1 : 0;
      const actual = (r.actual || 0) > 0.5 ? 1 : 0;
      return predicted === actual;
    }).length;
    const recentAccuracy = recentRecords.length > 0 ? recentCorrect / recentRecords.length : 0;
    
    // Determine trend
    const olderRecords = modelRecords.slice(-100, -50);
    const olderCorrect = olderRecords.filter(r => {
      const predicted = r.prediction > 0.5 ? 1 : 0;
      const actual = (r.actual || 0) > 0.5 ? 1 : 0;
      return predicted === actual;
    }).length;
    const olderAccuracy = olderRecords.length > 0 ? olderCorrect / olderRecords.length : 0;
    
    let trend: 'improving' | 'declining' | 'stable';
    if (recentAccuracy > olderAccuracy + 0.05) {
      trend = 'improving';
    } else if (recentAccuracy < olderAccuracy - 0.05) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }
    
    return {
      modelName,
      totalPredictions: modelRecords.length,
      correctPredictions: correct,
      accuracy,
      brierScore,
      calibrationError,
      recentAccuracy,
      trend,
    };
  }
  
  /**
   * Calculate calibration adjustment
   */
  calculateCalibrationAdjustment(modelName: string): CalibrationAdjustment | null {
    const performance = this.getModelPerformance(modelName);
    if (!performance || performance.totalPredictions < 50) {
      return null;
    }
    
    // If model is overconfident (predictions too extreme), adjust toward 0.5
    // If model is underconfident (predictions too conservative), adjust away from 0.5
    const adjustment = (performance.calibrationError - 0.1) * 0.1; // Small adjustment
    
    let reason = '';
    if (performance.calibrationError > 0.15) {
      reason = `High calibration error (${(performance.calibrationError * 100).toFixed(1)}%) - model needs adjustment`;
    } else if (performance.brierScore > 0.25) {
      reason = `High Brier score (${performance.brierScore.toFixed(3)}) - predictions need refinement`;
    } else {
      return null; // Model is well-calibrated
    }
    
    return {
      modelName,
      adjustment,
      reason,
      confidence: Math.min(1, performance.totalPredictions / 200), // More data = higher confidence
    };
  }
  
  /**
   * Get all model performances
   */
  getAllModelPerformances(): ModelPerformance[] {
    const modelNames = [...new Set(this.records.map(r => r.model))];
    return modelNames
      .map(name => this.getModelPerformance(name))
      .filter((p): p is ModelPerformance => p !== null)
      .sort((a, b) => b.accuracy - a.accuracy);
  }
  
  /**
   * Get records for a specific domain
   */
  getDomainRecords(domain: PredictionRecord['domain']): PredictionRecord[] {
    return this.records.filter(r => r.domain === domain);
  }
}

// Global tracker instance
export const predictionTracker = new PredictionTracker();

/**
 * Apply calibration adjustment to a prediction
 */
export function applyCalibrationAdjustment(
  prediction: number,
  adjustment: CalibrationAdjustment
): number {
  // Apply additive adjustment, but keep within bounds
  let adjusted = prediction + adjustment.adjustment;
  
  // If adjustment is significant, apply it more strongly
  if (Math.abs(adjustment.adjustment) > 0.05) {
    // Move prediction toward 0.5 if overconfident, away if underconfident
    if (adjustment.adjustment < 0) {
      adjusted = prediction * 0.9 + 0.5 * 0.1; // Move toward center
    } else {
      adjusted = prediction * 1.1 - 0.05 * (prediction > 0.5 ? 1 : -1); // Move away from center
    }
  }
  
  return Math.max(0.01, Math.min(0.99, adjusted));
}

