import { NextResponse } from 'next/server';

interface FactorWeights {
  weather: number;
  injuries: number;
  turnoverPercentage: number;
  homeFieldAdvantage: number;
  recentForm: number;
  headToHead: number;
  restDays: number;
  offensiveEfficiency: number;
  defensiveEfficiency: number;
  coaching: number;
}

interface SimulationParams {
  gameId: string;
  weights: FactorWeights;
  simulationCount: number;
}

/**
 * Elite Simulation API
 * Uses Progno to run advanced simulations with custom weights
 */
export async function POST(request: Request) {
  try {
    const body: SimulationParams = await request.json();
    const { gameId, weights, simulationCount } = body;

    if (!gameId || !weights || !simulationCount) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Verify user is elite tier
    const email = request.headers.get('x-user-email') ||
                  new URL(request.url).searchParams.get('email');

    if (email) {
      const tierRes = await fetch(`${request.url.split('/api')[0]}/api/user/tier?email=${email}`);
      const tierData = await tierRes.json();

      if (tierData?.tier !== 'elite') {
        return NextResponse.json(
          { error: 'Elite tier required' },
          { status: 403 }
        );
      }
    }

    // Get game data from progno
    const prognoUrl = process.env.PROGNO_API_URL || process.env.PROGNO_BASE_URL;

    if (!prognoUrl) {
      return NextResponse.json(
        {
          error: 'Progno API not configured',
          details: 'PROGNO_API_URL or PROGNO_BASE_URL environment variable is missing. Please configure it in your environment variables.',
          solution: 'Add PROGNO_API_URL or PROGNO_BASE_URL to your .env.local file or Vercel environment variables.',
          checkedVars: {
            PROGNO_API_URL: !!process.env.PROGNO_API_URL,
            PROGNO_BASE_URL: !!process.env.PROGNO_BASE_URL
          }
        },
        { status: 500 }
      );
    }

    let gameRes;
    try {
      gameRes = await fetch(`${prognoUrl.replace(/\/+$/, '')}/api/games/${gameId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (fetchError: any) {
      return NextResponse.json(
        {
          error: 'Failed to connect to Progno API',
          details: fetchError.message || 'Network error',
          solution: 'Check that PROGNO_API_URL is correct and the Progno service is running.'
        },
        { status: 503 }
      );
    }

    if (!gameRes.ok) {
      const errorText = await gameRes.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      return NextResponse.json(
        {
          error: 'Game not found in Progno',
          details: errorData.message || `HTTP ${gameRes.status}: ${gameRes.statusText}`,
          gameId,
          prognoUrl: prognoUrl.replace(/\/+$/, '')
        },
        { status: gameRes.status || 404 }
      );
    }

    let gameData;
    try {
      gameData = await gameRes.json();
    } catch (parseError: any) {
      return NextResponse.json(
        {
          error: 'Failed to parse game data from Progno',
          details: parseError.message || 'Invalid JSON response'
        },
        { status: 500 }
      );
    }

    // Run simulations using Progno's simulation endpoint
    const simulationResults = [];
    const simulationErrors: string[] = [];

    for (let i = 0; i < simulationCount; i++) {
      try {
        const simRes = await fetch(`${prognoUrl.replace(/\/+$/, '')}/api/simulate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId,
            weights,
            seed: Date.now() + i, // Unique seed for each simulation
          }),
        });

        if (simRes.ok) {
          try {
            const simData = await simRes.json();
            simulationResults.push(simData);
          } catch (parseError: any) {
            simulationErrors.push(`Simulation ${i}: Failed to parse response - ${parseError.message}`);
          }
        } else {
          const errorText = await simRes.text();
          simulationErrors.push(`Simulation ${i}: HTTP ${simRes.status} - ${errorText.substring(0, 100)}`);
        }
      } catch (err: any) {
        simulationErrors.push(`Simulation ${i}: ${err.message || 'Network error'}`);
        console.error(`Simulation ${i} failed:`, err);
      }
    }

    if (simulationResults.length === 0) {
      return NextResponse.json(
        {
          error: 'All simulations failed',
          details: simulationErrors.slice(0, 5).join('; '), // Show first 5 errors
          totalErrors: simulationErrors.length,
          solution: 'Check that the Progno API is running and accessible. Verify PROGNO_API_URL is correct.'
        },
        { status: 500 }
      );
    }

    if (simulationErrors.length > 0) {
      console.warn(`${simulationErrors.length} simulations failed, ${simulationResults.length} succeeded`);
    }

    // Aggregate results
    const aggregated = aggregateSimulationResults(simulationResults, gameData);

    return NextResponse.json({
      success: true,
      results: [aggregated],
      simulationCount: simulationResults.length,
      weights,
    });
  } catch (error: any) {
    console.error('Simulation API error:', error);
    return NextResponse.json(
      {
        error: 'Simulation failed',
        details: error.message || 'Unknown error occurred',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        solution: 'Check server logs for more details. Verify all environment variables are set correctly.'
      },
      { status: 500 }
    );
  }
}

function aggregateSimulationResults(
  results: any[],
  gameData: any
): any {
  // Calculate averages
  const team1WinCount = results.filter(r => r.winner === gameData.team1).length;
  const team2WinCount = results.filter(r => r.winner === gameData.team2).length;

  const team1WinProbability = (team1WinCount / results.length) * 100;
  const team2WinProbability = (team2WinCount / results.length) * 100;

  // Cover probabilities
  const team1CoverCount = results.filter(r => r.team1Cover).length;
  const team2CoverCount = results.filter(r => r.team2Cover).length;

  const team1CoverProbability = (team1CoverCount / results.length) * 100;
  const team2CoverProbability = (team2CoverCount / results.length) * 100;

  // Over/Under
  const overCount = results.filter(r => r.totalScore > (gameData.overUnder || 0)).length;
  const underCount = results.filter(r => r.totalScore <= (gameData.overUnder || 0)).length;

  const overProbability = (overCount / results.length) * 100;
  const underProbability = (underCount / results.length) * 100;

  // Average scores
  const avgTeam1Score = results.reduce((sum, r) => sum + (r.team1Score || 0), 0) / results.length;
  const avgTeam2Score = results.reduce((sum, r) => sum + (r.team2Score || 0), 0) / results.length;

  // Determine recommended pick
  let recommendedPick = '';
  let confidence = 0;

  if (team1CoverProbability > 60) {
    recommendedPick = `${gameData.team1} to cover`;
    confidence = team1CoverProbability;
  } else if (team2CoverProbability > 60) {
    recommendedPick = `${gameData.team2} to cover`;
    confidence = team2CoverProbability;
  } else if (overProbability > 55) {
    recommendedPick = `Over ${gameData.overUnder || 'total'}`;
    confidence = overProbability;
  } else if (underProbability > 55) {
    recommendedPick = `Under ${gameData.overUnder || 'total'}`;
    confidence = underProbability;
  } else {
    recommendedPick = `${gameData.team1} to win`;
    confidence = team1WinProbability;
  }

  return {
    gameId: gameData.gameId || gameData.id,
    game: `${gameData.team1} vs ${gameData.team2}`,
    team1: gameData.team1,
    team2: gameData.team2,
    team1WinProbability,
    team2WinProbability,
    team1CoverProbability,
    team2CoverProbability,
    overProbability,
    underProbability,
    recommendedPick,
    confidence: Math.round(confidence),
    averageScore: {
      team1: Math.round(avgTeam1Score * 10) / 10,
      team2: Math.round(avgTeam2Score * 10) / 10,
    },
  };
}

