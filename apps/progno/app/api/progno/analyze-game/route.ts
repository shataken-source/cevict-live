
import { NextRequest, NextResponse } from 'next/server';
import { calculateExpectedValue, calculateOptimalBetSize } from '../../../lib/bankroll-manager';
import { GameData, predictionEngine } from '../../../lib/prediction-engine';
import { savePrediction } from '../../../lib/progno-db';
import { validateClaudeEffectInput, sanitizeString } from '../../../lib/claude-effect-validator';
import { gatherClaudeEffectData, applyClaudeEffect } from '../../../lib/claude-effect-integration';
import { americanToDecimal, extractAveragedOdds, estimateTeamStatsFromOdds, estimateRecentForm } from '../../../lib/odds-helpers';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameId, gameData, simulationCount, bankroll, riskProfile } = body;

    // Input validation
    if (!gameData) {
      return NextResponse.json(
        { error: 'gameData is required' },
        { status: 400 }
      );
    }

    // Sanitize string inputs
    if (gameData.homeTeam) gameData.homeTeam = sanitizeString(gameData.homeTeam, 100);
    if (gameData.awayTeam) gameData.awayTeam = sanitizeString(gameData.awayTeam, 100);
    if (gameData.league) gameData.league = sanitizeString(gameData.league, 50);

    // Extract and average odds across all bookmakers for better accuracy
    const oddsData = extractAveragedOdds(gameData);

    // Estimate team stats from odds (more accurate than zeros)
    const estimatedStats = estimateTeamStatsFromOdds(oddsData, gameData.sport_key || 'americanfootball_nfl');

    // Convert The Odds API format to our GameData format
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

    // Check if this is a Kalshi game (by source or identifier)
    const isKalshiGame = gameData.source === 'kalshi' ||
      gameData.kalshi === true ||
      gameData.id?.toString().includes('kalshi') ||
      gameData.sport_key?.toLowerCase().includes('kalshi');

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

    // Run Monte Carlo simulations if simulationCount is provided
    // Use enhanced Monte Carlo for 10,000+ iterations, otherwise use standard approach
    // Validate and cap simulation count
    const numSimulations = simulationCount && simulationCount > 0
      ? Math.min(Math.max(1, parseInt(String(simulationCount)) || 100), 10000)
      : 100;
    const useEnhancedMonteCarlo = numSimulations >= 1000; // Use enhanced method for 1000+ iterations

    let predictions: any[] = [];
    let totalWeightedConfidence = 0;
    let totalWeightedEdge = 0;
    let totalWeight = 0;
    let winnerCounts: Map<string, { count: number; weighted: number }> = new Map();
    let betTypeCounts: Map<string, { count: number; weighted: number }> = new Map();

    // Use enhanced Monte Carlo for large simulation counts
    if (useEnhancedMonteCarlo && formattedGameData.teamStats) {
      try {
        const monteCarloResult = await predictionEngine.monteCarloSimulation(formattedGameData, numSimulations);

        // Convert Monte Carlo results to prediction format
        const winner = monteCarloResult.winRate > 0.5 ? formattedGameData.homeTeam : formattedGameData.awayTeam;
        const confidence = monteCarloResult.confidence;

        // Create a base prediction from Monte Carlo results
        const basePrediction = await predictionEngine.predict(formattedGameData, isKalshiGame);

        // Use Monte Carlo win rate to adjust confidence
        const adjustedConfidence = (basePrediction.confidence * 0.6) + (confidence * 0.4);

        // Update winner counts
        winnerCounts.set(winner, {
          count: Math.round(monteCarloResult.winRate * numSimulations),
          weighted: monteCarloResult.winRate * numSimulations * adjustedConfidence
        });

        // Use Monte Carlo average score for predicted score
        basePrediction.predictedScore = {
          home: Math.round(monteCarloResult.averageScore.home),
          away: Math.round(monteCarloResult.averageScore.away)
        };

        // Set as the base prediction
        const basePred = {
          ...basePrediction,
          predictedWinner: winner,
          confidence: adjustedConfidence,
          predictedScore: basePrediction.predictedScore
        };

        predictions.push(basePred);
        totalWeightedConfidence += adjustedConfidence * adjustedConfidence;
        totalWeightedEdge += basePrediction.edge * adjustedConfidence;
        totalWeight += adjustedConfidence;

        // Add Monte Carlo reasoning
        basePred.reasoning = [
          ...(basePred.reasoning || []),
          `Monte Carlo (${numSimulations.toLocaleString()} simulations): ${winner} wins ${(monteCarloResult.winRate * 100).toFixed(1)}% of simulations. Avg score: ${Math.round(monteCarloResult.averageScore.home)}-${Math.round(monteCarloResult.averageScore.away)} (std dev: ${monteCarloResult.stdDev.toFixed(1)})`
        ];
      } catch (monteCarloError) {
        console.warn('Enhanced Monte Carlo failed, falling back to standard simulations:', monteCarloError);
        // Fall through to standard simulation loop
      }
    }

    // Run standard simulations (for smaller counts or if enhanced method failed)
    if (!useEnhancedMonteCarlo || predictions.length === 0) {
      for (let i = 0; i < numSimulations; i++) {
        try {
          // Add realistic randomization to team stats for Monte Carlo simulation
          // Fixed variance calibrated to NFL score std dev (~7 pts per game)
          const varianceFactor = 1.5;
          const randomizedGameData: GameData = {
            ...formattedGameData,
            odds: {
              ...formattedGameData.odds,
              // Add small variance to odds to simulate market movement
              home: formattedGameData.odds.home + (Math.random() - 0.5) * 5,
              away: formattedGameData.odds.away + (Math.random() - 0.5) * 5,
              spread: formattedGameData.odds.spread ? formattedGameData.odds.spread + (Math.random() - 0.5) * 1.5 : undefined,
              total: formattedGameData.odds.total ? formattedGameData.odds.total + (Math.random() - 0.5) * 3 : undefined,
            },
            teamStats: formattedGameData.teamStats ? {
              home: {
                ...formattedGameData.teamStats.home,
                recentAvgPoints: Math.max(0, formattedGameData.teamStats.home.recentAvgPoints + (Math.random() - 0.5) * 4 * varianceFactor),
                recentAvgAllowed: Math.max(0, formattedGameData.teamStats.home.recentAvgAllowed + (Math.random() - 0.5) * 4 * varianceFactor),
                pointsFor: formattedGameData.teamStats.home.pointsFor + (Math.random() - 0.5) * 20 * varianceFactor,
                pointsAgainst: formattedGameData.teamStats.home.pointsAgainst + (Math.random() - 0.5) * 20 * varianceFactor,
              },
              away: {
                ...formattedGameData.teamStats.away,
                recentAvgPoints: Math.max(0, formattedGameData.teamStats.away.recentAvgPoints + (Math.random() - 0.5) * 4 * varianceFactor),
                recentAvgAllowed: Math.max(0, formattedGameData.teamStats.away.recentAvgAllowed + (Math.random() - 0.5) * 4 * varianceFactor),
                pointsFor: formattedGameData.teamStats.away.pointsFor + (Math.random() - 0.5) * 20 * varianceFactor,
                pointsAgainst: formattedGameData.teamStats.away.pointsAgainst + (Math.random() - 0.5) * 20 * varianceFactor,
              },
            } : formattedGameData.teamStats,
          };

          // For Kalshi games, force moneyline-only predictions
          const prediction = await predictionEngine.predict(randomizedGameData, isKalshiGame);
          predictions.push(prediction);

          // Weight by confidence - higher confidence predictions matter more
          const weight = prediction.confidence;
          totalWeightedConfidence += prediction.confidence * weight;
          totalWeightedEdge += prediction.edge * weight;
          totalWeight += weight;

          // Count winners (both simple count and weighted)
          const currentWinner = winnerCounts.get(prediction.predictedWinner) || { count: 0, weighted: 0 };
          winnerCounts.set(prediction.predictedWinner, {
            count: currentWinner.count + 1,
            weighted: currentWinner.weighted + weight,
          });

          // Count bet types (weighted by confidence)
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
    }

    // Calculate weighted averages from all simulations
    const avgConfidence = totalWeight > 0 ? totalWeightedConfidence / totalWeight : 0;
    const avgEdge = totalWeight > 0 ? totalWeightedEdge / totalWeight : 0;

    // Find most common winner (using weighted consensus)
    let mostCommonWinner = formattedGameData.homeTeam;
    let maxWeightedWins = 0;
    let maxSimpleWins = 0;
    winnerCounts.forEach((stats, winner) => {
      // Prefer weighted consensus, but also consider simple count
      if (stats.weighted > maxWeightedWins || (stats.weighted === maxWeightedWins && stats.count > maxSimpleWins)) {
        maxWeightedWins = stats.weighted;
        maxSimpleWins = stats.count;
        mostCommonWinner = winner;
      }
    });

    // Find most common bet recommendation (weighted by confidence)
    let mostCommonBet: any = null;
    let maxBetWeight = 0;
    let maxBetCount = 0;
    betTypeCounts.forEach((stats, betKey) => {
      // Prefer weighted consensus
      if (stats.weighted > maxBetWeight || (stats.weighted === maxBetWeight && stats.count > maxBetCount)) {
        maxBetWeight = stats.weighted;
        maxBetCount = stats.count;
        const [type, side] = betKey.split('-');
        mostCommonBet = { type, side };
      }
    });

    // Use the most recent prediction for detailed info, but use aggregated stats
    // For Kalshi games, force moneyline-only predictions
    const basePrediction = predictions[predictions.length - 1] || await predictionEngine.predict(formattedGameData, isKalshiGame);

    // Determine recommended pick
    // For Kalshi games: always use moneyline/outright winner
    // For regular games: use probability-based logic (spread/moneyline based on confidence)
    let recommendedPick = mostCommonWinner; // Default to most common winner

    if (isKalshiGame) {
      // Kalshi games: always use moneyline/outright winner
      if (mostCommonBet && mostCommonBet.type === 'moneyline') {
        recommendedPick = mostCommonBet.side;
      } else if (basePrediction.recommendedBet && basePrediction.recommendedBet.type === 'moneyline') {
        recommendedPick = basePrediction.recommendedBet.side;
      } else {
        // Fallback to predicted winner for Kalshi
        recommendedPick = mostCommonWinner;
      }
    } else {
      // Regular games: use probability-based logic (spread for high confidence, moneyline for lower)
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
      } else if (basePrediction.recommendedBet) {
        const bet = basePrediction.recommendedBet;
        if (bet.type === 'moneyline') {
          recommendedPick = bet.side;
        } else if (bet.type === 'spread') {
          const spread = formattedGameData.odds.spread || 0;
          recommendedPick = `${bet.side} ${spread > 0 ? '+' : ''}${spread}`;
        } else if (bet.type === 'total') {
          recommendedPick = `${bet.side} ${formattedGameData.odds.total || 0}`;
        }
      } else {
        // Fallback: use most common winner
        recommendedPick = mostCommonWinner;
      }
    }

    // Calculate consensus strength (how much simulations agree)
    const consensusStrength = maxSimpleWins > 0 ? maxSimpleWins / numSimulations : 0;
    const betConsensusStrength = maxBetCount > 0 ? maxBetCount / numSimulations : 0;

    // Calibrate confidence based on consensus strength
    // High consensus = more reliable confidence, low consensus = reduce confidence
    const consensusCalibration = 0.6 + (consensusStrength * 0.3); // 0.6-0.9 multiplier (more conservative)

    // Higher simulation count = more reliable, so boost confidence slightly
    const simulationBoost = Math.min(0.05, (numSimulations - 1) / 2000); // Up to 5% boost for 1000 sims (reduced)

    // Adjust confidence: base confidence * consensus calibration + simulation boost
    // Cap at 0.90 (90%) to allow more differentiation, minimum 0.50 (50%)
    let adjustedConfidence = Math.min(0.90, Math.max(0.50, (avgConfidence * consensusCalibration) + simulationBoost));

    // Apply Claude Effect to probability and confidence
    let claudeEffectResult: any = null;
    let finalProbability = mostCommonWinner === formattedGameData.homeTeam
      ? maxSimpleWins / numSimulations
      : 1 - (maxSimpleWins / numSimulations);

    try {
      // Gather Claude Effect data (Phases 1-4 for now)
      const claudeData = await gatherClaudeEffectData(formattedGameData, {
        includePhase1: true,
        includePhase2: true,
        includePhase3: true,
        includePhase4: true,
        includePhase5: false,
        includePhase6: false,
        includePhase7: false,
      });

      // Apply Claude Effect
      claudeEffectResult = await applyClaudeEffect(
        finalProbability,
        adjustedConfidence,
        formattedGameData,
        claudeData
      );

      // Use Claude Effect adjusted values
      finalProbability = claudeEffectResult.adjustedProbability;
      adjustedConfidence = claudeEffectResult.adjustedConfidence;
    } catch (claudeError) {
      console.warn('[Analyze Game] Claude Effect failed, using base prediction:', claudeError);
      // Continue with base prediction if Claude Effect fails
    }

    // Improved quality score: considers confidence, edge, consensus, and simulation count
    const qualityScore = (
      adjustedConfidence * 0.4 +           // Base confidence (40%)
      Math.abs(avgEdge) * 0.3 +             // Edge value (30%)
      consensusStrength * 0.2 +             // Consensus strength (20%)
      Math.min(1.0, numSimulations / 500) * 0.1  // Simulation reliability (10%)
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

    // Build complete game analysis
    const completeAnalysis = {
      // Game Information
      game: {
        homeTeam: formattedGameData.homeTeam,
        awayTeam: formattedGameData.awayTeam,
        league: formattedGameData.league,
        sport: formattedGameData.sport,
        date: formattedGameData.date,
        odds: formattedGameData.odds,
      },

      // Prediction Summary
      prediction: {
        predictedWinner: mostCommonWinner,
        baseProbability: finalProbability,
        adjustedProbability: claudeEffectResult?.adjustedProbability || finalProbability,
        probabilityPercentage: Math.round((claudeEffectResult?.adjustedProbability || finalProbability) * 100),
        confidence: adjustedConfidence,
        confidencePercentage: Math.round(adjustedConfidence * 100),
        edge: avgEdge,
        edgePercentage: Math.round(avgEdge * 100) / 100,
        quality: qualityScore,
        qualityPercentage: Math.round(qualityScore * 100) / 100,
        predictedScore: basePrediction.predictedScore,
        recommendedPick,
        recommendedBet: mostCommonBet || basePrediction.recommendedBet,
      },

      // Claude Effect Analysis
      claudeEffect: claudeEffectResult ? {
        scores: claudeEffectResult.scores,
        claudeEffect: claudeEffectResult.claudeEffect,
        reasoning: claudeEffectResult.reasoning || [],
        warnings: claudeEffectResult.warnings || [],
        recommendations: claudeEffectResult.recommendations,
      } : null,

      // Confidence Breakdown
      confidenceBreakdown: {
        baseConfidence: avgConfidence,
        consensusCalibration: consensusCalibration,
        simulationBoost: simulationBoost,
        adjustedConfidence: adjustedConfidence,
        confidenceSources: basePrediction.methods?.map((m: any) => ({
          method: m.name,
          confidence: m.confidence,
          weight: m.weight,
          contribution: (m.confidence * m.weight) / (basePrediction.methods?.reduce((sum: number, method: any) => sum + (method.confidence * method.weight), 0) || 1)
        })) || [],
      },

      // Wager Analysis
      wagerAnalysis: betSizeInfo ? {
        recommendedWager: betSizeInfo.recommendedWager,
        wagerPercentage: bankroll ? Math.round((betSizeInfo.recommendedWager / parseFloat(bankroll)) * 10000) / 100 : 0,
        kellyFraction: betSizeInfo.kellyFraction,
        kellyPercentage: Math.round(betSizeInfo.kellyFraction * 10000) / 100,
        method: betSizeInfo.method,
        reasoning: betSizeInfo.betReasoning,
        expectedValue: bankroll ? calculateExpectedValue(
          betSizeInfo.recommendedWager,
          adjustedConfidence,
          mostCommonBet?.type === 'moneyline'
            ? (mostCommonBet.side === formattedGameData.homeTeam ? formattedGameData.odds.home : formattedGameData.odds.away)
            : -110
        ) : null,
        potentialReturn: bankroll ? {
          ifWin: betSizeInfo.recommendedWager * (americanToDecimal(
            mostCommonBet?.type === 'moneyline'
              ? (mostCommonBet.side === formattedGameData.homeTeam ? formattedGameData.odds.home : formattedGameData.odds.away)
              : -110
          ) - 1),
          ifLoss: -betSizeInfo.recommendedWager,
          netProfit: calculateExpectedValue(
            betSizeInfo.recommendedWager,
            adjustedConfidence,
            mostCommonBet?.type === 'moneyline'
              ? (mostCommonBet.side === formattedGameData.homeTeam ? formattedGameData.odds.home : formattedGameData.odds.away)
              : -110
          ),
        } : null,
      } : null,

      // Complete Analysis Details
      analysis: {
        reasoning: basePrediction.reasoning || [],
        riskFactors: basePrediction.riskFactors || [],
        methods: basePrediction.methods || [],
        keyFactors: basePrediction.keyFactors || [],
        teamStats: formattedGameData.teamStats,
        recentForm: formattedGameData.recentForm,
        weather: formattedGameData.weather,
        injuries: formattedGameData.injuries,
      },

      // Simulation Results
      simulations: {
        count: numSimulations,
        consensusWinner: mostCommonWinner,
        consensusPercentage: maxSimpleWins > 0 ? Math.round((maxSimpleWins / numSimulations) * 100) : 0,
        consensusBet: mostCommonBet,
        consensusBetPercentage: maxBetCount > 0 ? Math.round((maxBetCount / numSimulations) * 100) : 0,
        consensusStrength: consensusStrength,
        betConsensusStrength: betConsensusStrength,
      },
    };

    // Ensure all values are properly calculated and not reused
    const responseData = {
      recommendedPick,
      confidence: Math.round(adjustedConfidence * 100), // Convert to percentage (backward compatibility)
      edge: Math.round(avgEdge * 100) / 100, // Keep as decimal percentage (backward compatibility)
      quality: Math.round(qualityScore * 100) / 100, // Backward compatibility
      // Explicitly include betSizeInfo properties to avoid reuse
      recommendedWager: betSizeInfo?.recommendedWager || null,
      kellyFraction: betSizeInfo?.kellyFraction || null,
      method: betSizeInfo?.method || null,
      betReasoning: betSizeInfo?.betReasoning || null,
      // Complete analysis with all calculated values
      completeAnalysis: {
        ...completeAnalysis,
        // Ensure prediction values are explicitly set
        prediction: {
          ...completeAnalysis.prediction,
          confidence: adjustedConfidence,
          confidencePercentage: Math.round(adjustedConfidence * 100),
          edge: avgEdge,
          edgePercentage: Math.round(avgEdge * 100) / 100,
        },
        // Ensure wager analysis values are explicitly set
        wagerAnalysis: betSizeInfo ? {
          ...completeAnalysis.wagerAnalysis,
          recommendedWager: betSizeInfo.recommendedWager,
          kellyFraction: betSizeInfo.kellyFraction,
          method: betSizeInfo.method,
          reasoning: betSizeInfo.betReasoning,
        } : null,
      },
    };

    // Save prediction to database so it appears in daily-card
    // Only save if confidence is above threshold (50%) and we have a valid pick
    if (adjustedConfidence >= 0.5 && recommendedPick && recommendedPick !== 'TBD') {
      try {
        await savePrediction({
          prediction_type: 'sports',
          category: league,
          question: `Who will win: ${formattedGameData.awayTeam} @ ${formattedGameData.homeTeam}?`,
          context: `Game prediction for ${formattedGameData.league} on ${formattedGameData.date}`,
          prediction_data: {
            gameData: formattedGameData,
            prediction: {
              predictedWinner: recommendedPick,
              confidence: adjustedConfidence,
              edge: avgEdge,
              predictedScore: basePrediction.predictedScore,
            },
            completeAnalysis: responseData.completeAnalysis,
            betSizeInfo: betSizeInfo,
          },
          confidence: Math.round(adjustedConfidence * 100),
          edge_pct: Math.round(avgEdge * 100) / 100,
          risk_level: adjustedConfidence >= 0.75 ? 'low' : adjustedConfidence >= 0.65 ? 'medium' : 'high',
          source: 'analyze-game',
          notes: `Outright winner prediction: ${recommendedPick}. Confidence: ${Math.round(adjustedConfidence * 100)}%, Edge: ${Math.round(avgEdge * 100) / 100}%`,
        });
      } catch (saveError) {
        // Don't fail the request if save fails, just log it
        console.warn('[ANALYZE-GAME] Failed to save prediction to database:', saveError);
      }
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Error analyzing game:', error);
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


