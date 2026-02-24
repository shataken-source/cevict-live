/**
 * Enterprise-level rate limiting
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100 // 100 requests per 15 minutes
};

const ADMIN_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30 // 30 requests per minute
};

/**
 * Check rate limit
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = store[identifier];
  
  // Clean up old records
  if (record && record.resetTime < now) {
    delete store[identifier];
  }
  
  // Check if limit exceeded
  if (record && record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime
    };
  }
  
  // Create or update record
  if (!record) {
    store[identifier] = {
      count: 1,
      resetTime: now + config.windowMs
    };
  } else {
    store[identifier].count++;
  }
  
  return {
    allowed: true,
    remaining: config.maxRequests - store[identifier].count,
    resetTime: store[identifier].resetTime
  };
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  
  return `rate-limit:${ip}`;
}

/**
 * Rate limit middleware for API routes
 */
export function rateLimitMiddleware(config?: RateLimitConfig) {
  return (request: Request): { allowed: boolean; headers: Headers } => {
    const identifier = getClientIdentifier(request);
    const result = checkRateLimit(identifier, config);
    
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', String(config?.maxRequests || DEFAULT_CONFIG.maxRequests));
    headers.set('X-RateLimit-Remaining', String(result.remaining));
    headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)));
    
    if (!result.allowed) {
      headers.set('Retry-After', String(Math.ceil((result.resetTime - Date.now()) / 1000)));
    }
    
    return { allowed: result.allowed, headers };
  };
}

/**
 * Admin rate limit check
 */
export function checkAdminRateLimit(identifier: string) {
  return checkRateLimit(`admin:${identifier}`, ADMIN_CONFIG);
}












