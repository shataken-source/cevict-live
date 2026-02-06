/**
 * Loop Prevention System
 * Prevents infinite loops, runaway processes, and repetitive failures
 */

interface ActionRecord {
  action: string;
  timestamp: number;
  hash: string;
}

interface CircuitState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
  resetAt?: number;
}

export class LoopPrevention {
  private actionHistory: ActionRecord[] = [];
  private circuitBreakers: Map<string, CircuitState> = new Map();
  private executionCounts: Map<string, number> = new Map();
  
  // Config
  private maxHistorySize = 1000;
  private duplicateWindowMs = 5000; // 5 seconds
  private maxDuplicates = 3;
  private circuitFailureThreshold = 5;
  private circuitResetMs = 60000; // 1 minute
  private maxExecutionsPerMinute = 100;

  /**
   * Check if action should be allowed (not a loop)
   */
  canExecute(action: string, payload?: any): { allowed: boolean; reason?: string } {
    const hash = this.hashAction(action, payload);
    const now = Date.now();

    // 1. Check circuit breaker
    const circuit = this.getCircuit(action);
    if (circuit.state === 'open') {
      if (now > (circuit.resetAt || 0)) {
        circuit.state = 'half-open';
      } else {
        return { allowed: false, reason: `Circuit open for "${action}" - too many failures` };
      }
    }

    // 2. Check for duplicate actions in time window
    const recentDuplicates = this.actionHistory.filter(
      r => r.hash === hash && (now - r.timestamp) < this.duplicateWindowMs
    ).length;

    if (recentDuplicates >= this.maxDuplicates) {
      return { 
        allowed: false, 
        reason: `Loop detected: "${action}" executed ${recentDuplicates} times in ${this.duplicateWindowMs}ms` 
      };
    }

    // 3. Check rate limit
    const minuteKey = `${action}_${Math.floor(now / 60000)}`;
    const execCount = this.executionCounts.get(minuteKey) || 0;
    if (execCount >= this.maxExecutionsPerMinute) {
      return { 
        allowed: false, 
        reason: `Rate limit: "${action}" exceeded ${this.maxExecutionsPerMinute}/minute` 
      };
    }

    return { allowed: true };
  }

  /**
   * Record an action execution
   */
  recordExecution(action: string, payload?: any): void {
    const hash = this.hashAction(action, payload);
    const now = Date.now();

    // Add to history
    this.actionHistory.push({ action, timestamp: now, hash });

    // Trim history
    if (this.actionHistory.length > this.maxHistorySize) {
      this.actionHistory = this.actionHistory.slice(-this.maxHistorySize);
    }

    // Update execution count
    const minuteKey = `${action}_${Math.floor(now / 60000)}`;
    this.executionCounts.set(minuteKey, (this.executionCounts.get(minuteKey) || 0) + 1);

    // Clean old execution counts
    this.cleanOldCounts(now);
  }

  /**
   * Record a failure
   */
  recordFailure(action: string): void {
    const circuit = this.getCircuit(action);
    circuit.failures++;
    circuit.lastFailure = Date.now();

    if (circuit.failures >= this.circuitFailureThreshold) {
      circuit.state = 'open';
      circuit.resetAt = Date.now() + this.circuitResetMs;
      console.warn(`🔴 Circuit OPEN for "${action}" after ${circuit.failures} failures`);
    }
  }

  /**
   * Record a success (resets circuit breaker)
   */
  recordSuccess(action: string): void {
    const circuit = this.getCircuit(action);
    if (circuit.state === 'half-open') {
      circuit.state = 'closed';
      circuit.failures = 0;
      console.log(`🟢 Circuit CLOSED for "${action}"`);
    }
  }

  /**
   * Get or create circuit breaker state
   */
  private getCircuit(action: string): CircuitState {
    if (!this.circuitBreakers.has(action)) {
      this.circuitBreakers.set(action, {
        failures: 0,
        lastFailure: 0,
        state: 'closed',
      });
    }
    return this.circuitBreakers.get(action)!;
  }

  /**
   * Hash an action for comparison
   */
  private hashAction(action: string, payload?: any): string {
    const str = payload ? `${action}:${JSON.stringify(payload)}` : action;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * Clean old execution counts
   */
  private cleanOldCounts(now: number): void {
    const currentMinute = Math.floor(now / 60000);
    for (const key of this.executionCounts.keys()) {
      const keyMinute = parseInt(key.split('_').pop() || '0');
      if (currentMinute - keyMinute > 5) {
        this.executionCounts.delete(key);
      }
    }
  }

  /**
   * Get status of all circuit breakers
   */
  getStatus(): object {
    const circuits: Record<string, any> = {};
    for (const [action, state] of this.circuitBreakers) {
      circuits[action] = {
        state: state.state,
        failures: state.failures,
        resetAt: state.resetAt ? new Date(state.resetAt).toISOString() : null,
      };
    }

    return {
      historySize: this.actionHistory.length,
      activeCircuits: this.circuitBreakers.size,
      circuits,
    };
  }

  /**
   * Reset a specific circuit
   */
  resetCircuit(action: string): void {
    this.circuitBreakers.delete(action);
    console.log(`🔄 Circuit reset for "${action}"`);
  }

  /**
   * Reset all circuits
   */
  resetAll(): void {
    this.circuitBreakers.clear();
    this.actionHistory = [];
    this.executionCounts.clear();
    console.log('🔄 All circuits and history reset');
  }

  /**
   * Wrap a function with loop prevention
   */
  wrap<T>(action: string, fn: () => Promise<T>): () => Promise<T> {
    return async () => {
      const check = this.canExecute(action);
      if (!check.allowed) {
        throw new Error(check.reason);
      }

      this.recordExecution(action);

      try {
        const result = await fn();
        this.recordSuccess(action);
        return result;
      } catch (error) {
        this.recordFailure(action);
        throw error;
      }
    };
  }
}

// Global instance
export const loopPrevention = new LoopPrevention();

