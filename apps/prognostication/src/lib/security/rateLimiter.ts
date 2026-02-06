/**
 * Rate Limiter
 * Stub implementation - to be expanded
 */

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining?: number;
}

export const apiRateLimiter = {
  async checkLimit(key: string): Promise<RateLimitResult> {
    // Stub: allow all requests for now
    return {
      allowed: true,
      remaining: 1000,
    };
  },
};
