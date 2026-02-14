/**
 * Early Bets Detection Service
 * Detects early line opportunities where odds have moved favorably
 */

export interface LineMovement {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  market: 'moneyline' | 'spread' | 'total';
  earlyLine: number;
  currentLine: number;
  movement: number;
  movementPercent: number;
  direction: 'favorable' | 'unfavorable' | 'neutral';
  edge: number;
  confidence: number;
  gameTime: string;
  detectedAt: string;
}

export interface EarlyBetOpportunity {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  pick: string;
  pickType: 'moneyline' | 'spread' | 'total';
  earlyOdds: number;
  currentOdds: number;
  oddsMovement: number;
  lineMovement: number;
  confidence: number;
  edge: number;
  recommendation: 'strong' | 'moderate' | 'weak';
  reasoning: string[];
  gameTime: string;
  detectedAt: string;
  timeWindow: string;
}

export class EarlyBetsDetectionService {
  private static readonly MIN_MOVEMENT_THRESHOLD = 2; // Points
  private static readonly MIN_CONFIDENCE = 65;
  private static readonly EARLY_WINDOW_HOURS = 24; // Consider lines from last 24 hours

  /**
   * Detect early bet opportunities by comparing early lines to current lines
   */
  static detectOpportunities(
    earlyOdds: Map<string, LineMovement>,
    currentOdds: Map<string, LineMovement>,
    sports: string[] = ['nba', 'nfl', 'nhl', 'mlb']
  ): EarlyBetOpportunity[] {
    const opportunities: EarlyBetOpportunity[] = [];

    for (const [gameId, current] of currentOdds.entries()) {
      const early = earlyOdds.get(gameId);
      if (!early) continue;

      const opportunity = this.analyzeOpportunity(early, current);
      if (opportunity && this.isValidOpportunity(opportunity)) {
        opportunities.push(opportunity);
      }
    }

    // Sort by edge (highest first)
    return opportunities.sort((a, b) => b.edge - a.edge);
  }

  /**
   * Analyze a single opportunity
   */
  private static analyzeOpportunity(
    early: LineMovement,
    current: LineMovement
  ): EarlyBetOpportunity | null {
    const movement = current.currentLine - early.earlyLine;
    const movementPercent = Math.abs(movement) / Math.abs(early.earlyLine) * 100;

    // Determine if movement is favorable for bettor
    const direction = this.determineDirection(early, current, movement);

    if (direction === 'unfavorable') {
      return null; // Line moved against us
    }

    const edge = this.calculateEdge(early, current);
    const confidence = this.calculateConfidence(early, current, edge);

    return {
      id: `early-${early.gameId}-${early.market}`,
      sport: early.sport,
      homeTeam: early.homeTeam,
      awayTeam: early.awayTeam,
      pick: this.determinePick(early, current, movement),
      pickType: early.market,
      earlyOdds: this.convertToAmerican(early.earlyLine, early.market),
      currentOdds: this.convertToAmerican(current.currentLine, current.market),
      oddsMovement: this.convertToAmerican(current.currentLine, current.market) - this.convertToAmerican(early.earlyLine, early.market),
      lineMovement: movement,
      confidence,
      edge,
      recommendation: this.getRecommendation(edge, confidence),
      reasoning: this.generateReasoning(early, current, movement, edge),
      gameTime: early.gameTime,
      detectedAt: new Date().toISOString(),
      timeWindow: this.calculateTimeWindow(early.detectedAt),
    };
  }

  /**
   * Determine if opportunity is valid
   */
  private static isValidOpportunity(opp: EarlyBetOpportunity): boolean {
    // Must meet minimum thresholds
    if (opp.confidence < this.MIN_CONFIDENCE) return false;
    if (Math.abs(opp.lineMovement) < this.MIN_MOVEMENT_THRESHOLD) return false;

    // Game must be in the future
    const gameTime = new Date(opp.gameTime);
    if (gameTime <= new Date()) return false;

    // Must be within early window
    const detectedTime = new Date(opp.detectedAt);
    const hoursSinceDetection = (Date.now() - detectedTime.getTime()) / (1000 * 60 * 60);
    if (hoursSinceDetection > this.EARLY_WINDOW_HOURS) return false;

    return true;
  }

  /**
   * Determine direction of line movement
   */
  private static determineDirection(
    early: LineMovement,
    current: LineMovement,
    movement: number
  ): 'favorable' | 'unfavorable' | 'neutral' {
    // For spreads and totals, movement toward zero is typically favorable for favorite/over
    // For moneylines, positive movement (less negative or more positive) is favorable

    if (early.market === 'moneyline') {
      // If early line was -150 and now -120, that's favorable for the favorite
      // If early line was +150 and now +180, that's favorable for the underdog
      if (early.earlyLine < 0 && current.currentLine > early.earlyLine) {
        return 'favorable'; // Line moved toward even
      }
      if (early.earlyLine > 0 && current.currentLine > early.earlyLine) {
        return 'favorable'; // Better payout
      }
      return 'unfavorable';
    }

    // For spreads and totals, check against the threshold
    if (Math.abs(movement) < this.MIN_MOVEMENT_THRESHOLD) {
      return 'neutral';
    }

    // For spreads, smaller absolute value is generally better for favorite
    // For totals, depends on over/under pick
    return Math.abs(current.currentLine) < Math.abs(early.earlyLine) ? 'favorable' : 'unfavorable';
  }

  /**
   * Determine which team to pick
   */
  private static determinePick(
    early: LineMovement,
    current: LineMovement,
    movement: number
  ): string {
    if (early.market === 'moneyline') {
      // Pick the side with favorable movement
      if (early.earlyLine < 0 && current.currentLine > early.earlyLine) {
        return early.homeTeam; // Favorite
      }
      return early.awayTeam; // Underdog
    }

    if (early.market === 'spread') {
      // Pick favorite if line moved in their favor
      return movement < 0 ? early.homeTeam : early.awayTeam;
    }

    if (early.market === 'total') {
      // Default to over for favorable total movement
      return 'Over';
    }

    return early.homeTeam;
  }

  /**
   * Calculate edge percentage
   */
  private static calculateEdge(early: LineMovement, current: LineMovement): number {
    // Edge is the value gained by getting the early line
    const impliedProbEarly = this.americanToImpliedProb(early.earlyLine);
    const impliedProbCurrent = this.americanToImpliedProb(current.currentLine);

    return (impliedProbCurrent - impliedProbEarly) * 100;
  }

  /**
   * Calculate confidence score
   */
  private static calculateConfidence(
    early: LineMovement,
    current: LineMovement,
    edge: number
  ): number {
    let confidence = 65; // Base confidence

    // Boost for edge
    confidence += Math.min(edge * 2, 15);

    // Boost for significant line movement
    const movement = Math.abs(current.currentLine - early.earlyLine);
    confidence += Math.min(movement * 2, 10);

    // Cap at 95
    return Math.min(confidence, 95);
  }

  /**
   * Get recommendation strength
   */
  private static getRecommendation(
    edge: number,
    confidence: number
  ): 'strong' | 'moderate' | 'weak' {
    if (edge > 5 && confidence > 75) return 'strong';
    if (edge > 3 && confidence > 70) return 'moderate';
    return 'weak';
  }

  /**
   * Generate reasoning for the pick
   */
  private static generateReasoning(
    early: LineMovement,
    current: LineMovement,
    movement: number,
    edge: number
  ): string[] {
    const reasoning: string[] = [];

    reasoning.push(`Line moved from ${early.earlyLine} to ${current.currentLine}`);
    reasoning.push(`Edge: ${edge.toFixed(1)}% by getting early line`);

    if (Math.abs(movement) > 5) {
      reasoning.push('Significant line movement detected');
    }

    if (edge > 5) {
      reasoning.push('Strong early line value');
    }

    reasoning.push(`Detected ${this.calculateTimeWindow(early.detectedAt)} ago`);

    return reasoning;
  }

  /**
   * Calculate time window since detection
   */
  private static calculateTimeWindow(detectedAt: string): string {
    const detected = new Date(detectedAt);
    const hours = Math.floor((Date.now() - detected.getTime()) / (1000 * 60 * 60));

    if (hours < 1) return '< 1 hour';
    if (hours === 1) return '1 hour';
    if (hours < 24) return `${hours} hours`;
    return `${Math.floor(hours / 24)} days`;
  }

  /**
   * Convert decimal odds to American
   */
  private static convertToAmerican(decimal: number, market: string): number {
    if (decimal >= 2) {
      return Math.round((decimal - 1) * 100);
    } else {
      return Math.round(-100 / (decimal - 1));
    }
  }

  /**
   * Convert American odds to implied probability
   */
  private static americanToImpliedProb(american: number): number {
    if (american > 0) {
      return 100 / (american + 100);
    } else {
      return Math.abs(american) / (Math.abs(american) + 100);
    }
  }

  /**
   * Track line for future comparison
   */
  static trackLine(
    gameId: string,
    sport: string,
    homeTeam: string,
    awayTeam: string,
    market: 'moneyline' | 'spread' | 'total',
    line: number,
    gameTime: string
  ): LineMovement {
    return {
      gameId,
      sport,
      homeTeam,
      awayTeam,
      market,
      earlyLine: line,
      currentLine: line,
      movement: 0,
      movementPercent: 0,
      direction: 'neutral',
      edge: 0,
      confidence: 0,
      gameTime,
      detectedAt: new Date().toISOString(),
    };
  }

  /**
   * Update tracked line with current odds
   */
  static updateLine(
    tracked: LineMovement,
    currentLine: number
  ): LineMovement {
    const movement = currentLine - tracked.earlyLine;
    const movementPercent = Math.abs(movement) / Math.abs(tracked.earlyLine) * 100;

    return {
      ...tracked,
      currentLine,
      movement,
      movementPercent,
      edge: this.calculateEdge(tracked, { ...tracked, currentLine } as LineMovement),
    };
  }
}

export default EarlyBetsDetectionService;
