/**
 * Learning API Endpoint
 * Records outcomes and triggers learning cycles
 */

import { NextRequest, NextResponse } from 'next/server';
import { predictionEngine } from '@/lib/prediction-engine';
import { recordOutcome } from '@/lib/progno-db';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    if (!body.predictionId) {
      return NextResponse.json(
        { error: 'Missing required field: predictionId' },
        { status: 400 }
      );
    }

    if (!body.actualOutcome || !['correct', 'incorrect', 'partial'].includes(body.actualOutcome)) {
      return NextResponse.json(
        { error: 'Invalid actualOutcome. Must be: correct, incorrect, or partial' },
        { status: 400 }
      );
    }

    const { predictionId, actualOutcome, methods, outcomeData } = body;

    // Record outcome in database
    const success = await recordOutcome(predictionId, {
      status: actualOutcome,
      outcome_data: outcomeData || {},
      is_correct: actualOutcome === 'correct',
      accuracy_score: actualOutcome === 'correct' ? 100 : actualOutcome === 'partial' ? 50 : 0,
      confidence_accuracy: actualOutcome === 'correct' ? 1.0 : actualOutcome === 'partial' ? 0.5 : 0.0
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to record outcome' },
        { status: 500 }
      );
    }

    // Trigger learning if methods provided
    if (methods && Array.isArray(methods)) {
      await predictionEngine.learnFromResult(predictionId, actualOutcome, methods);
    }

    return NextResponse.json({
      success: true,
      message: 'Outcome recorded and learning triggered',
      predictionId,
      actualOutcome
    });

  } catch (error: any) {
    console.error('[Learning API] Error:', error);
    return NextResponse.json(
      {
        error: 'Learning failed',
        message: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Weekly Learning Cycle Endpoint
 * Should be called via cron job weekly
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trigger = searchParams.get('trigger');

    // Only allow cron triggers or admin
    if (trigger !== 'cron' && trigger !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Use ?trigger=cron or ?trigger=admin' },
        { status: 401 }
      );
    }

    // Run weekly learning cycle
    await predictionEngine.weeklyLearningCycle();

    // Get updated weights and performance
    const weights = Object.fromEntries(predictionEngine.getMethodWeights());
    const performance = Object.fromEntries(
      Array.from(predictionEngine.getMethodPerformance().entries()).map(([key, value]) => [
        key,
        {
          winRate: value.total > 0 ? (value.correct / value.total) * 100 : 0,
          total: value.total,
          correct: value.correct,
          avgAccuracy: value.avgAccuracy * 100
        }
      ])
    );

    return NextResponse.json({
      success: true,
      message: 'Weekly learning cycle completed',
      methodWeights: weights,
      methodPerformance: performance,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[Learning Cycle] Error:', error);
    return NextResponse.json(
      {
        error: 'Learning cycle failed',
        message: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

