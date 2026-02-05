/**
 * Utility functions for predictions
 */

/**
 * Calculate confidence from American odds
 */
export function calculateConfidenceFromOdds(homeOdds: number, awayOdds: number): number {
  const homeProb = homeOdds > 0
    ? 100 / (homeOdds + 100)
    : Math.abs(homeOdds) / (Math.abs(homeOdds) + 100);
  
  const awayProb = awayOdds > 0
    ? 100 / (awayOdds + 100)
    : Math.abs(awayOdds) / (Math.abs(awayOdds) + 100);
  
  const total = homeProb + awayProb;
  return homeProb / total; // Return home team probability
}

/**
 * Simple hash function for strings
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Seeded random number generator v2
 */
export function seededRandomV2(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return (value * 100).toFixed(decimals) + '%';
}

/**
 * Calculate Kelly Criterion bet size
 */
export function kellyBetSize(edge: number, odds: number, fraction: number = 0.25): number {
  const decimalOdds = odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1;
  const kelly = (edge * decimalOdds - (1 - edge)) / (decimalOdds - 1);
  return Math.max(0, kelly * fraction);
}

