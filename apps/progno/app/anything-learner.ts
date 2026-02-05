// Anything Learner Module for Progno Sports Prediction Platform

export interface LearningData {
  question: string;
  prediction: string;
  actualOutcome?: string;
  confidence: number;
  timestamp: Date;
  accuracy?: number;
}

export interface LearningStats {
  totalPredictions: number;
  successfulPredictions: number;
  averageConfidence: number;
  accuracyRate: number;
  mostAccurateCategory: string;
  learningTrend: 'improving' | 'stable' | 'declining';
}

// Store learning data in memory (in production, this would be a database)
let learningData: LearningData[] = [];

// Learn from prediction results
export function learnFromAnythingResult(
  question: string,
  prediction: string,
  confidence: number,
  actualOutcome?: string
): void {
  const learningEntry: LearningData = {
    question,
    prediction,
    confidence,
    timestamp: new Date(),
    actualOutcome,
    accuracy: actualOutcome ? calculateAccuracy(prediction, actualOutcome) : undefined
  };

  learningData.push(learningEntry);

  // Keep only last 1000 entries to prevent memory issues
  if (learningData.length > 1000) {
    learningData = learningData.slice(-1000);
  }
}

// Get learning statistics
export function getAnythingLearningStats(): LearningStats {
  if (learningData.length === 0) {
    return {
      totalPredictions: 0,
      successfulPredictions: 0,
      averageConfidence: 0,
      accuracyRate: 0,
      mostAccurateCategory: 'none',
      learningTrend: 'stable'
    };
  }

  const totalPredictions = learningData.length;
  const predictionsWithOutcomes = learningData.filter(d => d.actualOutcome !== undefined);
  const successfulPredictions = predictionsWithOutcomes.filter(d => (d.accuracy || 0) > 0.7).length;

  const averageConfidence = learningData.reduce((sum, d) => sum + d.confidence, 0) / totalPredictions;
  const accuracyRate = predictionsWithOutcomes.length > 0
    ? successfulPredictions / predictionsWithOutcomes.length
    : 0;

  // Determine most accurate category
  const categoryAccuracy = calculateCategoryAccuracy();
  const mostAccurateCategory = Object.entries(categoryAccuracy)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';

  // Determine learning trend
  const learningTrend = calculateLearningTrend();

  return {
    totalPredictions,
    successfulPredictions,
    averageConfidence: Math.round(averageConfidence * 100) / 100,
    accuracyRate: Math.round(accuracyRate * 100) / 100,
    mostAccurateCategory,
    learningTrend
  };
}

// Calculate accuracy between prediction and actual outcome
function calculateAccuracy(prediction: string, actualOutcome: string): number {
  // If outcome is "correct" or "incorrect", use binary accuracy
  const outcomeLower = actualOutcome.toLowerCase();
  if (outcomeLower === 'correct' || outcomeLower === 'incorrect') {
    // For binary outcomes, check if prediction sentiment matches
    const predictionLower = prediction.toLowerCase();
    const isPositive = predictionLower.includes('likely') ||
                       predictionLower.includes('will') ||
                       predictionLower.includes('positive') ||
                       predictionLower.includes('favorable') ||
                       predictionLower.includes('suggest') ||
                       predictionLower.includes('expected');

    // If marked as correct, positive prediction = 1.0, negative = 0.5
    // If marked as incorrect, negative prediction = 1.0, positive = 0.3
    if (outcomeLower === 'correct') {
      return isPositive ? 1.0 : 0.5;
    } else {
      return isPositive ? 0.3 : 1.0;
    }
  }

  // Fallback: Simple accuracy calculation based on keyword matching
  const predictionWords = prediction.toLowerCase().split(' ');
  const actualWords = actualOutcome.toLowerCase().split(' ');

  const commonWords = predictionWords.filter(word => actualWords.includes(word));
  const accuracy = commonWords.length / Math.max(predictionWords.length, actualWords.length);

  return Math.round(accuracy * 100) / 100;
}

// Calculate accuracy by category
function calculateCategoryAccuracy(): { [category: string]: number } {
  const categories: { [category: string]: { correct: number; total: number } } = {};

  learningData.forEach(data => {
    if (data.actualOutcome === undefined) return;

    let category = 'general';
    const question = data.question.toLowerCase();

    if (question.includes('sport') || question.includes('game') || question.includes('team')) {
      category = 'sports';
    } else if (question.includes('weather') || question.includes('rain') || question.includes('temperature')) {
      category = 'weather';
    } else if (question.includes('outcome') || question.includes('result')) {
      category = 'outcome';
    }

    if (!categories[category]) {
      categories[category] = { correct: 0, total: 0 };
    }

    categories[category].total++;
    if ((data.accuracy || 0) > 0.7) {
      categories[category].correct++;
    }
  });

  const accuracyByCategory: { [category: string]: number } = {};
  Object.entries(categories).forEach(([category, { correct, total }]) => {
    accuracyByCategory[category] = total > 0 ? correct / total : 0;
  });

  return accuracyByCategory;
}

// Calculate learning trend
function calculateLearningTrend(): 'improving' | 'stable' | 'declining' {
  if (learningData.length < 10) return 'stable';

  // Compare recent vs older predictions
  const recentData = learningData.slice(-10);
  const olderData = learningData.slice(-20, -10);

  if (olderData.length === 0) return 'stable';

  const recentAccuracy = recentData
    .filter(d => d.actualOutcome !== undefined)
    .reduce((sum, d) => sum + (d.accuracy || 0), 0) / recentData.filter(d => d.actualOutcome !== undefined).length;

  const olderAccuracy = olderData
    .filter(d => d.actualOutcome !== undefined)
    .reduce((sum, d) => sum + (d.accuracy || 0), 0) / olderData.filter(d => d.actualOutcome !== undefined).length;

  if (recentAccuracy > olderAccuracy + 0.1) return 'improving';
  if (recentAccuracy < olderAccuracy - 0.1) return 'declining';
  return 'stable';
}

// Get recent learning data for analysis
export function getRecentLearningData(limit: number = 10): LearningData[] {
  return learningData.slice(-limit);
}

// Clear learning data (for testing or reset)
export function clearLearningData(): void {
  learningData = [];
}

// Export learning data for backup
export function exportLearningData(): LearningData[] {
  return [...learningData];
}

// Import learning data from backup
export function importLearningData(data: LearningData[]): void {
  learningData = data;
}
