/**
 * Circuit Breaker Pattern
 * Prevents cascading failures when external services are down
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failureThreshold: number; // Open circuit after N failures
  successThreshold: number; // Close circuit after N successes (half-open state)
  timeout: number; // Time to wait before trying again (ms)
  resetTimeout: number; // Time before attempting to close circuit (ms)
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 5000,
  resetTimeout: 60000, // 1 minute
};

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastSuccessTime: number;
}

class CircuitBreaker {
  private state: CircuitBreakerState;
  private config: CircuitBreakerConfig;
  private name: string;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      state: 'closed',
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.state.lastFailureTime;
      if (timeSinceLastFailure < this.config.resetTimeout) {
        throw new Error(`Circuit breaker is OPEN for ${this.name}. Retry after ${Math.ceil((this.config.resetTimeout - timeSinceLastFailure) / 1000)}s`);
      }
      // Try half-open state
      this.state.state = 'half-open';
      this.state.successes = 0;
    }

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Circuit breaker timeout for ${this.name}`)), this.config.timeout)
        ),
      ]);

      // Success - reset failures
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.state.lastSuccessTime = Date.now();
    this.state.failures = 0;

    if (this.state.state === 'half-open') {
      this.state.successes++;
      if (this.state.successes >= this.config.successThreshold) {
        this.state.state = 'closed';
        this.state.successes = 0;
        console.log(`[Circuit Breaker] ${this.name} closed - service recovered`);
      }
    }
  }

  private onFailure() {
    this.state.lastFailureTime = Date.now();
    this.state.failures++;
    this.state.successes = 0;

    if (this.state.failures >= this.config.failureThreshold) {
      this.state.state = 'open';
      console.error(`[Circuit Breaker] ${this.name} opened - ${this.state.failures} failures`);
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state.state;
  }

  /**
   * Manually reset circuit breaker
   */
  reset() {
    this.state = {
      state: 'closed',
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
    };
    console.log(`[Circuit Breaker] ${this.name} manually reset`);
  }
}

// Global circuit breakers for external services
export const circuitBreakers = {
  oddsApi: new CircuitBreaker('OddsAPI', { failureThreshold: 3, resetTimeout: 30000 }),
  sportsBlaze: new CircuitBreaker('SportsBlaze', { failureThreshold: 3, resetTimeout: 30000 }),
  claudeEffect: new CircuitBreaker('ClaudeEffect', { failureThreshold: 5, resetTimeout: 60000 }),
  simulation: new CircuitBreaker('Simulation', { failureThreshold: 10, resetTimeout: 120000 }),
};

