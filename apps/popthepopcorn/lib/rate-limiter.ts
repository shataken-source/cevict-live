/**
 * Rate Limiting Middleware
 * Prevents abuse of public API endpoints
 */

interface RateLimitStore {
  count: number
  resetTime: number
  blocked: boolean
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitStore>()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  blockDurationMs?: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
  blockDurationMs: 15 * 60 * 1000, // 15 minutes
}

/**
 * Check rate limit for a given identifier (IP, user ID, etc.)
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): RateLimitResult {
  const now = Date.now()
  const key = identifier
  const stored = rateLimitStore.get(key)

  // If blocked, check if block duration has passed
  if (stored?.blocked) {
    if (now < stored.resetTime) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: stored.resetTime,
        retryAfter: Math.ceil((stored.resetTime - now) / 1000),
      }
    } else {
      // Block expired, reset
      rateLimitStore.delete(key)
    }
  }

  // Get or create entry
  const entry = stored || {
    count: 0,
    resetTime: now + config.windowMs,
    blocked: false,
  }

  // Check if window has expired
  if (now >= entry.resetTime) {
    entry.count = 0
    entry.resetTime = now + config.windowMs
    entry.blocked = false
  }

  // Check limit
  if (entry.count >= config.maxRequests) {
    // Block if configured
    if (config.blockDurationMs) {
      entry.blocked = true
      entry.resetTime = now + config.blockDurationMs
    } else {
      // Just reset the window
      entry.resetTime = now + config.windowMs
    }

    rateLimitStore.set(key, entry)

    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    }
  }

  // Increment count
  entry.count++
  rateLimitStore.set(key, entry)

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Get client IP from request
 */
export function getClientIp(request: Request): string {
  // Check headers (Vercel, Cloudflare, etc.)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }

  // Fallback (won't work in serverless, but good for local dev)
  return 'unknown'
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Public write endpoints (strict)
  publicWrite: {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
    blockDurationMs: 15 * 60 * 1000, // 15 minutes
  },
  // Public read endpoints (more lenient)
  publicRead: {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
  },
  // Admin endpoints (very strict)
  admin: {
    maxRequests: 30,
    windowMs: 60000, // 1 minute
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
  },
  // Login attempts (very strict)
  login: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
  },
} as const
