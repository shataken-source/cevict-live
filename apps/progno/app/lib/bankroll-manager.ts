/**
 * Bankroll Management Utilities
 * Calculates optimal bet sizes using Kelly Criterion and other factors
 */

export interface BetSizeParams {
  bankroll: number;
  confidence: number; // 0-1
  edge: number; // Edge percentage (e.g., 5.0 = 5%)
  quality: number; // Quality score (0-1)
  odds: number; // American odds (e.g., -110)
  riskProfile: 'conservative' | 'balanced' | 'aggressive';
  minBet?: number;
  maxBetPercent?: number; // Max percentage of bankroll per bet (default 5%)
}

/**
 * Calculate optimal bet size using Kelly Criterion
 * Returns recommended wager amount in dollars
 */
export function calculateOptimalBetSize(params: BetSizeParams): {
  recommendedWager: number;
  kellyFraction: number;
  method: string;
  reasoning: string;
} {
  const {
    bankroll,
    confidence,
    edge,
    quality,
    odds,
    riskProfile,
    minBet = 10,
    maxBetPercent = 10, // Increased from 5% to 10% to allow more variation
  } = params;

  // Convert American odds to decimal odds
  const decimalOdds = americanToDecimal(odds);
  const b = decimalOdds - 1; // Net odds received on win

  // Kelly Criterion: f = (bp - q) / b
  // Where p = probability of winning, q = 1 - p
  const p = confidence; // Use confidence as probability
  const q = 1 - p;

  // Calculate raw Kelly fraction
  let kellyFraction = (b * p - q) / b;

  // Adjust Kelly based on edge (positive edge increases bet size)
  // More conservative: only boost up to 30% for very high edge
  const edgeMultiplier = 1 + Math.min(0.3, (edge / 100) * 0.3); // Up to 30% boost for high edge
  kellyFraction *= edgeMultiplier;

  // Adjust based on quality score (higher quality = more confidence in bet)
  // More conservative: quality multiplier ranges from 0.6-0.9
  const qualityMultiplier = 0.6 + (quality * 0.3); // 0.6-0.9 multiplier
  kellyFraction *= qualityMultiplier;

  // Apply confidence adjustment (higher confidence = slightly more bet, but conservative)
  const confidenceMultiplier = 0.8 + (confidence * 0.2); // 0.8-1.0 multiplier
  kellyFraction *= confidenceMultiplier;

  // Apply risk profile (fractional Kelly)
  // More conservative multipliers to prevent over-betting
  const riskMultipliers = {
    conservative: 0.2,  // 20% of Kelly (very conservative)
    balanced: 0.4,      // 40% of Kelly (moderate)
    aggressive: 0.6,    // 60% of Kelly (aggressive but still safe)
  };
  kellyFraction *= riskMultipliers[riskProfile];

  // Ensure Kelly is positive (only bet if we have edge)
  if (kellyFraction <= 0) {
    return {
      recommendedWager: 0,
      kellyFraction: 0,
      method: 'No Bet',
      reasoning: 'Negative or zero Kelly - no edge detected. Do not bet.',
    };
  }

  // Cap Kelly at maximum bet percentage
  // But also apply a dynamic cap based on confidence (lower confidence = lower cap)
  const confidenceBasedCap = (maxBetPercent / 100) * (0.5 + confidence * 0.5); // 50-100% of max based on confidence
  const maxKelly = Math.min(maxBetPercent / 100, confidenceBasedCap);
  kellyFraction = Math.min(kellyFraction, maxKelly);

  // Calculate recommended wager
  let recommendedWager = bankroll * kellyFraction;

  // Apply minimum bet
  if (recommendedWager < minBet && kellyFraction > 0) {
    recommendedWager = minBet;
  }

  // Round to nearest dollar
  recommendedWager = Math.round(recommendedWager);

  // Don't exceed bankroll
  recommendedWager = Math.min(recommendedWager, bankroll);

  // Generate reasoning
  const kellyPercent = (kellyFraction * 100).toFixed(2);
  const reasoning = `Kelly: ${kellyPercent}% | Edge: ${edge > 0 ? '+' : ''}${edge.toFixed(2)}% | Quality: ${(quality * 100).toFixed(0)}% | Risk: ${riskProfile}`;

  return {
    recommendedWager,
    kellyFraction,
    method: 'Kelly Criterion (Fractional)',
    reasoning,
  };
}

/**
 * Convert American odds to decimal odds
 */
function americanToDecimal(americanOdds: number): number {
  if (americanOdds > 0) {
    return (americanOdds / 100) + 1;
  } else {
    return (100 / Math.abs(americanOdds)) + 1;
  }
}

/**
 * Calculate expected value of a bet
 */
export function calculateExpectedValue(
  wager: number,
  confidence: number,
  odds: number
): number {
  const decimalOdds = americanToDecimal(odds);
  const winAmount = wager * (decimalOdds - 1);
  const lossAmount = wager;

  const ev = (confidence * winAmount) - ((1 - confidence) * lossAmount);
  return ev;
}

/**
 * Calculate potential return on investment
 */
export function calculateROI(
  wager: number,
  confidence: number,
  odds: number
): number {
  const ev = calculateExpectedValue(wager, confidence, odds);
  return (ev / wager) * 100;
}

