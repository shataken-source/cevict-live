/**
 * SYNC DEDUPLICATOR
 * Prevents redundant syncs by hashing picks
 * [STATUS: TESTED] - Production-ready sync deduplication
 */

import * as crypto from 'crypto';

export interface Pick {
  marketId: string;
  title: string;
  side: string;
  confidence: number;
  edge: number;
  [key: string]: any;
}

export class SyncDeduplicator {
  private lastHash: string = '';

  /**
   * Generate hash of picks array
   */
  private hashPicks(picks: Pick[]): string {
    const normalized = picks
      .map(p => ({
        marketId: p.marketId,
        title: p.title,
        side: p.side,
        confidence: p.confidence,
        edge: p.edge,
      }))
      .sort((a, b) => a.marketId.localeCompare(b.marketId));

    const json = JSON.stringify(normalized);
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  /**
   * Check if picks have changed
   */
  hasChanged(picks: Pick[]): boolean {
    const currentHash = this.hashPicks(picks);
    if (currentHash !== this.lastHash) {
      this.lastHash = currentHash;
      return true;
    }
    return false;
  }

  /**
   * Reset hash (force next sync)
   */
  reset(): void {
    this.lastHash = '';
  }
}

