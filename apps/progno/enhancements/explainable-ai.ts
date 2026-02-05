/**
 * Explainable AI (XAI) Module
 * Provides explanations for why predictions were made
 * Helps users understand and trust predictions
 */

export interface PredictionExplanation {
  prediction: number;
  confidence: number;
  factors: FactorContribution[];
  reasoning: string;
  keyInsights: string[];
  warnings: string[];
}

export interface FactorContribution {
  name: string;
  impact: number; // -1 to 1, negative = hurts, positive = helps
  weight: number; // 0 to 1, importance of this factor
  description: string;
  evidence?: string;
}

/**
 * Generate explanation for a prediction
 */
export function explainPrediction(
  prediction: number,
  factors: Record<string, { value: number; weight: number; description: string }>,
  context?: Record<string, any>
): PredictionExplanation {
  const factorContributions: FactorContribution[] = [];
  let totalPositiveImpact = 0;
  let totalNegativeImpact = 0;
  
  // Calculate contribution of each factor
  for (const [name, factor] of Object.entries(factors)) {
    // Normalize factor value to -1 to 1 range
    const normalizedValue = Math.max(-1, Math.min(1, (factor.value - 0.5) * 2));
    const impact = normalizedValue * factor.weight;
    
    factorContributions.push({
      name,
      impact,
      weight: factor.weight,
      description: factor.description,
      evidence: context?.[name] ? `Current value: ${context[name]}` : undefined,
    });
    
    if (impact > 0) {
      totalPositiveImpact += impact;
    } else {
      totalNegativeImpact += Math.abs(impact);
    }
  }
  
  // Sort by absolute impact
  factorContributions.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  
  // Generate reasoning
  const reasoning = generateReasoning(factorContributions, prediction);
  
  // Extract key insights
  const keyInsights = extractKeyInsights(factorContributions, prediction);
  
  // Generate warnings
  const warnings = generateWarnings(factorContributions, prediction, context);
  
  return {
    prediction,
    confidence: calculateConfidence(factorContributions),
    factors: factorContributions,
    reasoning,
    keyInsights,
    warnings,
  };
}

/**
 * Generate natural language reasoning
 */
function generateReasoning(
  factors: FactorContribution[],
  prediction: number
): string {
  const topFactors = factors.slice(0, 3);
  const reasons: string[] = [];
  
  if (prediction > 0.6) {
    reasons.push('Strong prediction in favor due to:');
  } else if (prediction < 0.4) {
    reasons.push('Strong prediction against due to:');
  } else {
    reasons.push('Close prediction with mixed signals:');
  }
  
  for (const factor of topFactors) {
    if (Math.abs(factor.impact) > 0.1) {
      const direction = factor.impact > 0 ? 'supports' : 'opposes';
      reasons.push(`- ${factor.name} ${direction} the prediction (${(Math.abs(factor.impact) * 100).toFixed(0)}% impact)`);
    }
  }
  
  return reasons.join('\n');
}

/**
 * Extract key insights
 */
function extractKeyInsights(
  factors: FactorContribution[],
  prediction: number
): string[] {
  const insights: string[] = [];
  
  // Find strongest positive factor
  const strongestPositive = factors.find(f => f.impact > 0);
  if (strongestPositive && strongestPositive.impact > 0.2) {
    insights.push(`${strongestPositive.name} is the strongest positive factor`);
  }
  
  // Find strongest negative factor
  const strongestNegative = factors.find(f => f.impact < 0);
  if (strongestNegative && Math.abs(strongestNegative.impact) > 0.2) {
    insights.push(`${strongestNegative.name} is the strongest negative factor`);
  }
  
  // Check for conflicting signals
  const positiveCount = factors.filter(f => f.impact > 0.1).length;
  const negativeCount = factors.filter(f => f.impact < -0.1).length;
  if (positiveCount > 0 && negativeCount > 0) {
    insights.push(`Mixed signals: ${positiveCount} positive vs ${negativeCount} negative factors`);
  }
  
  // Confidence insight
  if (prediction > 0.7 || prediction < 0.3) {
    insights.push('High confidence prediction');
  } else if (prediction > 0.55 || prediction < 0.45) {
    insights.push('Moderate confidence - close call');
  } else {
    insights.push('Low confidence - highly uncertain outcome');
  }
  
  return insights;
}

/**
 * Generate warnings
 */
function generateWarnings(
  factors: FactorContribution[],
  prediction: number,
  context?: Record<string, any>
): string[] {
  const warnings: string[] = [];
  
  // Check for missing data
  const lowWeightFactors = factors.filter(f => f.weight < 0.1);
  if (lowWeightFactors.length > factors.length * 0.3) {
    warnings.push('Many factors have low confidence due to limited data');
  }
  
  // Check for high uncertainty
  if (prediction > 0.45 && prediction < 0.55) {
    warnings.push('Prediction is very close to 50/50 - high uncertainty');
  }
  
  // Check for conflicting strong factors
  const strongPositive = factors.filter(f => f.impact > 0.3);
  const strongNegative = factors.filter(f => f.impact < -0.3);
  if (strongPositive.length > 0 && strongNegative.length > 0) {
    warnings.push('Conflicting strong signals detected - prediction may be unreliable');
  }
  
  // Context-specific warnings
  if (context) {
    if (context.weather && context.weather.includes('extreme')) {
      warnings.push('Extreme weather conditions may affect prediction accuracy');
    }
    if (context.injuries && context.injuries.length > 2) {
      warnings.push('Multiple injuries may significantly impact outcome');
    }
  }
  
  return warnings;
}

/**
 * Calculate overall confidence
 */
function calculateConfidence(factors: FactorContribution[]): number {
  // Confidence based on:
  // 1. Number of factors with high weight
  // 2. Agreement between factors
  // 3. Strength of top factors
  
  const highWeightCount = factors.filter(f => f.weight > 0.2).length;
  const weightScore = Math.min(1, highWeightCount / 5);
  
  // Agreement score (how much factors agree)
  const positiveImpacts = factors.filter(f => f.impact > 0).map(f => f.impact);
  const negativeImpacts = factors.filter(f => f.impact < 0).map(f => Math.abs(f.impact));
  const totalPositive = positiveImpacts.reduce((a, b) => a + b, 0);
  const totalNegative = negativeImpacts.reduce((a, b) => a + b, 0);
  const total = totalPositive + totalNegative;
  const agreementScore = total > 0 ? Math.abs(totalPositive - totalNegative) / total : 0.5;
  
  // Strength score (how strong the top factors are)
  const topFactorStrength = Math.abs(factors[0]?.impact || 0);
  const strengthScore = Math.min(1, topFactorStrength * 2);
  
  // Combine scores
  return (weightScore * 0.3 + agreementScore * 0.4 + strengthScore * 0.3);
}

/**
 * Format explanation for display
 */
export function formatExplanation(explanation: PredictionExplanation): string {
  const lines: string[] = [];
  
  lines.push(`\n📊 PREDICTION EXPLANATION`);
  lines.push(`Prediction: ${(explanation.prediction * 100).toFixed(1)}%`);
  lines.push(`Confidence: ${(explanation.confidence * 100).toFixed(0)}%`);
  lines.push('');
  
  lines.push('🔍 REASONING:');
  lines.push(explanation.reasoning);
  lines.push('');
  
  lines.push('💡 KEY INSIGHTS:');
  explanation.keyInsights.forEach(insight => {
    lines.push(`  • ${insight}`);
  });
  lines.push('');
  
  if (explanation.warnings.length > 0) {
    lines.push('⚠️  WARNINGS:');
    explanation.warnings.forEach(warning => {
      lines.push(`  ⚠ ${warning}`);
    });
    lines.push('');
  }
  
  lines.push('📈 FACTOR BREAKDOWN:');
  explanation.factors.slice(0, 5).forEach(factor => {
    const impactPercent = (Math.abs(factor.impact) * 100).toFixed(0);
    const direction = factor.impact > 0 ? '↑' : '↓';
    lines.push(`  ${direction} ${factor.name}: ${impactPercent}% impact (${factor.description})`);
  });
  
  return lines.join('\n');
}

