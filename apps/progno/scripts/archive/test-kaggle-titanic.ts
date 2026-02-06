/**
 * Test script for Kaggle Titanic competition
 * Run with: npx ts-node scripts/test-kaggle-titanic.ts
 */

import {
  loadKaggleDataset,
  loadTrainingData,
  SimpleTitanicClassifier,
  generateSubmission,
  PredictionResult
} from '../app/kaggle-integration';

async function testTitanicCompetition() {
  console.log('🏆 Testing Kaggle Titanic Competition\n');

  // Step 1: Load dataset
  console.log('📊 Step 1: Loading dataset...');
  const dataset = await loadKaggleDataset('titanic');
  if (!dataset) {
    console.error('❌ Dataset not found!');
    return;
  }
  console.log(`✅ Loaded: ${dataset.name}`);
  console.log(`   Type: ${dataset.type}`);
  console.log(`   Size: ${dataset.size} samples\n`);

  // Step 2: Load training data
  console.log('📥 Step 2: Loading training data...');
  const trainingData = await loadTrainingData('titanic');
  if (trainingData.length === 0) {
    console.error('❌ Training data not found!');
    return;
  }
  console.log(`✅ Loaded ${trainingData.length} samples\n`);

  // Step 3: Split train/test
  console.log('✂️  Step 3: Splitting data...');
  const trainData = trainingData.filter(row => {
    const survived = row['2urvived'] || row['Survived'];
    return survived !== '' && survived !== undefined;
  });
  const testData = trainingData.filter(row => {
    const survived = row['2urvived'] || row['Survived'];
    return !survived || survived === '';
  });
  console.log(`✅ Training: ${trainData.length} samples`);
  console.log(`✅ Test: ${testData.length} samples\n`);

  // Step 4: Train model
  console.log('🎓 Step 4: Training model...');
  const model = new SimpleTitanicClassifier();
  model.train(trainData);
  console.log('✅ Model trained!\n');

  // Step 5: Evaluate on training set
  console.log('📈 Step 5: Evaluating on training set...');
  let correct = 0;
  let total = 0;
  trainData.slice(0, 100).forEach(row => {
    const actual = parseInt(row['2urvived'] || row['Survived'] || '0');
    const result = model.predict(row);
    if (result.prediction === actual) correct++;
    total++;
  });
  const accuracy = (correct / total) * 100;
  console.log(`✅ Accuracy: ${accuracy.toFixed(2)}% (${correct}/${total})\n`);

  // Step 6: Generate predictions
  console.log('🔮 Step 6: Generating predictions...');
  const predictions: PredictionResult[] = testData.map(row => {
    const result = model.predict(row);
    return {
      id: row['Passengerid'] || row['PassengerId'] || Math.random(),
      prediction: result.prediction,
      confidence: result.confidence
    };
  });
  console.log(`✅ Generated ${predictions.length} predictions`);
  console.log(`   Average confidence: ${(predictions.reduce((sum, p) => sum + (p.confidence || 0), 0) / predictions.length * 100).toFixed(1)}%\n`);

  // Step 7: Generate submission file
  console.log('💾 Step 7: Generating submission file...');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const submissionPath = `titanic/submission-${timestamp}.csv`;
  await generateSubmission(predictions, submissionPath);
  console.log(`✅ Submission file created: ${submissionPath}\n`);

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Dataset: ${dataset.name}`);
  console.log(`Training Samples: ${trainData.length}`);
  console.log(`Test Samples: ${testData.length}`);
  console.log(`Training Accuracy: ${accuracy.toFixed(2)}%`);
  console.log(`Predictions Generated: ${predictions.length}`);
  console.log(`Submission File: ${submissionPath}`);
  console.log('\n🎯 Next Steps:');
  console.log('1. Review the submission file');
  console.log('2. Submit to Kaggle: https://www.kaggle.com/c/titanic/submit');
  console.log('3. Check your leaderboard position!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run test
testTitanicCompetition().catch(console.error);

