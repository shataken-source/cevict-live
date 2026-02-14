/**
 * Monte Carlo Simulation API
 * POST /api/simulate - Run game simulations
 *
 * Like Leans AI's "Remi" - runs 1000+ simulations per game
 * to provide probability-based picks free from human bias
 */

import { NextRequest, NextResponse } from 'next/server';
import { MonteCarloEngine, MonteCarloConfig } from '../../lib/monte-carlo-engine';
import { GameData } from '../../lib/prediction-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      gameData,
      spread,
      total,
      iterations = 1000,
      includeValueBets = true,
      config = {}
    } = body;

    // Validate input
    if (!gameData || !gameData.homeTeam || !gameData.awayTeam) {
      return NextResponse.json(
        { success: false, error: 'gameData with homeTeam and awayTeam required' },
        { status: 400 }
      );
    }

    // Create engine with config
    const engine = new MonteCarloEngine({
      iterations: Math.min(Math.max(iterations, 100), 10000), // 100-10000
      ...config,
    });

    // Run simulation
    const result = await engine.simulate(
      gameData as GameData,
      spread,
      total
    );

    // Detect value bets if requested
    let valueBets = null;
    if (includeValueBets && gameData.odds) {
      valueBets = engine.detectValueBets(
        result,
        gameData.odds,
        gameData.homeTeam,
        gameData.awayTeam,
        spread,
        total
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        simulation: result,
        valueBets,
        summary: {
          winner: result.homeWinProbability > 0.5 ? gameData.homeTeam : gameData.awayTeam,
          winProbability: Math.max(result.homeWinProbability, result.awayWinProbability),
          predictedScore: result.predictedScore,
          confidence: result.confidence,
          bestBet: valueBets && valueBets.length > 0 ? valueBets[0] : null,
        },
      },
    });
  } catch (error: any) {
    console.error('[Simulate API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Simulation failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/simulate - Get simulation for a game by ID
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId');
  const iterations = parseInt(searchParams.get('iterations') || '1000');
  const sport = searchParams.get('sport') || 'nfl';

  if (!gameId) {
    return NextResponse.json(
      { success: false, error: 'gameId required' },
      { status: 400 }
    );
  }

  try {
    // Fetch game data from odds service
    const { OddsService } = await import('../../../lib/odds-service');
    const game = await OddsService.getGame(gameId);

    if (!game) {
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      );
    }

    // Convert to GameData format
    const gameData: GameData = {
      homeTeam: game.homeTeam.name,
      awayTeam: game.awayTeam.name,
      league: sport.toUpperCase(),
      sport: sport.toUpperCase(),
      odds: {
        home: game.odds.moneyline.home,
        away: game.odds.moneyline.away,
        spread: game.odds.spread.home,
        total: game.odds.total.line,
      },
      date: game.startTime.toISOString(),
      venue: game.venue,
    };

    // Run simulation
    const engine = new MonteCarloEngine({
      iterations: Math.min(Math.max(iterations, 100), 10000),
    });

    const result = await engine.simulate(
      gameData,
      game.odds.spread.home,
      game.odds.total.line
    );

    // Detect value bets
    const valueBets = engine.detectValueBets(
      result,
      gameData.odds,
      gameData.homeTeam,
      gameData.awayTeam,
      game.odds.spread.home,
      game.odds.total.line
    );

    return NextResponse.json({
      success: true,
      data: {
        game: {
          id: gameId,
          homeTeam: gameData.homeTeam,
          awayTeam: gameData.awayTeam,
          startTime: game.startTime,
          venue: game.venue,
        },
        simulation: result,
        valueBets,
        picks: generatePicks(result, valueBets, gameData),
      },
    });
  } catch (error: any) {
    console.error('[Simulate API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Simulation failed' },
      { status: 500 }
    );
  }
}

/**
 * Generate user-friendly picks from simulation results
 */
function generatePicks(
  result: any,
  valueBets: any[],
  gameData: GameData
) {
  const picks: any[] = [];

  // Moneyline pick
  const mlWinner = result.homeWinProbability > 0.5 ? gameData.homeTeam : gameData.awayTeam;
  const mlProb = Math.max(result.homeWinProbability, result.awayWinProbability);
  const mlValueBet = valueBets?.find(v => v.type === 'moneyline' && v.side === mlWinner);

  picks.push({
    type: 'Moneyline',
    pick: mlWinner,
    probability: `${(mlProb * 100).toFixed(1)}%`,
    edge: mlValueBet ? `+${mlValueBet.edge.toFixed(1)}%` : 'No edge',
    confidence: getConfidenceLabel(mlProb),
    hasValue: !!mlValueBet,
  });

  // Spread pick
  const spreadHomeCovers = result.spreadProbabilities.homeCovers;
  const spreadAwayCovers = result.spreadProbabilities.awayCovers;
  const spreadPick = spreadHomeCovers > spreadAwayCovers
    ? { team: gameData.homeTeam, prob: spreadHomeCovers, line: gameData.odds.spread }
    : { team: gameData.awayTeam, prob: spreadAwayCovers, line: -(gameData.odds.spread || 0) };
  const spreadValueBet = valueBets?.find(v => v.type === 'spread');

  picks.push({
    type: 'Spread',
    pick: `${spreadPick.team} ${spreadPick.line > 0 ? '+' : ''}${spreadPick.line}`,
    probability: `${(spreadPick.prob * 100).toFixed(1)}%`,
    edge: spreadValueBet ? `+${spreadValueBet.edge.toFixed(1)}%` : 'No edge',
    confidence: getConfidenceLabel(spreadPick.prob),
    hasValue: !!spreadValueBet,
  });

  // Total pick
  const overProb = result.totalProbabilities.over;
  const underProb = result.totalProbabilities.under;
  const totalPick = overProb > underProb
    ? { side: 'Over', prob: overProb }
    : { side: 'Under', prob: underProb };
  const totalValueBet = valueBets?.find(v => v.type === 'total' && v.side === totalPick.side);

  picks.push({
    type: 'Total',
    pick: `${totalPick.side} ${gameData.odds.total}`,
    probability: `${(totalPick.prob * 100).toFixed(1)}%`,
    edge: totalValueBet ? `+${totalValueBet.edge.toFixed(1)}%` : 'No edge',
    confidence: getConfidenceLabel(totalPick.prob),
    projectedTotal: result.totalProbabilities.averageTotal.toFixed(1),
    hasValue: !!totalValueBet,
  });

  return picks;
}

function getConfidenceLabel(prob: number): string {
  if (prob >= 0.70) return '🔥 High';
  if (prob >= 0.60) return '✅ Medium';
  if (prob >= 0.55) return '⚖️ Slight';
  return '⚠️ Low';
}
