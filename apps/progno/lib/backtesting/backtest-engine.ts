/**
 * Backtesting Framework for Claude Effect
 * Validates predictions on historical data.
 * predictGame() uses the real PredictionEngine and, when useClaudeEffect is true,
 * applies the Claude Effect via gatherClaudeEffectData + applyClaudeEffect (same as v2 route).
 */

import { PredictionEngine } from '../../app/lib/prediction-engine';
import type { GameData } from '../../app/lib/prediction-engine';
import { gatherClaudeEffectData, applyClaudeEffect } from '../../app/lib/claude-effect-integration';

export interface HistoricalGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: Date;
  odds: {
    home: number;
    away: number;
    spread?: number;
    total?: number;
  };
  actualWinner: string;
  actualScore?: {
    home: number;
    away: number;
  };
  gameData: any;
}

export interface BacktestResult {
  totalGames: number;
  correctPredictions: number;
  winRate: number;
  roi: number;
  totalWagered: number;
  totalReturn: number;
  withClaudeEffect: {
    winRate: number;
    roi: number;
    totalWagered: number;
    totalReturn: number;
    gamesBet: number;
  };
  withoutClaudeEffect: {
    winRate: number;
    roi: number;
    totalWagered: number;
    totalReturn: number;
    gamesBet: number;
  };
  dimensionImpact: {
    sentiment: { winRate: number; roi: number };
    narrative: { winRate: number; roi: number };
    iai: { winRate: number; roi: number };
    csi: { winRate: number; roi: number };
  };
  errors: string[];
}

export interface BacktestConfig {
  startDate: Date;
  endDate: Date;
  leagues: string[];
  useClaudeEffect: boolean;
  bankroll: number;
  betSize: 'kelly' | 'fixed' | 'percentage';
  minConfidence: number;
  minEdge: number;
}

/**
 * Backtest Engine
 */
export class BacktestEngine {
  /**
   * Run backtest on historical games
   */
  async runBacktest(
    games: HistoricalGame[],
    config: BacktestConfig
  ): Promise<BacktestResult> {

    const results: BacktestResult = {
      totalGames: games.length,
      correctPredictions: 0,
      winRate: 0,
      roi: 0,
      totalWagered: 0,
      totalReturn: 0,
      withClaudeEffect: {
        winRate: 0,
        roi: 0,
        totalWagered: 0,
        totalReturn: 0,
        gamesBet: 0,
      },
      withoutClaudeEffect: {
        winRate: 0,
        roi: 0,
        totalWagered: 0,
        totalReturn: 0,
        gamesBet: 0,
      },
      dimensionImpact: {
        sentiment: { winRate: 0, roi: 0 },
        narrative: { winRate: 0, roi: 0 },
        iai: { winRate: 0, roi: 0 },
        csi: { winRate: 0, roi: 0 },
      },
      errors: [],
    };

    let correctWithClaude = 0;
    let correctWithoutClaude = 0;
    let wageredWithClaude = 0;
    let wageredWithoutClaude = 0;
    let returnWithClaude = 0;
    let returnWithoutClaude = 0;
    let gamesBetWithClaude = 0;
    let gamesBetWithoutClaude = 0;

    // Process each game
    for (const game of games) {
      try {
        // Generate prediction WITH Claude Effect
        const predictionWithClaude = await this.predictGame(game, true, config);

        // Generate prediction WITHOUT Claude Effect
        const predictionWithoutClaude = await this.predictGame(game, false, config);

        // Check if predictions meet thresholds
        if (predictionWithClaude.confidence >= config.minConfidence &&
            Math.abs(predictionWithClaude.edge) >= config.minEdge) {

          const betSize = this.calculateBetSize(
            predictionWithClaude,
            config.bankroll,
            config.betSize
          );

          wageredWithClaude += betSize;
          gamesBetWithClaude += 1;

          // Check if prediction was correct
          const isCorrect = this.isPredictionCorrect(
            predictionWithClaude,
            game
          );

          if (isCorrect) {
            correctWithClaude++;
            const odds = this.getOddsForPrediction(predictionWithClaude, game);
            returnWithClaude += betSize * (this.americanToDecimal(odds) - 1);
          } else {
            returnWithClaude -= betSize;
          }
        }

        // Same for without Claude Effect
        if (predictionWithoutClaude.confidence >= config.minConfidence &&
            Math.abs(predictionWithoutClaude.edge) >= config.minEdge) {

          const betSize = this.calculateBetSize(
            predictionWithoutClaude,
            config.bankroll,
            config.betSize
          );

          wageredWithoutClaude += betSize;
          gamesBetWithoutClaude += 1;

          const isCorrect = this.isPredictionCorrect(
            predictionWithoutClaude,
            game
          );

          if (isCorrect) {
            correctWithoutClaude++;
            const odds = this.getOddsForPrediction(predictionWithoutClaude, game);
            returnWithoutClaude += betSize * (this.americanToDecimal(odds) - 1);
          } else {
            returnWithoutClaude -= betSize;
          }
        }

      } catch (error: any) {
        results.errors.push(`Game ${game.id}: ${error.message}`);
      }
    }

    // Calculate final metrics
    results.withClaudeEffect = {
      winRate: gamesBetWithClaude > 0 ? correctWithClaude / gamesBetWithClaude : 0,
      roi: wageredWithClaude > 0 ? (returnWithClaude / wageredWithClaude) * 100 : 0,
      totalWagered: wageredWithClaude,
      totalReturn: returnWithClaude,
      gamesBet: gamesBetWithClaude,
    };

    results.withoutClaudeEffect = {
      winRate: gamesBetWithoutClaude > 0 ? correctWithoutClaude / gamesBetWithoutClaude : 0,
      roi: wageredWithoutClaude > 0 ? (returnWithoutClaude / wageredWithoutClaude) * 100 : 0,
      totalWagered: wageredWithoutClaude,
      totalReturn: returnWithoutClaude,
      gamesBet: gamesBetWithoutClaude,
    };

    results.winRate = results.withClaudeEffect.winRate;
    results.roi = results.withClaudeEffect.roi;
    results.totalWagered = wageredWithClaude;
    results.totalReturn = returnWithClaude;

    return results;
  }

  private predictionEngine: PredictionEngine;

  constructor() {
    this.predictionEngine = new PredictionEngine();
  }

  /**
   * Generate prediction for a game using the real PredictionEngine.
   * When useClaudeEffect is true, gathers Claude Effect data and applies the same adjustment as the v2 route.
   * If gather/apply fails (e.g. no server for sentiment/narrative APIs), falls back to base prediction.
   */
  private async predictGame(
    game: HistoricalGame,
    useClaudeEffect: boolean,
    _config: BacktestConfig
  ): Promise<any> {
    const gameData: GameData = {
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      league: game.league,
      sport: game.league?.toLowerCase() || 'nfl',
      odds: game.odds,
      date: game.date?.toISOString?.() || new Date().toISOString(),
      venue: (game.gameData as any)?.venue,
    };
    const result = await this.predictionEngine.predict(gameData, false);
    // Engine may return confidence as 0–1 or 0–100
    let confidence0to1 = result.confidence <= 1 ? result.confidence : result.confidence / 100;
    const edgePct = typeof result.edge === 'number' ? (result.edge <= 1 ? result.edge : result.edge / 100) : 0.05;

    if (useClaudeEffect) {
      try {
        const claudeData = await gatherClaudeEffectData(gameData, {
          includePhase1: true,
          includePhase2: true,
          includePhase3: true,
          includePhase4: true,
          includePhase5: false,
          includePhase6: false,
          includePhase7: false,
        });
        const ceResult = await applyClaudeEffect(confidence0to1, confidence0to1, gameData, claudeData);
        // Same small adjustment as v2 route: preserve base variance, apply -0.04 to +0.04
        const claudeAdjustment = (ceResult.adjustedConfidence - 0.5) * 0.08;
        confidence0to1 = Math.min(0.95, Math.max(0.58, confidence0to1 + claudeAdjustment));
      } catch {
        // Claude Effect APIs may be unavailable when running backtest standalone; use base prediction
      }
    }

    return {
      predictedWinner: result.predictedWinner,
      confidence: confidence0to1,
      edge: edgePct,
      probability: confidence0to1,
      recommendedBet: result.recommendedBet
        ? { type: result.recommendedBet.type, side: result.recommendedBet.side, value: result.recommendedBet.value, confidence: result.recommendedBet.confidence }
        : { type: 'moneyline' as const, side: result.predictedWinner, value: 0, confidence: result.confidence },
    };
  }

  /**
   * Check if prediction was correct
   */
  private isPredictionCorrect(prediction: any, game: HistoricalGame): boolean {
    if (prediction.recommendedBet?.type === 'moneyline') {
      return prediction.predictedWinner === game.actualWinner;
    }
    // Add logic for spread/total bets
    return prediction.predictedWinner === game.actualWinner;
  }

  /**
   * Calculate bet size
   */
  private calculateBetSize(
    prediction: any,
    bankroll: number,
    method: string
  ): number {
    switch (method) {
      case 'kelly':
        // Kelly Criterion
        const kellyFraction = (prediction.probability * this.americanToDecimal(-110) - 1) /
                             (this.americanToDecimal(-110) - 1);
        return Math.max(0, Math.min(bankroll * 0.25, bankroll * kellyFraction * 0.5));
      case 'fixed':
        return bankroll * 0.01; // 1% of bankroll
      case 'percentage':
        return bankroll * (prediction.confidence * 0.02); // Up to 2% based on confidence
      default:
        return bankroll * 0.01;
    }
  }

  /**
   * Get odds for prediction
   */
  private getOddsForPrediction(prediction: any, game: HistoricalGame): number {
    if (prediction.predictedWinner === game.homeTeam) {
      return game.odds.home;
    }
    return game.odds.away;
  }

  /**
   * Convert American odds to decimal
   */
  private americanToDecimal(americanOdds: number): number {
    if (americanOdds > 0) {
      return (americanOdds / 100) + 1;
    }
    return (100 / Math.abs(americanOdds)) + 1;
  }
}

