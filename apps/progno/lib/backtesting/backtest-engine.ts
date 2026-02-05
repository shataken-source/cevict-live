/**
 * Backtesting Framework for Claude Effect
 * Validates predictions on historical data
 */

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
  };
  withoutClaudeEffect: {
    winRate: number;
    roi: number;
    totalWagered: number;
    totalReturn: number;
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
      },
      withoutClaudeEffect: {
        winRate: 0,
        roi: 0,
        totalWagered: 0,
        totalReturn: 0,
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
    const gamesWithBetsClaude = wageredWithClaude > 0 ?
      Math.ceil(wageredWithClaude / (config.bankroll * 0.01)) : 0;
    const gamesWithBetsNoClaude = wageredWithoutClaude > 0 ?
      Math.ceil(wageredWithoutClaude / (config.bankroll * 0.01)) : 0;

    results.withClaudeEffect = {
      winRate: gamesWithBetsClaude > 0 ? correctWithClaude / gamesWithBetsClaude : 0,
      roi: wageredWithClaude > 0 ? (returnWithClaude / wageredWithClaude) * 100 : 0,
      totalWagered: wageredWithClaude,
      totalReturn: returnWithClaude,
    };

    results.withoutClaudeEffect = {
      winRate: gamesWithBetsNoClaude > 0 ? correctWithoutClaude / gamesWithBetsNoClaude : 0,
      roi: wageredWithoutClaude > 0 ? (returnWithoutClaude / wageredWithoutClaude) * 100 : 0,
      totalWagered: wageredWithoutClaude,
      totalReturn: returnWithoutClaude,
    };

    results.winRate = results.withClaudeEffect.winRate;
    results.roi = results.withClaudeEffect.roi;
    results.totalWagered = wageredWithClaude;
    results.totalReturn = returnWithClaude;

    return results;
  }

  /**
   * Generate prediction for a game
   */
  private async predictGame(
    game: HistoricalGame,
    useClaudeEffect: boolean,
    config: BacktestConfig
  ): Promise<any> {
    // This would call the actual prediction engine
    // For now, return placeholder
    return {
      predictedWinner: game.homeTeam,
      confidence: 0.65,
      edge: 0.05,
      probability: 0.65,
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

