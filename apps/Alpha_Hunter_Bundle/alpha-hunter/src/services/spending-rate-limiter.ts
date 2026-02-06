/**
 * SPENDING RATE LIMITER
 * Prevents rapid capital deployment
 * Max $10 per 5 minutes
 * [STATUS: TESTED] - Production-ready rate limiting
 */

export class SpendingRateLimiter {
  private spendingHistory: Array<{ timestamp: number; amount: number }> = [];
  private readonly MAX_SPEND_PER_WINDOW = 10; // $10
  private readonly WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if spending is allowed
   */
  canSpend(amount: number): { allowed: boolean; reason?: string; waitMs?: number } {
    const now = Date.now();
    const windowStart = now - this.WINDOW_MS;

    // Remove old entries
    this.spendingHistory = this.spendingHistory.filter(e => e.timestamp > windowStart);

    // Calculate total spent in window
    const totalSpent = this.spendingHistory.reduce((sum, e) => sum + e.amount, 0);

    if (totalSpent + amount > this.MAX_SPEND_PER_WINDOW) {
      // Find when we can spend again
      const oldestEntry = this.spendingHistory[0];
      if (oldestEntry) {
        const waitMs = (oldestEntry.timestamp + this.WINDOW_MS) - now;
        return {
          allowed: false,
          reason: `Rate limit: $${totalSpent.toFixed(2)} spent in last 5 minutes (max $${this.MAX_SPEND_PER_WINDOW})`,
          waitMs: Math.max(0, waitMs),
        };
      }
      return {
        allowed: false,
        reason: `Rate limit: $${totalSpent.toFixed(2)} spent in last 5 minutes (max $${this.MAX_SPEND_PER_WINDOW})`,
      };
    }

    return { allowed: true };
  }

  /**
   * Record a spend
   */
  recordSpend(amount: number): void {
    this.spendingHistory.push({
      timestamp: Date.now(),
      amount,
    });
  }

  /**
   * Get current spending in window
   */
  getCurrentSpending(): number {
    const now = Date.now();
    const windowStart = now - this.WINDOW_MS;
    this.spendingHistory = this.spendingHistory.filter(e => e.timestamp > windowStart);
    return this.spendingHistory.reduce((sum, e) => sum + e.amount, 0);
  }

  /**
   * Clear history
   */
  clear(): void {
    this.spendingHistory = [];
  }
}

