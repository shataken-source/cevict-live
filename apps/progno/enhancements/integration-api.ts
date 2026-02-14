/**
 * PROGNO Enhancements Integration API
 * Provides a unified interface to all enhancement modules
 */

import { explainPrediction, PredictionExplanation, formatExplanation } from './explainable-ai';
import { quantifyUncertainty, UncertaintyEstimate, formatUncertainty } from './uncertainty-quantification';
import { fetchAllRealTimeData, integrateRealTimeData, RealTimeData } from './real-time-data-integration';
import { predictionTracker, PredictionRecord, applyCalibrationAdjustment } from './prediction-tracking';
import { getSolunarData, enhanceFishingWithSolunar, analyzeBarometricPressure } from './fishing-solunar';
import { getBeachBuoyData, enhanceBeachSafetyWithBuoyData } from './noaa-wave-buoys';

export interface EnhancedPredictionResult {
  prediction: number;
  confidence: number;
  explanation: PredictionExplanation;
  uncertainty: UncertaintyEstimate;
  realTimeData?: RealTimeData;
  adjustments?: Array<{ factor: string; impact: number; description: string }>;
  recordId?: string;
}

export interface EnhancedFishingResult {
  baseProbability: number;
  enhancedProbability: number;
  solunarData: any;
  barometricPressure: any;
  bestTimes: Date[];
  adjustments: Array<{ factor: string; impact: number }>;
}

export interface EnhancedBeachSafetyResult {
  basePrediction: {
    ripCurrentRisk: number;
    overallRisk: 'low' | 'moderate' | 'high' | 'extreme';
  };
  enhancedPrediction: {
    ripCurrentRisk: number;
    overallRisk: 'low' | 'moderate' | 'high' | 'extreme';
  };
  buoyData?: any;
  adjustments: Array<{ factor: string; impact: number; description: string }>;
}

/**
 * Get enhanced sports prediction with all features
 */
export async function getEnhancedSportsPrediction(
  team1: string,
  team2: string,
  basePrediction: number,
  baseConfidence: number,
  factors: Record<string, { value: number; weight: number; description: string }>,
  location?: string,
  modelName: string = 'ensemble',
  domain: PredictionRecord['domain'] = 'sports'
): Promise<EnhancedPredictionResult> {
  // 1. Fetch real-time data
  const realTimeData = await fetchAllRealTimeData(team1, team2, location);
  
  // 2. Integrate real-time data
  const { adjustedPrediction, adjustments } = integrateRealTimeData(basePrediction, realTimeData);
  
  // 3. Apply calibration adjustment if available
  const calibrationAdjustment = predictionTracker.calculateCalibrationAdjustment(modelName);
  let finalPrediction = adjustedPrediction;
  if (calibrationAdjustment) {
    finalPrediction = applyCalibrationAdjustment(adjustedPrediction, calibrationAdjustment);
  }
  
  // 4. Generate explanation
  const explanation = explainPrediction(finalPrediction, factors, {
    injuries: realTimeData.injuries?.length || 0,
    weather: realTimeData.weather?.conditions,
  });
  
  // 5. Quantify uncertainty
  const uncertainty = quantifyUncertainty(finalPrediction, {
    dataQuality: realTimeData.injuries ? 0.9 : 0.7,
    modelConfidence: baseConfidence,
    historicalAccuracy: 0.75, // Could be calculated from tracker
    sampleSize: 100, // Could be from tracker
    variance: explanation.factors.length > 0 
      ? Math.abs(explanation.factors[0].impact - explanation.factors[1]?.impact || 0)
      : 0.1,
  });
  
  // 6. Record prediction
  const recordId = predictionTracker.recordPrediction(
    finalPrediction,
    baseConfidence,
    Object.fromEntries(Object.entries(factors).map(([k, v]) => [k, v.value])),
    modelName,
    domain
  );
  
  return {
    prediction: finalPrediction,
    confidence: explanation.confidence,
    explanation,
    uncertainty,
    realTimeData,
    adjustments,
    recordId,
  };
}

/**
 * Get enhanced fishing prediction
 */
export async function getEnhancedFishingPrediction(
  baseProbability: number,
  latitude: number,
  longitude: number,
  currentPressure: number,
  previousPressure?: number
): Promise<EnhancedFishingResult> {
  // 1. Get solunar data
  const solunarData = getSolunarData(new Date(), latitude, longitude);
  
  // 2. Analyze barometric pressure
  const barometricPressure = analyzeBarometricPressure(currentPressure, previousPressure);
  
  // 3. Enhance prediction
  const enhanced = enhanceFishingWithSolunar(
    baseProbability,
    solunarData,
    barometricPressure,
    new Date()
  );
  
  return {
    baseProbability,
    enhancedProbability: enhanced.enhancedProbability,
    solunarData,
    barometricPressure,
    bestTimes: enhanced.bestTimes,
    adjustments: enhanced.adjustments,
  };
}

/**
 * Get enhanced beach safety prediction
 */
export async function getEnhancedBeachSafetyPrediction(
  basePrediction: {
    ripCurrentRisk: number;
    overallRisk: 'low' | 'moderate' | 'high' | 'extreme';
  },
  beachLat: number,
  beachLon: number
): Promise<EnhancedBeachSafetyResult> {
  // 1. Get buoy data
  const { buoyData } = await getBeachBuoyData(beachLat, beachLon);
  
  // 2. Enhance prediction if buoy data available
  if (buoyData) {
    const enhanced = enhanceBeachSafetyWithBuoyData(basePrediction, buoyData);
    return {
      basePrediction,
      enhancedPrediction: enhanced.enhancedPrediction,
      buoyData,
      adjustments: enhanced.adjustments,
    };
  }
  
  // Return base prediction if no buoy data
  return {
    basePrediction,
    enhancedPrediction: basePrediction,
    adjustments: [],
  };
}

/**
 * Format complete enhanced prediction for display
 */
export function formatEnhancedPrediction(result: EnhancedPredictionResult): string {
  const lines: string[] = [];
  
  lines.push('\n═══════════════════════════════════════════════════════════════');
  lines.push('🎯 ENHANCED PREDICTION');
  lines.push('═══════════════════════════════════════════════════════════════\n');
  
  lines.push(`📊 Prediction: ${(result.prediction * 100).toFixed(1)}%`);
  lines.push(`🎯 Confidence: ${(result.confidence * 100).toFixed(0)}%`);
  lines.push('');
  
  // Explanation
  lines.push(formatExplanation(result.explanation));
  lines.push('');
  
  // Uncertainty
  lines.push(formatUncertainty(result.uncertainty));
  lines.push('');
  
  // Real-time adjustments
  if (result.adjustments && result.adjustments.length > 0) {
    lines.push('🔄 REAL-TIME ADJUSTMENTS:');
    result.adjustments.forEach(adj => {
      const impact = (adj.impact * 100).toFixed(1);
      const sign = adj.impact > 0 ? '+' : '';
      lines.push(`  ${sign}${impact}% - ${adj.factor}: ${adj.description}`);
    });
    lines.push('');
  }
  
  // Real-time data summary
  if (result.realTimeData) {
    lines.push('📡 REAL-TIME DATA:');
    if (result.realTimeData.injuries && result.realTimeData.injuries.length > 0) {
      lines.push(`  ⚠️  ${result.realTimeData.injuries.length} injury reports`);
    }
    if (result.realTimeData.lineMovement && result.realTimeData.lineMovement.length > 0) {
      lines.push(`  📈 ${result.realTimeData.lineMovement.length} line movements detected`);
    }
    if (result.realTimeData.weather) {
      lines.push(`  🌤️  Weather: ${result.realTimeData.weather.conditions}`);
    }
    if (result.realTimeData.sentiment && result.realTimeData.sentiment.sampleSize > 0) {
      const s = result.realTimeData.sentiment;
      const overall = s.positive + s.negative > 0 ? (s.positive / (s.positive + s.negative) > 0.5 ? 'bullish' : 'bearish') : 'neutral';
      lines.push(`  💬 Social sentiment: ${overall} (n=${s.sampleSize})`);
    }
    lines.push('');
  }
  
  lines.push('═══════════════════════════════════════════════════════════════\n');
  
  return lines.join('\n');
}

/**
 * Update prediction with actual outcome
 */
export function updatePredictionOutcome(
  recordId: string,
  actual: number
): boolean {
  return predictionTracker.updateActual(recordId, actual);
}

/**
 * Get model performance summary
 */
export function getModelPerformanceSummary() {
  return predictionTracker.getAllModelPerformances();
}

