/**
 * Parlay Analyzer
 * Analyzes parlay and teaser bets for expected value
 */

export interface ParlayLeg {
  gameId: string;
  type: 'spread' | 'moneyline' | 'total';
  side: 'home' | 'away' | 'over' | 'under';
  line?: number;
  odds: number;
  probability?: number;
}

export interface ParlayAnalysis {
  id: string;
  legs: ParlayLeg[];
  totalOdds: number;
  impliedProbability: number;
  calculatedProbability: number;
  expectedValue: number;
  payout: number;
  risk: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface TeaserAnalysis extends ParlayAnalysis {
  originalLines: number[];
  adjustedLines: number[];
  pointsAdded: number;
}

export class ParlayAnalyzer {
  /**
   * Check for correlation between parlay legs
   * Correlated legs reduce parlay value (e.g., same game, related outcomes)
   */
  private static checkCorrelation(legs: ParlayLeg[]): {
    isCorrelated: boolean;
    correlationScore: number; // 0-1, higher = more correlated
    warnings: string[];
  } {
    const warnings: string[] = [];
    let correlationScore = 0;
    let correlationCount = 0;

    // Check for same game (high correlation)
    const gameIds = legs.map(l => l.gameId);
    const uniqueGameIds = new Set(gameIds);
    if (uniqueGameIds.size < gameIds.length) {
      const sameGameCount = gameIds.length - uniqueGameIds.size;
      correlationScore += sameGameCount * 0.4; // High correlation penalty
      correlationCount += sameGameCount;
      warnings.push(`${sameGameCount} legs from the same game(s) - high correlation`);
    }

    // Check for related bet types (e.g., spread + total from same game)
    for (let i = 0; i < legs.length; i++) {
      for (let j = i + 1; j < legs.length; j++) {
        if (legs[i].gameId === legs[j].gameId) {
          // Same game correlation
          if (legs[i].type !== legs[j].type) {
            correlationScore += 0.2; // Medium correlation (spread + total)
            correlationCount++;
            warnings.push(`Legs ${i + 1} and ${j + 1} are from the same game with different bet types`);
          } else if (legs[i].type === legs[j].type && legs[i].side !== legs[j].side) {
            correlationScore += 0.1; // Low correlation (opposite sides of same bet)
            correlationCount++;
          }
        }
      }
    }

    // Check for sequential games (same team playing back-to-back)
    // This would require game date/time data, simplified here
    const teamNames = legs.map(l => {
      // Extract team names from gameId (simplified)
      return l.gameId.split('-').slice(1, 3).join('-');
    });
    const uniqueTeams = new Set(teamNames);
    if (uniqueTeams.size < teamNames.length) {
      correlationScore += 0.15;
      warnings.push('Multiple legs involving the same team(s)');
    }

    // Normalize correlation score (0-1)
    const normalizedScore = Math.min(1, correlationScore / Math.max(1, legs.length - 1));

    return {
      isCorrelated: normalizedScore > 0.3, // Threshold for correlation warning
      correlationScore: normalizedScore,
      warnings: warnings.length > 0 ? warnings : [],
    };
  }

  /**
   * Analyze a parlay bet with correlation checking
   */
  static async analyze(legs: ParlayLeg[], stake: number = 100): Promise<ParlayAnalysis> {
    if (!legs || legs.length < 2) {
      throw new Error('At least 2 legs required for parlay');
    }

    // Check for correlation
    const correlation = this.checkCorrelation(legs);

    // Calculate total odds (multiply all odds)
    const totalOdds = legs.reduce((acc, leg) => {
      const decimal = this.americanToDecimal(leg.odds);
      return acc * decimal;
    }, 1);

    // Convert back to American odds
    const americanOdds = this.decimalToAmerican(totalOdds);

    // Calculate implied probability from odds
    const impliedProbability = this.americanToImplied(americanOdds);

    // Calculate actual probability (multiply all leg probabilities)
    // If probability not provided, estimate from odds
    let calculatedProbability = legs.reduce((acc, leg) => {
      const legProb = leg.probability || this.americanToImplied(leg.odds);
      return acc * legProb;
    }, 1);

    // Adjust probability for correlation (correlated legs reduce effective probability)
    if (correlation.isCorrelated) {
      // Reduce probability by correlation factor
      const correlationPenalty = 1 - (correlation.correlationScore * 0.3); // Up to 30% reduction
      calculatedProbability *= correlationPenalty;
    }

    // Calculate expected value
    const payout = stake * totalOdds;
    const expectedValue = (calculatedProbability * payout) - stake;

    // Determine risk level (increase risk if correlated)
    let risk: 'low' | 'medium' | 'high' = 'medium';
    if (calculatedProbability > 0.3 && !correlation.isCorrelated) risk = 'low';
    else if (calculatedProbability < 0.1 || correlation.correlationScore > 0.5) risk = 'high';
    else if (correlation.isCorrelated) risk = 'high'; // Correlated parlays are higher risk

    // Generate recommendation with correlation warnings
    let recommendation = '';
    if (correlation.isCorrelated && correlation.warnings.length > 0) {
      recommendation = `⚠️ CORRELATED PARLAY: ${correlation.warnings.join('; ')}. `;
    }

    if (expectedValue > 0) {
      recommendation += `Positive EV (+$${expectedValue.toFixed(2)})`;
      if (correlation.isCorrelated) {
        recommendation += ' - Correlated legs reduce value, consider reduced stake or uncorrelated alternatives';
      } else {
        recommendation += ' - Consider reduced stake';
      }
    } else if (expectedValue > -stake * 0.1) {
      recommendation += 'Slight negative EV - Low confidence';
      if (correlation.isCorrelated) {
        recommendation += ' - Correlation further reduces value';
      }
    } else {
      recommendation += 'Negative EV - Not recommended';
      if (correlation.isCorrelated) {
        recommendation += ' - Correlation makes this even worse';
      }
    }

    return {
      id: `parlay_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      legs,
      totalOdds: americanOdds,
      impliedProbability,
      calculatedProbability,
      expectedValue,
      payout,
      risk,
      recommendation,
      // Add correlation data to analysis (extend interface if needed)
      ...(correlation.isCorrelated && {
        correlation: {
          isCorrelated: true,
          score: correlation.correlationScore,
          warnings: correlation.warnings,
        },
      }),
    } as ParlayAnalysis & { correlation?: { isCorrelated: boolean; score: number; warnings: string[] } };
  }

  /**
   * Analyze a teaser bet
   */
  static async analyzeTeaser(
    legs: Array<{ gameId: string; originalLine: number; side: 'home' | 'away' }>,
    points: number = 6,
    stake: number = 100
  ): Promise<TeaserAnalysis> {
    if (!legs || legs.length < 2) {
      throw new Error('At least 2 legs required for teaser');
    }

    // Convert legs to parlay format with adjusted lines
    const parlayLegs: ParlayLeg[] = legs.map(leg => ({
      gameId: leg.gameId,
      type: 'spread',
      side: leg.side,
      line: leg.originalLine + (leg.side === 'home' ? points : -points),
      odds: -110, // Standard teaser odds
      probability: 0.75, // Teaser typically improves probability significantly
    }));

    const analysis = await this.analyze(parlayLegs, stake);

    return {
      ...analysis,
      originalLines: legs.map(l => l.originalLine),
      adjustedLines: parlayLegs.map(l => l.line || 0),
      pointsAdded: points,
    };
  }

  private static americanToDecimal(americanOdds: number): number {
    if (americanOdds > 0) {
      return (americanOdds / 100) + 1;
    } else {
      return (100 / Math.abs(americanOdds)) + 1;
    }
  }

  private static decimalToAmerican(decimal: number): number {
    if (decimal >= 2) {
      return (decimal - 1) * 100;
    } else {
      return -100 / (decimal - 1);
    }
  }

  private static americanToImplied(americanOdds: number): number {
    if (americanOdds > 0) {
      return 100 / (americanOdds + 100);
    } else {
      return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
    }
  }
}

