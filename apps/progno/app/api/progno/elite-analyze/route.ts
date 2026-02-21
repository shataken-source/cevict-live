import { NextRequest, NextResponse } from 'next/server';
import { calculateOptimalBetSize } from '@/app/lib/bankroll-manager';
import { GameData, predictionEngine } from '@/app/lib/prediction-engine';
import { extractAveragedOdds, estimateTeamStatsFromOdds, estimateRecentForm } from '@/app/lib/odds-helpers';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameData, simulationCount, varianceFactor, methodWeights, confidenceThreshold, edgeThreshold, bankroll, riskProfile } = body;

    if (!gameData) {
      return NextResponse.json(
        { error: 'gameData is required' },
        { status: 400 }
      );
    }

    // Extract and average odds across all bookmakers
    const oddsData = extractAveragedOdds(gameData);

    // Estimate team stats from odds
    const estimatedStats = estimateTeamStatsFromOdds(oddsData, gameData.sport_key || 'americanfootball_nfl');

    // Convert to GameData format
    let league = 'NFL';
    if (gameData.sport_key) {
      const sportKey = gameData.sport_key.toLowerCase();
      if (sportKey.includes('americanfootball_nfl')) league = 'NFL';
      else if (sportKey.includes('basketball_nba')) league = 'NBA';
      else if (sportKey.includes('baseball_mlb')) league = 'MLB';
      else if (sportKey.includes('icehockey_nhl')) league = 'NHL';
      else if (sportKey.includes('americanfootball_ncaaf') || sportKey.includes('collegefootball')) league = 'NCAAF';
      else if (sportKey.includes('basketball_ncaab') || sportKey.includes('collegebasketball')) league = 'NCAAB';
      else {
        // Fallback: try to extract from sport_key
        const parts = gameData.sport_key.split('_');
        if (parts.length > 1) {
          const leaguePart = parts[parts.length - 1].toUpperCase();
          if (['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB'].includes(leaguePart)) {
            league = leaguePart;
          }
        }
      }
    }

    const formattedGameData: GameData = {
      homeTeam: gameData.home_team || gameData.homeTeam,
      awayTeam: gameData.away_team || gameData.awayTeam,
      league: league,
      sport: gameData.sport_key?.split('_')[0] || 'americanfootball',
      date: gameData.commence_time || gameData.date,
      odds: oddsData,
      teamStats: estimatedStats,
      recentForm: estimateRecentForm(oddsData),
    };

    // Temporarily override prediction engine weights
    let restoreWeights: (() => void) | null = null;
    if (methodWeights) {
      restoreWeights = predictionEngine.setCustomWeights(methodWeights);
    }

    try {
      // Run Monte Carlo simulations with custom variance
      const numSimulations = simulationCount && simulationCount > 0 ? Math.min(simulationCount, 1000) : 1;
      const variance = varianceFactor || 1.5;

      let predictions: any[] = [];
      let totalWeightedConfidence = 0;
      let totalWeightedEdge = 0;
      let totalWeight = 0;
      let winnerCounts: Map<string, { count: number; weighted: number }> = new Map();
      let betTypeCounts: Map<string, { count: number; weighted: number }> = new Map();

      for (let i = 0; i < numSimulations; i++) {
        try {
          const randomizedGameData: GameData = {
            ...formattedGameData,
            odds: {
              ...formattedGameData.odds,
              home: formattedGameData.odds.home + (Math.random() - 0.5) * 5,
              away: formattedGameData.odds.away + (Math.random() - 0.5) * 5,
              spread: formattedGameData.odds.spread ? formattedGameData.odds.spread + (Math.random() - 0.5) * 1.5 : undefined,
              total: formattedGameData.odds.total ? formattedGameData.odds.total + (Math.random() - 0.5) * 3 : undefined,
            },
            teamStats: formattedGameData.teamStats ? {
              home: {
                ...formattedGameData.teamStats.home,
                recentAvgPoints: Math.max(0, formattedGameData.teamStats.home.recentAvgPoints + (Math.random() - 0.5) * 4 * variance),
                recentAvgAllowed: Math.max(0, formattedGameData.teamStats.home.recentAvgAllowed + (Math.random() - 0.5) * 4 * variance),
                pointsFor: formattedGameData.teamStats.home.pointsFor + (Math.random() - 0.5) * 20 * variance,
                pointsAgainst: formattedGameData.teamStats.home.pointsAgainst + (Math.random() - 0.5) * 20 * variance,
              },
              away: {
                ...formattedGameData.teamStats.away,
                recentAvgPoints: Math.max(0, formattedGameData.teamStats.away.recentAvgPoints + (Math.random() - 0.5) * 4 * variance),
                recentAvgAllowed: Math.max(0, formattedGameData.teamStats.away.recentAvgAllowed + (Math.random() - 0.5) * 4 * variance),
                pointsFor: formattedGameData.teamStats.away.pointsFor + (Math.random() - 0.5) * 20 * variance,
                pointsAgainst: formattedGameData.teamStats.away.pointsAgainst + (Math.random() - 0.5) * 20 * variance,
              },
            } : formattedGameData.teamStats,
          };

          const prediction = await predictionEngine.predict(randomizedGameData);
          predictions.push(prediction);

          const weight = prediction.confidence;
          totalWeightedConfidence += prediction.confidence * weight;
          totalWeightedEdge += prediction.edge * weight;
          totalWeight += weight;

          const currentWinner = winnerCounts.get(prediction.predictedWinner) || { count: 0, weighted: 0 };
          winnerCounts.set(prediction.predictedWinner, {
            count: currentWinner.count + 1,
            weighted: currentWinner.weighted + weight,
          });

          if (prediction.recommendedBet) {
            const betKey = `${prediction.recommendedBet.type}-${prediction.recommendedBet.side}`;
            const currentBet = betTypeCounts.get(betKey) || { count: 0, weighted: 0 };
            betTypeCounts.set(betKey, {
              count: currentBet.count + 1,
              weighted: currentBet.weighted + weight,
            });
          }
        } catch (err) {
          console.error(`Simulation ${i + 1} failed:`, err);
        }
      }

      // Restore original weights
      if (restoreWeights) {
        restoreWeights();
      }

      const avgConfidence = totalWeight > 0 ? totalWeightedConfidence / totalWeight : 0;
      const avgEdge = totalWeight > 0 ? totalWeightedEdge / totalWeight : 0;

      let mostCommonWinner = formattedGameData.homeTeam;
      let maxWeightedWins = 0;
      let maxSimpleWins = 0;
      winnerCounts.forEach((stats, winner) => {
        if (stats.weighted > maxWeightedWins || (stats.weighted === maxWeightedWins && stats.count > maxSimpleWins)) {
          maxWeightedWins = stats.weighted;
          maxSimpleWins = stats.count;
          mostCommonWinner = winner;
        }
      });

      let mostCommonBet: any = null;
      let maxBetWeight = 0;
      let maxBetCount = 0;
      betTypeCounts.forEach((stats, betKey) => {
        if (stats.weighted > maxBetWeight || (stats.weighted === maxBetWeight && stats.count > maxBetCount)) {
          maxBetWeight = stats.weighted;
          maxBetCount = stats.count;
          const [type, side] = betKey.split('-');
          mostCommonBet = { type, side };
        }
      });

      const basePrediction = predictions[predictions.length - 1] || await predictionEngine.predict(formattedGameData);

      let recommendedPick = 'TBD';
      if (mostCommonBet) {
        const bet = mostCommonBet;
        if (bet.type === 'moneyline') {
          recommendedPick = bet.side;
        } else if (bet.type === 'spread') {
          const spread = formattedGameData.odds.spread || 0;
          recommendedPick = `${bet.side} ${spread > 0 ? '+' : ''}${spread}`;
        } else if (bet.type === 'total') {
          recommendedPick = `${bet.side} ${formattedGameData.odds.total || 0}`;
        }
      } else {
        recommendedPick = mostCommonWinner;
      }

      const consensusStrength = maxSimpleWins > 0 ? maxSimpleWins / numSimulations : 0;
      // More conservative calibration: 0.6-0.9 multiplier (instead of 0.5-1.0)
      const consensusCalibration = 0.6 + (consensusStrength * 0.3);
      // Reduced simulation boost: up to 5% (instead of 8%)
      const simulationBoost = Math.min(0.05, (numSimulations - 1) / 2000);
      // Cap at 0.85 (85%) to be more realistic - no bet should be 100% certain
      const adjustedConfidence = Math.min(0.85, (avgConfidence * consensusCalibration) + simulationBoost);
      const qualityScore = (
        adjustedConfidence * 0.4 +
        Math.abs(avgEdge) * 0.3 +
        consensusStrength * 0.2 +
        Math.min(1.0, numSimulations / 500) * 0.1
      );

      // Calculate optimal bet size if bankroll is provided
      let betSizeInfo: any = null;
      if (bankroll && bankroll > 0) {
        // Determine odds from the recommended bet
        let odds = -110; // Default
        if (mostCommonBet?.type === 'moneyline') {
          // Use the odds for the recommended side
          if (mostCommonBet.side === formattedGameData.homeTeam) {
            odds = formattedGameData.odds.home;
          } else {
            odds = formattedGameData.odds.away;
          }
        } else {
          // For spreads/totals, use standard -110
          odds = -110;
        }

        const betSizeResult = calculateOptimalBetSize({
          bankroll: parseFloat(bankroll) || 1000,
          confidence: adjustedConfidence,
          edge: avgEdge,
          quality: qualityScore,
          odds: odds,
          riskProfile: riskProfile || 'balanced',
        });

        betSizeInfo = {
          recommendedWager: betSizeResult.recommendedWager,
          kellyFraction: betSizeResult.kellyFraction,
          method: betSizeResult.method,
          betReasoning: betSizeResult.reasoning,
        };
      }

      return NextResponse.json({
        recommendedPick,
        confidence: Math.round(adjustedConfidence * 100),
        edge: Math.round(avgEdge * 100) / 100,
        quality: Math.round(qualityScore * 100) / 100,
        ...betSizeInfo,
        simulations: {
          count: numSimulations,
          consensusWinner: mostCommonWinner,
          consensusPercentage: maxSimpleWins > 0 ? Math.round((maxSimpleWins / numSimulations) * 100) : 0,
        },
      });
    } finally {
      // Always restore original weights
      if (restoreWeights) {
        restoreWeights();
      }
    }
  } catch (error: any) {
    console.error('Error in elite analyze:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze game',
        details: error.message,
        recommendedPick: 'TBD',
        confidence: 0,
        edge: 0,
        quality: 0,
      },
      { status: 500 }
    );
  }
}

