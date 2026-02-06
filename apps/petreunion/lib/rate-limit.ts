/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or a dedicated service
 */

import type { NextRequest } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private windowMs: number;
  private maxRequests: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  check(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.store[identifier];

    if (!entry || entry.resetTime < now) {
      // Create new window
      this.store[identifier] = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt: now + this.windowMs,
      };
    }

    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetTime,
      };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetAt: entry.resetTime,
    };
  }
}

// Create rate limiters for different endpoints
export const reportRateLimiter = new RateLimiter(10, 60000); // 10 requests per minute
export const searchRateLimiter = new RateLimiter(30, 60000); // 30 requests per minute
export const petOfDayRateLimiter = new RateLimiter(5, 3600000); // 5 requests per hour

/**
 * Get client identifier from request
 */
export function getClientId(request: NextRequest): string {
  // Try to get IP from headers (works with Vercel, Cloudflare, etc.)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  
  return ip;
}

/**
 * Rate limit middleware for Next.js API routes
 */
export function rateLimit(
  limiter: RateLimiter,
  identifier?: string
): (request: Request) => { allowed: boolean; remaining: number; resetAt: number } {
  return (request: Request) => {
    const id = identifier || getClientId(request);
    return limiter.check(id);
  };
}
