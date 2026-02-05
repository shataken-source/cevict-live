/**
 * Simulation and Tuning System for 2024 Data
 * Runs simulations and fine-tunes the prediction engine until 90% win rate
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { GameData, predictionEngine } from '../app/lib/prediction-engine';

interface HistoricalGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  odds: {
    home: number;
    away: number;
    spread?: number;
    total?: number;
  };
  actualWinner: string;
  actualScore: {
    home: number;
    away: number;
  };
  teamStats?: {
    home: any;
    away: any;
  };
  recentForm?: {
    home: string[];
    away: string[];
  };
  headToHead?: {
    homeWins: number;
    awayWins: number;
  };
  weather?: any;
  injuries?: any;
}

interface SimulationResult {
  gameId: string;
  predictedWinner: string;
  actualWinner: string;
  correct: boolean;
  confidence: number;
  edge: number;
  methods: { name: string; confidence: number; weight: number }[];
}

interface TuningParameters {
  methodWeights: Map<string, number>;
  confidenceThreshold: number;
  edgeThreshold: number;
  combinationMethod: 'weighted' | 'majority' | 'ensemble';
}

class SimulationEngine {
  private games: HistoricalGame[] = [];
  private results: SimulationResult[] = [];
  private tuningParams: TuningParameters;
  private iteration = 0;
  private bestWinRate = 0;
  private bestParams: TuningParameters | null = null;

  constructor() {
    this.tuningParams = {
      methodWeights: new Map(),
      confidenceThreshold: 0.5,
      edgeThreshold: 2.0,
      combinationMethod: 'weighted'
    };
    this.initializeWeights();
  }

  private initializeWeights() {
    const methods = [
      'statistical-model',
      'elo-rating',
      'recent-form',
      'head-to-head',
      'market-efficiency',
      'weather-impact',
      'injury-impact',
      'home-advantage',
      'momentum',
      'machine-learning'
    ];

    methods.forEach(method => {
      this.tuningParams.methodWeights.set(method, 1.0);
    });
  }

  /**
   * Load 2024 historical game data
   */
  async load2024Data(): Promise<void> {
    console.log('📊 Loading 2024 historical data...');

    // Try to load from file first
    const dataFile = path.join(process.cwd(), 'data', '2024-games.json');

    if (fs.existsSync(dataFile)) {
      const raw = fs.readFileSync(dataFile, 'utf8');
      this.games = JSON.parse(raw);
      console.log(`✅ Loaded ${this.games.length} games from file`);
      return;
    }

    // Try to load from Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Load games from 2024
        const startDate = '2024-01-01';
        const endDate = '2024-12-31';

        const { data, error } = await supabase
          .from('progno_predictions')
          .select('*')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .eq('prediction_type', 'sports');

        if (!error && data) {
          // Convert to HistoricalGame format
          this.games = data.map((pred: any) => {
            const predData = pred.prediction_data || {};
            const gameData = predData.gameData || {};
            const outcome = pred.outcome_data || {};

            return {
              id: pred.id,
              homeTeam: gameData.homeTeam || 'Unknown',
              awayTeam: gameData.awayTeam || 'Unknown',
              league: pred.category || 'NFL',
              date: pred.created_at,
              odds: gameData.odds || { home: -110, away: -110 },
              actualWinner: outcome.winner || gameData.homeTeam,
              actualScore: outcome.finalScore || { home: 0, away: 0 },
              teamStats: gameData.teamStats,
              recentForm: gameData.recentForm,
              headToHead: gameData.headToHead,
              weather: gameData.weather,
              injuries: gameData.injuries
            };
          });

          console.log(`✅ Loaded ${this.games.length} games from database`);
          return;
        }
      } catch (error) {
        console.warn('⚠️ Database load failed, using sample data:', error);
      }
    }

    // Generate sample 2024 NFL data if no data available
    this.generateSample2024Data();
    console.log(`✅ Generated ${this.games.length} sample games for 2024`);
  }

  /**
   * Generate sample 2024 NFL data for testing
   */
  private generateSample2024Data(): void {
    const teams = [
      'Kansas City Chiefs', 'Buffalo Bills', 'Cincinnati Bengals',
      'Baltimore Ravens', 'Miami Dolphins', 'Pittsburgh Steelers',
      'Cleveland Browns', 'New York Jets', 'Los Angeles Chargers',
      'Denver Broncos', 'Las Vegas Raiders', 'New England Patriots',
      'Dallas Cowboys', 'Philadelphia Eagles', 'New York Giants',
      'Washington Commanders', 'San Francisco 49ers', 'Seattle Seahawks',
      'Los Angeles Rams', 'Arizona Cardinals', 'Detroit Lions',
      'Green Bay Packers', 'Minnesota Vikings', 'Chicago Bears',
      'Tampa Bay Buccaneers', 'New Orleans Saints', 'Atlanta Falcons',
      'Carolina Panthers', 'Jacksonville Jaguars', 'Tennessee Titans',
      'Indianapolis Colts', 'Houston Texans'
    ];

    const weeks = 18; // NFL regular season
    const gamesPerWeek = 16;

    for (let week = 1; week <= weeks; week++) {
      for (let game = 0; game < gamesPerWeek; game++) {
        const homeIdx = (week * 2 + game) % teams.length;
        const awayIdx = (week * 3 + game * 2) % teams.length;

        if (homeIdx === awayIdx) continue;

        const homeTeam = teams[homeIdx];
        const awayTeam = teams[awayIdx];

        // Generate realistic odds
        const homeOdds = -150 + Math.random() * 100; // -150 to -50
        const awayOdds = 100 + Math.random() * 100; // 100 to 200
        const spread = -7 + Math.random() * 14; // -7 to +7
        const total = 40 + Math.random() * 20; // 40 to 60

        // Generate actual score (home team wins ~55% of the time)
        const homeTeamWins = Math.random() > 0.45;
        const homeScore = 17 + Math.floor(Math.random() * 21); // 17-37
        const awayScore = homeTeamWins
          ? homeScore - Math.floor(Math.random() * 10) - 1
          : homeScore + Math.floor(Math.random() * 10) + 1;

        // Generate team stats
        const homeWins = Math.floor(Math.random() * 8) + 5; // 5-12
        const homeLosses = 17 - homeWins;
        const awayWins = Math.floor(Math.random() * 8) + 5;
        const awayLosses = 17 - awayWins;

        // Generate recent form
        const generateForm = () => {
          const form = [];
          for (let i = 0; i < 5; i++) {
            form.push(Math.random() > 0.4 ? 'W' : 'L');
          }
          return form;
        };

        // Calculate proper date for NFL week (each week starts on Thursday)
        // Week 1 starts Sept 5, 2024 (Thursday)
        const weekStartDate = new Date('2024-09-05');
        const daysOffset = (week - 1) * 7; // Each week is 7 days
        const gameDate = new Date(weekStartDate);
        gameDate.setDate(gameDate.getDate() + daysOffset + (game % 3)); // Distribute games across week

        this.games.push({
          id: `game-2024-w${week}-g${game}`,
          homeTeam,
          awayTeam,
          league: 'NFL',
          date: gameDate.toISOString().split('T')[0],
          odds: {
            home: Math.round(homeOdds),
            away: Math.round(awayOdds),
            spread: Math.round(spread * 10) / 10,
            total: Math.round(total * 10) / 10
          },
          actualWinner: homeTeamWins ? homeTeam : awayTeam,
          actualScore: {
            home: homeScore,
            away: awayScore
          },
          teamStats: {
            home: {
              wins: homeWins,
              losses: homeLosses,
              pointsFor: homeScore * 1.2,
              pointsAgainst: awayScore * 0.9,
              recentAvgPoints: homeScore,
              recentAvgAllowed: awayScore * 0.9
            },
            away: {
              wins: awayWins,
              losses: awayLosses,
              pointsFor: awayScore * 1.2,
              pointsAgainst: homeScore * 0.9,
              recentAvgPoints: awayScore,
              recentAvgAllowed: homeScore * 0.9
            }
          },
          recentForm: {
            home: generateForm(),
            away: generateForm()
          },
          headToHead: {
            homeWins: Math.floor(Math.random() * 3),
            awayWins: Math.floor(Math.random() * 3)
          }
        });
      }
    }

    // Save sample data for future use
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(dataDir, '2024-games.json'),
      JSON.stringify(this.games, null, 2)
    );
  }

  /**
   * Run simulation on a single game (500+ iterations)
   */
  async simulateGame(game: HistoricalGame, iterations: number = 500): Promise<SimulationResult> {
    const predictions: { winner: string; confidence: number; edge: number }[] = [];

    // Run multiple simulations with slight variations
    for (let i = 0; i < iterations; i++) {
      // Add small random noise to simulate real-world variance
      const gameData: GameData = {
        ...game,
        sport: game.league, // Map league to sport
        odds: {
          ...game.odds,
          home: game.odds.home + (Math.random() - 0.5) * 10,
          away: game.odds.away + (Math.random() - 0.5) * 10
        }
      };

      try {
        const prediction = await predictionEngine.predict(gameData);
        predictions.push({
          winner: prediction.predictedWinner,
          confidence: prediction.confidence,
          edge: prediction.edge
        });
      } catch (error) {
        console.warn(`Simulation ${i} failed:`, error);
      }
    }

    // Aggregate results
    const winnerVotes = new Map<string, number>();
    let totalConfidence = 0;
    let totalEdge = 0;

    predictions.forEach(pred => {
      winnerVotes.set(pred.winner, (winnerVotes.get(pred.winner) || 0) + 1);
      totalConfidence += pred.confidence;
      totalEdge += pred.edge;
    });

    // Majority vote winner
    let predictedWinner = game.homeTeam;
    let maxVotes = 0;
    winnerVotes.forEach((votes, winner) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        predictedWinner = winner;
      }
    });

    const avgConfidence = totalConfidence / predictions.length;
    const avgEdge = totalEdge / predictions.length;

    // Get methods from last prediction (they're similar across iterations)
    const lastPred = await predictionEngine.predict({
      ...game,
      sport: game.league, // Map league to sport
      odds: game.odds
    });

    return {
      gameId: game.id,
      predictedWinner,
      actualWinner: game.actualWinner,
      correct: predictedWinner === game.actualWinner,
      confidence: avgConfidence,
      edge: avgEdge,
      methods: lastPred.methods
    };
  }

  /**
   * Run simulations on all games for a week
   */
  async simulateWeek(weekNumber: number): Promise<SimulationResult[]> {
    const weekGames = this.games.filter(g => {
      const gameWeek = this.getWeekFromDate(g.date);
      return gameWeek === weekNumber;
    });

    console.log(`\n📅 Simulating Week ${weekNumber} (${weekGames.length} games)...`);

    const results: SimulationResult[] = [];

    for (const game of weekGames) {
      console.log(`  🎮 ${game.homeTeam} vs ${game.awayTeam}...`);
      const result = await this.simulateGame(game, 500);
      results.push(result);

      // Record outcome for learning (only if methods are available)
      if (result.methods && result.methods.length > 0) {
        try {
          // Use game.id as predictionId (for simulation purposes)
          await predictionEngine.learnFromResult(
            game.id,
            result.correct ? 'correct' : 'incorrect',
            result.methods.map(m => ({
              name: m.name,
              confidence: m.confidence,
              weight: m.weight
            }))
          );
        } catch (error: any) {
          // Silently handle database errors (expected in simulation mode)
          if (!error.message?.includes('database') && !error.message?.includes('not found')) {
            console.warn(`  ⚠️  Failed to record learning for ${game.id}:`, error.message);
          }
        }
      }
    }

    return results;
  }

  /**
   * Calculate win rate from results
   */
  calculateWinRate(results: SimulationResult[]): number {
    if (results.length === 0) return 0;
    const correct = results.filter(r => r.correct).length;
    return (correct / results.length) * 100;
  }

  /**
   * Tune engine parameters based on results
   */
  tuneEngine(results: SimulationResult[]): void {
    console.log('\n🔧 Tuning engine parameters...');

    // Analyze method performance
    const methodStats = new Map<string, { correct: number; total: number; avgConfidence: number }>();

    results.forEach(result => {
      result.methods.forEach(method => {
        const stat = methodStats.get(method.name) || { correct: 0, total: 0, avgConfidence: 0 };
        stat.total += 1;
        if (result.correct) stat.correct += 1;
        stat.avgConfidence = (stat.avgConfidence * (stat.total - 1) + method.confidence) / stat.total;
        methodStats.set(method.name, stat);
      });
    });

    // Adjust weights based on performance
    methodStats.forEach((stat, methodName) => {
      if (stat.total === 0) return;

      const winRate = stat.correct / stat.total;
      const currentWeight = this.tuningParams.methodWeights.get(methodName) || 1.0;

      // More aggressive tuning: adjust by up to 20% based on performance
      const adjustment = (winRate - 0.5) * 0.4; // ±20% max
      const newWeight = currentWeight * (1 + adjustment);

      // Clamp between 0.3 and 2.5 for more aggressive tuning
      const clampedWeight = Math.max(0.3, Math.min(2.5, newWeight));

      this.tuningParams.methodWeights.set(methodName, clampedWeight);

      // Update engine weights
      predictionEngine.setMethodWeight(methodName, clampedWeight);

      console.log(`  ${methodName}: ${(winRate * 100).toFixed(1)}% win rate, weight: ${currentWeight.toFixed(2)} → ${clampedWeight.toFixed(2)}`);
    });

    // Adjust confidence threshold
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    const correctAvgConfidence = results
      .filter(r => r.correct)
      .reduce((sum, r) => sum + r.confidence, 0) / results.filter(r => r.correct).length || 0.5;

    // If correct predictions have higher confidence, we can raise threshold
    if (correctAvgConfidence > avgConfidence + 0.1) {
      this.tuningParams.confidenceThreshold = Math.min(0.7, this.tuningParams.confidenceThreshold + 0.01);
    } else if (correctAvgConfidence < avgConfidence - 0.1) {
      this.tuningParams.confidenceThreshold = Math.max(0.3, this.tuningParams.confidenceThreshold - 0.01);
    }

    console.log(`  Confidence threshold: ${(this.tuningParams.confidenceThreshold * 100).toFixed(1)}%`);
  }

  /**
   * Get week number from date
   */
  private getWeekFromDate(dateString: string): number {
    const date = new Date(dateString);
    const startOfSeason = new Date('2024-09-05'); // NFL season start
    const diffTime = date.getTime() - startOfSeason.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
  }

  /**
   * Main simulation loop - runs until 90% win rate
   */
  async runSimulations(targetWinRate: number = 90): Promise<void> {
    console.log('🚀 Starting 2024 Simulation and Tuning Process...');
    console.log(`🎯 Target Win Rate: ${targetWinRate}%`);
    console.log(`📊 Total Games: ${this.games.length}`);
    console.log(`🔄 Simulations per game: 500+\n`);

    let currentWinRate = 0;
    const maxIterations = 50; // Prevent infinite loops

    while (currentWinRate < targetWinRate && this.iteration < maxIterations) {
      this.iteration++;
      console.log(`\n${'='.repeat(60)}`);
      console.log(`ITERATION ${this.iteration}`);
      console.log(`${'='.repeat(60)}`);

      // Reset results for this iteration
      this.results = [];

      // Simulate all weeks
      const weeks = 18; // NFL season
      for (let week = 1; week <= weeks; week++) {
        const weekResults = await this.simulateWeek(week);
        this.results.push(...weekResults);

        const weekWinRate = this.calculateWinRate(weekResults);
        console.log(`  Week ${week} Win Rate: ${weekWinRate.toFixed(2)}%`);
      }

      // Calculate overall win rate
      currentWinRate = this.calculateWinRate(this.results);
      const correct = this.results.filter(r => r.correct).length;
      const total = this.results.length;

      console.log(`\n📊 Overall Results:`);
      console.log(`   Correct: ${correct}/${total}`);
      console.log(`   Win Rate: ${currentWinRate.toFixed(2)}%`);
      console.log(`   Target: ${targetWinRate}%`);
      console.log(`   Gap: ${(targetWinRate - currentWinRate).toFixed(2)}%`);

      // Save best parameters
      if (currentWinRate > this.bestWinRate) {
        this.bestWinRate = currentWinRate;
        this.bestParams = {
          methodWeights: new Map(this.tuningParams.methodWeights),
          confidenceThreshold: this.tuningParams.confidenceThreshold,
          edgeThreshold: this.tuningParams.edgeThreshold,
          combinationMethod: this.tuningParams.combinationMethod
        };
        console.log(`\n✨ New best win rate: ${this.bestWinRate.toFixed(2)}%`);
      }

      // Tune engine if not at target
      if (currentWinRate < targetWinRate) {
        this.tuneEngine(this.results);

      // Apply tuned weights to engine
      predictionEngine.setMethodWeights(this.tuningParams.methodWeights);
      } else {
        console.log(`\n🎉 Target achieved! Win rate: ${currentWinRate.toFixed(2)}%`);
        break;
      }

      // Save progress
      this.saveProgress();
    }

    // Final report
    console.log(`\n${'='.repeat(60)}`);
    console.log('FINAL RESULTS');
    console.log(`${'='.repeat(60)}`);
    console.log(`Iterations: ${this.iteration}`);
    console.log(`Final Win Rate: ${currentWinRate.toFixed(2)}%`);
    console.log(`Best Win Rate: ${this.bestWinRate.toFixed(2)}%`);
    console.log(`Target: ${targetWinRate}%`);

    if (this.bestParams) {
      console.log(`\nBest Parameters:`);
      this.bestParams.methodWeights.forEach((weight, method) => {
        console.log(`  ${method}: ${weight.toFixed(3)}`);
      });
    }

    // Save final tuned parameters
    this.saveTunedParameters();
  }

  /**
   * Save progress to file
   */
  private saveProgress(): void {
    const progressDir = path.join(process.cwd(), 'data', 'simulations');
    if (!fs.existsSync(progressDir)) {
      fs.mkdirSync(progressDir, { recursive: true });
    }

    const progressFile = path.join(progressDir, `iteration-${this.iteration}.json`);
    fs.writeFileSync(progressFile, JSON.stringify({
      iteration: this.iteration,
      winRate: this.calculateWinRate(this.results),
      results: this.results,
      parameters: {
        methodWeights: Object.fromEntries(this.tuningParams.methodWeights),
        confidenceThreshold: this.tuningParams.confidenceThreshold
      }
    }, null, 2));
  }

  /**
   * Save final tuned parameters
   */
  private saveTunedParameters(): void {
    if (!this.bestParams) return;

    const paramsDir = path.join(process.cwd(), 'data', 'tuned-parameters');
    if (!fs.existsSync(paramsDir)) {
      fs.mkdirSync(paramsDir, { recursive: true });
    }

    const paramsFile = path.join(paramsDir, '2024-tuned-parameters.json');
    fs.writeFileSync(paramsFile, JSON.stringify({
      winRate: this.bestWinRate,
      iteration: this.iteration,
      parameters: {
        methodWeights: Object.fromEntries(this.bestParams.methodWeights),
        confidenceThreshold: this.bestParams.confidenceThreshold,
        edgeThreshold: this.bestParams.edgeThreshold,
        combinationMethod: this.bestParams.combinationMethod
      }
    }, null, 2));

    console.log(`\n💾 Tuned parameters saved to: ${paramsFile}`);
  }
}

// Main execution
async function main() {
  const simulator = new SimulationEngine();

  try {
    await simulator.load2024Data();
    await simulator.runSimulations(90); // Target 90% win rate
  } catch (error) {
    console.error('❌ Simulation failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { SimulationEngine };

