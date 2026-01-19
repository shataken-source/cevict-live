/**
 * IAI Signal Detectors
 * Detects Reverse Line Movement, Steam Moves, Pro Edge, and Line Freezes
 */

import { LineMovement, BettingSplit, ReverseLineMovement, SteamMove, ProEdge, LineFreeze } from './signals';

/**
 * Reverse Line Movement Detector
 * Detects when line moves opposite to public betting
 */
export class RLMDetector {
  /**
   * Detect RLM from betting splits and line movements
   */
  detect(
    publicTicketPct: number,  // % of public on favorite
    lineMovement: number,     // Line movement (positive = toward home, negative = toward away)
    isHomeFavorite: boolean
  ): ReverseLineMovement {

    // Determine if public is on favorite
    const publicOnFavorite = isHomeFavorite
      ? publicTicketPct > 50
      : publicTicketPct < 50;

    // Calculate expected vs actual movement
    // If public is on favorite, line should move toward favorite (positive if home fav)
    // If line moves opposite, that's RLM

    let direction: 'with_public' | 'against_public' | 'neutral' = 'neutral';
    let strength = 0;

    if (publicOnFavorite) {
      // Public on favorite
      const expectedMovement = isHomeFavorite ? 1 : -1; // Line should move toward favorite
      if (Math.sign(lineMovement) !== Math.sign(expectedMovement)) {
        direction = 'against_public';
        // Calculate strength: how much public vs how much line moved
        const publicStrength = Math.abs(publicTicketPct - 50) / 50; // 0 to 1
        const movementStrength = Math.min(Math.abs(lineMovement) / 2, 1); // Normalize to 0-1
        strength = (publicStrength + movementStrength) / 2;
      } else {
        direction = 'with_public';
        strength = 0;
      }
    } else {
      // Public on underdog
      const expectedMovement = isHomeFavorite ? -1 : 1; // Line should move toward underdog
      if (Math.sign(lineMovement) !== Math.sign(expectedMovement)) {
        direction = 'against_public';
        const publicStrength = Math.abs(publicTicketPct - 50) / 50;
        const movementStrength = Math.min(Math.abs(lineMovement) / 2, 1);
        strength = (publicStrength + movementStrength) / 2;
      } else {
        direction = 'with_public';
        strength = 0;
      }
    }

    // Calculate score
    let score = 0;
    if (direction === 'against_public') {
      // RLM detected - sharps betting against public
      // Score is positive if sharps on home, negative if sharps on away
      const sharpSide = isHomeFavorite
        ? (lineMovement < 0 ? 'away' : 'home')
        : (lineMovement > 0 ? 'home' : 'away');

      score = sharpSide === 'home'
        ? strength * 0.25
        : -strength * 0.25;
    }

    return {
      detected: direction === 'against_public',
      publicTicketPct,
      lineMovement,
      direction,
      strength,
      score: Math.max(-0.25, Math.min(0.25, score)),
    };
  }
}

/**
 * Steam Move Detector
 * Detects coordinated line movements across multiple books
 */
export class SteamDetector {
  private recentMovements: LineMovement[] = [];
  private readonly timeWindow = 60 * 1000; // 60 seconds
  private readonly minBooks = 3; // Minimum books for steam
  private readonly minMagnitude = 0.5; // Minimum movement (NFL) or 1.5 (NBA)

  /**
   * Add a line movement and check for steam
   */
  detectSteam(movement: LineMovement): SteamMove | null {
    // Add to recent movements
    this.recentMovements.push(movement);

    // Clean old movements
    const cutoff = new Date(Date.now() - this.timeWindow);
    this.recentMovements = this.recentMovements.filter(m => m.timestamp >= cutoff);

    // Group by side and magnitude
    const homeMovements = this.recentMovements.filter(m => m.movement > 0);
    const awayMovements = this.recentMovements.filter(m => m.movement < 0);

    // Check for steam on home side
    if (homeMovements.length >= this.minBooks) {
      const uniqueBooks = new Set(homeMovements.map(m => m.book));
      if (uniqueBooks.size >= this.minBooks) {
        const avgMagnitude = homeMovements.reduce((sum, m) => sum + Math.abs(m.movement), 0) / homeMovements.length;
        const minMagnitude = movement.sport === 'NFL' ? 0.5 : 1.5;

        if (avgMagnitude >= minMagnitude) {
          const velocity = homeMovements.length / (this.timeWindow / 1000 / 60); // Moves per minute

          return {
            detected: true,
            side: 'home',
            magnitude: avgMagnitude,
            velocity,
            booksAffected: Array.from(uniqueBooks),
            timestamp: new Date(),
            score: Math.min(0.25, (avgMagnitude / 2) * (velocity / 10)),
          };
        }
      }
    }

    // Check for steam on away side
    if (awayMovements.length >= this.minBooks) {
      const uniqueBooks = new Set(awayMovements.map(m => m.book));
      if (uniqueBooks.size >= this.minBooks) {
        const avgMagnitude = awayMovements.reduce((sum, m) => sum + Math.abs(m.movement), 0) / awayMovements.length;
        const minMagnitude = movement.sport === 'NFL' ? 0.5 : 1.5;

        if (avgMagnitude >= minMagnitude) {
          const velocity = awayMovements.length / (this.timeWindow / 1000 / 60);

          return {
            detected: true,
            side: 'away',
            magnitude: avgMagnitude,
            velocity,
            booksAffected: Array.from(uniqueBooks),
            timestamp: new Date(),
            score: -Math.min(0.25, (avgMagnitude / 2) * (velocity / 10)), // Negative for away
          };
        }
      }
    }

    return null;
  }

  /**
   * Reset detector (for new game)
   */
  reset(): void {
    this.recentMovements = [];
  }
}

/**
 * Pro Edge Calculator
 * Calculates handle vs ticket gap (sharp money indicator)
 */
export class ProEdgeCalculator {
  /**
   * Calculate Pro Edge from betting splits
   */
  calculate(splits: BettingSplit[]): ProEdge[] {
    const results: ProEdge[] = [];

    for (const split of splits) {
      const gap = split.handlePercentage - split.ticketPercentage;

      // Significant gap indicates sharp money
      // Gap > 15% = strong sharp signal
      // Gap < -15% = public heavy (fade signal)

      let score = 0;
      if (Math.abs(gap) >= 15) {
        // Strong signal
        score = (gap / 100) * 0.25; // Scale to -0.25 to +0.25
      } else if (Math.abs(gap) >= 10) {
        // Moderate signal
        score = (gap / 100) * 0.15;
      } else if (Math.abs(gap) >= 5) {
        // Weak signal
        score = (gap / 100) * 0.08;
      }

      results.push({
        detected: Math.abs(gap) >= 10,
        team: split.team,
        ticketPct: split.ticketPercentage,
        handlePct: split.handlePercentage,
        gap,
        score: Math.max(-0.25, Math.min(0.25, score)),
      });
    }

    return results;
  }
}

/**
 * Line Freeze Detector
 * Detects when line doesn't move despite heavy public action
 */
export class LineFreezeDetector {
  private lineHistory: Array<{ timestamp: Date; line: number }> = [];
  private readonly freezeThreshold = 0.25; // Line must not move more than 0.25 points
  private readonly minDuration = 30 * 60 * 1000; // 30 minutes
  private readonly minPublicPct = 75; // At least 75% public on one side

  /**
   * Check for line freeze
   */
  detect(
    currentLine: number,
    publicTicketPct: number,
    isHomeFavorite: boolean
  ): LineFreeze | null {

    // Add current line to history
    this.lineHistory.push({
      timestamp: new Date(),
      line: currentLine,
    });

    // Clean old history (keep last 2 hours)
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
    this.lineHistory = this.lineHistory.filter(h => h.timestamp >= cutoff);

    if (this.lineHistory.length < 2) {
      return null;
    }

    // Check if public is heavily on one side
    const publicOnFavorite = isHomeFavorite
      ? publicTicketPct > 50
      : publicTicketPct < 50;

    const publicStrength = publicOnFavorite
      ? Math.abs(publicTicketPct - 50) * 2
      : Math.abs((100 - publicTicketPct) - 50) * 2;

    if (publicStrength < this.minPublicPct) {
      return null; // Not enough public action
    }

    // Check if line has been stable
    const oldestLine = this.lineHistory[0].line;
    const lineStability = Math.abs(currentLine - oldestLine) <= this.freezeThreshold;

    if (!lineStability) {
      return null; // Line is moving
    }

    // Calculate duration of freeze
    const duration = (this.lineHistory[this.lineHistory.length - 1].timestamp.getTime() -
                     this.lineHistory[0].timestamp.getTime()) / (1000 * 60); // minutes

    if (duration < this.minDuration / (1000 * 60)) {
      return null; // Not frozen long enough
    }

    // Line freeze detected - books are comfortable taking public money
    // This means they believe the opposite side will cover
    const sharpSide = publicOnFavorite ? (isHomeFavorite ? 'away' : 'home') : (isHomeFavorite ? 'home' : 'away');

    let score = 0;
    if (sharpSide === 'home') {
      score = 0.15; // Sharps on home
    } else {
      score = -0.15; // Sharps on away
    }

    // Adjust score based on public strength and duration
    const strengthMultiplier = Math.min(publicStrength / 100, 1);
    const durationMultiplier = Math.min(duration / 60, 1); // Max at 60 minutes
    score *= (strengthMultiplier * 0.7 + durationMultiplier * 0.3);

    return {
      detected: true,
      publicTicketPct,
      lineStable: true,
      duration,
      score: Math.max(-0.25, Math.min(0.25, score)),
    };
  }

  /**
   * Reset detector
   */
  reset(): void {
    this.lineHistory = [];
  }
}
