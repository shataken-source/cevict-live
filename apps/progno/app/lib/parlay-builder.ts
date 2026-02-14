/**
 * Parlay Builder Service
 * Builds +EV parlays with correlation detection
 */

export interface ParlayLeg {
  pickId: string;
  sport: string;
  team: string;
  market: 'moneyline' | 'spread' | 'total';
  odds: number;
  probability: number;
  ev: number;
}

export interface Parlay {
  id: string;
  legs: ParlayLeg[];
  combinedOdds: number;
  trueProbability: number;
  impliedProbability: number;
  expectedValue: number;
  correlation: number; // 0-1, higher means legs are correlated
  recommendation: 'strong' | 'moderate' | 'avoid';
}

export class ParlayBuilder {
  private readonly MIN_EV = 5; // Minimum 5% expected value

  /**
   * Build parlays from eligible picks
   */
  buildParlays(picks: ParlayLeg[], maxLegs: number = 3): Parlay[] {
    const parlays: Parlay[] = [];

    // Generate 2-leg parlays
    for (let i = 0; i < picks.length; i++) {
      for (let j = i + 1; j < picks.length; j++) {
        const legs = [picks[i], picks[j]];
        const parlay = this.analyzeParlay(legs);
        if (parlay.expectedValue >= this.MIN_EV) {
          parlays.push(parlay);
        }
      }
    }

    // Generate 3-leg parlays if requested
    if (maxLegs >= 3) {
      for (let i = 0; i < picks.length; i++) {
        for (let j = i + 1; j < picks.length; j++) {
          for (let k = j + 1; k < picks.length; k++) {
            const legs = [picks[i], picks[j], picks[k]];
            const parlay = this.analyzeParlay(legs);
            if (parlay.expectedValue >= this.MIN_EV) {
              parlays.push(parlay);
            }
          }
        }
      }
    }

    return parlays.sort((a, b) => b.expectedValue - a.expectedValue);
  }

  /**
   * Analyze a parlay for EV and correlation
   */
  private analyzeParlay(legs: ParlayLeg[]): Parlay {
    const id = `parlay-${legs.map(l => l.pickId).join('-')}`;
    
    // Calculate combined decimal odds
    const combinedDecimal = legs.reduce((acc, leg) => acc * this.americanToDecimal(leg.odds), 1);
    const combinedOdds = this.decimalToAmerican(combinedDecimal);

    // Calculate true probability (considering correlation)
    let correlation = this.calculateCorrelation(legs);
    let trueProbability = legs[0].probability;
    
    for (let i = 1; i < legs.length; i++) {
      // Adjust for correlation: if legs are positively correlated,
      // true probability is higher than simple multiplication
      const adjustment = 1 + (correlation * 0.2);
      trueProbability *= (legs[i].probability * adjustment);
    }

    // Cap probability at reasonable level
    trueProbability = Math.min(trueProbability, 0.95);

    // Implied probability from odds
    const impliedProbability = 1 / combinedDecimal;

    // Expected value
    const expectedValue = (trueProbability * (combinedDecimal - 1) - (1 - trueProbability)) * 100;

    // Recommendation
    let recommendation: Parlay['recommendation'];
    if (expectedValue > 15) {
      recommendation = 'strong';
    } else if (expectedValue > this.MIN_EV) {
      recommendation = 'moderate';
    } else {
      recommendation = 'avoid';
    }

    return {
      id,
      legs,
      combinedOdds,
      trueProbability: Math.round(trueProbability * 100) / 100,
      impliedProbability: Math.round(impliedProbability * 100) / 100,
      expectedValue: Math.round(expectedValue * 100) / 100,
      correlation: Math.round(correlation * 100) / 100,
      recommendation,
    };
  }

  /**
   * Calculate correlation between legs
   * Higher correlation means legs are related (e.g., same game, same team)
   */
  private calculateCorrelation(legs: ParlayLeg[]): number {
    let correlation = 0;
    
    for (let i = 0; i < legs.length; i++) {
      for (let j = i + 1; j < legs.length; j++) {
        // Same sport increases correlation slightly
        if (legs[i].sport === legs[j].sport) {
          correlation += 0.1;
        }
        
        // Same team is highly correlated
        if (legs[i].team === legs[j].team) {
          correlation += 0.5;
        }
        
        // Same game (both team totals) is correlated
        if (legs[i].market === 'total' && legs[j].market === 'total') {
          correlation += 0.3;
        }
      }
    }

    // Normalize to 0-1
    const pairs = (legs.length * (legs.length - 1)) / 2;
    return Math.min(correlation / (pairs * 0.5), 1);
  }

  /**
   * Find correlated opportunities (same game parlays)
   */
  findCorrelatedOpportunities(picks: ParlayLeg[]): Parlay[] {
    const gameGroups = new Map<string, ParlayLeg[]>();
    
    // Group picks by game
    for (const pick of picks) {
      // Extract game ID from pickId (format: pick-{gameId}-{market})
      const parts = pick.pickId.split('-');
      if (parts.length >= 2) {
        const gameId = parts[1];
        if (!gameGroups.has(gameId)) {
          gameGroups.set(gameId, []);
        }
        gameGroups.get(gameId)!.push(pick);
      }
    }

    const opportunities: Parlay[] = [];
    
    // Analyze each game's correlated picks
    for (const [, gamePicks] of gameGroups) {
      if (gamePicks.length >= 2) {
        // Look for team total + game total correlations
        const teamTotals = gamePicks.filter(p => p.market === 'total');
        const spreads = gamePicks.filter(p => p.market === 'spread');
        
        // Create correlated parlays
        for (const total of teamTotals) {
          for (const spread of spreads) {
            const parlay = this.analyzeParlay([total, spread]);
            if (parlay.expectedValue > 0) {
              opportunities.push(parlay);
            }
          }
        }
      }
    }

    return opportunities.sort((a, b) => b.expectedValue - a.expectedValue);
  }

  private americanToDecimal(american: number): number {
    if (american > 0) {
      return (american / 100) + 1;
    } else {
      return (100 / Math.abs(american)) + 1;
    }
  }

  private decimalToAmerican(decimal: number): number {
    if (decimal >= 2) {
      return Math.round((decimal - 1) * 100);
    } else {
      return Math.round(-100 / (decimal - 1));
    }
  }
}

export default ParlayBuilder;
