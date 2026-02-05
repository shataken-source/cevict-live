/**
 * Monte Carlo Simulation Engine
 * Like Leans AI's "Remi" - runs thousands of simulations to remove human bias
 * 
 * Features:
 * - 1000-10000 simulations per game
 * - Multiple outcome distributions (normal, Poisson, beta)
 * - Injury-adjusted simulations
 * - Weather-adjusted simulations
 * - Spread/total probability distributions
 */

import { GameData, TeamStats } from './prediction-engine';

export interface MonteCarloConfig {
  iterations: number;        // Number of simulations (1000-10000)
  includeInjuries: boolean;  // Factor in injury impact
  includeWeather: boolean;   // Factor in weather impact
  homeAdvantage: number;     // Points advantage for home team (default: 3)
  varianceMultiplier: number; // How much randomness (default: 1.0)
}

export interface SimulationOutcome {
  homeScore: number;
  awayScore: number;
  homeWin: boolean;
  margin: number;
  total: number;
}

export interface MonteCarloResult {
  // Win probabilities
  homeWinProbability: number;
  awayWinProbability: number;
  
  // Spread analysis
  spreadProbabilities: {
    homeCovers: number;  // Probability home covers spread
    awayCovers: number;  // Probability away covers spread
    push: number;        // Probability of push
    averageMargin: number;
    marginStdDev: number;
  };
  
  // Total analysis
  totalProbabilities: {
    over: number;        // Probability over hits
    under: number;       // Probability under hits
    push: number;
    averageTotal: number;
    totalStdDev: number;
  };
  
  // Score predictions
  predictedScore: {
    home: number;
    away: number;
    homeRange: [number, number];  // 90% confidence interval
    awayRange: [number, number];
  };
  
  // Distribution data for charts
  scoreDistribution: {
    homeScores: number[];
    awayScores: number[];
    margins: number[];
    totals: number[];
  };
  
  // Metadata
  iterations: number;
  confidence: number;  // Based on win probability deviation from 50%
  simulationTime: number;
}

export interface ValueBet {
  type: 'moneyline' | 'spread' | 'total';
  side: string;
  line?: number;
  modelProbability: number;
  impliedProbability: number;
  edge: number;  // Edge percentage
  expectedValue: number;  // EV per $100 bet
  confidence: 'low' | 'medium' | 'high' | 'very_high';
  kellyFraction: number;  // Optimal bet size (Kelly Criterion)
  reasoning: string;
}

const DEFAULT_CONFIG: MonteCarloConfig = {
  iterations: 1000,
  includeInjuries: true,
  includeWeather: true,
  homeAdvantage: 3,
  varianceMultiplier: 1.0,
};

/**
 * Sport-specific scoring parameters
 */
const SPORT_PARAMS: Record<string, {
  avgScore: number;
  stdDev: number;
  minScore: number;
  maxScore: number;
  homeAdvantage: number;
}> = {
  NFL: { avgScore: 24, stdDev: 10, minScore: 0, maxScore: 60, homeAdvantage: 2.5 },
  NCAAF: { avgScore: 28, stdDev: 14, minScore: 0, maxScore: 70, homeAdvantage: 3.5 },
  NBA: { avgScore: 112, stdDev: 12, minScore: 70, maxScore: 150, homeAdvantage: 3.0 },
  NCAAB: { avgScore: 72, stdDev: 11, minScore: 40, maxScore: 110, homeAdvantage: 4.0 },
  NHL: { avgScore: 3, stdDev: 1.5, minScore: 0, maxScore: 10, homeAdvantage: 0.3 },
  MLB: { avgScore: 4.5, stdDev: 2.5, minScore: 0, maxScore: 15, homeAdvantage: 0.2 },
};

export class MonteCarloEngine {
  private config: MonteCarloConfig;

  constructor(config: Partial<MonteCarloConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Run full Monte Carlo simulation for a game
   */
  async simulate(
    gameData: GameData,
    spread?: number,
    total?: number,
    config?: Partial<MonteCarloConfig>
  ): Promise<MonteCarloResult> {
    const startTime = Date.now();
    const mergedConfig = { ...this.config, ...config };
    const iterations = mergedConfig.iterations;

    const sport = this.normalizeSport(gameData.sport || gameData.league);
    const params = SPORT_PARAMS[sport] || SPORT_PARAMS.NFL;

    // Calculate base scoring rates
    const { homeExpected, awayExpected, homeStdDev, awayStdDev } = 
      this.calculateBaseRates(gameData, params, mergedConfig);

    // Run simulations
    const outcomes: SimulationOutcome[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const outcome = this.simulateSingleGame(
        homeExpected,
        awayExpected,
        homeStdDev,
        awayStdDev,
        params.minScore,
        params.maxScore
      );
      outcomes.push(outcome);
    }

    // Analyze results
    const result = this.analyzeOutcomes(
      outcomes,
      spread ?? gameData.odds?.spread ?? 0,
      total ?? gameData.odds?.total ?? params.avgScore * 2,
      iterations,
      startTime
    );

    return result;
  }

  /**
   * Calculate base scoring rates from team data
   */
  private calculateBaseRates(
    gameData: GameData,
    params: typeof SPORT_PARAMS.NFL,
    config: MonteCarloConfig
  ): {
    homeExpected: number;
    awayExpected: number;
    homeStdDev: number;
    awayStdDev: number;
  } {
    let homeExpected = params.avgScore;
    let awayExpected = params.avgScore;
    let homeStdDev = params.stdDev;
    let awayStdDev = params.stdDev;

    if (gameData.teamStats) {
      const { home, away } = gameData.teamStats;

      // Calculate offensive/defensive ratings
      const homeOffense = home.recentAvgPoints || 
        (home.pointsFor / Math.max(home.wins + home.losses, 1)) || 
        params.avgScore;
      const awayOffense = away.recentAvgPoints || 
        (away.pointsFor / Math.max(away.wins + away.losses, 1)) || 
        params.avgScore;
      const homeDefense = home.recentAvgAllowed || 
        (home.pointsAgainst / Math.max(home.wins + home.losses, 1)) || 
        params.avgScore;
      const awayDefense = away.recentAvgAllowed || 
        (away.pointsAgainst / Math.max(away.wins + away.losses, 1)) || 
        params.avgScore;

      // Expected points = (offensive rating + opponent's defensive rating) / 2
      homeExpected = (homeOffense + awayDefense) / 2;
      awayExpected = (awayOffense + homeDefense) / 2;

      // Adjust for ratings if available
      if (home.offensiveRating && home.defensiveRating) {
        homeExpected = homeExpected * (home.offensiveRating / 100);
      }
      if (away.offensiveRating && away.defensiveRating) {
        awayExpected = awayExpected * (away.offensiveRating / 100);
      }
    }

    // Apply home advantage
    homeExpected += config.homeAdvantage || params.homeAdvantage;

    // Apply injury adjustments
    if (config.includeInjuries && gameData.injuries) {
      const homeInjuryImpact = gameData.injuries.homeImpact || 0;
      const awayInjuryImpact = gameData.injuries.awayImpact || 0;
      
      homeExpected *= (1 - homeInjuryImpact);
      awayExpected *= (1 - awayInjuryImpact);
    }

    // Apply weather adjustments (reduces scoring in bad weather)
    if (config.includeWeather && gameData.weather) {
      const weatherImpact = this.calculateWeatherImpact(gameData.weather);
      homeExpected *= (1 - weatherImpact);
      awayExpected *= (1 - weatherImpact);
    }

    // Apply variance multiplier
    homeStdDev *= config.varianceMultiplier;
    awayStdDev *= config.varianceMultiplier;

    return { homeExpected, awayExpected, homeStdDev, awayStdDev };
  }

  /**
   * Calculate weather impact on scoring (0-0.2 reduction)
   */
  private calculateWeatherImpact(weather: GameData['weather']): number {
    if (!weather) return 0;

    let impact = 0;

    // Precipitation impact
    const conditions = (weather.conditions || '').toLowerCase();
    if (conditions.includes('rain') || conditions.includes('snow')) {
      impact += 0.08;
    }
    if (conditions.includes('heavy')) {
      impact += 0.05;
    }

    // Wind impact
    if (weather.windSpeed) {
      if (weather.windSpeed > 20) impact += 0.05;
      if (weather.windSpeed > 30) impact += 0.05;
    }

    // Temperature impact (extreme cold)
    if (weather.temperature && weather.temperature < 20) {
      impact += 0.03;
    }

    return Math.min(impact, 0.2);
  }

  /**
   * Simulate a single game outcome
   */
  private simulateSingleGame(
    homeExpected: number,
    awayExpected: number,
    homeStdDev: number,
    awayStdDev: number,
    minScore: number,
    maxScore: number
  ): SimulationOutcome {
    // Generate scores using normal distribution
    const homeScore = this.clamp(
      this.normalRandom(homeExpected, homeStdDev),
      minScore,
      maxScore
    );
    const awayScore = this.clamp(
      this.normalRandom(awayExpected, awayStdDev),
      minScore,
      maxScore
    );

    // Round to reasonable values
    const roundedHome = Math.round(homeScore);
    const roundedAway = Math.round(awayScore);

    return {
      homeScore: roundedHome,
      awayScore: roundedAway,
      homeWin: roundedHome > roundedAway,
      margin: roundedHome - roundedAway,
      total: roundedHome + roundedAway,
    };
  }

  /**
   * Analyze simulation outcomes
   */
  private analyzeOutcomes(
    outcomes: SimulationOutcome[],
    spread: number,
    total: number,
    iterations: number,
    startTime: number
  ): MonteCarloResult {
    const n = outcomes.length;

    // Win probabilities
    const homeWins = outcomes.filter(o => o.homeWin).length;
    const homeWinProb = homeWins / n;
    const awayWinProb = 1 - homeWinProb;

    // Extract arrays for analysis
    const margins = outcomes.map(o => o.margin);
    const totals = outcomes.map(o => o.total);
    const homeScores = outcomes.map(o => o.homeScore);
    const awayScores = outcomes.map(o => o.awayScore);

    // Spread analysis (positive spread means home is underdog)
    const homeCoversCount = outcomes.filter(o => o.margin > spread).length;
    const pushCount = outcomes.filter(o => o.margin === spread).length;
    const awayCoversCount = n - homeCoversCount - pushCount;

    // Total analysis
    const overCount = outcomes.filter(o => o.total > total).length;
    const totalPushCount = outcomes.filter(o => o.total === total).length;
    const underCount = n - overCount - totalPushCount;

    // Statistics
    const avgMargin = this.average(margins);
    const marginStdDev = this.standardDeviation(margins);
    const avgTotal = this.average(totals);
    const totalStdDev = this.standardDeviation(totals);
    const avgHome = this.average(homeScores);
    const avgAway = this.average(awayScores);

    // Confidence intervals (90%)
    const sortedHome = [...homeScores].sort((a, b) => a - b);
    const sortedAway = [...awayScores].sort((a, b) => a - b);
    const lowIdx = Math.floor(n * 0.05);
    const highIdx = Math.floor(n * 0.95);

    // Calculate confidence based on win probability
    const confidence = Math.abs(homeWinProb - 0.5) * 2;

    return {
      homeWinProbability: homeWinProb,
      awayWinProbability: awayWinProb,
      
      spreadProbabilities: {
        homeCovers: homeCoversCount / n,
        awayCovers: awayCoversCount / n,
        push: pushCount / n,
        averageMargin: avgMargin,
        marginStdDev: marginStdDev,
      },
      
      totalProbabilities: {
        over: overCount / n,
        under: underCount / n,
        push: totalPushCount / n,
        averageTotal: avgTotal,
        totalStdDev: totalStdDev,
      },
      
      predictedScore: {
        home: Math.round(avgHome),
        away: Math.round(avgAway),
        homeRange: [sortedHome[lowIdx], sortedHome[highIdx]],
        awayRange: [sortedAway[lowIdx], sortedAway[highIdx]],
      },
      
      scoreDistribution: {
        homeScores,
        awayScores,
        margins,
        totals,
      },
      
      iterations,
      confidence,
      simulationTime: Date.now() - startTime,
    };
  }

  /**
   * Detect value bets from simulation results
   */
  detectValueBets(
    result: MonteCarloResult,
    odds: GameData['odds'],
    homeTeam: string,
    awayTeam: string,
    spread?: number,
    total?: number
  ): ValueBet[] {
    const valueBets: ValueBet[] = [];

    // Check moneyline value
    const homeImplied = this.americanToImplied(odds.home);
    const awayImplied = this.americanToImplied(odds.away);
    
    // Home moneyline
    const homeEdge = (result.homeWinProbability - homeImplied) * 100;
    if (homeEdge > 3) {  // Minimum 3% edge
      valueBets.push({
        type: 'moneyline',
        side: homeTeam,
        modelProbability: result.homeWinProbability,
        impliedProbability: homeImplied,
        edge: homeEdge,
        expectedValue: this.calculateEV(result.homeWinProbability, odds.home),
        confidence: this.edgeToConfidence(homeEdge),
        kellyFraction: this.kellyFraction(result.homeWinProbability, odds.home),
        reasoning: `Model: ${(result.homeWinProbability * 100).toFixed(1)}% vs Market: ${(homeImplied * 100).toFixed(1)}%`,
      });
    }

    // Away moneyline
    const awayEdge = (result.awayWinProbability - awayImplied) * 100;
    if (awayEdge > 3) {
      valueBets.push({
        type: 'moneyline',
        side: awayTeam,
        modelProbability: result.awayWinProbability,
        impliedProbability: awayImplied,
        edge: awayEdge,
        expectedValue: this.calculateEV(result.awayWinProbability, odds.away),
        confidence: this.edgeToConfidence(awayEdge),
        kellyFraction: this.kellyFraction(result.awayWinProbability, odds.away),
        reasoning: `Model: ${(result.awayWinProbability * 100).toFixed(1)}% vs Market: ${(awayImplied * 100).toFixed(1)}%`,
      });
    }

    // Spread value (assuming -110 standard)
    const spreadOdds = -110;
    const spreadImplied = this.americanToImplied(spreadOdds);

    // Home covers spread
    const homeSpreadEdge = (result.spreadProbabilities.homeCovers - spreadImplied) * 100;
    if (homeSpreadEdge > 3) {
      valueBets.push({
        type: 'spread',
        side: homeTeam,
        line: spread ?? odds.spread ?? 0,
        modelProbability: result.spreadProbabilities.homeCovers,
        impliedProbability: spreadImplied,
        edge: homeSpreadEdge,
        expectedValue: this.calculateEV(result.spreadProbabilities.homeCovers, spreadOdds),
        confidence: this.edgeToConfidence(homeSpreadEdge),
        kellyFraction: this.kellyFraction(result.spreadProbabilities.homeCovers, spreadOdds),
        reasoning: `Model: ${(result.spreadProbabilities.homeCovers * 100).toFixed(1)}% to cover ${spread ?? odds.spread ?? 0}`,
      });
    }

    // Away covers spread
    const awaySpreadEdge = (result.spreadProbabilities.awayCovers - spreadImplied) * 100;
    if (awaySpreadEdge > 3) {
      valueBets.push({
        type: 'spread',
        side: awayTeam,
        line: -(spread ?? odds.spread ?? 0),
        modelProbability: result.spreadProbabilities.awayCovers,
        impliedProbability: spreadImplied,
        edge: awaySpreadEdge,
        expectedValue: this.calculateEV(result.spreadProbabilities.awayCovers, spreadOdds),
        confidence: this.edgeToConfidence(awaySpreadEdge),
        kellyFraction: this.kellyFraction(result.spreadProbabilities.awayCovers, spreadOdds),
        reasoning: `Model: ${(result.spreadProbabilities.awayCovers * 100).toFixed(1)}% to cover ${-(spread ?? odds.spread ?? 0)}`,
      });
    }

    // Over/Under value
    const totalLine = total ?? odds.total ?? 44;
    
    // Over
    const overEdge = (result.totalProbabilities.over - spreadImplied) * 100;
    if (overEdge > 3) {
      valueBets.push({
        type: 'total',
        side: 'Over',
        line: totalLine,
        modelProbability: result.totalProbabilities.over,
        impliedProbability: spreadImplied,
        edge: overEdge,
        expectedValue: this.calculateEV(result.totalProbabilities.over, spreadOdds),
        confidence: this.edgeToConfidence(overEdge),
        kellyFraction: this.kellyFraction(result.totalProbabilities.over, spreadOdds),
        reasoning: `Model: ${(result.totalProbabilities.over * 100).toFixed(1)}% over ${totalLine} (avg: ${result.totalProbabilities.averageTotal.toFixed(1)})`,
      });
    }

    // Under
    const underEdge = (result.totalProbabilities.under - spreadImplied) * 100;
    if (underEdge > 3) {
      valueBets.push({
        type: 'total',
        side: 'Under',
        line: totalLine,
        modelProbability: result.totalProbabilities.under,
        impliedProbability: spreadImplied,
        edge: underEdge,
        expectedValue: this.calculateEV(result.totalProbabilities.under, spreadOdds),
        confidence: this.edgeToConfidence(underEdge),
        kellyFraction: this.kellyFraction(result.totalProbabilities.under, spreadOdds),
        reasoning: `Model: ${(result.totalProbabilities.under * 100).toFixed(1)}% under ${totalLine} (avg: ${result.totalProbabilities.averageTotal.toFixed(1)})`,
      });
    }

    // Sort by edge (best value first)
    return valueBets.sort((a, b) => b.edge - a.edge);
  }

  // ========== Utility Functions ==========

  private normalRandom(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private average(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private standardDeviation(arr: number[]): number {
    const avg = this.average(arr);
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }

  private americanToImplied(odds: number): number {
    if (odds > 0) {
      return 100 / (odds + 100);
    } else {
      return Math.abs(odds) / (Math.abs(odds) + 100);
    }
  }

  private calculateEV(probability: number, odds: number): number {
    // EV = (probability * profit) - (1 - probability) * stake
    // For $100 bet
    let profit: number;
    if (odds > 0) {
      profit = odds;
    } else {
      profit = 100 / (Math.abs(odds) / 100);
    }
    return (probability * profit) - ((1 - probability) * 100);
  }

  private kellyFraction(probability: number, odds: number): number {
    // Kelly = (bp - q) / b
    // b = decimal odds - 1
    // p = probability of winning
    // q = 1 - p
    const decimalOdds = odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1;
    const b = decimalOdds - 1;
    const p = probability;
    const q = 1 - p;
    
    const kelly = (b * p - q) / b;
    // Cap at 25% of bankroll (quarter Kelly for safety)
    return Math.max(0, Math.min(kelly * 0.25, 0.25));
  }

  private edgeToConfidence(edge: number): 'low' | 'medium' | 'high' | 'very_high' {
    if (edge >= 10) return 'very_high';
    if (edge >= 7) return 'high';
    if (edge >= 5) return 'medium';
    return 'low';
  }

  private normalizeSport(sport: string): string {
    const upper = sport.toUpperCase();
    if (upper.includes('NCAAF') || upper.includes('CFB') || upper.includes('COLLEGE FOOTBALL')) {
      return 'NCAAF';
    }
    if (upper.includes('NCAAB') || upper.includes('CBB') || upper.includes('COLLEGE BASKETBALL')) {
      return 'NCAAB';
    }
    return upper;
  }
}

// Export singleton
export const monteCarloEngine = new MonteCarloEngine();

