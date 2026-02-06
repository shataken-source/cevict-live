/**
 * Retry Utility
 * 
 * Exponential backoff retry logic for API calls and operations
 */

async function retry(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    retryable = (error) => true, // Retry on all errors by default
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!retryable(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));

      // Exponential backoff
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Rate limiter - ensures operations don't exceed rate limits
 */
class RateLimiter {
  constructor(maxOperations, windowMs) {
    this.maxOperations = maxOperations;
    this.windowMs = windowMs;
    this.operations = [];
  }

  async waitIfNeeded() {
    const now = Date.now();
    
    // Remove old operations outside the window
    this.operations = this.operations.filter(time => now - time < this.windowMs);

    // If at limit, wait until oldest operation expires
    if (this.operations.length >= this.maxOperations) {
      const oldestOperation = this.operations[0];
      const waitTime = this.windowMs - (now - oldestOperation) + 100; // Add 100ms buffer
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // Record this operation
    this.operations.push(Date.now());
  }
}

module.exports = {
  retry,
  RateLimiter,
};
