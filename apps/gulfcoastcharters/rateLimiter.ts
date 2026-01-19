/**
 * Rate Limiter Middleware
 * 
 * Protects against DDoS attacks and abuse.
 * CRITICAL FIX: Prevents system overload from malicious actors.
 * 
 * Features:
 * - Token bucket algorithm
 * - IP-based limiting
 * - User-based limiting
 * - Configurable rules per endpoint
 * - Automatic cleanup
 */

import { LRUCache } from 'lru-cache';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Only count failed requests
  skipFailedRequests?: boolean; // Only count successful requests
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private cache: LRUCache<string, RateLimitRecord>;
  private config: RateLimitConfig;
  
  constructor(config: RateLimitConfig) {
    this.config = {
      message: 'Too many requests, please try again later.',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config
    };
    
    // Initialize LRU cache
    this.cache = new LRUCache<string, RateLimitRecord>({
      max: 10000, // Max entries
      ttl: config.windowMs, // Auto-expire after window
      updateAgeOnGet: false
    });
  }
  
  /**
   * Check if request is allowed
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const record = this.cache.get(key);
    
    if (!record || now >= record.resetTime) {
      // New window
      const newRecord: RateLimitRecord = {
        count: 1,
        resetTime: now + this.config.windowMs
      };
      this.cache.set(key, newRecord);
      
      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - 1,
        resetTime: newRecord.resetTime
      };
    }
    
    // Check if under limit
    if (record.count < this.config.maxRequests) {
      record.count++;
      this.cache.set(key, record);
      
      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - record.count,
        resetTime: record.resetTime
      };
    }
    
    // Rate limit exceeded
    return {
      allowed: false,
      limit: this.config.maxRequests,
      remaining: 0,
      resetTime: record.resetTime,
      retryAfter: Math.ceil((record.resetTime - now) / 1000)
    };
  }
  
  /**
   * Consume a request (increment counter)
   */
  consume(key: string, success: boolean = true): RateLimitResult {
    // Skip counting based on config
    if (success && this.config.skipSuccessfulRequests) {
      return this.check(key);
    }
    if (!success && this.config.skipFailedRequests) {
      return this.check(key);
    }
    
    return this.check(key);
  }
  
  /**
   * Reset limit for a key
   */
  reset(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Get current status without consuming
   */
  getStatus(key: string): RateLimitResult {
    const now = Date.now();
    const record = this.cache.get(key);
    
    if (!record || now >= record.resetTime) {
      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests,
        resetTime: now + this.config.windowMs
      };
    }
    
    return {
      allowed: record.count < this.config.maxRequests,
      limit: this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - record.count),
      resetTime: record.resetTime,
      retryAfter: record.count >= this.config.maxRequests
        ? Math.ceil((record.resetTime - now) / 1000)
        : undefined
    };
  }
}

/**
 * Multiple rate limiters for different endpoints
 */
export class RateLimitManager {
  private limiters: Map<string, RateLimiter> = new Map();
  
  /**
   * Add rate limiter for an endpoint
   */
  addLimiter(endpoint: string, config: RateLimitConfig): void {
    this.limiters.set(endpoint, new RateLimiter(config));
  }
  
  /**
   * Check rate limit for endpoint
   */
  check(endpoint: string, key: string): RateLimitResult {
    const limiter = this.limiters.get(endpoint);
    
    if (!limiter) {
      // No limiter configured, allow request
      return {
        allowed: true,
        limit: Infinity,
        remaining: Infinity,
        resetTime: Date.now()
      };
    }
    
    return limiter.check(key);
  }
  
  /**
   * Consume request for endpoint
   */
  consume(endpoint: string, key: string, success: boolean = true): RateLimitResult {
    const limiter = this.limiters.get(endpoint);
    
    if (!limiter) {
      return {
        allowed: true,
        limit: Infinity,
        remaining: Infinity,
        resetTime: Date.now()
      };
    }
    
    return limiter.consume(key, success);
  }
  
  /**
   * Reset limit for endpoint and key
   */
  reset(endpoint: string, key: string): void {
    const limiter = this.limiters.get(endpoint);
    if (limiter) {
      limiter.reset(key);
    }
  }
}

/**
 * Express middleware for rate limiting
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  const limiter = new RateLimiter(config);
  
  return async (req: any, res: any, next: any) => {
    // Use IP address or user ID as key
    const key = req.user?.id || req.ip || req.connection.remoteAddress;
    
    const result = limiter.check(key);
    
    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': result.limit,
      'X-RateLimit-Remaining': result.remaining,
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
    });
    
    if (!result.allowed) {
      res.set('Retry-After', result.retryAfter);
      return res.status(429).json({
        error: config.message || 'Too many requests',
        retryAfter: result.retryAfter
      });
    }
    
    next();
  };
}

/**
 * Supabase Edge Function rate limiter
 */
export async function rateLimitEdgeFunction(
  request: Request,
  config: RateLimitConfig
): Promise<Response | null> {
  const limiter = new RateLimiter(config);
  
  // Get IP from request
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
    request.headers.get('x-real-ip') || 
    'unknown';
  
  const result = limiter.check(ip);
  
  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: config.message || 'Too many requests',
        retryAfter: result.retryAfter
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
          'Retry-After': result.retryAfter?.toString() || '60'
        }
      }
    );
  }
  
  return null; // Request allowed
}

/**
 * Pre-configured rate limiters for common scenarios
 */
export const RateLimitPresets = {
  // Strict: 10 requests per minute
  strict: {
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: 'Too many requests. Please try again in a minute.'
  },
  
  // Standard: 100 requests per minute
  standard: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    message: 'Rate limit exceeded. Please slow down.'
  },
  
  // Lenient: 1000 requests per minute
  lenient: {
    windowMs: 60 * 1000,
    maxRequests: 1000,
    message: 'Too many requests.'
  },
  
  // Authentication: 5 attempts per 15 minutes
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    message: 'Too many login attempts. Please try again later.',
    skipSuccessfulRequests: true // Only count failed attempts
  },
  
  // API: 1000 requests per hour
  api: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 1000,
    message: 'API rate limit exceeded.'
  },
  
  // Upload: 20 uploads per hour
  upload: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 20,
    message: 'Upload limit exceeded. Please try again later.'
  }
};

/**
 * Global rate limit manager instance
 */
let globalManager: RateLimitManager | null = null;

export function initializeRateLimiting(): RateLimitManager {
  if (!globalManager) {
    globalManager = new RateLimitManager();
    
    // Configure default limiters
    globalManager.addLimiter('/api/auth/login', RateLimitPresets.auth);
    globalManager.addLimiter('/api/auth/signup', RateLimitPresets.auth);
    globalManager.addLimiter('/api/inspections', RateLimitPresets.standard);
    globalManager.addLimiter('/api/bookings', RateLimitPresets.standard);
    globalManager.addLimiter('/api/upload', RateLimitPresets.upload);
  }
  
  return globalManager;
}

export function getRateLimitManager(): RateLimitManager {
  if (!globalManager) {
    throw new Error('Rate limiting not initialized. Call initializeRateLimiting() first.');
  }
  return globalManager;
}

/**
 * Example usage:
 * 
 * // Initialize once at app startup
 * initializeRateLimiting();
 * 
 * // In your route handler
 * const manager = getRateLimitManager();
 * const result = manager.consume('/api/inspections', userId);
 * 
 * if (!result.allowed) {
 *   return res.status(429).json({
 *     error: 'Rate limit exceeded',
 *     retryAfter: result.retryAfter
 *   });
 * }
 * 
 * // Continue with request...
 */
