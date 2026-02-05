import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface SimulationRequest {
  weights: {
    weather: number;
    injuries: number;
    turnoverPercentage: number;
    homeFieldAdvantage: number;
    recentForm: number;
    h2hHistory: number;
    restDays: number;
    lineMovement: number;
  };
  iterations: number;
  gameId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SimulationRequest = await request.json();
    const { weights, iterations, gameId } = body;

    // For now, return mock simulation results
    // TODO: Implement actual simulation with the weights
    const result = {
      winRate: 0.65 + (Math.random() * 0.15), // 65-80%
      confidence: 0.70 + (Math.random() * 0.20), // 70-90%
      iterations,
      averageScore: {
        home: Math.round(24 + Math.random() * 10),
        away: Math.round(20 + Math.random() * 10),
      },
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Simulation error:', error);
    return NextResponse.json(
      { error: error?.message || 'Simulation failed' },
      { status: 500 }
    );
  }
}

