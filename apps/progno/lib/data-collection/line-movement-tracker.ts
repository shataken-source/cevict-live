/**
 * Line Movement Tracker
 * Tracks odds movement over time to identify sharp money
 * Hardened with validation, persistence limits, error handling, and memory safety
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

export class LineMovementTracker {
  private snapshotsPath: string;
  private snapshots: OddsSnapshot[] = [];
  private readonly MAX_SNAPSHOTS_PER_GAME = 50; // Prevent memory bloat
  private readonly MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor() {
    const prognoDir = path.join(process.cwd(), '.progno');
    if (!fs.existsSync(prognoDir)) {
      fs.mkdirSync(prognoDir, { recursive: true });
    }
    this.snapshotsPath = path.join(prognoDir, 'line-movement-snapshots.json');
    this.loadSnapshots();
  }

  private loadSnapshots(): void {
    try {
      if (fs.existsSync(this.snapshotsPath)) {
        const raw = fs.readFileSync(this.snapshotsPath, 'utf8');
        const parsed = JSON.parse(raw);
        this.snapshots = parsed.map((s: any) => ({
          ...s,
          timestamp: new Date(s.timestamp)
        }));
        this.cleanOldSnapshots();
      }
    } catch (error) {
      console.error('[LineMovement] Failed to load snapshots:', error);
      this.snapshots = [];
    }
  }

  private saveSnapshots(): void {
    try {
      fs.writeFileSync(this.snapshotsPath, JSON.stringify(this.snapshots, null, 2), 'utf8');
    } catch (error) {
      console.error('[LineMovement] Failed to save snapshots:', error);
    }
  }

  recordSnapshot(
    gameId: string,
    sport: string,
    spread?: number,
    total?: number,
    moneylineHome?: number,
    moneylineAway?: number,
    bookmaker?: string
  ): void {
    if (!gameId || !sport) {
      console.warn('[LineMovement] Invalid snapshot: missing gameId or sport');
      return;
    }

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

    // Clean old entries for this game
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    this.snapshots = this.snapshots.filter(s => 
      s.gameId !== gameId || s.timestamp.getTime() > oneDayAgo
    );

    // Limit per game
    const gameSnapshots = this.snapshots.filter(s => s.gameId === gameId);
    if (gameSnapshots.length >= this.MAX_SNAPSHOTS_PER_GAME) {
      this.snapshots = this.snapshots.filter(s => s.gameId !== gameId);
      this.snapshots.push(...gameSnapshots.slice(-this.MAX_SNAPSHOTS_PER_GAME + 1));
    }

    this.snapshots.push(snapshot);
    this.saveSnapshots();
  }

  getMovement(gameId: string): LineMovement | null {
    if (!gameId) return null;

    const gameSnapshots = this.snapshots
      .filter(s => s.gameId === gameId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (gameSnapshots.length === 0) return null;

    const opening = gameSnapshots[0];
    const current = gameSnapshots[gameSnapshots.length - 1];

    let movementDirection: 'toward_home' | 'toward_away' | 'stable' = 'stable';

    if (opening.spread !== undefined && current.spread !== undefined) {
      const change = current.spread - opening.spread;
      if (Math.abs(change) > 0.5) {
        movementDirection = change < 0 ? 'toward_home' : 'toward_away';
      }
    }

    const sharpMoneyIndicator = this.identifySharpMoney(
      opening.spread,
      current.spread,
      movementDirection
    );

    return {
      gameId,
      openingSpread: opening.spread,
      currentSpread: current.spread,
      openingTotal: opening.total,
      currentTotal: current.total,
      movementDirection,
      sharpMoneyIndicator
    };
  }

  private identifySharpMoney(
    openingSpread?: number,
    currentSpread?: number,
    direction: 'toward_home' | 'toward_away' | 'stable' = 'stable'
  ): 'home' | 'away' | 'none' {
    if (openingSpread === undefined || currentSpread === undefined) return 'none';

    const change = Math.abs(currentSpread - openingSpread);
    if (change < 1) return 'none';

    if (direction === 'toward_home') return 'home';
    if (direction === 'toward_away') return 'away';
    return 'none';
  }

  cleanOldSnapshots(): void {
    const cutoff = Date.now() - this.MAX_AGE_MS;
    const beforeCount = this.snapshots.length;
    this.snapshots = this.snapshots.filter(s => s.timestamp.getTime() > cutoff);
    const removed = beforeCount - this.snapshots.length;

    if (removed > 0) {
      console.log(`[LineMovement] Cleaned ${removed} old snapshots`);
      this.saveSnapshots();
    }
  }
}

export const lineMovementTracker = new LineMovementTracker();