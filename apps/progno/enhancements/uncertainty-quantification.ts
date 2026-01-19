/**
 * Uncertainty Quantification Module
 * Provides confidence intervals and uncertainty estimates for predictions
 */

export interface UncertaintyEstimate {
  prediction: number;
  confidenceInterval: {
    lower: number;
    upper: number;
    level: number; // e.g., 0.95 for 95% confidence
  };
  uncertainty: number; // 0-1, higher = more uncertain
  sources: UncertaintySource[];
  recommendations: string[];
}

export interface UncertaintySource {
  name: string;
  contribution: number; // 0-1, how much this contributes to uncertainty
  description: string;
  mitigation?: string;
}

/**
 * Calculate uncertainty for a prediction
 */
export function quantifyUncertainty(
  prediction: number,
  factors: {
    dataQuality: number; // 0-1, quality of input data
    modelConfidence: number; // 0-1, model's confidence
    historicalAccuracy: number; // 0-1, how accurate similar predictions were
    sampleSize: number; // number of similar cases
    variance: number; // variance in predictions from ensemble
  }
): UncertaintyEstimate {
  const sources: UncertaintySource[] = [];

  // Data quality uncertainty
  const dataUncertainty = 1 - factors.dataQuality;
  sources.push({
    name: 'Data Quality',
    contribution: dataUncertainty * 0.3,
    description: `Data quality score: ${(factors.dataQuality * 100).toFixed(0)}%`,
    mitigation: 'Gather more reliable data sources',
  });

  // Model confidence uncertainty
  const modelUncertainty = 1 - factors.modelConfidence;
  sources.push({
    name: 'Model Confidence',
    contribution: modelUncertainty * 0.25,
    description: `Model confidence: ${(factors.modelConfidence * 100).toFixed(0)}%`,
    mitigation: 'Train model on more similar cases',
  });

  // Historical accuracy uncertainty
  const historicalUncertainty = 1 - factors.historicalAccuracy;
  sources.push({
    name: 'Historical Accuracy',
    contribution: historicalUncertainty * 0.2,
    description: `Similar predictions were ${(factors.historicalAccuracy * 100).toFixed(0)}% accurate`,
    mitigation: 'Improve model calibration',
  });

  // Sample size uncertainty
  const sampleUncertainty = Math.max(0, 1 - Math.min(1, factors.sampleSize / 100));
  sources.push({
    name: 'Sample Size',
    contribution: sampleUncertainty * 0.15,
    description: `Based on ${factors.sampleSize} similar cases`,
    mitigation: 'Wait for more data points',
  });

  // Ensemble variance uncertainty
  const varianceUncertainty = Math.min(1, factors.variance * 2);
  sources.push({
    name: 'Model Agreement',
    contribution: varianceUncertainty * 0.1,
    description: `Models disagree by ${(factors.variance * 100).toFixed(1)}%`,
    mitigation: 'Use more diverse models or better feature engineering',
  });

  // Total uncertainty
  const totalUncertainty = sources.reduce((sum, s) => sum + s.contribution, 0);

  // Calculate confidence interval
  // Use prediction ± uncertainty * prediction range
  const predictionRange = Math.min(prediction, 1 - prediction);
  const margin = totalUncertainty * predictionRange * 1.96; // 95% confidence z-score

  const confidenceInterval = {
    lower: Math.max(0, prediction - margin),
    upper: Math.min(1, prediction + margin),
    level: 0.95,
  };

  // Generate recommendations
  const recommendations = generateRecommendations(sources, totalUncertainty);

  return {
    prediction,
    confidenceInterval,
    uncertainty: totalUncertainty,
    sources: sources.sort((a, b) => b.contribution - a.contribution),
    recommendations,
  };
}

/**
 * Generate recommendations to reduce uncertainty
 */
function generateRecommendations(
  sources: UncertaintySource[],
  totalUncertainty: number
): string[] {
  const recommendations: string[] = [];

  if (totalUncertainty > 0.5) {
    recommendations.push('⚠️ High uncertainty - consider waiting for more information');
  }

  // Top 3 uncertainty sources
  const topSources = sources.slice(0, 3);
  for (const source of topSources) {
    if (source.contribution > 0.15 && source.mitigation) {
      recommendations.push(`• ${source.mitigation}`);
    }
  }

  if (totalUncertainty < 0.2) {
    recommendations.push('✅ Low uncertainty - prediction is reliable');
  }

  return recommendations;
}

/**
 * Calculate prediction intervals for Monte Carlo results
 */
export function calculatePredictionIntervals(
  samples: number[],
  confidenceLevel: number = 0.95
): {
  mean: number;
  median: number;
  lower: number;
  upper: number;
  percentile: number;
} {
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const median = sorted[Math.floor(sorted.length / 2)];

  const alpha = 1 - confidenceLevel;
  const lowerIndex = Math.floor(sorted.length * (alpha / 2));
  const upperIndex = Math.ceil(sorted.length * (1 - alpha / 2));

  return {
    mean,
    median,
    lower: sorted[lowerIndex],
    upper: sorted[upperIndex],
    percentile: confidenceLevel * 100,
  };
}

/**
 * Format uncertainty estimate for display
 */
export function formatUncertainty(estimate: UncertaintyEstimate): string {
  const lines: string[] = [];

  lines.push(`\n📊 UNCERTAINTY ANALYSIS`);
  lines.push(`Prediction: ${(estimate.prediction * 100).toFixed(1)}%`);
  lines.push(`Uncertainty: ${(estimate.uncertainty * 100).toFixed(0)}%`);
  lines.push(`\n${(estimate.confidenceInterval.level * 100).toFixed(0)}% Confidence Interval:`);
  lines.push(`  ${(estimate.confidenceInterval.lower * 100).toFixed(1)}% - ${(estimate.confidenceInterval.upper * 100).toFixed(1)}%`);
  lines.push('');

  lines.push('🔍 UNCERTAINTY SOURCES:');
  estimate.sources.forEach((source, i) => {
    const contribution = (source.contribution * 100).toFixed(0);
    lines.push(`  ${i + 1}. ${source.name}: ${contribution}%`);
    lines.push(`     ${source.description}`);
    if (source.mitigation) {
      lines.push(`     💡 ${source.mitigation}`);
    }
  });
  lines.push('');

  if (estimate.recommendations.length > 0) {
    lines.push('💡 RECOMMENDATIONS:');
    estimate.recommendations.forEach(rec => {
      lines.push(`  ${rec}`);
    });
  }

  return lines.join('\n');
}

