/**
 * Simulation Engine
 * Wrapper for Monte Carlo simulations
 */

import { PredictionEngine, type GameData } from './prediction-engine';

export interface SimulationResult {
  gameId: string;
  iterations: number;
  homeWinPct: number;
  awayWinPct: number;
  spreadResults: {
    homeCoverPct: number;
    awayCoverPct: number;
    pushPct: number;
    avgMargin: number;
    marginStdDev: number;
  };
  totalResults: {
    overPct: number;
    underPct: number;
    pushPct: number;
    avgTotal: number;
    totalStdDev: number;
  };
  scenarios: {
    blowoutHome: number;
    blowoutAway: number;
    closeGame: number;
    overtime: number;
  };
  seed?: number; // Random seed for reproducibility
}

export class SimulationEngine {
  private predictionEngine: PredictionEngine;

  constructor() {
    this.predictionEngine = new PredictionEngine();
  }

  /**
   * Run Monte Carlo simulation for a game
   * Uses seeded random for reproducibility
   */
  async simulate(
    gameId: string,
    iterations: number = 10000,
    customParams?: Partial<GameData>,
    seed?: number
  ): Promise<SimulationResult & { seed: number }> {
    // Use provided seed or generate one for reproducibility
    const simulationSeed = seed || Math.floor(Math.random() * 1000000);

    // Seed the random number generator (simple LCG for reproducibility)
    let rngState = simulationSeed;
    const seededRandom = () => {
      rngState = (rngState * 1664525 + 1013904223) % Math.pow(2, 32);
      return rngState / Math.pow(2, 32);
    };
    // TODO: Get actual game data from OddsService
    // For now, use placeholder game data
    const gameData: GameData = {
      homeTeam: 'Home Team',
      awayTeam: 'Away Team',
      league: 'NFL',
      sport: 'NFL',
      odds: { home: -110, away: -110, spread: -3.5, total: 44.5 },
      ...customParams,
    };

    // Run Monte Carlo simulation
    const result = await this.predictionEngine.monteCarloSimulation(gameData, iterations);

    // Calculate spread results
    const spreadLine = gameData.odds.spread || 0;
    let homeCovers = 0;
    let awayCovers = 0;
    let pushes = 0;
    const margins: number[] = [];

    // Simulate spread outcomes (using seeded random)
    for (let i = 0; i < iterations; i++) {
      const homeScore = result.averageScore.home + (seededRandom() - 0.5) * result.stdDev * 2;
      const awayScore = result.averageScore.away + (seededRandom() - 0.5) * result.stdDev * 2;
      const margin = homeScore - awayScore;
      margins.push(margin);

      if (Math.abs(margin + spreadLine) < 0.5) {
        pushes++;
      } else if (margin + spreadLine > 0) {
        homeCovers++;
      } else {
        awayCovers++;
      }
    }

    // Calculate total results
    const totalLine = gameData.odds.total || 44.5;
    let overs = 0;
    let unders = 0;
    let totalPushes = 0;
    const totals: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const homeScore = result.averageScore.home + (seededRandom() - 0.5) * result.stdDev * 2;
      const awayScore = result.averageScore.away + (seededRandom() - 0.5) * result.stdDev * 2;
      const total = homeScore + awayScore;
      totals.push(total);

      if (Math.abs(total - totalLine) < 0.5) {
        totalPushes++;
      } else if (total > totalLine) {
        overs++;
      } else {
        unders++;
      }
    }

    // Calculate scenarios
    const blowoutThreshold = 14; // 14+ point margin
    let blowoutHome = 0;
    let blowoutAway = 0;
    let closeGames = 0;
    let overtimes = 0;

    for (const margin of margins) {
      if (Math.abs(margin) < 3) {
        closeGames++;
      } else if (margin >= blowoutThreshold) {
        blowoutHome++;
      } else if (margin <= -blowoutThreshold) {
        blowoutAway++;
      }
    }

    // Overtime is rare, estimate based on close games
    overtimes = Math.floor(closeGames * 0.1);

    const avgMargin = margins.reduce((a, b) => a + b, 0) / margins.length;
    const marginStdDev = Math.sqrt(
      margins.reduce((sum, m) => sum + Math.pow(m - avgMargin, 2), 0) / margins.length
    );

    const avgTotal = totals.reduce((a, b) => a + b, 0) / totals.length;
    const totalStdDev = Math.sqrt(
      totals.reduce((sum, t) => sum + Math.pow(t - avgTotal, 2), 0) / totals.length
    );

    return {
      gameId,
      iterations,
      homeWinPct: result.winRate * 100,
      awayWinPct: (1 - result.winRate) * 100,
      spreadResults: {
        homeCoverPct: (homeCovers / iterations) * 100,
        awayCoverPct: (awayCovers / iterations) * 100,
        pushPct: (pushes / iterations) * 100,
        avgMargin: Math.round(avgMargin * 10) / 10,
        marginStdDev: Math.round(marginStdDev * 10) / 10,
      },
      totalResults: {
        overPct: (overs / iterations) * 100,
        underPct: (unders / iterations) * 100,
        pushPct: (totalPushes / iterations) * 100,
        avgTotal: Math.round(avgTotal * 10) / 10,
        totalStdDev: Math.round(totalStdDev * 10) / 10,
      },
      scenarios: {
        blowoutHome: (blowoutHome / iterations) * 100,
        blowoutAway: (blowoutAway / iterations) * 100,
        closeGame: (closeGames / iterations) * 100,
        overtime: (overtimes / iterations) * 100,
      },
      seed: simulationSeed, // Include seed for reproducibility
    };
  }
}

