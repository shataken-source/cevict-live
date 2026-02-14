/**
 * Cevict Probability Analyzer
 * 
 * Analyzes prediction accuracy, confidence calibration, and probability distributions
 * Uses Brier scoring, calibration curves, and statistical analysis
 */

import { getAccuracyMetrics } from './prediction-tracker';

export interface ProbabilityAnalysis {
  brierScore: number;
  calibration: {
    perfectCalibration: number;
    overconfidence: number;
    underconfidence: number;
    reliabilityIndex: number;
  };
  confidenceDistribution: {
    excellent: number;    // 70-100%
    good: number;           // 60-70%
    average: number;        // 50-60%
    poor: number;          // 30-50%
    terrible: number;       // 0-30%
  };
  byConfidence: Record<string, {
    predictions: number;
    accuracy: number;
    brierScore: number;
    expectedAccuracy: number;
  };
  bySport: Record<string, {
    totalPredictions: number;
    winRate: number;
    avgConfidence: number;
    avgBrierScore: number;
  };
}

export class CevictProbabilityAnalyzer {
  /**
   * Analyze prediction accuracy and calibration
   */
  analyze(): ProbabilityAnalysis {
    const metrics = getAccuracyMetrics();
    
    // Calculate Brier score (lower is better, target <0.25)
    const overallBrier = metrics.averageBrier || 0;
    
    // Confidence calibration analysis
    const confidenceRanges = {
      excellent: { min: 70, max: 100, count: 0 },
      good: { min: 60, max: 70, count: 0 },
      average: { min: 50, max: 60, count: 0 },
      poor: { min: 30, max: 50, count: 0 },
      terrible: { min: 0, max: 30, count: 0 }
    };
    
    // Count predictions by confidence range
    const predictions = metrics.byConfidence ? Object.values(metrics.byConfidence) : [];
    predictions.forEach(pred => {
      const confidence = pred.avgConfidence || 0;
      if (confidence >= 70) confidenceRanges.excellent.count++;
      else if (confidence >= 60) confidenceRanges.good.count++;
      else if (confidence >= 50) confidenceRanges.average.count++;
      else if (confidence >= 30) confidenceRanges.poor.count++;
      else confidenceRanges.terrible.count++;
    });
    
    // Calculate calibration metrics
    const perfectCalibration = overallBrier < 0.1 ? 1 : 0;
    const overconfidence = overallBrier > 0.25 ? 1 : 0;
    const underconfidence = overallBrier > 0.35 ? 1 : 0;
    const reliabilityIndex = 1 - (overallBrier / 0.25);
    
    return {
      brierScore: overallBrier,
      calibration: {
        perfectCalibration,
        overconfidence,
        underconfidence,
        reliabilityIndex
      },
      confidenceDistribution: confidenceRanges,
      byConfidence: metrics.byConfidence || {},
      bySport: metrics.bySport || {}
    };
  }

/**
 * Get probability analysis for admin dashboard
 */
export function getProbabilityAnalysis(): ProbabilityAnalysis {
  const analyzer = new CevictProbabilityAnalyzer();
  return analyzer.analyze();
}
