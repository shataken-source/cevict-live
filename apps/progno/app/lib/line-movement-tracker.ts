/**
 * Line Movement Tracker Service
 * Tracks opening lines vs current lines, detects steam moves and reverse line movement
 */

export interface LineSnapshot {
  timestamp: string;
  moneyline?: { home: number; away: number };
  spread?: { line: number; home: number; away: number };
  total?: { line: number; over: number; under: number };
  source: string;
}

export interface LineMovement {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  market: 'moneyline' | 'spread' | 'total';
  openingLine: number;
  currentLine: number;
  movement: number;
  movementPercent: number;
  direction: 'towardFavorite' | 'towardUnderdog' | 'neutral';
  steamMove: boolean;
  reverseLineMovement: boolean;
  lastUpdated: string;
}

export interface SteamMoveAlert {
  gameId: string;
  sport: string;
  market: string;
  pointsMoved: number;
  timeWindow: number; // minutes
  detectedAt: string;
  severity: 'low' | 'medium' | 'high';
}

export class LineMovementTracker {
  private lineHistory: Map<string, LineSnapshot[]> = new Map();
  private readonly STEAM_MOVE_THRESHOLD = 2; // points moved
  private readonly STEAM_MOVE_WINDOW = 15; // minutes

  /**
   * Record a new line snapshot
   */
  recordLine(
    gameId: string,
    sport: string,
    homeTeam: string,
    awayTeam: string,
    snapshot: LineSnapshot
  ): void {
    const key = this.getKey(gameId, sport, homeTeam, awayTeam);
    
    if (!this.lineHistory.has(key)) {
      this.lineHistory.set(key, []);
    }

    const history = this.lineHistory.get(key)!;
    history.push(snapshot);

    // Keep only last 24 hours of data
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const filtered = history.filter(h => new Date(h.timestamp) > cutoff);
    this.lineHistory.set(key, filtered);
  }

  /**
   * Get line movement for a specific game and market
   */
  getLineMovement(
    gameId: string,
    sport: string,
    homeTeam: string,
    awayTeam: string,
    market: 'moneyline' | 'spread' | 'total'
  ): LineMovement | null {
    const key = this.getKey(gameId, sport, homeTeam, awayTeam);
    const history = this.lineHistory.get(key);

    if (!history || history.length < 2) return null;

    const opening = history[0];
    const current = history[history.length - 1];

    let openingLine: number;
    let currentLine: number;

    switch (market) {
      case 'moneyline':
        openingLine = opening.moneyline?.home || 0;
        currentLine = current.moneyline?.home || 0;
        break;
      case 'spread':
        openingLine = opening.spread?.line || 0;
        currentLine = current.spread?.line || 0;
        break;
      case 'total':
        openingLine = opening.total?.line || 0;
        currentLine = current.total?.line || 0;
        break;
      default:
        return null;
    }

    const movement = currentLine - openingLine;
    const movementPercent = Math.abs(movement) / Math.abs(openingLine) * 100;

    // Detect steam move (rapid movement)
    const steamMove = this.detectSteamMove(history, market);

    // Detect reverse line movement
    const reverseLineMovement = this.detectReverseLineMovement(history, market);

    return {
      gameId,
      sport,
      homeTeam,
      awayTeam,
      market,
      openingLine,
      currentLine,
      movement,
      movementPercent,
      direction: this.getDirection(movement, market),
      steamMove: steamMove !== null,
      reverseLineMovement,
      lastUpdated: current.timestamp,
    };
  }

  /**
   * Detect steam moves (rapid line shifts)
   */
  private detectSteamMove(
    history: LineSnapshot[],
    market: 'moneyline' | 'spread' | 'total'
  ): SteamMoveAlert | null {
    if (history.length < 2) return null;

    const now = new Date();
    const windowStart = new Date(now.getTime() - this.STEAM_MOVE_WINDOW * 60 * 1000);

    // Get snapshots within time window
    const recentSnapshots = history.filter(h => new Date(h.timestamp) >= windowStart);

    if (recentSnapshots.length < 2) return null;

    const first = recentSnapshots[0];
    const last = recentSnapshots[recentSnapshots.length - 1];

    let firstLine: number;
    let lastLine: number;

    switch (market) {
      case 'moneyline':
        firstLine = first.moneyline?.home || 0;
        lastLine = last.moneyline?.home || 0;
        break;
      case 'spread':
        firstLine = first.spread?.line || 0;
        lastLine = last.spread?.line || 0;
        break;
      case 'total':
        firstLine = first.total?.line || 0;
        lastLine = last.total?.line || 0;
        break;
    }

    const pointsMoved = Math.abs(lastLine - firstLine);

    if (pointsMoved >= this.STEAM_MOVE_THRESHOLD) {
      return {
        gameId: history[0].source, // Use source as proxy
        sport: 'unknown',
        market,
        pointsMoved,
        timeWindow: this.STEAM_MOVE_WINDOW,
        detectedAt: new Date().toISOString(),
        severity: pointsMoved > 5 ? 'high' : pointsMoved > 3 ? 'medium' : 'low',
      };
    }

    return null;
  }

  /**
   * Detect reverse line movement
   * (Line moves opposite to public betting percentage)
   */
  private detectReverseLineMovement(
    history: LineSnapshot[],
    market: 'moneyline' | 'spread' | 'total'
  ): boolean {
    // This would integrate with public betting data
    // For now, placeholder logic: if line moves favorably despite no major news
    const movement = this.getLineMovementFromHistory(history, market);
    if (!movement) return false;

    // Simplified: consider it reverse movement if line moves >2 points
    // without corresponding public betting shift (would need public betting API)
    return Math.abs(movement) > 2;
  }

  private getLineMovementFromHistory(
    history: LineSnapshot[],
    market: 'moneyline' | 'spread' | 'total'
  ): number | null {
    if (history.length < 2) return null;

    const first = history[0];
    const last = history[history.length - 1];

    switch (market) {
      case 'moneyline':
        return (last.moneyline?.home || 0) - (first.moneyline?.home || 0);
      case 'spread':
        return (last.spread?.line || 0) - (first.spread?.line || 0);
      case 'total':
        return (last.total?.line || 0) - (first.total?.line || 0);
      default:
        return null;
    }
  }

  private getDirection(movement: number, market: 'moneyline' | 'spread' | 'total'): LineMovement['direction'] {
    if (market === 'moneyline') {
      // Positive movement means line moved toward underdog (better payout)
      return movement > 0 ? 'towardUnderdog' : movement < 0 ? 'towardFavorite' : 'neutral';
    } else {
      // For spreads/totals, smaller absolute value favors favorite/over
      return Math.abs(movement) < 0.5 ? 'neutral' : 'towardFavorite';
    }
  }

  private getKey(gameId: string, sport: string, homeTeam: string, awayTeam: string): string {
    return `${sport}-${gameId}-${homeTeam}-${awayTeam}`;
  }

  /**
   * Get all line movements for monitoring
   */
  getAllMovements(): LineMovement[] {
    const movements: LineMovement[] = [];

    for (const [key, history] of this.lineHistory.entries()) {
      if (history.length < 2) continue;

      const parts = key.split('-');
      const sport = parts[0];
      const gameId = parts[1];
      // homeTeam and awayTeam may contain hyphens, so reconstruct
      const teams = parts.slice(2).join('-').split('-');
      const mid = Math.floor(teams.length / 2);
      const homeTeam = teams.slice(0, mid).join('-');
      const awayTeam = teams.slice(mid).join('-');

      // Check all markets
      for (const market of ['moneyline', 'spread', 'total'] as const) {
        const movement = this.getLineMovement(gameId, sport, homeTeam, awayTeam, market);
        if (movement) {
          movements.push(movement);
        }
      }
    }

    return movements.sort((a, b) => 
      Math.abs(b.movement) - Math.abs(a.movement)
    );
  }
}

export default LineMovementTracker;
