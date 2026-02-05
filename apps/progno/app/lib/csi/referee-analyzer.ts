/**
 * Referee Variance Analyzer
 * Tracks referee crew tendencies and their impact on game chaos
 */

export interface RefereeCrew {
  id: string;
  name: string;
  sport: string;

  // Tendencies
  homeWinPctDiff: number;      // Difference from league average home win %
  underPct: number;            // % of games that go under (swallows whistle)
  holdingCallRate: number;     // Holding calls per game vs league average
  penaltyCallRate: number;     // Total penalties per game vs league average

  // Historical data
  gamesOfficiated: number;
  avgPenalties: number;
  homeTeamAdvantage: number;    // -1 to +1 (negative = favors away)
}

export interface RefereeImpact {
  crew: RefereeCrew;
  chaosContribution: number;    // 0 to 1
  homeTeamAdvantage: number;    // -0.1 to +0.1
  reasoning: string[];
}

/**
 * Referee Analyzer
 * Analyzes how referee crew tendencies affect game chaos
 */
export class RefereeAnalyzer {
  private crewDatabase: Map<string, RefereeCrew> = new Map();

  /**
   * Load referee crew data
   */
  loadCrew(crew: RefereeCrew): void {
    this.crewDatabase.set(crew.id, crew);
  }

  /**
   * Analyze referee impact on chaos
   */
  analyze(
    crewId: string,
    homeTeamStyle?: {
      reliesOnHolding?: boolean;  // Aggressive O-Line
      defensiveStyle?: 'aggressive' | 'conservative';
    }
  ): RefereeImpact | null {

    const crew = this.crewDatabase.get(crewId);
    if (!crew) {
      return null; // Crew not in database
    }

    let chaosContribution = 0;
    const reasoning: string[] = [];

    // 1. Home Team Advantage Variance
    // If crew favors home teams significantly more/less than average
    if (Math.abs(crew.homeWinPctDiff) > 0.10) {
      chaosContribution += 0.10;
      reasoning.push(
        `Ref crew ${crew.name} has ${crew.homeWinPctDiff > 0 ? 'strong' : 'weak'} home team bias (${(crew.homeWinPctDiff * 100).toFixed(1)}% vs league avg)`
      );
    }

    // 2. Under Rate (Swallows Whistle)
    // If crew calls fewer penalties, defense dominates = more chaos
    if (crew.underPct > 0.60) {
      chaosContribution += 0.08;
      reasoning.push(
        `Ref crew calls fewer penalties (${(crew.underPct * 100).toFixed(0)}% under rate) - favors defense`
      );
    }

    // 3. Holding Call Rate vs Team Style
    // If team relies on holding but crew calls holding 2x league average = chaos
    if (homeTeamStyle?.reliesOnHolding && crew.holdingCallRate > 1.5) {
      chaosContribution += 0.12;
      reasoning.push(
        `⚠️ HIGH CHAOS: Home team relies on holding, but ref crew calls holding at ${(crew.holdingCallRate * 100).toFixed(0)}% of league average`
      );
    }

    // 4. Penalty Call Rate Variance
    // High variance in penalty calling = unpredictable
    if (Math.abs(crew.penaltyCallRate - 1.0) > 0.3) {
      chaosContribution += 0.05;
      reasoning.push(
        `Ref crew penalty rate ${crew.penaltyCallRate > 1.0 ? 'above' : 'below'} league average`
      );
    }

    // Calculate home team advantage
    const homeTeamAdvantage = crew.homeTeamAdvantage * 0.1; // Scale to -0.1 to +0.1

    return {
      crew,
      chaosContribution: Math.min(1.0, chaosContribution),
      homeTeamAdvantage,
      reasoning,
    };
  }

  /**
   * Get default crew (when crew not in database)
   */
  getDefaultCrew(): RefereeCrew {
    return {
      id: 'default',
      name: 'Unknown Crew',
      sport: 'NFL',
      homeWinPctDiff: 0,
      underPct: 0.50,
      holdingCallRate: 1.0,
      penaltyCallRate: 1.0,
      gamesOfficiated: 0,
      avgPenalties: 0,
      homeTeamAdvantage: 0,
    };
  }
}

