// Enterprise-grade rate limiting for high traffic
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  limit(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Get existing requests for this key
    let keyRequests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    keyRequests = keyRequests.filter(time => time > windowStart);
    
    // Check if limit exceeded
    if (keyRequests.length >= config.maxRequests) {
      return false;
    }
    
    // Add current request
    keyRequests.push(now);
    this.requests.set(key, keyRequests);
    
    return true;
  }

  reset(key: string): void {
    this.requests.delete(key);
  }

  // Cleanup old entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, times] of this.requests.entries()) {
      const validTimes = times.filter(t => t > now - 3600000); // 1 hour
      if (validTimes.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimes);
      }
    }
  }
}

export const rateLimiter = new RateLimiter();

// Cleanup every 5 minutes
setInterval(() => rateLimiter.cleanup(), 300000);

// Rate limit configs for different operations
export const RATE_LIMITS = {
  BOOKING: { maxRequests: 5, windowMs: 60000 }, // 5 bookings per minute
  PAYMENT: { maxRequests: 3, windowMs: 60000 }, // 3 payments per minute
  MESSAGE: { maxRequests: 30, windowMs: 60000 }, // 30 messages per minute
  API: { maxRequests: 100, windowMs: 60000 }, // 100 API calls per minute
  AUTH: { maxRequests: 5, windowMs: 300000 }, // 5 auth attempts per 5 minutes
};
