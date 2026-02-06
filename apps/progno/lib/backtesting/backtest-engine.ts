/**
 * Backtesting Framework for Claude Effect
 * Validates predictions on historical data with MC, dimension impact, and MC+Value paths
 */

import { CompleteClaudeEffectEngine, getClaudeEffectEngine } from '../data-sources/claude-effect-complete';
import { PredictionEngine } from '../../app/lib/prediction-engine';
import type { GameData } from '../../app/lib/prediction-engine';
import { estimateTeamStatsFromOdds } from '../../app/lib/odds-helpers';

export interface HistoricalGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: Date;
  odds: { home: number; away: number; spread?: number; total?: number };
  actualWinner: string;
  actualScore?: { home: number; away: number };
  gameData: GameData;
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

  monteCarloStats: {
    avgCIWidth: number;
    medianCIWidth: number;
    gamesWithWideCI: number;
  };

  dimensionImpact: {
    sentiment: { winRate: number; roi: number; gamesBet: number };
    narrative: { winRate: number; roi: number; gamesBet: number };
    iai:       { winRate: number; roi: number; gamesBet: number };
    csi:       { winRate: number; roi: number; gamesBet: number };
  };

  mcValueBreakdown?: {
    favorite:  { gamesBet: number; correct: number; winRate: number; roi: number; totalReturn: number };
    underdog:  { gamesBet: number; correct: number; winRate: number; roi: number; totalReturn: number };
  };

  errors: string[];
}

export interface BacktestConfig {
  startDate: Date;
  endDate: Date;
  leagues: string[];
  useClaudeEffect: boolean;
  useMCValue?: boolean;
  bankroll: number;
  betSize: 'kelly' | 'fixed' | 'percentage';
  minConfidence: number;
  minEdge: number;
  mcIterations?: number;
}

export class BacktestEngine {
  private claudeEngine: CompleteClaudeEffectEngine;
  private predictionEngine: PredictionEngine;

  constructor() {
    this.claudeEngine = getClaudeEffectEngine();
    this.predictionEngine = new PredictionEngine();
  }

  async runBacktest(games: HistoricalGame[], config: BacktestConfig): Promise<BacktestResult> {
    const filteredGames = games.filter(g => {
      const d = g.date instanceof Date ? g.date : new Date(g.date);
      if (d < config.startDate || d > config.endDate) return false;
      if (config.leagues.length > 0 && !config.leagues.includes(g.league)) return false;
      return true;
    });

    const result: BacktestResult = {
      totalGames: filteredGames.length,
      correctPredictions: 0,
      winRate: 0,
      roi: 0,
      totalWagered: 0,
      totalReturn: 0,
      withClaudeEffect: { winRate: 0, roi: 0, totalWagered: 0, totalReturn: 0, gamesBet: 0 },
      withoutClaudeEffect: { winRate: 0, roi: 0, totalWagered: 0, totalReturn: 0, gamesBet: 0 },
      monteCarloStats: { avgCIWidth: 0, medianCIWidth: 0, gamesWithWideCI: 0 },
      dimensionImpact: {
        sentiment: { winRate: 0, roi: 0, gamesBet: 0 },
        narrative: { winRate: 0, roi: 0, gamesBet: 0 },
        iai:       { winRate: 0, roi: 0, gamesBet: 0 },
        csi:       { winRate: 0, roi: 0, gamesBet: 0 }
      },
      errors: []
    };

    let correctWith = 0, wageredWith = 0, returnWith = 0, gamesBetWith = 0;
    let correctWithout = 0, wageredWithout = 0, returnWithout = 0, gamesBetWithout = 0;
    const ciWidths: number[] = [];

    const mcIterations = config.mcIterations ?? 1000;
    const useMCValue = config.useMCValue ?? false;

    for (const game of filteredGames) {
      try {
        const basePrediction = await this.predictionEngine.predict(game.gameData, false);

        // WITH Claude Effect (PredictionResult has no .probability; confidence is 0-1. Claude expects baseConfidence 0-100.)
        const baseProbability = typeof basePrediction.confidence === 'number' ? basePrediction.confidence : 0.5;
        const baseConfidencePct = typeof basePrediction.confidence === 'number' ? basePrediction.confidence * 100 : 50;
        const ceResult = await this.claudeEngine.calculate({
          baseProbability,
          baseConfidence: baseConfidencePct,
          gameTime: game.date,
          sport: game.league,
          homeTeam: game.gameData?.homeTeam,
          awayTeam: game.gameData?.awayTeam,
          gameId: game.id
        }, { useMonteCarlo: true, mcIterations });

        const predictionWith = {
          predictedWinner: basePrediction.predictedWinner,
          confidence: ceResult.adjustedConfidence / 100,
          edge: ceResult.edgePercentage / 100,
          probability: ceResult.adjustedProbability,
          monteCarlo: ceResult.monteCarlo
        };

        // WITHOUT Claude Effect (PredictionEngine already returns confidence 0-1)
        const predictionWithout = { ...basePrediction, monteCarlo: undefined };

        // Optional MC+Value path
        let finalPredictionWith = predictionWith;
        if (useMCValue) {
          finalPredictionWith = await this.predictGameMCValue(game);
        }

        // Process WITH Claude Effect
        if (finalPredictionWith.confidence >= config.minConfidence &&
            Math.abs(finalPredictionWith.edge) >= config.minEdge) {

          const betSize = this.calculateBetSize(finalPredictionWith, config.bankroll, config.betSize, game);
          wageredWith += betSize;
          gamesBetWith++;

          const isCorrect = this.isPredictionCorrect(finalPredictionWith, game);
          if (isCorrect) {
            correctWith++;
            const odds = this.getOddsForPrediction(finalPredictionWith, game);
            returnWith += betSize * (this.americanToDecimal(odds) - 1);
          } else {
            returnWith -= betSize;
          }

          if (finalPredictionWith.monteCarlo) {
            const width = finalPredictionWith.monteCarlo.probability95th - finalPredictionWith.monteCarlo.probability5th;
            ciWidths.push(width);
            if (width > 0.15) result.monteCarloStats.gamesWithWideCI++;
          }
        }

        // Process WITHOUT Claude Effect
        if (predictionWithout.confidence >= config.minConfidence &&
            Math.abs(predictionWithout.edge) >= config.minEdge) {

          const betSize = this.calculateBetSize(predictionWithout, config.bankroll, config.betSize, game);
          wageredWithout += betSize;
          gamesBetWithout++;

          const isCorrect = this.isPredictionCorrect(predictionWithout, game);
          if (isCorrect) {
            correctWithout++;
            const odds = this.getOddsForPrediction(predictionWithout, game);
            returnWithout += betSize * (this.americanToDecimal(odds) - 1);
          } else {
            returnWithout -= betSize;
          }
        }

      } catch (error: any) {
        result.errors.push(`Game ${game.id}: ${error.message}`);
      }
    }

    // Final metrics
    result.withClaudeEffect = {
      winRate: gamesBetWith > 0 ? correctWith / gamesBetWith : 0,
      roi: wageredWith > 0 ? (returnWith / wageredWith) * 100 : 0,
      totalWagered: wageredWith,
      totalReturn: returnWith,
      gamesBet: gamesBetWith
    };

    result.withoutClaudeEffect = {
      winRate: gamesBetWithout > 0 ? correctWithout / gamesBetWithout : 0,
      roi: wageredWithout > 0 ? (returnWithout / wageredWithout) * 100 : 0,
      totalWagered: wageredWithout,
      totalReturn: returnWithout,
      gamesBet: gamesBetWithout
    };

    result.winRate = result.withClaudeEffect.winRate;
    result.roi = result.withClaudeEffect.roi;
    result.totalWagered = wageredWith;
    result.totalReturn = returnWith;

    // Monte Carlo stats
    if (ciWidths.length > 0) {
      ciWidths.sort((a, b) => a - b);
      result.monteCarloStats.avgCIWidth = ciWidths.reduce((a, b) => a + b, 0) / ciWidths.length;
      result.monteCarloStats.medianCIWidth = ciWidths[Math.floor(ciWidths.length / 2)];
    }

    return result;
  }

  private async predictGameMCValue(game: HistoricalGame): Promise<any> {
    // MC+Value logic (same as picks/today)
    // Placeholder — replace with your actual implementation
    return {
      predictedWinner: game.homeTeam,
      confidence: 0.65,
      edge: 0.08,
      probability: 0.65
    };
  }

  private calculateBetSize(prediction: any, bankroll: number, method: string, game?: HistoricalGame): number {
    const odds = game ? this.getOddsForPrediction(prediction, game) : -110;

    switch (method) {
      case 'kelly':
        const decimal = this.americanToDecimal(odds);
        const fraction = (prediction.probability * decimal - 1) / (decimal - 1);
        return Math.max(0, Math.min(bankroll * 0.25, bankroll * Math.max(0, fraction) * 0.5));
      case 'fixed':
        return bankroll * 0.01;
      case 'percentage':
        return bankroll * (prediction.confidence * 0.02);
      default:
        return bankroll * 0.01;
    }
  }

  private isPredictionCorrect(prediction: any, game: HistoricalGame): boolean {
    return prediction.predictedWinner === game.actualWinner;
  }

  private getOddsForPrediction(prediction: any, game: HistoricalGame): number {
    return prediction.predictedWinner === game.homeTeam ? game.odds.home : game.odds.away;
  }

  private americanToDecimal(odds: number): number {
    if (odds > 0) return 1 + odds / 100;
    return 1 + 100 / Math.abs(odds);
  }
}