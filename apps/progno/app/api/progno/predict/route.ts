/**
 * Advanced Prediction API Endpoint
 * Uses the best prediction engine this side of Vegas
 */

import { NextRequest, NextResponse } from 'next/server';
import { predictionEngine, GameData } from '@/app/lib/prediction-engine';
import { savePrediction } from '@/app/lib/progno-db';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    if (!body.homeTeam || !body.awayTeam || !body.league) {
      return NextResponse.json(
        { error: 'Missing required fields: homeTeam, awayTeam, league' },
        { status: 400 }
      );
    }

    // Build game data
    const gameData: GameData = {
      homeTeam: body.homeTeam,
      awayTeam: body.awayTeam,
      league: body.league,
      sport: body.sport || body.league,
      odds: body.odds || {
        home: body.odds?.home || -110,
        away: body.odds?.away || -110,
        spread: body.odds?.spread,
        total: body.odds?.total
      },
      date: body.date,
      venue: body.venue,
      weather: body.weather,
      injuries: body.injuries,
      teamStats: body.teamStats,
      recentForm: body.recentForm,
      headToHead: body.headToHead
    };

    // Generate prediction using advanced engine
    const prediction = await predictionEngine.predict(gameData);

    // Save prediction to database
    const predictionId = await savePrediction({
      prediction_type: 'sports',
      category: gameData.league,
      question: `Who will win: ${gameData.homeTeam} vs ${gameData.awayTeam}?`,
      context: JSON.stringify({
        date: gameData.date,
        venue: gameData.venue,
        odds: gameData.odds
      }),
      prediction_data: {
        gameData,
        prediction,
        methods: prediction.methods
      },
      confidence: prediction.confidence,
      edge_pct: prediction.edge,
      risk_level: prediction.confidence > 0.7 ? 'low' : prediction.confidence > 0.5 ? 'medium' : 'high',
      source: 'prediction-engine',
      notes: prediction.reasoning.join('; ')
    });

    return NextResponse.json({
      success: true,
      prediction: {
        id: predictionId?.id || `pred_${Date.now()}`,
        gameId: `game_${Date.now()}`,
        ...prediction,
        gameData: {
          homeTeam: gameData.homeTeam,
          awayTeam: gameData.awayTeam,
          league: gameData.league,
          date: gameData.date
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[Prediction API] Error:', error);
    return NextResponse.json(
      {
        error: 'Prediction failed',
        message: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

