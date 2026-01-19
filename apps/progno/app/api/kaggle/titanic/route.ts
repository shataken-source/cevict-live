/**
 * Kaggle Titanic Competition API
 * Train model and generate predictions
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateSubmission,
  loadKaggleDataset,
  loadTrainingData,
  PredictionResult,
  SimpleTitanicClassifier
} from '../../../kaggle-integration';

// Ensure this runs on the server
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Load dataset metadata
    const dataset = await loadKaggleDataset('titanic');
    if (!dataset) {
      return NextResponse.json(
        { error: 'Titanic dataset not found' },
        { status: 404 }
      );
    }

    // Load training data
    const trainingData = await loadTrainingData('titanic');
    if (trainingData.length === 0) {
      return NextResponse.json(
        { error: 'Training data not found' },
        { status: 404 }
      );
    }

    // Train model
    const model = new SimpleTitanicClassifier();
    model.train(trainingData);

    // Generate predictions for test set
    const testData = trainingData.filter(row => {
      const survived = row['2urvived'] || row['Survived'];
      return !survived || survived === '';
    });

    const predictions: PredictionResult[] = testData.map(row => {
      const result = model.predict(row);
      return {
        id: row['Passengerid'] || row['PassengerId'] || Math.random(),
        prediction: result.prediction,
        confidence: result.confidence
      };
    });

    // Generate submission file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const submissionPath = `titanic/submission-${timestamp}.csv`;
    await generateSubmission(predictions, submissionPath);

    return NextResponse.json({
      success: true,
      dataset: {
        name: dataset.name,
        type: dataset.type,
        size: dataset.size,
        columns: dataset.columns.length
      },
      training: {
        samples: trainingData.length,
        testSamples: testData.length
      },
      predictions: {
        count: predictions.length,
        averageConfidence: predictions.reduce((sum, p) => sum + (p.confidence || 0), 0) / predictions.length
      },
      submission: {
        path: submissionPath,
        message: 'Submission file generated. Download and submit to Kaggle!'
      }
    });

  } catch (error: any) {
    console.error('Titanic prediction error:', error);
    const errorMessage = error?.message || error?.toString() || 'Failed to generate predictions';
    console.error('Full error:', error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'train') {
      // Load and train
      const trainingData = await loadTrainingData('titanic');
      const model = new SimpleTitanicClassifier();
      model.train(trainingData);

      return NextResponse.json({
        success: true,
        message: 'Model trained successfully',
        trainingSamples: trainingData.length
      });
    }

    if (action === 'predict') {
      const { testData } = body;
      if (!testData || !Array.isArray(testData)) {
        return NextResponse.json(
          { error: 'testData array required' },
          { status: 400 }
        );
      }

      // Load training data to train model
      const trainingData = await loadTrainingData('titanic');
      const model = new SimpleTitanicClassifier();
      model.train(trainingData);

      // Generate predictions
      const predictions = testData.map((row: any) => {
        const result = model.predict(row);
        return {
          id: row['PassengerId'] || row['Passengerid'] || Math.random(),
          prediction: result.prediction,
          confidence: result.confidence
        };
      });

      return NextResponse.json({
        success: true,
        predictions
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "train" or "predict"' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Titanic API error:', error);
    const errorMessage = error?.message || error?.toString() || 'Internal server error';
    console.error('Full error:', error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

