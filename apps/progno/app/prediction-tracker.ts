// Prediction Tracker Module for Progno Sports Prediction Platform

export interface PredictionResult {
  id: string;
  gameId: string;
  prediction: {
    predictedWinner: string;
    confidence: number;
    predictedScore: { home: number; away: number };
    stake: number;
    pick: string;
    edge: number;
    rationale: string;
  };
  actualResult?: {
    winner: string;
    finalScore: { home: number; away: number };
    status: 'win' | 'lose' | 'pending';
  };
  accuracy: {
    winnerCorrect?: boolean;
    scoreAccuracy?: number;
    confidenceAccuracy?: number;
    profit?: number;
  };
  timestamp: Date;
  sport: string;
}

export interface AccuracyMetrics {
  totalPredictions: number;
  correctPredictions: number;
  winRate: number;
  averageConfidence: number;
  averageProfit: number;
  roi: number;
  bySport: { [sport: string]: AccuracyMetrics };
  byConfidence: { [range: string]: AccuracyMetrics };
  recentPerformance: PredictionResult[];
}

class PredictionTracker {
  private predictions: PredictionResult[] = [];
  private readonly STORAGE_KEY = 'progno_predictions';
  private readonly hasLocalStorage = (() => {
    const ls = typeof globalThis !== 'undefined' ? (globalThis as any).localStorage : undefined;
    return ls && typeof ls.getItem === 'function' && typeof ls.setItem === 'function';
  })();
  private memoryStore: PredictionResult[] = [];
  private fileStorePath: string | null = null;
  private hasFs: boolean;
  private fs: typeof import('fs') | null = null;
  private path: typeof import('path') | null = null;

  constructor() {
    this.hasFs = typeof window === 'undefined' && typeof process !== 'undefined' && !!process?.cwd;
    if (this.hasFs) {
      const req = typeof window === 'undefined' ? (eval('require') as NodeRequire) : null;
      this.path = req ? req('path') : null;
      this.fs = req ? req('fs') : null;
      const base = this.path.join(process.cwd(), '.progno');
      if (this.fs && !this.fs.existsSync(base)) {
        try { this.fs.mkdirSync(base, { recursive: true }); } catch {}
      }
      this.fileStorePath = this.path.join(base, 'predictions.json');
    }
    this.loadPredictions();
  }

  // Load predictions from localStorage
  private loadPredictions(): void {
    // LocalStorage path
    if (this.hasLocalStorage) {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          this.predictions = JSON.parse(stored).map((p: any) => ({
            ...p,
            timestamp: new Date(p.timestamp)
          }));
          return;
        }
      } catch (error) {
        console.error('Failed to load predictions:', error);
      }
    }

    // File system fallback (cron/CLI)
    if (this.fileStorePath && this.fs) {
      try {
        if (this.fs.existsSync(this.fileStorePath)) {
          const stored = this.fs.readFileSync(this.fileStorePath, 'utf8');
          if (stored) {
            this.predictions = JSON.parse(stored).map((p: any) => ({
              ...p,
              timestamp: new Date(p.timestamp)
            }));
            return;
          }
        }
      } catch (error) {
        console.error('Failed to load file predictions:', error);
      }
    }

    // In-memory fallback
    this.predictions = [...this.memoryStore];
  }

  // Save predictions to localStorage
  private savePredictions(): void {
    // LocalStorage path
    if (this.hasLocalStorage) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.predictions));
      } catch (error) {
        console.error('Failed to save predictions:', error);
      }
    }

    // File system fallback (cron/CLI)
    if (this.fileStorePath && this.fs) {
      try {
        this.fs.writeFileSync(this.fileStorePath, JSON.stringify(this.predictions, null, 2), 'utf8');
      } catch (error) {
        console.error('Failed to save file predictions:', error);
      }
    } else {
      // Keep memory store updated for server/CLI use
      this.memoryStore = [...this.predictions];
    }
  }

  // Add a new prediction
  addPrediction(gameId: string, prediction: any, sport: string): string {
    const id = `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newPrediction: PredictionResult = {
      id,
      gameId,
      prediction: {
        predictedWinner: prediction.predictedWinner,
        confidence: prediction.confidence,
        predictedScore: prediction.predictedScore,
        stake: prediction.stake || 100,
        pick: prediction.pick,
        edge: prediction.edge || 0,
        rationale: prediction.rationale || ''
      },
      actualResult: {
        winner: '',
        finalScore: { home: 0, away: 0 },
        status: 'pending'
      },
      accuracy: {},
      timestamp: new Date(),
      sport
    };

    this.predictions.push(newPrediction);
    this.savePredictions();
    return id;
  }

  // Check if we already have a pending prediction for this gameId
  hasPendingPredictionForGameId(gameId: string): boolean {
    return this.predictions.some(p => p.gameId === gameId && p.actualResult?.status === 'pending');
  }

  // Update prediction with actual results
  updatePredictionResult(predictionId: string, actualResult: { winner: string; finalScore: { home: number; away: number } }): void {
    const prediction = this.predictions.find(p => p.id === predictionId);
    if (!prediction) return;

    prediction.actualResult = {
      winner: actualResult.winner,
      finalScore: actualResult.finalScore,
      status: this.determinePredictionStatus(prediction, actualResult)
    };

    prediction.accuracy = this.calculateAccuracy(prediction);
    this.savePredictions();
  }

  // Auto-update predictions based on live game data
  async updatePredictionsFromLiveGames(games: any[]): Promise<number> {
    const completedGames = games.filter(game => game.isCompleted && game.liveScore);
    let updated = 0;

    for (const game of completedGames) {
      const pendingPredictions = this.predictions.filter(
        p => p.gameId === game.id && p.actualResult?.status === 'pending'
      );

      for (const prediction of pendingPredictions) {
        const actualResult = {
          winner: game.liveScore.home > game.liveScore.away ? game.homeTeam : game.awayTeam,
          finalScore: game.liveScore
        };

        this.updatePredictionResult(prediction.id, actualResult);
        updated++;
      }
    }
    return updated;
  }

  // Determine if prediction was correct
  private determinePredictionStatus(prediction: PredictionResult, actual: { winner: string; finalScore: { home: number; away: number } }): 'win' | 'lose' | 'pending' {
    if (!actual.winner) return 'pending';
    return prediction.prediction.predictedWinner === actual.winner ? 'win' : 'lose';
  }

  // Calculate accuracy metrics for a prediction
  private calculateAccuracy(prediction: PredictionResult): PredictionResult['accuracy'] {
    if (!prediction.actualResult || prediction.actualResult.status === 'pending') {
      return {};
    }

    const winnerCorrect = prediction.prediction.predictedWinner === prediction.actualResult.winner;

    // Calculate score accuracy (how close the predicted score was to actual)
    const predictedScore = prediction.prediction.predictedScore;
    const actualScore = prediction.actualResult.finalScore;
    const scoreDiff = Math.abs(predictedScore.home - actualScore.home) + Math.abs(predictedScore.away - actualScore.away);
    const scoreAccuracy = Math.max(0, 100 - (scoreDiff * 5)); // 5 points per point difference

    // Calculate profit based on odds (simplified)
    const profit = winnerCorrect ? prediction.prediction.stake * 0.91 : -prediction.prediction.stake; // Assuming -110 odds

    return {
      winnerCorrect,
      scoreAccuracy: Math.round(scoreAccuracy),
      confidenceAccuracy: winnerCorrect ? prediction.prediction.confidence : 0,
      profit
    };
  }

  // Get comprehensive accuracy metrics
  getAccuracyMetrics(): AccuracyMetrics {
    const completedPredictions = this.predictions.filter(p => p.actualResult?.status !== 'pending');
    const correctPredictions = completedPredictions.filter(p => p.accuracy.winnerCorrect);

    const totalProfit = completedPredictions.reduce((sum, p) => sum + (p.accuracy.profit || 0), 0);
    const totalStaked = completedPredictions.reduce((sum, p) => sum + p.prediction.stake, 0);

    const baseMetrics: AccuracyMetrics = {
      totalPredictions: this.predictions.length,
      correctPredictions: correctPredictions.length,
      winRate: completedPredictions.length > 0 ? correctPredictions.length / completedPredictions.length : 0,
      averageConfidence: completedPredictions.length > 0 ?
        completedPredictions.reduce((sum, p) => sum + p.prediction.confidence, 0) / completedPredictions.length : 0,
      averageProfit: completedPredictions.length > 0 ? totalProfit / completedPredictions.length : 0,
      roi: totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0,
      bySport: {},
      byConfidence: {},
      recentPerformance: completedPredictions.slice(-10) // Last 10 predictions
    };

    // Calculate metrics by sport
    const sports = [...new Set(this.predictions.map(p => p.sport))];
    for (const sport of sports) {
      const sportPredictions = this.predictions.filter(p => p.sport === sport && p.actualResult?.status !== 'pending');
      const sportCorrect = sportPredictions.filter(p => p.accuracy.winnerCorrect);

      baseMetrics.bySport[sport] = {
        totalPredictions: sportPredictions.length,
        correctPredictions: sportCorrect.length,
        winRate: sportPredictions.length > 0 ? sportCorrect.length / sportPredictions.length : 0,
        averageConfidence: sportPredictions.length > 0 ?
          sportPredictions.reduce((sum, p) => sum + p.prediction.confidence, 0) / sportPredictions.length : 0,
        averageProfit: sportPredictions.length > 0 ?
          sportPredictions.reduce((sum, p) => sum + (p.accuracy.profit || 0), 0) / sportPredictions.length : 0,
        roi: sportPredictions.length > 0 ?
          (sportPredictions.reduce((sum, p) => sum + (p.accuracy.profit || 0), 0) /
           sportPredictions.reduce((sum, p) => sum + p.prediction.stake, 0)) * 100 : 0,
        bySport: {},
        byConfidence: {},
        recentPerformance: sportPredictions.slice(-5)
      };
    }

    // Calculate metrics by confidence range
    const confidenceRanges = ['50-60%', '60-70%', '70-80%', '80-90%', '90-100%'];
    for (const range of confidenceRanges) {
      const [min, max] = range.split('-').map(r => parseInt(r));
      const rangePredictions = completedPredictions.filter(p => {
        const confidence = p.prediction.confidence * 100;
        return confidence >= min && confidence < max;
      });

      const rangeCorrect = rangePredictions.filter(p => p.accuracy.winnerCorrect);

      baseMetrics.byConfidence[range] = {
        totalPredictions: rangePredictions.length,
        correctPredictions: rangeCorrect.length,
        winRate: rangePredictions.length > 0 ? rangeCorrect.length / rangePredictions.length : 0,
        averageConfidence: rangePredictions.length > 0 ?
          rangePredictions.reduce((sum, p) => sum + p.prediction.confidence, 0) / rangePredictions.length : 0,
        averageProfit: rangePredictions.length > 0 ?
          rangePredictions.reduce((sum, p) => sum + (p.accuracy.profit || 0), 0) / rangePredictions.length : 0,
        roi: rangePredictions.length > 0 ?
          (rangePredictions.reduce((sum, p) => sum + (p.accuracy.profit || 0), 0) /
           rangePredictions.reduce((sum, p) => sum + p.prediction.stake, 0)) * 100 : 0,
        bySport: {},
        byConfidence: {},
        recentPerformance: rangePredictions.slice(-5)
      };
    }

    return baseMetrics;
  }

  // Get predictions for a specific date range
  getPredictionsByDateRange(startDate: Date, endDate: Date): PredictionResult[] {
    return this.predictions.filter(p =>
      p.timestamp >= startDate && p.timestamp <= endDate
    );
  }

  // Export prediction data
  exportToCSV(): string {
    const headers = [
      'Date', 'Sport', 'Game ID', 'Predicted Winner', 'Actual Winner',
      'Confidence', 'Status', 'Profit', 'ROI'
    ];

    const rows = this.predictions.map(p => [
      p.timestamp.toISOString().split('T')[0],
      p.sport,
      p.gameId,
      p.prediction.predictedWinner,
      p.actualResult?.winner || 'Pending',
      `${(p.prediction.confidence * 100).toFixed(1)}%`,
      p.actualResult?.status || 'Pending',
      p.accuracy.profit ? `$${p.accuracy.profit.toFixed(2)}` : 'Pending',
      p.accuracy.profit && p.prediction.stake ? `${((p.accuracy.profit / p.prediction.stake) * 100).toFixed(1)}%` : 'Pending'
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  // Clear all prediction history
  clearHistory(): void {
    this.predictions = [];
    this.savePredictions();
  }
}

// Global prediction tracker instance
export const predictionTracker = new PredictionTracker();

// Export functions for external use
export const addPrediction = (gameId: string, prediction: any, sport: string) =>
  predictionTracker.addPrediction(gameId, prediction, sport);

export const updatePredictionResult = (predictionId: string, actualResult: { winner: string; finalScore: { home: number; away: number } }) =>
  predictionTracker.updatePredictionResult(predictionId, actualResult);

export const getAccuracyMetrics = () => predictionTracker.getAccuracyMetrics();

export const updatePredictionsFromLiveGames = (games: any[]) =>
  predictionTracker.updatePredictionsFromLiveGames(games);

export const hasPendingPredictionForGameId = (gameId: string) =>
  predictionTracker.hasPendingPredictionForGameId(gameId);
