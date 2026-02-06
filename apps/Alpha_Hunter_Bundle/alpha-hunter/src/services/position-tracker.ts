/**
 * POSITION TRACKER SERVICE
 * Tracks open positions and prevents duplicate trades
 * [STATUS: TESTED] - Production-ready position deduplication
 */

export interface Position {
  id: string;
  symbol: string;
  platform: 'coinbase' | 'kalshi';
  entryTime: Date;
  amount: number;
}

export class PositionTracker {
  private positions: Map<string, Position> = new Map();
  private lastTradeTime: Map<string, number> = new Map(); // symbol -> timestamp
  private readonly COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if position already exists for symbol
   */
  hasOpenPosition(symbol: string, platform: 'coinbase' | 'kalshi'): boolean {
    for (const [id, pos] of this.positions) {
      if (pos.symbol === symbol && pos.platform === platform) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if symbol has a recent position (within time window)
   * Used for duplicate protection: skip if same symbol traded within 60 minutes
   */
  hasRecentPosition(
    symbol: string,
    platform: 'coinbase' | 'kalshi',
    timeWindowMs: number = 60 * 60 * 1000 // Default: 60 minutes
  ): { hasRecent: boolean; timeSinceEntry?: number } {
    const now = Date.now();
    for (const [id, pos] of this.positions) {
      if (pos.symbol === symbol && pos.platform === platform) {
        const timeSinceEntry = now - pos.entryTime.getTime();
        if (timeSinceEntry < timeWindowMs) {
          return { hasRecent: true, timeSinceEntry };
        }
      }
    }
    return { hasRecent: false };
  }

  /**
   * Check if symbol is on cooldown
   */
  isOnCooldown(symbol: string): { onCooldown: boolean; remainingMs?: number } {
    const lastTrade = this.lastTradeTime.get(symbol);
    if (!lastTrade) {
      return { onCooldown: false };
    }

    const elapsed = Date.now() - lastTrade;
    if (elapsed < this.COOLDOWN_MS) {
      return {
        onCooldown: true,
        remainingMs: this.COOLDOWN_MS - elapsed,
      };
    }

    return { onCooldown: false };
  }

  /**
   * Add a new position
   */
  addPosition(id: string, symbol: string, platform: 'coinbase' | 'kalshi', amount: number): void {
    this.positions.set(id, {
      id,
      symbol,
      platform,
      entryTime: new Date(),
      amount,
    });
    this.lastTradeTime.set(symbol, Date.now());
  }

  /**
   * Remove a position
   */
  removePosition(id: string): void {
    this.positions.delete(id);
  }

  /**
   * Get all positions for a platform
   */
  getPositions(platform?: 'coinbase' | 'kalshi'): Position[] {
    if (platform) {
      return Array.from(this.positions.values()).filter(p => p.platform === platform);
    }
    return Array.from(this.positions.values());
  }

  /**
   * Get position count
   */
  getPositionCount(platform?: 'coinbase' | 'kalshi'): number {
    if (platform) {
      return Array.from(this.positions.values()).filter(p => p.platform === platform).length;
    }
    return this.positions.size;
  }

  /**
   * Get total capital deployed
   */
  getTotalCapitalDeployed(): number {
    return Array.from(this.positions.values()).reduce((sum, p) => sum + p.amount, 0);
  }

  /**
   * Get capital deployed per symbol
   */
  getCapitalPerSymbol(): Map<string, number> {
    const capital = new Map<string, number>();
    for (const pos of this.positions.values()) {
      const current = capital.get(pos.symbol) || 0;
      capital.set(pos.symbol, current + pos.amount);
    }
    return capital;
  }

  /**
   * Clear all positions (for testing/reset)
   */
  clear(): void {
    this.positions.clear();
    this.lastTradeTime.clear();
  }
}

