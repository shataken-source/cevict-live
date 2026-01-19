// Test Script for PROGNO Learning System
// Runs multiple predictions and simulates learning feedback

import { predictAnything, AnythingInput } from '../app/anything-predictor';
import {
  learnFromAnythingResult,
  getAnythingLearningStats,
  clearLearningData
} from '../app/anything-learner';

interface TestCase {
  question: string;
  context?: string;
  expectedOutcome: 'correct' | 'incorrect';
  category: string;
}

const testCases: TestCase[] = [
  // Weather questions (should be more accurate)
  {
    question: "Will it rain in Miami tomorrow?",
    context: "Current forecast shows 80% chance of rain",
    expectedOutcome: 'correct',
    category: 'weather'
  },
  {
    question: "Will it snow in Florida next week?",
    context: "Florida rarely gets snow, especially in December",
    expectedOutcome: 'correct',
    category: 'weather'
  },
  {
    question: "Will the temperature be above 70°F in California today?",
    context: "California typically has warm weather",
    expectedOutcome: 'correct',
    category: 'weather'
  },

  // Sports questions
  {
    question: "Will the Chiefs win their next game?",
    context: "Chiefs are strong team this season",
    expectedOutcome: 'correct',
    category: 'sports'
  },
  {
    question: "Will Alabama win the national championship?",
    context: "Alabama is a top-ranked team",
    expectedOutcome: 'correct',
    category: 'sports'
  },
  {
    question: "Will a team score over 50 points in the Super Bowl?",
    context: "High scoring games are common in Super Bowl",
    expectedOutcome: 'correct',
    category: 'sports'
  },

  // Outcome questions
  {
    question: "Will Bitcoin price increase next month?",
    context: "Cryptocurrency is volatile",
    expectedOutcome: 'incorrect', // Hard to predict
    category: 'outcome'
  },
  {
    question: "Will I get a promotion this year?",
    context: "Performance reviews are coming up",
    expectedOutcome: 'correct',
    category: 'outcome'
  },
  {
    question: "Will the stock market go up next week?",
    context: "Market trends are positive",
    expectedOutcome: 'correct',
    category: 'outcome'
  },

  // General questions
  {
    question: "Will there be a new iPhone released next year?",
    context: "Apple releases new iPhones annually",
    expectedOutcome: 'correct',
    category: 'general'
  },
  {
    question: "Will remote work become more common?",
    context: "Trend shows increasing remote work adoption",
    expectedOutcome: 'correct',
    category: 'general'
  },
  {
    question: "Will AI replace all jobs?",
    context: "AI will augment, not replace all jobs",
    expectedOutcome: 'correct',
    category: 'general'
  },

  // Edge cases
  {
    question: "Will the sun rise tomorrow?",
    context: "The sun always rises",
    expectedOutcome: 'correct',
    category: 'general'
  },
  {
    question: "Will I win the lottery?",
    context: "Lottery odds are extremely low",
    expectedOutcome: 'incorrect',
    category: 'outcome'
  }
];

async function runLearningTests() {
  console.log('🧪 PROGNO Learning System Test Suite');
  console.log('=====================================\n');

  // Clear existing learning data for fresh test
  clearLearningData();
  console.log('✅ Cleared existing learning data\n');

  let testNumber = 1;
  const results: Array<{
    test: number;
    question: string;
    prediction: string;
    confidence: number;
    marked: 'correct' | 'incorrect';
    category: string;
  }> = [];

  // Run all test cases
  for (const testCase of testCases) {
    console.log(`\n[Test ${testNumber}/${testCases.length}]`);
    console.log(`Question: "${testCase.question}"`);
    console.log(`Category: ${testCase.category}`);

    try {
      const input: AnythingInput = {
        question: testCase.question,
        context: testCase.context,
        riskProfile: 'balanced'
      };

      // Make prediction
      const prediction = await predictAnything(input);

      console.log(`Prediction: ${prediction.prediction}`);
      console.log(`Confidence: ${Math.round(prediction.confidence * 100)}%`);
      console.log(`Risk Level: ${prediction.riskLevel}`);

      // Simulate user feedback (mark as correct/incorrect)
      learnFromAnythingResult(
        testCase.question,
        prediction.prediction,
        prediction.confidence,
        testCase.expectedOutcome
      );

      console.log(`✅ Marked as: ${testCase.expectedOutcome}`);

      results.push({
        test: testNumber,
        question: testCase.question,
        prediction: prediction.prediction,
        confidence: prediction.confidence,
        marked: testCase.expectedOutcome,
        category: testCase.category
      });

      // Small delay to simulate real usage
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
    }

    testNumber++;
  }

  // Show learning statistics
  console.log('\n\n📊 FINAL LEARNING STATISTICS');
  console.log('=====================================');

  const stats = getAnythingLearningStats();
  console.log(`Total Predictions: ${stats.totalPredictions}`);
  console.log(`Successful Predictions: ${stats.successfulPredictions}`);
  console.log(`Failed Predictions: ${stats.totalPredictions - stats.successfulPredictions}`);
  console.log(`Average Confidence: ${(stats.averageConfidence * 100).toFixed(1)}%`);
  console.log(`Accuracy Rate: ${(stats.accuracyRate * 100).toFixed(1)}%`);
  console.log(`Most Accurate Category: ${stats.mostAccurateCategory}`);
  console.log(`Learning Trend: ${stats.learningTrend}`);

  // Category breakdown
  console.log('\n📈 RESULTS BY CATEGORY');
  console.log('=====================================');

  const categoryStats: Record<string, { correct: number; total: number }> = {};

  results.forEach(result => {
    if (!categoryStats[result.category]) {
      categoryStats[result.category] = { correct: 0, total: 0 };
    }
    categoryStats[result.category].total++;
    if (result.marked === 'correct') {
      categoryStats[result.category].correct++;
    }
  });

  Object.entries(categoryStats).forEach(([category, stats]) => {
    const accuracy = (stats.correct / stats.total) * 100;
    console.log(`${category}: ${stats.correct}/${stats.total} (${accuracy.toFixed(1)}%)`);
  });

  // Confidence analysis
  console.log('\n📊 CONFIDENCE ANALYSIS');
  console.log('=====================================');

  const correctPredictions = results.filter(r => r.marked === 'correct');
  const incorrectPredictions = results.filter(r => r.marked === 'incorrect');

  if (correctPredictions.length > 0) {
    const avgConfidenceCorrect = correctPredictions.reduce((sum, r) => sum + r.confidence, 0) / correctPredictions.length;
    console.log(`Average confidence (correct): ${(avgConfidenceCorrect * 100).toFixed(1)}%`);
  }

  if (incorrectPredictions.length > 0) {
    const avgConfidenceIncorrect = incorrectPredictions.reduce((sum, r) => sum + r.confidence, 0) / incorrectPredictions.length;
    console.log(`Average confidence (incorrect): ${(avgConfidenceIncorrect * 100).toFixed(1)}%`);
  }

  console.log('\n✅ Learning tests complete!');
  console.log('\nThe system has learned from all predictions and can now:');
  console.log('- Track accuracy by category');
  console.log('- Identify learning trends');
  console.log('- Improve future predictions based on feedback');
}

// Run the tests
runLearningTests().catch(console.error);

