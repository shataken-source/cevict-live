/**
 * Line Movement Tracker for Phase 3 (Information Asymmetry Index)
 */

export interface LineMovement {
  gameId: string;
  timestamp: Date;
  openingLine: number;
  currentLine: number;
  movementAmount: number;
  movementDirection: 'toward_home' | 'toward_away' | 'stable';
  publicTicketPct?: number;
  publicHandlePct?: number;
  sharpIndicator: boolean;
}

export class LineMovementTracker {
  private movements: Map<string, LineMovement[]> = new Map();

  /**
   * Track line movement for a game
   */
  trackMovement(
    gameId: string,
    currentLine: number,
    openingLine?: number,
    publicTicketPct?: number,
    publicHandlePct?: number
  ): LineMovement {

    const existing = this.movements.get(gameId) || [];
    const lastMovement = existing[existing.length - 1];

    const opening = openingLine ?? lastMovement?.openingLine ?? currentLine;
    const movementAmount = currentLine - opening;

    let movementDirection: 'toward_home' | 'toward_away' | 'stable' = 'stable';
    if (Math.abs(movementAmount) > 0.5) {
      movementDirection = movementAmount > 0 ? 'toward_away' : 'toward_home';
    }

    // Detect sharp money indicator
    // Reverse line movement: public on one side, line moves the other way
    const sharpIndicator = this.detectSharpMoney(
      movementAmount,
      publicTicketPct,
      publicHandlePct
    );

    const movement: LineMovement = {
      gameId,
      timestamp: new Date(),
      openingLine: opening,
      currentLine,
      movementAmount,
      movementDirection,
      publicTicketPct,
      publicHandlePct,
      sharpIndicator,
    };

    existing.push(movement);
    this.movements.set(gameId, existing);

    return movement;
  }

  /**
   * Detect sharp money (reverse line movement)
   */
  private detectSharpMoney(
    movementAmount: number,
    publicTicketPct?: number,
    publicHandlePct?: number
  ): boolean {

    if (publicTicketPct === undefined) {
      return false;
    }

    // If public is heavily on one side (>60%) but line moves the other way
    const publicOnHome = publicTicketPct > 0.5;
    const lineMovedAway = movementAmount > 0.5; // Line moved toward away team

    // Reverse line movement: public on home, but line moved toward away = sharp money on away
    if (publicOnHome && lineMovedAway) {
      return true;
    }

    // Public on away, but line moved toward home = sharp money on home
    if (!publicOnHome && movementAmount < -0.5) {
      return true;
    }

    // Handle vs ticket gap (sharp money indicator)
    if (publicHandlePct !== undefined && publicTicketPct !== undefined) {
      const gap = Math.abs(publicHandlePct - publicTicketPct);
      // Large gap (>15%) suggests sharp money
      if (gap > 0.15) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get movement history for a game
   */
  getMovementHistory(gameId: string): LineMovement[] {
    return this.movements.get(gameId) || [];
  }

  /**
   * Get latest movement for a game
   */
  getLatestMovement(gameId: string): LineMovement | null {
    const history = this.getMovementHistory(gameId);
    return history.length > 0 ? history[history.length - 1] : null;
  }
}

