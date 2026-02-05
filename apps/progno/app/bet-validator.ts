// Bet Validator Module for Progno Sports Prediction Platform

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  confidence: number;
}

export interface BetInput {
  game: string;
  betType: 'moneyline' | 'spread' | 'total' | 'prop';
  amount: number;
  odds: number;
  selection: string;
}

// Validate bet input
export function validateBet(bet: BetInput): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let confidence = 1.0;

  // Validate game
  if (!bet.game || bet.game.trim().length === 0) {
    errors.push('Game selection is required');
    confidence -= 0.3;
  }

  // Validate bet type
  const validBetTypes = ['moneyline', 'spread', 'total', 'prop'];
  if (!validBetTypes.includes(bet.betType)) {
    errors.push('Invalid bet type');
    confidence -= 0.2;
  }

  // Validate amount
  if (bet.amount <= 0) {
    errors.push('Bet amount must be greater than 0');
    confidence -= 0.3;
  } else if (bet.amount > 10000) {
    warnings.push('Large bet amount - consider bankroll management');
    confidence -= 0.1;
  } else if (bet.amount < 10) {
    warnings.push('Small bet amount - may not be worth the risk');
    confidence -= 0.05;
  }

  // Validate odds
  if (bet.odds <= -10000 || bet.odds >= 10000) {
    errors.push('Odds outside reasonable range');
    confidence -= 0.2;
  } else if (Math.abs(bet.odds) < 100) {
    warnings.push('Very favorable odds - verify accuracy');
    confidence -= 0.1;
  }

  // Validate selection
  if (!bet.selection || bet.selection.trim().length === 0) {
    errors.push('Selection is required');
    confidence -= 0.2;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    confidence: Math.max(0, confidence)
  };
}

// Validate multiple bets
export function validateMultipleBets(bets: BetInput[]): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  let totalConfidence = 0;

  bets.forEach((bet, index) => {
    const result = validateBet(bet);
    allErrors.push(...result.errors.map(error => `Bet ${index + 1}: ${error}`));
    allWarnings.push(...result.warnings.map(warning => `Bet ${index + 1}: ${warning}`));
    totalConfidence += result.confidence;
  });

  // Check for duplicate games
  const gameNames = bets.map(bet => bet.game.toLowerCase().trim());
  const duplicates = gameNames.filter((game, index) => gameNames.indexOf(game) !== index);
  if (duplicates.length > 0) {
    allWarnings.push('Duplicate games detected - consider consolidating');
    totalConfidence -= 0.1;
  }

  // Check total exposure
  const totalAmount = bets.reduce((sum, bet) => sum + bet.amount, 0);
  if (totalAmount > 1000) {
    allWarnings.push('High total exposure - review bankroll management');
    totalConfidence -= 0.1;
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    confidence: bets.length > 0 ? Math.max(0, totalConfidence / bets.length) : 0
  };
}

// Validate parlay bet
export function validateParlay(bets: BetInput[]): ValidationResult {
  const baseValidation = validateMultipleBets(bets);

  if (!baseValidation.isValid) {
    return baseValidation;
  }

  const warnings = [...baseValidation.warnings];
  let confidence = baseValidation.confidence;

  // Parlay-specific validations
  if (bets.length < 2) {
    baseValidation.errors.push('Parlay must have at least 2 bets');
    baseValidation.isValid = false;
    confidence -= 0.3;
  }

  if (bets.length > 10) {
    warnings.push('Large parlay - very low probability of success');
    confidence -= 0.2;
  }

  // Check for correlated outcomes
  const hasCorrelatedBets = checkForCorrelatedBets(bets);
  if (hasCorrelatedBets) {
    warnings.push('Potentially correlated bets - parlay may not be allowed');
    confidence -= 0.15;
  }

  return {
    ...baseValidation,
    warnings,
    confidence: Math.max(0, confidence)
  };
}

// Check for correlated bets (simplified)
function checkForCorrelatedBets(bets: BetInput[]): boolean {
  // This is a simplified check - in reality, you'd need more sophisticated logic
  const games = bets.map(bet => bet.game.toLowerCase().trim());
  const uniqueGames = [...new Set(games)];

  // If multiple bets on the same game, they might be correlated
  return games.length !== uniqueGames.length;
}

// Calculate bet recommendation
export function getBetRecommendation(bet: BetInput): {
  action: 'bet' | 'avoid' | 'caution';
  reasoning: string;
  confidence: number;
} {
  const validation = validateBet(bet);

  if (!validation.isValid) {
    return {
      action: 'avoid',
      reasoning: validation.errors.join('; '),
      confidence: 0
    };
  }

  if (validation.confidence >= 0.8) {
    return {
      action: 'bet',
      reasoning: 'Strong validation score with minimal warnings',
      confidence: validation.confidence
    };
  } else if (validation.confidence >= 0.6) {
    return {
      action: 'caution',
      reasoning: validation.warnings.join('; '),
      confidence: validation.confidence
    };
  } else {
    return {
      action: 'avoid',
      reasoning: 'Low confidence due to multiple factors',
      confidence: validation.confidence
    };
  }
}
