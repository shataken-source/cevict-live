/**
 * Teaser Probability Calculator
 * Calculates the probability of winning teaser bets based on historical data
 * 
 * Teaser logic: moving spread in your favor reduces variance, increases win rate
 * Key insight: teasers are parlays where you buy points - value depends on crossing key numbers
 */

export interface TeaserLeg {
  team: string
  originalSpread: number
  teaserSpread: number  // After adding teaser points
  sport: 'NFL' | 'NBA' | 'NCAAF' | 'NCAAB'
  gameTotal?: number  // For evaluating teaser value
}

export interface TeaserCalculation {
  legs: TeaserLeg[]
  teaserPoints: number  // 6, 6.5, 7 for football; 4, 4.5, 5 for basketball
  originalOdds: number  // American odds (usually -110 per leg for 2-team)
  impliedWinRate: number  // Probability each leg covers teaser spread
  combinedProbability: number  // All legs win
  fairOdds: number  // What odds should be based on probability
  ev: number  // Expected value percentage
  recommendation: 'play' | 'avoid' | 'strong_play'
  reasoning: string[]
}

// Historical cover rates by teaser points (research-based)
const TEASER_COVER_RATES: Record<string, Record<number, number>> = {
  NFL: {
    6: 0.725,   // 6-point teaser covers ~72.5% (crosses 3, 7 key numbers)
    6.5: 0.74,
    7: 0.755,
  },
  NCAAF: {
    6: 0.71,    // College slightly less predictable
    6.5: 0.725,
    7: 0.74,
  },
  NBA: {
    4: 0.68,    // Basketball teasers less valuable
    4.5: 0.695,
    5: 0.71,
  },
  NCAAB: {
    4: 0.67,    // College basketball even less predictable
    4.5: 0.685,
    5: 0.70,
  }
}

// Key numbers in football (3, 7) - teasers that cross these have higher value
const KEY_NUMBERS = {
  NFL: [3, 7, 10, 14],
  NCAAF: [3, 7, 10, 14, 17],
  NBA: [],  // Basketball has no key numbers
  NCAAB: []
}

/**
 * Calculate teaser probability and EV
 */
export function calculateTeaser(teaser: TeaserCalculation): TeaserCalculation {
  const reasoning: string[] = []
  
  // Get base cover rate for this sport and teaser points
  const baseRate = TEASER_COVER_RATES[teaser.legs[0]?.sport]?.[teaser.teaserPoints] || 0.70
  
  // Adjust for key number crosses
  let adjustedRate = baseRate
  let keyNumberCrosses = 0
  
  for (const leg of teaser.legs) {
    const keyNumbers = KEY_NUMBERS[leg.sport] || []
    const crossed = keyNumbers.filter(n => 
      (leg.originalSpread < n && leg.teaserSpread >= n) ||
      (leg.originalSpread > -n && leg.teaserSpread <= -n)
    ).length
    
    if (crossed > 0) {
      keyNumberCrosses += crossed
      // Crossing key numbers adds ~2-3% per number
      adjustedRate += crossed * 0.025
      reasoning.push(`${leg.team}: Crosses ${crossed} key number(s) (+${(crossed * 2.5).toFixed(1)}%)`)
    }
    
    // Check if teaser makes it a pick'em or better
    if (Math.abs(leg.teaserSpread) <= 1) {
      adjustedRate += 0.015
      reasoning.push(`${leg.team}: Near pick'em after teaser (+1.5%)`)
    }
  }
  
  // Cap individual leg probability
  adjustedRate = Math.min(0.80, adjustedRate)
  
  // Calculate combined probability (legs are correlated in some teasers)
  const legCount = teaser.legs.length
  let combinedProb = Math.pow(adjustedRate, legCount)
  
  // Correlation adjustment for same-game teasers
  const sameGame = teaser.legs.every(l => 
    teaser.legs[0].sport === l.sport
  )
  if (sameGame && legCount === 2) {
    // Same-game teasers have negative correlation (one covers, other less likely)
    combinedProb *= 0.95
    reasoning.push('Same-game correlation: -5% combined prob')
  }
  
  // Convert to odds
  const fairOdds = probabilityToAmerican(combinedProb)
  
  // Calculate EV
  const impliedProb = americanToProbability(teaser.originalOdds)
  const ev = ((combinedProb / impliedProb) - 1) * 100
  
  // Recommendation
  let recommendation: 'play' | 'avoid' | 'strong_play'
  if (ev > 10) recommendation = 'strong_play'
  else if (ev > 3) recommendation = 'play'
  else recommendation = 'avoid'
  
  return {
    ...teaser,
    impliedWinRate: adjustedRate,
    combinedProbability: combinedProb,
    fairOdds,
    ev,
    recommendation,
    reasoning: [
      `Base cover rate: ${(baseRate * 100).toFixed(1)}%`,
      `Adjusted rate: ${(adjustedRate * 100).toFixed(1)}%`,
      `Combined probability: ${(combinedProb * 100).toFixed(1)}%`,
      `Fair odds: ${formatOdds(fairOdds)}`,
      `EV: ${ev > 0 ? '+' : ''}${ev.toFixed(1)}%`,
      ...reasoning
    ]
  }
}

/**
 * Find the best teaser options for a set of picks
 */
export function findBestTeaser(
  picks: Array<{ team: string; spread: number; sport: 'NFL' | 'NBA' | 'NCAAF' | 'NCAAB' }>,
  teaserPoints: number,
  odds: number = -110
): TeaserCalculation {
  const legs: TeaserLeg[] = picks.map(p => ({
    team: p.team,
    originalSpread: p.spread,
    teaserSpread: p.spread > 0 ? p.spread + teaserPoints : p.spread - teaserPoints,
    sport: p.sport
  }))
  
  return calculateTeaser({
    legs,
    teaserPoints,
    originalOdds: odds,
    impliedWinRate: 0,
    combinedProbability: 0,
    fairOdds: 0,
    ev: 0,
    recommendation: 'avoid',
    reasoning: []
  })
}

/**
 * Check if a teaser crosses key numbers (Wong teaser criteria)
 */
export function isWongTeaser(teaser: TeaserCalculation): boolean {
  // Wong teasers: 6-point teasers that go from +1.5 to +7.5 or -7.5 to -1.5
  // Crossing both 3 and 7
  return teaser.legs.every(leg => {
    const crossed3 = (leg.originalSpread < 3 && leg.teaserSpread >= 3) ||
                     (leg.originalSpread > -3 && leg.teaserSpread <= -3)
    const crossed7 = (leg.originalSpread < 7 && leg.teaserSpread >= 7) ||
                     (leg.originalSpread > -7 && leg.teaserSpread <= -7)
    return crossed3 || crossed7
  })
}

// Helper functions
function americanToProbability(odds: number): number {
  if (odds > 0) return 100 / (odds + 100)
  return Math.abs(odds) / (Math.abs(odds) + 100)
}

function probabilityToAmerican(prob: number): number {
  if (prob >= 0.5) return Math.round(-100 * prob / (1 - prob))
  return Math.round(100 * (1 - prob) / prob)
}

function formatOdds(odds: number): string {
  if (odds > 0) return `+${odds}`
  return String(odds)
}

// Export for use in picks API
export const TEASER_CALCULATOR = {
  calculateTeaser,
  findBestTeaser,
  isWongTeaser,
  KEY_NUMBERS,
  TEASER_COVER_RATES
}
