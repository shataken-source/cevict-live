/**
 * Line Movement Tracker
 * Tracks odds movement over time to identify sharp money
 */

import fs from 'fs';
import path from 'path';

interface OddsSnapshot {
  gameId: string;
  sport: string;
  timestamp: Date;
  spread?: number;
  total?: number;
  moneylineHome?: number;
  moneylineAway?: number;
  bookmaker?: string;
}

interface LineMovement {
  gameId: string;
  openingSpread?: number;
  currentSpread?: number;
  openingTotal?: number;
  currentTotal?: number;
  movementDirection: 'toward_home' | 'toward_away' | 'stable';
  sharpMoneyIndicator?: 'home' | 'away' | 'none';
}

class LineMovementTracker {
  private snapshotsPath: string;
  private snapshots: OddsSnapshot[] = [];

  constructor() {
    const prognoDir = path.join(process.cwd(), '.progno');
    if (!fs.existsSync(prognoDir)) {
      fs.mkdirSync(prognoDir, { recursive: true });
    }
    this.snapshotsPath = path.join(prognoDir, 'line-movement-snapshots.json');
    this.loadSnapshots();
  }

  /**
   * Load snapshots from disk
   */
  private loadSnapshots(): void {
    try {
      if (fs.existsSync(this.snapshotsPath)) {
        const data = fs.readFileSync(this.snapshotsPath, 'utf8');
        const parsed = JSON.parse(data);
        this.snapshots = parsed.map((s: any) => ({
          ...s,
          timestamp: new Date(s.timestamp)
        }));
      }
    } catch (error) {
      console.error('[LineMovement] Failed to load snapshots:', error);
      this.snapshots = [];
    }
  }

  /**
   * Save snapshots to disk
   */
  private saveSnapshots(): void {
    try {
      fs.writeFileSync(this.snapshotsPath, JSON.stringify(this.snapshots, null, 2), 'utf8');
    } catch (error) {
      console.error('[LineMovement] Failed to save snapshots:', error);
    }
  }

  /**
   * Record current odds snapshot
   */
  recordSnapshot(
    gameId: string,
    sport: string,
    spread?: number,
    total?: number,
    moneylineHome?: number,
    moneylineAway?: number,
    bookmaker?: string
  ): void {
    const snapshot: OddsSnapshot = {
      gameId,
      sport,
      timestamp: new Date(),
      spread,
      total,
      moneylineHome,
      moneylineAway,
      bookmaker
    };

    // Remove old snapshots for this game (keep last 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    this.snapshots = this.snapshots.filter(s => 
      s.gameId !== gameId || s.timestamp.getTime() > oneDayAgo
    );

    this.snapshots.push(snapshot);
    this.saveSnapshots();
  }

  /**
   * Get line movement for a game
   */
  getMovement(gameId: string): LineMovement | null {
    const gameSnapshots = this.snapshots
      .filter(s => s.gameId === gameId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (gameSnapshots.length === 0) return null;

    const opening = gameSnapshots[0];
    const current = gameSnapshots[gameSnapshots.length - 1];

    const openingSpread = opening.spread;
    const currentSpread = current.spread;
    const openingTotal = opening.total;
    const currentTotal = current.total;

    // Determine movement direction
    let movementDirection: 'toward_home' | 'toward_away' | 'stable' = 'stable';
    if (openingSpread !== undefined && currentSpread !== undefined) {
      const spreadChange = currentSpread - openingSpread;
      if (Math.abs(spreadChange) > 0.5) {
        // Negative spread means home favored, so decrease = more home favor
        movementDirection = spreadChange < 0 ? 'toward_home' : 'toward_away';
      }
    }

    // Identify sharp money (simplified heuristic)
    // Sharp money often moves line against public betting
    const sharpMoneyIndicator = this.identifySharpMoney(
      openingSpread,
      currentSpread,
      movementDirection
    );

    return {
      gameId,
      openingSpread,
      currentSpread,
      openingTotal,
      currentTotal,
      movementDirection,
      sharpMoneyIndicator
    };
  }

  /**
   * Identify sharp money indicator (simplified)
   */
  private identifySharpMoney(
    openingSpread?: number,
    currentSpread?: number,
    direction: 'toward_home' | 'toward_away' | 'stable' = 'stable'
  ): 'home' | 'away' | 'none' {
    if (!openingSpread || !currentSpread) return 'none';

    const change = Math.abs(currentSpread - openingSpread);
    if (change < 1) return 'none'; // Not significant movement

    // If line moves significantly, sharp money is likely on the side it moved toward
    // (This is simplified - real sharp money detection is more complex)
    if (direction === 'toward_home') return 'home';
    if (direction === 'toward_away') return 'away';
    return 'none';
  }

  /**
   * Clean old snapshots (older than 7 days)
   */
  cleanOldSnapshots(): void {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    this.snapshots = this.snapshots.filter(s => 
      s.timestamp.getTime() > sevenDaysAgo
    );
    this.saveSnapshots();
  }
}

export const lineMovementTracker = new LineMovementTracker();

