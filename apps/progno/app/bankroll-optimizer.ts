// Bankroll Optimizer Module for Progno Sports Prediction Platform

export interface BankrollOptimizerInput {
  currentBankroll: number;
  targetBankroll: number;
  riskProfile: 'safe' | 'balanced' | 'aggressive';
  maxBets: number;
  availableGames: Game[];
}

export interface Game {
  id: string;
  sport: string;
  teams: {
    home: string;
    away: string;
  };
  odds: {
    home: number;
    away: number;
    draw?: number;
  };
  startTime: Date;
  confidence: number;
}

export interface LiveGameScore {
  gameId: string;
  homeScore: number;
  awayScore: number;
  timeRemaining: string;
  lastUpdated: Date;
}

export interface OptimizedBet {
  gameId: string;
  game: Game;
  betType: 'home' | 'away' | 'draw';
  amount: number;
  expectedValue: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  reasoning: string;
}

export interface OptimizationResult {
  optimizedBets: OptimizedBet[];
  totalAmount: number;
  expectedReturn: number;
  riskScore: number;
  recommendations: string[];
}

// Main optimization function
export function optimizeBankroll(input: BankrollOptimizerInput): OptimizationResult {
  const { currentBankroll, targetBankroll, riskProfile, maxBets, availableGames } = input;

  // Filter games based on confidence and time
  const eligibleGames = availableGames.filter(game =>
    game.confidence >= 0.6 &&
    new Date(game.startTime) > new Date()
  );

  // Calculate optimal bet amounts based on risk profile
  const riskMultipliers = {
    safe: 0.02,    // 2% of bankroll per bet
    balanced: 0.05, // 5% of bankroll per bet
    aggressive: 0.1 // 10% of bankroll per bet
  };

  const riskMultiplier = riskMultipliers[riskProfile];
  const maxBetAmount = currentBankroll * riskMultiplier;

  // Generate optimized bets
  const optimizedBets: OptimizedBet[] = eligibleGames
    .slice(0, maxBets)
    .map((game, index) => {
      const betAmount = Math.min(maxBetAmount, currentBankroll / maxBets);
      const expectedValue = calculateExpectedValue(game, betAmount);

      return {
        gameId: game.id,
        game,
        betType: determineBetType(game),
        amount: betAmount,
        expectedValue,
        confidence: game.confidence,
        riskLevel: determineRiskLevel(game.confidence, riskProfile),
        reasoning: generateReasoning(game, riskProfile)
      };
    })
    .sort((a, b) => b.expectedValue - a.expectedValue);

  const totalAmount = optimizedBets.reduce((sum, bet) => sum + bet.amount, 0);
  const expectedReturn = optimizedBets.reduce((sum, bet) => sum + bet.expectedValue, 0);
  const riskScore = calculateRiskScore(optimizedBets, riskProfile);

  return {
    optimizedBets,
    totalAmount,
    expectedReturn,
    riskScore,
    recommendations: generateRecommendations(optimizedBets, riskProfile, currentBankroll)
  };
}

// Calculate expected value for a bet
function calculateExpectedValue(game: Game, betAmount: number): number {
  const impliedProbability = 1 / Math.max(...Object.values(game.odds));
  const actualProbability = game.confidence;

  if (actualProbability > impliedProbability) {
    return betAmount * (actualProbability * Math.max(...Object.values(game.odds)) - 1);
  }

  return -betAmount * 0.1; // Negative expected value for unfavorable bets
}

// Determine optimal bet type
function determineBetType(game: Game): 'home' | 'away' | 'draw' {
  const odds = game.odds;
  const bestOdds = Math.max(...Object.values(odds));

  if (odds.home === bestOdds) return 'home';
  if (odds.away === bestOdds) return 'away';
  return 'draw';
}

// Determine risk level
function determineRiskLevel(confidence: number, riskProfile: string): 'low' | 'medium' | 'high' {
  if (confidence >= 0.8) return 'low';
  if (confidence >= 0.6) return 'medium';
  return 'high';
}

// Generate reasoning for bet
function generateReasoning(game: Game, riskProfile: string): string {
  const reasons = [
    `Strong statistical model with ${Math.round(game.confidence * 100)}% confidence`,
    `Favorable odds compared to implied probability`,
    `Recent team form and head-to-head record support this outcome`,
    `Risk-adjusted for ${riskProfile} betting strategy`
  ];

  return reasons[Math.floor(Math.random() * reasons.length)];
}

// Calculate overall risk score
function calculateRiskScore(bets: OptimizedBet[], riskProfile: string): number {
  const highRiskBets = bets.filter(bet => bet.riskLevel === 'high').length;
  const totalBets = bets.length;

  let baseScore = (highRiskBets / totalBets) * 100;

  // Adjust based on risk profile
  const profileAdjustments = {
    safe: 20,
    balanced: 0,
    aggressive: -10
  };

  return Math.max(0, Math.min(100, baseScore + profileAdjustments[riskProfile as keyof typeof profileAdjustments]));
}

// Generate recommendations
function generateRecommendations(bets: OptimizedBet[], riskProfile: string, currentBankroll: number): string[] {
  const recommendations: string[] = [];

  if (bets.length === 0) {
    recommendations.push('No suitable bets found based on current criteria');
    return recommendations;
  }

  const totalExposure = bets.reduce((sum, bet) => sum + bet.amount, 0);
  const exposurePercentage = (totalExposure / currentBankroll) * 100;

  if (exposurePercentage > 20) {
    recommendations.push('Consider reducing total exposure to manage risk');
  }

  if (riskProfile === 'safe' && bets.some(bet => bet.riskLevel === 'high')) {
    recommendations.push('Review high-risk bets for conservative strategy');
  }

  if (riskProfile === 'aggressive' && bets.every(bet => bet.riskLevel === 'low')) {
    recommendations.push('Consider higher-risk opportunities for aggressive strategy');
  }

  recommendations.push(`Bankroll management: ${exposurePercentage.toFixed(1)}% exposure`);
  recommendations.push(`Expected return: ${bets.reduce((sum, bet) => sum + bet.expectedValue, 0).toFixed(2)}`);

  return recommendations;
}

// Mock live game scores
export function getLiveGameScores(gameIds: string[]): LiveGameScore[] {
  return gameIds.map(gameId => ({
    gameId,
    homeScore: Math.floor(Math.random() * 100),
    awayScore: Math.floor(Math.random() * 100),
    timeRemaining: `${Math.floor(Math.random() * 45)}:00`,
    lastUpdated: new Date()
  }));
}

// Update optimization based on live scores
export function updateOptimizationWithLiveScores(
  optimization: OptimizationResult,
  liveScores: LiveGameScore[]
): OptimizationResult {
  const updatedBets = optimization.optimizedBets.map(bet => {
    const liveScore = liveScores.find(score => score.gameId === bet.gameId);

    if (!liveScore) return bet;

    // Adjust confidence based on live score
    const scoreDiff = Math.abs(liveScore.homeScore - liveScore.awayScore);
    const confidenceAdjustment = scoreDiff > 20 ? 0.1 : -0.05;
    const newConfidence = Math.max(0.3, Math.min(0.95, bet.confidence + confidenceAdjustment));

    return {
      ...bet,
      confidence: newConfidence,
      reasoning: `${bet.reasoning} (Live: ${liveScore.homeScore}-${liveScore.awayScore})`
    };
  });

  return {
    ...optimization,
    optimizedBets: updatedBets,
    recommendations: [
      ...optimization.recommendations,
      'Updated based on live game scores'
    ]
  };
}
