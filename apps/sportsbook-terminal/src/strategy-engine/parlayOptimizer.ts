/**
 * Strategy Engine - Parlay & Teaser Optimizer
 * Prognostication Capital
 *
 * Generates optimal multi-leg bets with:
 * - Correlation-adjusted probabilities
 * - +EV filtering
 * - Kelly-appropriate sizing
 * - Key number analysis for teasers
 */

import type { SignalInput, AllocationResult } from '../capital-allocator/capitalAllocator';

export interface ParlayLeg {
  signalId: string;
  eventId: string;
  team: string;
  probability: number;
  odds: number;
  edge: number;
  sport: string;
  league: string;
}

export interface ParlayCombination {
  id: string;
  legs: ParlayLeg[];
  type: '2-leg' | '3-leg' | '4-leg';
  combinedProbability: number;
  combinedOdds: number;
  payout: number;
  ev: number;
  expectedValue: number;
  correlationPenalty: number;
  recommendation: 'strong' | 'moderate' | 'weak' | 'avoid';
  maxStake: number; // Based on bankroll
}

export interface TeaserOpportunity {
  id: string;
  leg: ParlayLeg;
  originalSpread: number;
  teaserPoints: number;
  newSpread: number;
  originalProb: number;
  teaserProb: number;
  sport: 'NFL' | 'NBA';
  keyNumberCapture: boolean;
  ev: number;
  recommendation: 'play' | 'avoid';
}

// Key numbers in NFL (3 and 7 are most common margins)
const NFL_KEY_NUMBERS = [3, 7, 10, 6, 4];
const NBA_KEY_NUMBERS = [3, 4, 5, 6, 7];

// Teaser adjustment factors by sport and points
const TEASER_ADJUSTMENTS: Record<string, Record<number, number>> = {
  NFL: {
    6: 0.07,   // +7% probability for 6-point teaser
    6.5: 0.08,
    7: 0.09,
    10: 0.12,  // Sweetheart teaser
  },
  NBA: {
    4: 0.04,
    4.5: 0.045,
    5: 0.05,
    7: 0.07,
  },
};

/**
 * Calculate correlation penalty between two picks
 */
function calculateCorrelation(p1: ParlayLeg, p2: ParlayLeg): number {
  // Same team correlation (highest)
  if (p1.eventId === p2.eventId) return 0.3;

  // Same league correlation
  if (p1.league === p2.league) {
    // Same day games have higher correlation
    return 0.15;
  }

  // Same sport, different league
  if (p1.sport === p2.sport) return 0.08;

  // Different sports (low correlation)
  return 0.02;
}

/**
 * Generate all parlay combinations from high-confidence picks
 */
export function generateParlays(
  picks: SignalInput[],
  bankroll: number,
  options: {
    minConfidence?: number;
    minConfidence2Leg?: number;  // Higher threshold for 2-leg
    minConfidence3Leg?: number;  // Lower threshold for 3-leg
    maxLegs?: number;
    requirePositiveEV?: boolean;
    maxParlays?: number;
    prioritize2Leg?: boolean;   // Prioritize 2-leg over 3-leg
  } = {}
): ParlayCombination[] {
  const {
    minConfidence = 58,
    minConfidence2Leg = 65,  // Higher confidence for 2-leg parlays
    minConfidence3Leg = 60,  // Lower confidence for 3-leg parlays
    maxLegs = 3,
    requirePositiveEV = true,
    maxParlays = 20,
    prioritize2Leg = true,   // Default to prioritizing 2-leg
  } = options;

  // Filter picks separately for 2-leg (higher confidence) and 3-leg (lower confidence)
  const eligible2Leg = picks
    .filter(p => p.confidence >= minConfidence2Leg)
    .filter(p => !p.isPremium)
    .map(p => ({
      signalId: p.id,
      eventId: p.eventId,
      team: p.league?.includes('NBA') || p.league?.includes('NFL')
        ? p.eventId.split('-')[0] || 'Team'
        : 'Side',
      probability: p.modelProbability,
      odds: p.decimalOdds,
      edge: p.modelProbability - (1 / p.decimalOdds),
      sport: p.league?.split(' ')[0] || 'Sports',
      league: p.league || 'General',
    }));

  const eligible3Leg = picks
    .filter(p => p.confidence >= minConfidence3Leg)
    .filter(p => !p.isPremium)
    .map(p => ({
      signalId: p.id,
      eventId: p.eventId,
      team: p.league?.includes('NBA') || p.league?.includes('NFL')
        ? p.eventId.split('-')[0] || 'Team'
        : 'Side',
      probability: p.modelProbability,
      odds: p.decimalOdds,
      edge: p.modelProbability - (1 / p.decimalOdds),
      sport: p.league?.split(' ')[0] || 'Sports',
      league: p.league || 'General',
    }));

  const parlays: ParlayCombination[] = [];

  // Generate 2-leg parlays (using higher confidence threshold)
  for (let i = 0; i < eligible2Leg.length; i++) {
    for (let j = i + 1; j < eligible2Leg.length; j++) {
      const leg1 = eligible2Leg[i];
      const leg2 = eligible2Leg[j];

      const correlation = calculateCorrelation(leg1, leg2);
      const correlationPenalty = 1 - correlation;

      // Combined probability with correlation adjustment
      const combinedProb = leg1.probability * leg2.probability * correlationPenalty;

      // Calculate parlay odds
      const combinedOdds = leg1.odds * leg2.odds;
      const payout = combinedOdds;

      // Expected value
      const ev = (combinedProb * payout) - (1 - combinedProb);

      if (requirePositiveEV && ev <= 0) continue;

      // Recommendation strength
      let recommendation: ParlayCombination['recommendation'] = 'avoid';
      if (ev > 0.15) recommendation = 'strong';
      else if (ev > 0.08) recommendation = 'moderate';
      else if (ev > 0) recommendation = 'weak';

      // Max stake (1% of bankroll for parlays)
      const maxStake = bankroll * 0.01;

      parlays.push({
        id: `parlay-2-${i}-${j}`,
        legs: [leg1, leg2],
        type: '2-leg',
        combinedProbability: combinedProb,
        combinedOdds,
        payout,
        ev,
        expectedValue: ev * maxStake,
        correlationPenalty: correlation,
        recommendation,
        maxStake,
      });
    }
  }

  // Generate 3-leg parlays (if enough picks and maxLegs >= 3)
  if (maxLegs >= 3 && eligible3Leg.length >= 3) {
    for (let i = 0; i < eligible3Leg.length; i++) {
      for (let j = i + 1; j < eligible3Leg.length; j++) {
        for (let k = j + 1; k < eligible3Leg.length; k++) {
          const leg1 = eligible3Leg[i];
          const leg2 = eligible3Leg[j];
          const leg3 = eligible3Leg[k];

          const correlation = (
            calculateCorrelation(leg1, leg2) +
            calculateCorrelation(leg1, leg3) +
            calculateCorrelation(leg2, leg3)
          ) / 3;

          const correlationPenalty = 1 - correlation;
          const combinedProb = leg1.probability * leg2.probability * leg3.probability * correlationPenalty;
          const combinedOdds = leg1.odds * leg2.odds * leg3.odds;
          const payout = combinedOdds;
          const ev = (combinedProb * payout) - (1 - combinedProb);

          if (requirePositiveEV && ev <= 0) continue;

          let recommendation: ParlayCombination['recommendation'] = 'avoid';
          if (ev > 0.20) recommendation = 'strong';
          else if (ev > 0.10) recommendation = 'moderate';
          else if (ev > 0) recommendation = 'weak';

          const maxStake = bankroll * 0.005; // 0.5% for 3-leg

          parlays.push({
            id: `parlay-3-${i}-${j}-${k}`,
            legs: [leg1, leg2, leg3],
            type: '3-leg',
            combinedProbability: combinedProb,
            combinedOdds,
            payout,
            ev,
            expectedValue: ev * maxStake,
            correlationPenalty: correlation,
            recommendation,
            maxStake,
          });
        }
      }
    }
  }

  // Sort: prioritize 2-leg with higher EV, then by EV descending
  return parlays
    .sort((a, b) => {
      // Prioritize 2-leg over 3-leg if prioritize2Leg is true
      if (prioritize2Leg) {
        if (a.type === '2-leg' && b.type === '3-leg') return -1;
        if (a.type === '3-leg' && b.type === '2-leg') return 1;
      }
      // Then sort by EV
      return b.ev - a.ev;
    })
    .slice(0, maxParlays);
}

/**
 * Analyze teaser opportunities
 */
export function analyzeTeasers(
  picks: SignalInput[],
  bankroll: number,
  options: {
    sports?: ('NFL' | 'NBA')[];
    teaserPoints?: number[];
  } = {}
): TeaserOpportunity[] {
  const { sports = ['NFL', 'NBA'], teaserPoints = [6, 7] } = options;

  const opportunities: TeaserOpportunity[] = [];

  for (const pick of picks) {
    // Only analyze spread bets for teasers
    if (!pick.league?.includes('NFL') && !pick.league?.includes('NBA')) continue;

    const sport = pick.league.includes('NFL') ? 'NFL' : 'NBA';
    if (!sports.includes(sport)) continue;

    // Parse spread from pick description or use default
    const spreadMatch = pick.eventId?.match(/([+-]\d+\.?\d*)/);
    const originalSpread = spreadMatch ? parseFloat(spreadMatch[1]) : -3;

    for (const points of teaserPoints) {
      const adjustment = TEASER_ADJUSTMENTS[sport]?.[points];
      if (!adjustment) continue;

      const newSpread = sport === 'NFL'
        ? originalSpread + (originalSpread < 0 ? points : -points)
        : originalSpread + (originalSpread < 0 ? points : -points);

      // Check if crossing key number
      const keyNumbers = sport === 'NFL' ? NFL_KEY_NUMBERS : NBA_KEY_NUMBERS;
      const crossedKeyNumber = keyNumbers.some(kn => {
        const crossed = (originalSpread < kn && newSpread >= kn) ||
          (originalSpread > kn && newSpread <= kn);
        return crossed;
      });

      // Calculate teaser probability
      const teaserProb = Math.min(0.95, pick.modelProbability + adjustment + (crossedKeyNumber ? 0.02 : 0));

      // Teaser odds (typically -110 for 2-team, +160 for 3-team in NFL)
      const teaserOdds = sport === 'NFL' && points === 6 ? 2.65 : 2.5; // Simplified

      const ev = (teaserProb * teaserOdds) - (1 - teaserProb);

      opportunities.push({
        id: `teaser-${pick.id}-${points}`,
        leg: {
          signalId: pick.id,
          eventId: pick.eventId,
          team: pick.league?.split(' ')[0] || 'Team',
          probability: pick.modelProbability,
          odds: pick.decimalOdds,
          edge: pick.modelProbability - (1 / pick.decimalOdds),
          sport,
          league: pick.league || sport,
        },
        originalSpread,
        teaserPoints: points,
        newSpread,
        originalProb: pick.modelProbability,
        teaserProb,
        sport,
        keyNumberCapture: crossedKeyNumber,
        ev,
        recommendation: ev > 0.05 && crossedKeyNumber ? 'play' : 'avoid',
      });
    }
  }

  // Sort by EV descending
  return opportunities.sort((a, b) => b.ev - a.ev);
}

/**
 * Format parlay for display
 */
export function formatParlay(parlay: ParlayCombination): string {
  const legs = parlay.legs.map(l => l.team).join(' + ');
  const odds = parlay.combinedOdds.toFixed(2);
  const ev = parlay.ev > 0 ? `+${parlay.ev.toFixed(2)}` : parlay.ev.toFixed(2);
  return `${legs} @ ${odds} (EV: ${ev})`;
}

/**
 * Get parlay recommendation color
 */
export function getParlayColor(rec: ParlayCombination['recommendation']): string {
  switch (rec) {
    case 'strong': return '#00e676';
    case 'moderate': return '#ffd600';
    case 'weak': return '#ff9800';
    case 'avoid': return '#ff5252';
  }
}

/**
 * Export parlays to CSV
 */
export function exportParlaysCSV(parlays: ParlayCombination[]): string {
  const headers = ['ID', 'Type', 'Legs', 'Combined Odds', 'EV', 'Recommendation', 'Max Stake'];

  const rows = parlays.map(p => [
    p.id,
    p.type,
    p.legs.map(l => l.team).join(' + '),
    p.combinedOdds.toFixed(3),
    p.ev.toFixed(4),
    p.recommendation,
    p.maxStake.toFixed(2),
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Validate parlay doesn't exceed risk limits
 */
export function validateParlayRisk(
  parlay: ParlayCombination,
  currentExposure: number,
  bankroll: number
): { valid: boolean; reason?: string } {
  // Max 1% of bankroll on any parlay
  const maxParlayRisk = bankroll * 0.01;

  if (parlay.maxStake > maxParlayRisk) {
    return { valid: false, reason: 'Exceeds 1% parlay risk limit' };
  }

  // Total portfolio exposure check
  if (currentExposure + parlay.maxStake > bankroll * 0.6) {
    return { valid: false, reason: 'Would exceed 60% total portfolio exposure' };
  }

  // 4+ leg parlays are generally not recommended
  if (parlay.legs.length >= 4 && parlay.ev < 0.10) {
    return { valid: false, reason: '4+ leg parlays require EV > 10%' };
  }

  return { valid: true };
}
