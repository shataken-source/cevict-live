/**
 * Advanced Prediction Engine
 * The best prediction engine this side of Vegas
 * Uses multiple calculation methods and learns from results
 */

import { savePrediction, recordOutcome, getWinPercentage } from './progno-db';

export interface GameData {
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: string;
  odds: {
    home: number;
    away: number;
    spread?: number;
    total?: number;
  };
  date?: string;
  venue?: string;
  weather?: {
    temperature?: number;
    conditions?: string;
    windSpeed?: number;
  };
  injuries?: {
    homeImpact?: number;
    awayImpact?: number;
  };
  teamStats?: {
    home: TeamStats;
    away: TeamStats;
  };
  recentForm?: {
    home: string[]; // ['W', 'L', 'W', ...]
    away: string[];
  };
  headToHead?: {
    homeWins: number;
    awayWins: number;
    draws?: number;
  };
}

export interface TeamStats {
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  homeRecord?: { wins: number; losses: number };
  awayRecord?: { wins: number; losses: number };
  recentAvgPoints: number;
  recentAvgAllowed: number;
  strengthOfSchedule?: number;
  offensiveRating?: number;
  defensiveRating?: number;
}

export interface PredictionResult {
  predictedWinner: string;
  confidence: number; // 0-100
  edge: number; // Expected value percentage
  predictedScore?: {
    home: number;
    away: number;
  };
  methods: {
    name: string;
    confidence: number;
    weight: number;
  }[];
  reasoning: string[];
  riskFactors: string[];
  recommendedBet?: {
    type: 'moneyline' | 'spread' | 'total';
    side: string;
    value: number;
    confidence: number;
  };
}

export interface LearningData {
  method: string;
  confidence: number;
  actualOutcome: 'correct' | 'incorrect' | 'partial';
  accuracy: number;
  timestamp: string;
}

/**
 * Advanced Prediction Engine Class
 */
export class PredictionEngine {
  private learningWeights: Map<string, number> = new Map();
  private methodPerformance: Map<string, { correct: number; total: number; avgAccuracy: number }> = new Map();
  private weeklyLearningData: LearningData[] = [];

  constructor() {
    this.initializeWeights();
    this.loadHistoricalPerformance();
  }

  /**
   * Initialize default weights for prediction methods
   */
  private initializeWeights() {
    const defaultMethods = [
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

    defaultMethods.forEach(method => {
      this.learningWeights.set(method, 1.0);
      this.methodPerformance.set(method, { correct: 0, total: 0, avgAccuracy: 0 });
    });

    // Add new advanced methods
    const advancedMethods = [
      'poisson-distribution',
      'regression-model',
      'bayesian-update',
      'monte-carlo'
    ];

    advancedMethods.forEach(method => {
      this.learningWeights.set(method, 1.0);
      this.methodPerformance.set(method, { correct: 0, total: 0, avgAccuracy: 0 });
    });
  }

  /**
   * Set custom weights for prediction methods (for elite fine-tuning)
   * Returns a function to restore original weights
   */
  setCustomWeights(weights: Record<string, number>): () => void {
    const originalWeights = new Map(this.learningWeights);

    // Apply custom weights
    Object.entries(weights).forEach(([method, weight]) => {
      this.learningWeights.set(method, weight);
    });

    // Return restore function
    return () => {
      this.learningWeights = originalWeights;
    };
  }

  /**
   * Load historical performance from database
   */
  private async loadHistoricalPerformance() {
    try {
      // Load win percentages by method from database
      const stats = await getWinPercentage({ type: 'sports' });

      if (stats) {
        // Adjust weights based on historical performance
        const baseWeight = 1.0;
        const performanceMultiplier = stats.win_percentage / 50; // Normalize to 50% baseline

        this.learningWeights.forEach((weight, method) => {
          this.learningWeights.set(method, baseWeight * performanceMultiplier);
        });
      }
    } catch (error) {
      console.warn('[PredictionEngine] Could not load historical performance:', error);
    }
  }

  /**
   * Main prediction method - combines all calculation methods
   * @param gameData - Game data for prediction
   * @param forceMoneyline - If true, always recommend moneyline (for Kalshi games)
   */
  async predict(gameData: GameData, forceMoneyline: boolean = false): Promise<PredictionResult> {
    const methods: { name: string; confidence: number; weight: number }[] = [];
    const reasoning: string[] = [];
    const riskFactors: string[] = [];

    // 1. Statistical Model (Pythagorean Expectation + Advanced Metrics)
    const statisticalPred = this.statisticalModel(gameData);
    methods.push({
      name: 'statistical-model',
      confidence: statisticalPred.confidence,
      weight: this.learningWeights.get('statistical-model') || 1.0
    });
    reasoning.push(statisticalPred.reasoning);

    // 2. Enhanced ELO Rating System (tracks team strength over time)
    const eloPred = this.eloRatingEnhanced(gameData);
    methods.push({
      name: 'elo-rating',
      confidence: eloPred.confidence,
      weight: this.learningWeights.get('elo-rating') || 1.0
    });
    reasoning.push(eloPred.reasoning);

    // 3. Recent Form Analysis
    const formPred = this.recentFormAnalysis(gameData);
    methods.push({
      name: 'recent-form',
      confidence: formPred.confidence,
      weight: this.learningWeights.get('recent-form') || 1.0
    });
    reasoning.push(formPred.reasoning);

    // 4. Head-to-Head History
    const h2hPred = this.headToHeadAnalysis(gameData);
    if (h2hPred) {
      methods.push({
        name: 'head-to-head',
        confidence: h2hPred.confidence,
        weight: this.learningWeights.get('head-to-head') || 0.8
      });
      reasoning.push(h2hPred.reasoning);
    }

    // 5. Market Efficiency Analysis
    const marketPred = this.marketEfficiencyAnalysis(gameData);
    methods.push({
      name: 'market-efficiency',
      confidence: marketPred.confidence,
      weight: this.learningWeights.get('market-efficiency') || 1.2
    });
    reasoning.push(marketPred.reasoning);
    if (marketPred.edge > 0) {
      reasoning.push(`Market edge detected: ${marketPred.edge.toFixed(2)}%`);
    }

    // 6. Weather Impact
    if (gameData.weather) {
      const weatherPred = this.weatherImpactAnalysis(gameData);
      methods.push({
        name: 'weather-impact',
        confidence: weatherPred.confidence,
        weight: this.learningWeights.get('weather-impact') || 0.6
      });
      reasoning.push(weatherPred.reasoning);
      if (weatherPred.risk) {
        riskFactors.push(weatherPred.risk);
      }
    }

    // 7. Injury Impact
    if (gameData.injuries) {
      const injuryPred = this.injuryImpactAnalysis(gameData);
      methods.push({
        name: 'injury-impact',
        confidence: injuryPred.confidence,
        weight: this.learningWeights.get('injury-impact') || 0.8
      });
      reasoning.push(injuryPred.reasoning);
      if (injuryPred.risk) {
        riskFactors.push(injuryPred.risk);
      }
    }

    // 8. Home Advantage
    const homeAdvPred = this.homeAdvantageAnalysis(gameData);
    methods.push({
      name: 'home-advantage',
      confidence: homeAdvPred.confidence,
      weight: this.learningWeights.get('home-advantage') || 0.7
    });
    reasoning.push(homeAdvPred.reasoning);

    // 9. Momentum Analysis
    const momentumPred = this.momentumAnalysis(gameData);
    methods.push({
      name: 'momentum',
      confidence: momentumPred.confidence,
      weight: this.learningWeights.get('momentum') || 0.9
    });
    reasoning.push(momentumPred.reasoning);

    // 10. Machine Learning Model (if we have historical data)
    const mlPred = await this.machineLearningPrediction(gameData);
    if (mlPred) {
      methods.push({
        name: 'machine-learning',
        confidence: mlPred.confidence,
        weight: this.learningWeights.get('machine-learning') || 1.5
      });
      reasoning.push(mlPred.reasoning);
    }

    // 11. Poisson Distribution for Total Score Predictions
    if (gameData.odds.total) {
      const poissonPred = this.poissonDistribution(gameData);
      methods.push({
        name: 'poisson-distribution',
        confidence: poissonPred.confidence,
        weight: this.learningWeights.get('poisson-distribution') || 1.0
      });
      reasoning.push(poissonPred.reasoning);
    }

    // 12. Regression Model for Historical Trends
    const regressionPred = await this.regressionModel(gameData);
    if (regressionPred) {
      methods.push({
        name: 'regression-model',
        confidence: regressionPred.confidence,
        weight: this.learningWeights.get('regression-model') || 1.2
      });
      reasoning.push(regressionPred.reasoning);
    }

    // 13. Bayesian Update from Past Predictions
    const bayesianPred = await this.bayesianUpdate(gameData);
    if (bayesianPred) {
      methods.push({
        name: 'bayesian-update',
        confidence: bayesianPred.confidence,
        weight: this.learningWeights.get('bayesian-update') || 1.3
      });
      reasoning.push(bayesianPred.reasoning);
    }

    // Combine all methods using weighted average
    const combinedResult = this.combineMethods(methods, gameData);

    // Calculate expected value and edge
    const edge = this.calculateEdge(gameData, combinedResult);

    // Generate recommended bet (force moneyline for Kalshi games)
    const recommendedBet = this.generateBetRecommendation(gameData, combinedResult, edge, forceMoneyline);

    return {
      predictedWinner: combinedResult.winner,
      confidence: Math.round(combinedResult.confidence * 100) / 100,
      edge: Math.round(edge * 100) / 100,
      predictedScore: combinedResult.score,
      methods,
      reasoning: reasoning.filter(r => r),
      riskFactors,
      recommendedBet
    };
  }

  /**
   * Statistical Model - Pythagorean Expectation + Advanced Metrics
   */
  private statisticalModel(gameData: GameData): { confidence: number; reasoning: string; winner: string } {
    if (!gameData.teamStats) {
      return { confidence: 0.5, reasoning: 'Insufficient statistical data', winner: gameData.homeTeam };
    }

    const { home, away } = gameData.teamStats;

    // Pythagorean Expectation
    const homePythagorean = Math.pow(home.pointsFor, 2.37) /
      (Math.pow(home.pointsFor, 2.37) + Math.pow(home.pointsAgainst, 2.37));
    const awayPythagorean = Math.pow(away.pointsFor, 2.37) /
      (Math.pow(away.pointsFor, 2.37) + Math.pow(away.pointsAgainst, 2.37));

    // Win Percentage
    const homeWinPct = home.wins / (home.wins + home.losses);
    const awayWinPct = away.wins / (away.wins + away.losses);

    // Strength of Schedule adjustment
    const homeSOS = home.strengthOfSchedule || 0.5;
    const awaySOS = away.strengthOfSchedule || 0.5;
    const homeAdjusted = homePythagorean * (1 + (homeSOS - 0.5) * 0.1);
    const awayAdjusted = awayPythagorean * (1 + (awaySOS - 0.5) * 0.1);

    // Combined metric
    const homeStrength = (homeAdjusted * 0.6) + (homeWinPct * 0.4);
    const awayStrength = (awayAdjusted * 0.6) + (awayWinPct * 0.4);

    const homeWinProb = homeStrength / (homeStrength + awayStrength);
    const confidence = Math.abs(homeWinProb - 0.5) * 2; // Convert to 0-1 scale
    const winner = homeWinProb > 0.5 ? gameData.homeTeam : gameData.awayTeam;

    const reasoning = `Statistical model: ${winner} favored ${(Math.max(homeWinProb, 1 - homeWinProb) * 100).toFixed(1)}% based on Pythagorean expectation and win percentage`;

    return { confidence, reasoning, winner };
  }


  /**
   * Recent Form Analysis
   */
  private recentFormAnalysis(gameData: GameData): { confidence: number; reasoning: string; winner: string } {
    if (!gameData.recentForm || !gameData.recentForm.home || !gameData.recentForm.away) {
      return { confidence: 0.5, reasoning: 'Insufficient recent form data', winner: gameData.homeTeam };
    }

    const homeForm = gameData.recentForm.home;
    const awayForm = gameData.recentForm.away;

    // Calculate form score (W = 1, L = 0, D = 0.5)
    const homeFormScore = homeForm.reduce((sum, result) => {
      if (result === 'W') return sum + 1;
      if (result === 'D') return sum + 0.5;
      return sum;
    }, 0) / homeForm.length;

    const awayFormScore = awayForm.reduce((sum, result) => {
      if (result === 'W') return sum + 1;
      if (result === 'D') return sum + 0.5;
      return sum;
    }, 0) / awayForm.length;

    // Weight recent games more heavily
    const homeRecentWeight = homeForm.slice(0, 3).reduce((sum, result) => {
      if (result === 'W') return sum + 1;
      if (result === 'D') return sum + 0.5;
      return sum;
    }, 0) / 3;

    const awayRecentWeight = awayForm.slice(0, 3).reduce((sum, result) => {
      if (result === 'W') return sum + 1;
      if (result === 'D') return sum + 0.5;
      return sum;
    }, 0) / 3;

    const homeCombined = (homeFormScore * 0.6) + (homeRecentWeight * 0.4);
    const awayCombined = (awayFormScore * 0.6) + (awayRecentWeight * 0.4);

    const homeWinProb = homeCombined / (homeCombined + awayCombined);
    const confidence = Math.abs(homeWinProb - 0.5) * 2;
    const winner = homeWinProb > 0.5 ? gameData.homeTeam : gameData.awayTeam;

    const reasoning = `Recent form: ${winner} has better recent form (${(homeCombined * 100).toFixed(0)}% vs ${(awayCombined * 100).toFixed(0)}%)`;

    return { confidence, reasoning, winner };
  }

  /**
   * Head-to-Head Analysis
   */
  private headToHeadAnalysis(gameData: GameData): { confidence: number; reasoning: string; winner: string } | null {
    if (!gameData.headToHead) {
      return null;
    }

    const { homeWins, awayWins, draws } = gameData.headToHead;
    const total = homeWins + awayWins + (draws || 0);

    if (total === 0) {
      return null;
    }

    const homeH2HProb = (homeWins + (draws || 0) * 0.5) / total;
    const confidence = Math.min(Math.abs(homeH2HProb - 0.5) * 2, 0.8); // Cap at 0.8
    const winner = homeH2HProb > 0.5 ? gameData.homeTeam : gameData.awayTeam;

    const reasoning = `Head-to-head: ${winner} leads series ${homeWins}-${awayWins}${draws ? `-${draws}` : ''}`;

    return { confidence, reasoning, winner };
  }

  /**
   * Market Efficiency Analysis - Find value in odds
   */
  private marketEfficiencyAnalysis(gameData: GameData): {
    confidence: number;
    reasoning: string;
    winner: string;
    edge: number;
  } {
    const { odds } = gameData;

    // Convert American odds to implied probability
    const homeImpliedProb = this.americanToImplied(odds.home);
    const awayImpliedProb = this.americanToImplied(odds.away);

    // Calculate market efficiency (should sum to ~1.0)
    const marketEfficiency = homeImpliedProb + awayImpliedProb;
    const vig = marketEfficiency - 1.0;

    // Remove vig to get true probabilities
    const homeTrueProb = homeImpliedProb / marketEfficiency;
    const awayTrueProb = awayImpliedProb / marketEfficiency;

    // Compare to our model predictions (simplified - would use actual model)
    // For now, assume market is efficient, but look for value
    const homeValue = homeTrueProb > 0.5 ? (homeTrueProb - 0.5) * 2 : 0;
    const awayValue = awayTrueProb > 0.5 ? (awayTrueProb - 0.5) * 2 : 0;

    const edge = Math.max(homeValue, awayValue) * 100;
    const confidence = Math.abs(homeTrueProb - 0.5) * 2;
    const winner = homeTrueProb > 0.5 ? gameData.homeTeam : gameData.awayTeam;

    const reasoning = `Market analysis: ${winner} has ${edge.toFixed(1)}% edge based on implied probabilities`;

    return { confidence, reasoning, winner, edge };
  }

  /**
   * Weather Impact Analysis
   */
  private weatherImpactAnalysis(gameData: GameData): {
    confidence: number;
    reasoning: string;
    winner: string;
    risk?: string;
  } {
    if (!gameData.weather) {
      return { confidence: 0.5, reasoning: 'No weather data available', winner: gameData.homeTeam };
    }

    const { temperature, conditions, windSpeed } = gameData.weather;
    let impact = 0;
    let reasoning = 'Weather conditions: ';
    let risk: string | undefined;

    // Extreme weather impacts
    if (conditions?.toLowerCase().includes('snow') || conditions?.toLowerCase().includes('rain')) {
      impact += 0.1; // Favors running game / defense
      reasoning += 'Precipitation favors ground game. ';
      risk = 'Weather conditions may affect game flow';
    }

    if (windSpeed && windSpeed > 20) {
      impact += 0.15; // Favors running game
      reasoning += `High winds (${windSpeed}mph) favor running game. `;
      if (!risk) risk = 'High winds may impact passing game';
    }

    if (temperature && temperature < 20) {
      impact += 0.05; // Slight advantage to home team
      reasoning += `Cold temperatures (${temperature}°F) may affect performance. `;
    }

    // Default: slight home advantage in bad weather
    const homeAdvantage = impact;
    const confidence = Math.min(impact * 5, 0.7);
    const winner = gameData.homeTeam; // Home team typically handles weather better

    reasoning += `Weather gives slight edge to home team.`;

    return { confidence, reasoning, winner, risk };
  }

  /**
   * Injury Impact Analysis
   */
  private injuryImpactAnalysis(gameData: GameData): {
    confidence: number;
    reasoning: string;
    winner: string;
    risk?: string;
  } {
    if (!gameData.injuries) {
      return { confidence: 0.5, reasoning: 'No injury data available', winner: gameData.homeTeam };
    }

    const { homeImpact, awayImpact } = gameData.injuries;
    const impactDiff = (awayImpact || 0) - (homeImpact || 0);

    let reasoning = 'Injury impact: ';
    let risk: string | undefined;

    if (Math.abs(impactDiff) > 0.1) {
      const affectedTeam = impactDiff > 0 ? gameData.awayTeam : gameData.homeTeam;
      const advantage = Math.abs(impactDiff);
      reasoning += `${affectedTeam} significantly impacted by injuries (${(advantage * 100).toFixed(0)}% reduction). `;
      risk = 'Key player injuries may affect game outcome';
    } else {
      reasoning += 'Injuries relatively balanced. ';
    }

    const confidence = Math.min(Math.abs(impactDiff) * 3, 0.8);
    const winner = impactDiff > 0 ? gameData.homeTeam : gameData.awayTeam;

    return { confidence, reasoning, winner, risk };
  }

  /**
   * Home Advantage Analysis
   */
  private homeAdvantageAnalysis(gameData: GameData): { confidence: number; reasoning: string; winner: string } {
    if (!gameData.teamStats?.home?.homeRecord) {
      return { confidence: 0.3, reasoning: 'Home advantage: Standard 3-point advantage', winner: gameData.homeTeam };
    }

    const homeRecord = gameData.teamStats.home.homeRecord;
    const homeWinPct = homeRecord.wins / (homeRecord.wins + homeRecord.losses);

    // Strong home teams get more advantage
    const homeAdvantage = 0.03 + (homeWinPct - 0.5) * 0.1; // 3-8% advantage
    const confidence = Math.min(homeAdvantage * 10, 0.6);
    const winner = gameData.homeTeam;

    const reasoning = `Home advantage: ${gameData.homeTeam} has ${(homeWinPct * 100).toFixed(0)}% home win rate, providing ${(homeAdvantage * 100).toFixed(1)}% advantage`;

    return { confidence, reasoning, winner };
  }

  /**
   * Momentum Analysis
   */
  private momentumAnalysis(gameData: GameData): { confidence: number; reasoning: string; winner: string } {
    if (!gameData.recentForm) {
      return { confidence: 0.5, reasoning: 'Insufficient momentum data', winner: gameData.homeTeam };
    }

    const homeForm = gameData.recentForm.home || [];
    const awayForm = gameData.recentForm.away || [];

    // Calculate momentum (recent wins weighted more)
    const homeMomentum = homeForm.slice(0, 3).reduce((sum, result, index) => {
      const weight = 3 - index; // Most recent = highest weight
      if (result === 'W') return sum + weight;
      if (result === 'L') return sum - weight;
      return sum;
    }, 0) / 6;

    const awayMomentum = awayForm.slice(0, 3).reduce((sum, result, index) => {
      const weight = 3 - index;
      if (result === 'W') return sum + weight;
      if (result === 'L') return sum - weight;
      return sum;
    }, 0) / 6;

    const momentumDiff = homeMomentum - awayMomentum;
    const confidence = Math.min(Math.abs(momentumDiff) * 0.3, 0.7);
    const winner = momentumDiff > 0 ? gameData.homeTeam : gameData.awayTeam;

    const reasoning = `Momentum: ${winner} has stronger recent momentum (${momentumDiff > 0 ? '+' : ''}${momentumDiff.toFixed(2)})`;

    return { confidence, reasoning, winner };
  }

  /**
   * Machine Learning Prediction (simplified - would use actual ML model)
   */
  private async machineLearningPrediction(gameData: GameData): Promise<{
    confidence: number;
    reasoning: string;
    winner: string;
  } | null> {
    // In production, this would use a trained ML model
    // For now, use weighted combination of historical performance

    try {
      // Get historical performance for similar games
      const stats = await getWinPercentage({
        type: 'sports',
        category: gameData.league
      });

      if (!stats || stats.total < 10) {
        return null; // Not enough data
      }

      // Adjust prediction based on historical accuracy
      const historicalAccuracy = stats.win_percentage / 100;
      const baseConfidence = 0.6;
      const adjustedConfidence = baseConfidence * historicalAccuracy;

      // Use statistical model as base, adjust with ML insights
      const statisticalPred = this.statisticalModel(gameData);
      const mlConfidence = (statisticalPred.confidence * 0.7) + (adjustedConfidence * 0.3);

      return {
        confidence: mlConfidence,
        reasoning: `ML model: Based on ${stats.total} historical predictions with ${stats.win_percentage.toFixed(1)}% accuracy`,
        winner: statisticalPred.winner
      };
    } catch (error) {
      console.warn('[PredictionEngine] ML prediction failed:', error);
      return null;
    }
  }

  /**
   * Combine all methods using weighted average
   */
  private combineMethods(
    methods: { name: string; confidence: number; weight: number }[],
    gameData: GameData
  ): { winner: string; confidence: number; score?: { home: number; away: number } } {
    // Group by predicted winner
    const homeVotes: number[] = [];
    const awayVotes: number[] = [];

    methods.forEach(method => {
      // For simplicity, assume methods predict home or away
      // In production, each method would return its prediction
      const vote = method.confidence * method.weight;

      // Simplified: assume higher confidence = home team (would be more sophisticated)
      if (method.confidence > 0.5) {
        homeVotes.push(vote);
      } else {
        awayVotes.push(vote);
      }
    });

    const homeTotal = homeVotes.reduce((sum, v) => sum + v, 0);
    const awayTotal = awayVotes.reduce((sum, v) => sum + v, 0);
    const total = homeTotal + awayTotal;

    const homeWinProb = total > 0 ? homeTotal / total : 0.5;
    const winner = homeWinProb > 0.5 ? gameData.homeTeam : gameData.awayTeam;
    const confidence = Math.abs(homeWinProb - 0.5) * 2;

    // Predict score (simplified)
    const score = this.predictScore(gameData, homeWinProb);

    return { winner, confidence, score };
  }

  /**
   * Predict game score
   */
  private predictScore(gameData: GameData, homeWinProb: number): { home: number; away: number } {
    if (!gameData.teamStats) {
      return { home: 24, away: 21 };
    }

    const { home, away } = gameData.teamStats;
    const avgHomeScore = home.recentAvgPoints || 24;
    const avgAwayScore = away.recentAvgPoints || 22;
    const avgHomeAllowed = home.recentAvgAllowed || 21;
    const avgAwayAllowed = away.recentAvgAllowed || 24;

    // Expected points = (own offense + opponent defense) / 2
    const homeExpected = (avgHomeScore + avgAwayAllowed) / 2;
    const awayExpected = (avgAwayScore + avgHomeAllowed) / 2;

    // Adjust based on win probability
    const homeScore = homeExpected + (homeWinProb - 0.5) * 4;
    const awayScore = awayExpected - (homeWinProb - 0.5) * 4;

    return {
      home: Math.round(homeScore),
      away: Math.round(awayScore)
    };
  }

  /**
   * Calculate expected value edge
   */
  private calculateEdge(gameData: GameData, result: { winner: string; confidence: number }): number {
    const { odds } = gameData;
    const isHomeWinner = result.winner === gameData.homeTeam;

    const impliedProb = isHomeWinner
      ? this.americanToImplied(odds.home)
      : this.americanToImplied(odds.away);

    const modelProb = result.confidence;
    const edge = (modelProb - impliedProb) * 100;

    return edge;
  }

  /**
   * Generate bet recommendation
   */
  private generateBetRecommendation(
    gameData: GameData,
    result: { winner: string; confidence: number },
    edge: number,
    forceMoneyline: boolean = false
  ): { type: 'moneyline' | 'spread' | 'total'; side: string; value: number; confidence: number } | undefined {
    if (edge < 2) {
      return undefined; // Not enough edge
    }

    const isHomeWinner = result.winner === gameData.homeTeam;
    const side = isHomeWinner ? gameData.homeTeam : gameData.awayTeam;

    // For Kalshi games, always use moneyline (outright winner)
    // For regular games, use probability-based logic
    const betType = forceMoneyline || result.confidence <= 0.65 ? 'moneyline' : 'spread';
    const value = isHomeWinner ? gameData.odds.home : gameData.odds.away;

    return {
      type: betType,
      side,
      value,
      confidence: result.confidence
    };
  }

  /**
   * Convert American odds to implied probability
   */
  private americanToImplied(odds: number): number {
    if (odds > 0) {
      return 100 / (odds + 100);
    } else {
      return Math.abs(odds) / (Math.abs(odds) + 100);
    }
  }

  /**
   * Learn from results - update method weights based on performance
   */
  async learnFromResult(
    predictionId: string,
    actualOutcome: 'correct' | 'incorrect' | 'partial',
    methods: { name: string; confidence: number; weight: number }[]
  ): Promise<void> {
    const accuracy = actualOutcome === 'correct' ? 1.0 : actualOutcome === 'partial' ? 0.5 : 0.0;

    // Update method performance
    methods.forEach(method => {
      const perf = this.methodPerformance.get(method.name) || { correct: 0, total: 0, avgAccuracy: 0 };
      perf.total += 1;
      if (actualOutcome === 'correct') perf.correct += 1;

      // Update average accuracy
      perf.avgAccuracy = (perf.avgAccuracy * (perf.total - 1) + accuracy) / perf.total;

      this.methodPerformance.set(method.name, perf);

      // Adjust weight based on performance
      const performanceRatio = perf.avgAccuracy;
      const currentWeight = this.learningWeights.get(method.name) || 1.0;
      const newWeight = currentWeight * (0.9 + performanceRatio * 0.2); // Adjust by ±10%

      this.learningWeights.set(method.name, Math.max(0.5, Math.min(2.0, newWeight))); // Clamp between 0.5 and 2.0
    });

    // Store learning data for weekly analysis
    this.weeklyLearningData.push({
      method: methods.map(m => m.name).join(','),
      confidence: methods.reduce((sum, m) => sum + m.confidence, 0) / methods.length,
      actualOutcome,
      accuracy,
      timestamp: new Date().toISOString()
    });

    // Record outcome in database
    await recordOutcome(predictionId, {
      status: actualOutcome,
      outcome_data: { methods, accuracy },
      is_correct: actualOutcome === 'correct',
      accuracy_score: accuracy * 100,
      confidence_accuracy: accuracy
    });
  }

  /**
   * Weekly learning cycle - analyze past week's performance and adjust
   */
  async weeklyLearningCycle(): Promise<void> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Get all predictions from past week
    const stats = await getWinPercentage({
      startDate: oneWeekAgo.toISOString(),
      endDate: new Date().toISOString()
    });

    if (!stats || stats.total === 0) {
      console.log('[PredictionEngine] No data for weekly learning cycle');
      return;
    }

    // Analyze performance by method
    const methodStats = new Map<string, { correct: number; total: number; avgConfidence: number }>();

    this.weeklyLearningData.forEach(data => {
      const methods = data.method.split(',');
      methods.forEach(method => {
        const stat = methodStats.get(method) || { correct: 0, total: 0, avgConfidence: 0 };
        stat.total += 1;
        if (data.actualOutcome === 'correct') stat.correct += 1;
        stat.avgConfidence = (stat.avgConfidence * (stat.total - 1) + data.confidence) / stat.total;
        methodStats.set(method, stat);
      });
    });

    // Adjust weights based on weekly performance
    methodStats.forEach((stat, method) => {
      const winRate = stat.total > 0 ? stat.correct / stat.total : 0.5;
      const currentWeight = this.learningWeights.get(method) || 1.0;

      // Adjust weight: better performance = higher weight
      const adjustment = (winRate - 0.5) * 0.2; // ±10% adjustment
      const newWeight = currentWeight * (1 + adjustment);

      this.learningWeights.set(method, Math.max(0.5, Math.min(2.0, newWeight)));

      console.log(`[PredictionEngine] ${method}: ${(winRate * 100).toFixed(1)}% win rate, weight adjusted to ${newWeight.toFixed(2)}`);
    });

    // Clear weekly data for next cycle
    this.weeklyLearningData = [];

    console.log(`[PredictionEngine] Weekly learning cycle complete. Overall: ${stats.win_percentage.toFixed(1)}% win rate`);
  }

  /**
   * Get current method weights (for debugging/monitoring)
   */
  getMethodWeights(): Map<string, number> {
    return this.learningWeights;
  }

  /**
   * Set method weight (for tuning)
   */
  setMethodWeight(method: string, weight: number): void {
    this.learningWeights.set(method, Math.max(0.1, Math.min(3.0, weight)));
  }

  /**
   * Set all method weights (for tuning)
   */
  setMethodWeights(weights: Map<string, number>): void {
    weights.forEach((weight, method) => {
      this.setMethodWeight(method, weight);
    });
  }

  /**
   * Get method performance stats
   */
  getMethodPerformance(): Map<string, { correct: number; total: number; avgAccuracy: number }> {
    return new Map(this.methodPerformance);
  }

  /**
   * Poisson Distribution - For Total Score Predictions
   * Uses Poisson distribution to predict game totals based on team scoring rates
   */
  private poissonDistribution(gameData: GameData): {
    confidence: number;
    reasoning: string;
    winner: string;
    predictedTotal?: number;
  } {
    if (!gameData.teamStats || !gameData.odds.total) {
      return { confidence: 0.5, reasoning: 'Insufficient data for Poisson distribution', winner: gameData.homeTeam };
    }

    const { home, away } = gameData.teamStats;

    // Calculate expected goals/points per game (lambda)
    const homeLambda = home.recentAvgPoints || (home.pointsFor / (home.wins + home.losses)) || 20;
    const awayLambda = away.recentAvgPoints || (away.pointsFor / (away.wins + away.losses)) || 20;

    // Adjust for defensive ratings
    const homeDefense = away.recentAvgAllowed || (away.pointsAgainst / (away.wins + away.losses)) || 20;
    const awayDefense = home.recentAvgAllowed || (home.pointsAgainst / (home.wins + home.losses)) || 20;

    // Adjusted lambdas (offense vs opponent defense)
    const adjustedHomeLambda = (homeLambda * 0.7) + (homeLambda * (1 - (homeDefense / 30)) * 0.3);
    const adjustedAwayLambda = (awayLambda * 0.7) + (awayLambda * (1 - (awayDefense / 30)) * 0.3);

    // Expected total
    const expectedTotal = adjustedHomeLambda + adjustedAwayLambda;

    // Calculate probability of over/under using Poisson
    const overProb = this.poissonProbabilityOver(expectedTotal, gameData.odds.total);
    const underProb = 1 - overProb;

    // Confidence based on how far from 50/50
    const confidence = Math.abs(overProb - 0.5) * 2;

    // Determine if we favor over or under
    const favorsOver = overProb > 0.5;
    const reasoning = `Poisson distribution: Expected total ${expectedTotal.toFixed(1)} points. ${(Math.max(overProb, underProb) * 100).toFixed(1)}% probability ${favorsOver ? 'over' : 'under'} ${gameData.odds.total}`;

    return {
      confidence,
      reasoning,
      winner: gameData.homeTeam, // Winner doesn't apply to totals, but required by interface
      predictedTotal: expectedTotal
    };
  }

  /**
   * Calculate probability of going over a total using Poisson distribution
   */
  private poissonProbabilityOver(lambda: number, total: number): number {
    // Use Poisson CDF approximation
    // P(X > total) = 1 - P(X <= total)
    let cumulative = 0;
    for (let k = 0; k <= Math.floor(total); k++) {
      cumulative += Math.pow(lambda, k) * Math.exp(-lambda) / this.factorial(k);
    }
    return 1 - cumulative;
  }

  /**
   * Factorial helper for Poisson
   */
  private factorial(n: number): number {
    if (n <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  }

  /**
   * Regression Model - Factor in Historical Trends
   * Uses linear regression to identify trends in team performance
   */
  private async regressionModel(gameData: GameData): Promise<{
    confidence: number;
    reasoning: string;
    winner: string;
  } | null> {
    if (!gameData.teamStats) {
      return null;
    }

    const { home, away } = gameData.teamStats;

    // Simple linear regression on recent performance
    // Trend = (recentAvg - seasonAvg) / games
    const homeRecentAvg = home.recentAvgPoints || 0;
    const awayRecentAvg = away.recentAvgPoints || 0;

    const homeSeasonAvg = home.pointsFor / (home.wins + home.losses) || 0;
    const awaySeasonAvg = away.pointsFor / (away.wins + away.losses) || 0;

    // Calculate trend (positive = improving, negative = declining)
    const homeTrend = homeRecentAvg - homeSeasonAvg;
    const awayTrend = awayRecentAvg - awaySeasonAvg;

    // Trend strength (how significant is the change)
    const homeTrendStrength = Math.abs(homeTrend) / Math.max(homeSeasonAvg, 1);
    const awayTrendStrength = Math.abs(awayTrend) / Math.max(awaySeasonAvg, 1);

    // Combine trend with current strength
    const homeStrength = (homeSeasonAvg * 0.6) + (homeRecentAvg * 0.4) + (homeTrend * 0.2);
    const awayStrength = (awaySeasonAvg * 0.6) + (awayRecentAvg * 0.4) + (awayTrend * 0.2);

    const homeWinProb = homeStrength / (homeStrength + awayStrength);
    const confidence = Math.min(Math.abs(homeWinProb - 0.5) * 2, 0.8);
    const winner = homeWinProb > 0.5 ? gameData.homeTeam : gameData.awayTeam;

    const homeTrendDesc = homeTrend > 0 ? 'improving' : homeTrend < 0 ? 'declining' : 'stable';
    const awayTrendDesc = awayTrend > 0 ? 'improving' : awayTrend < 0 ? 'declining' : 'stable';

    const reasoning = `Regression model: ${winner} favored. Home team ${homeTrendDesc} (${homeTrend > 0 ? '+' : ''}${homeTrend.toFixed(1)}), Away team ${awayTrendDesc} (${awayTrend > 0 ? '+' : ''}${awayTrend.toFixed(1)})`;

    return { confidence, reasoning, winner };
  }

  /**
   * Bayesian Update - Learn from Past Predictions
   * Updates prior beliefs based on historical prediction accuracy
   */
  private async bayesianUpdate(gameData: GameData): Promise<{
    confidence: number;
    reasoning: string;
    winner: string;
  } | null> {
    try {
      // Get historical win percentage for similar games
      const historicalStats = await getWinPercentage({
        type: 'sports',
        category: gameData.league || gameData.sport
      });

      if (!historicalStats || historicalStats.total < 10) {
        return null; // Need at least 10 historical predictions
      }

      // Prior probability (from our model)
      const priorProb = 0.5; // Start with 50/50

      // Likelihood (historical accuracy for this type of game)
      const historicalAccuracy = historicalStats.win_percentage / 100;

      // Bayesian update: P(A|B) = P(B|A) * P(A) / P(B)
      // Simplified: posterior = (likelihood * prior) / evidence
      const evidence = (historicalAccuracy * priorProb) + ((1 - historicalAccuracy) * (1 - priorProb));
      const posteriorProb = (historicalAccuracy * priorProb) / evidence;

      // Adjust confidence based on historical performance
      const confidence = Math.min(posteriorProb * 2, 0.9); // Cap at 90%

      // Determine winner based on team stats (simplified)
      let winner = gameData.homeTeam;
      if (gameData.teamStats) {
        const homeStrength = gameData.teamStats.home.wins / (gameData.teamStats.home.wins + gameData.teamStats.home.losses);
        const awayStrength = gameData.teamStats.away.wins / (gameData.teamStats.away.wins + gameData.teamStats.away.losses);
        winner = homeStrength > awayStrength ? gameData.homeTeam : gameData.awayTeam;
      }

      const reasoning = `Bayesian update: Historical accuracy ${(historicalAccuracy * 100).toFixed(1)}% for ${gameData.league || gameData.sport}. Posterior probability adjusted to ${(posteriorProb * 100).toFixed(1)}%`;

      return { confidence, reasoning, winner };
    } catch (error) {
      console.warn('[PredictionEngine] Bayesian update failed:', error);
      return null;
    }
  }

  /**
   * Enhanced Monte Carlo Simulation
   * Run 10,000 game simulations for robust predictions
   */
  async monteCarloSimulation(
    gameData: GameData,
    iterations: number = 10000
  ): Promise<{
    winRate: number;
    confidence: number;
    averageScore: { home: number; away: number };
    stdDev: number;
    iterations: number;
  }> {
    if (!gameData.teamStats) {
      throw new Error('Team stats required for Monte Carlo simulation');
    }

    const { home, away } = gameData.teamStats;

    // Base scoring rates
    const homeOffense = home.recentAvgPoints || (home.pointsFor / (home.wins + home.losses)) || 20;
    const awayOffense = away.recentAvgPoints || (away.pointsFor / (away.wins + away.losses)) || 20;
    const homeDefense = home.recentAvgAllowed || (home.pointsAgainst / (home.wins + home.losses)) || 20;
    const awayDefense = away.recentAvgAllowed || (away.pointsAgainst / (away.wins + away.losses)) || 20;

    let homeWins = 0;
    let totalHomeScore = 0;
    let totalAwayScore = 0;
    const homeScores: number[] = [];
    const awayScores: number[] = [];

    // Run simulations
    for (let i = 0; i < iterations; i++) {
      // Simulate scores using normal distribution around expected values
      // Offense vs opponent defense
      const expectedHomeScore = (homeOffense * 0.6) + (homeOffense * (1 - (awayDefense / 30)) * 0.4);
      const expectedAwayScore = (awayOffense * 0.6) + (awayOffense * (1 - (homeDefense / 30)) * 0.4);

      // Add randomness (standard deviation ~10% of expected)
      const homeScore = Math.max(0, this.normalRandom(expectedHomeScore, expectedHomeScore * 0.1));
      const awayScore = Math.max(0, this.normalRandom(expectedAwayScore, expectedAwayScore * 0.1));

      homeScores.push(homeScore);
      awayScores.push(awayScore);
      totalHomeScore += homeScore;
      totalAwayScore += awayScore;

      if (homeScore > awayScore) {
        homeWins++;
      }
    }

    // Calculate statistics
    const winRate = homeWins / iterations;
    const avgHomeScore = totalHomeScore / iterations;
    const avgAwayScore = totalAwayScore / iterations;

    // Calculate standard deviation
    const homeVariance = homeScores.reduce((sum, score) => sum + Math.pow(score - avgHomeScore, 2), 0) / iterations;
    const awayVariance = awayScores.reduce((sum, score) => sum + Math.pow(score - avgAwayScore, 2), 0) / iterations;
    const stdDev = Math.sqrt((homeVariance + awayVariance) / 2);

    // Confidence based on win rate distance from 50%
    const confidence = Math.abs(winRate - 0.5) * 2;

    return {
      winRate,
      confidence,
      averageScore: {
        home: avgHomeScore,
        away: avgAwayScore
      },
      stdDev,
      iterations
    };
  }

  /**
   * Generate random number from normal distribution (Box-Muller transform)
   */
  private normalRandom(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  /**
   * Enhanced ELO Rating System - Track Team Strength Over Time
   * Maintains ELO ratings that update based on game results
   */
  private eloRatingEnhanced(gameData: GameData): {
    confidence: number;
    reasoning: string;
    winner: string;
    eloRatings: { home: number; away: number };
  } {
    if (!gameData.teamStats) {
      return {
        confidence: 0.5,
        reasoning: 'Insufficient data for ELO rating',
        winner: gameData.homeTeam,
        eloRatings: { home: 1500, away: 1500 }
      };
    }

    const { home, away } = gameData.teamStats;

    // Calculate base ELO from win percentage
    const homeWinPct = home.wins / (home.wins + home.losses);
    const awayWinPct = away.wins / (away.wins + away.losses);

    // Base ELO (1500 is average)
    let homeELO = 1500 + (homeWinPct - 0.5) * 400;
    let awayELO = 1500 + (awayWinPct - 0.5) * 400;

    // Adjust for recent form (recent games weighted more)
    if (home.recentAvgPoints && away.recentAvgPoints) {
      const homeRecentStrength = (home.recentAvgPoints / (home.recentAvgPoints + away.recentAvgAllowed)) || 0.5;
      const awayRecentStrength = (away.recentAvgPoints / (away.recentAvgPoints + home.recentAvgAllowed)) || 0.5;

      // Blend base ELO with recent form (70% base, 30% recent)
      homeELO = (homeELO * 0.7) + (1500 + (homeRecentStrength - 0.5) * 400) * 0.3;
      awayELO = (awayELO * 0.7) + (1500 + (awayRecentStrength - 0.5) * 400) * 0.3;
    }

    // Home advantage (typically +50 ELO points)
    const homeAdvantage = 50;
    const adjustedHomeELO = homeELO + homeAdvantage;

    // ELO difference
    const eloDiff = adjustedHomeELO - awayELO;

    // Win probability from ELO difference
    // Formula: P = 1 / (1 + 10^(-diff/400))
    const homeWinProb = 1 / (1 + Math.pow(10, -eloDiff / 400));
    const confidence = Math.abs(homeWinProb - 0.5) * 2;
    const winner = homeWinProb > 0.5 ? gameData.homeTeam : gameData.awayTeam;

    const reasoning = `Enhanced ELO: ${winner} favored (${adjustedHomeELO.toFixed(0)} vs ${awayELO.toFixed(0)}) with ${(homeWinProb * 100).toFixed(1)}% win probability. ELO difference: ${eloDiff > 0 ? '+' : ''}${eloDiff.toFixed(0)}`;

    return {
      confidence,
      reasoning,
      winner,
      eloRatings: {
        home: adjustedHomeELO,
        away: awayELO
      }
    };
  }
}

// Export singleton instance
export const predictionEngine = new PredictionEngine();

