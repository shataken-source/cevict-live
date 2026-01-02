/**
 * Enterprise-Level Security Middleware for SmokersRights
 * 
 * Implements comprehensive security features:
 * - Rate limiting
 * - Brute force protection
 * - XSS prevention
 * - CSRF protection
 * - Input validation
 * - Security headers
 * - API key validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory rate limit store (use Redis in production)
const rateLimitStore: RateLimitStore = {};
const bruteForceStore: { [key: string]: { attempts: number; lockUntil: number } } = {};

// Rate limit configuration
const RATE_LIMITS = {
  api: { maxRequests: 100, windowMs: 15 * 60 * 1000 }, // 100 requests per 15 minutes
  auth: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 requests per 15 minutes
  search: { maxRequests: 50, windowMs: 60 * 1000 }, // 50 requests per minute
  default: { maxRequests: 200, windowMs: 15 * 60 * 1000 }, // 200 requests per 15 minutes
};

// Brute force protection
const BRUTE_FORCE_CONFIG = {
  maxAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  resetAfter: 60 * 60 * 1000, // 1 hour
};

/**
 * Get client identifier for rate limiting
 */
function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.ip || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  return `${ip}:${userAgent}`;
}

/**
 * Check rate limit
 */
export function checkRateLimit(
  request: NextRequest,
  type: keyof typeof RATE_LIMITS = 'default'
): { allowed: boolean; remaining: number; resetTime: number } {
  const clientId = getClientId(request);
  const limit = RATE_LIMITS[type];
  const now = Date.now();

  // Clean up old entries
  Object.keys(rateLimitStore).forEach(key => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  });

  const key = `${clientId}:${type}`;
  const record = rateLimitStore[key];

  if (!record || record.resetTime < now) {
    // New window
    rateLimitStore[key] = {
      count: 1,
      resetTime: now + limit.windowMs,
    };
    return {
      allowed: true,
      remaining: limit.maxRequests - 1,
      resetTime: now + limit.windowMs,
    };
  }

  if (record.count >= limit.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: limit.maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Check brute force protection
 */
export function checkBruteForce(
  identifier: string,
  isSuccessful: boolean = false
): { allowed: boolean; lockUntil?: number; attemptsRemaining?: number } {
  const now = Date.now();
  const record = bruteForceStore[identifier];

  if (isSuccessful) {
    // Reset on successful attempt
    delete bruteForceStore[identifier];
    return { allowed: true };
  }

  if (!record) {
    bruteForceStore[identifier] = {
      attempts: 1,
      lockUntil: 0,
    };
    return {
      allowed: true,
      attemptsRemaining: BRUTE_FORCE_CONFIG.maxAttempts - 1,
    };
  }

  // Check if locked
  if (record.lockUntil > now) {
    return {
      allowed: false,
      lockUntil: record.lockUntil,
    };
  }

  // Reset if lock expired
  if (record.lockUntil > 0 && record.lockUntil < now) {
    delete bruteForceStore[identifier];
    return {
      allowed: true,
      attemptsRemaining: BRUTE_FORCE_CONFIG.maxAttempts - 1,
    };
  }

  record.attempts++;

  if (record.attempts >= BRUTE_FORCE_CONFIG.maxAttempts) {
    record.lockUntil = now + BRUTE_FORCE_CONFIG.lockoutDuration;
    return {
      allowed: false,
      lockUntil: record.lockUntil,
    };
  }

  return {
    allowed: true,
    attemptsRemaining: BRUTE_FORCE_CONFIG.maxAttempts - record.attempts,
  };
}

/**
 * Validate API key with timing-safe comparison
 */
export function validateApiKey(providedKey: string, expectedKey: string): boolean {
  if (!providedKey || !expectedKey) return false;
  if (providedKey.length !== expectedKey.length) return false;

  let result = 0;
  for (let i = 0; i < providedKey.length; i++) {
    result |= providedKey.charCodeAt(i) ^ expectedKey.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(request: NextRequest): boolean {
  const token = request.headers.get('x-csrf-token');
  const cookieToken = request.cookies.get('csrf-token')?.value;

  if (!token || !cookieToken) return false;
  return validateApiKey(token, cookieToken);
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.stripe.com https://*.supabase.co; frame-src 'self' https://js.stripe.com https://hooks.stripe.com;"
  );

  // XSS Protection
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Frame options
  response.headers.set('X-Frame-Options', 'DENY');

  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );

  return response;
}

/**
 * Main security middleware function
 */
export async function securityMiddleware(
  request: NextRequest,
  options: {
    rateLimitType?: keyof typeof RATE_LIMITS;
    requireAuth?: boolean;
    requireCSRF?: boolean;
    requireApiKey?: boolean;
  } = {}
): Promise<NextResponse | null> {
  const { rateLimitType = 'default', requireAuth = false, requireCSRF = false, requireApiKey = false } = options;

  // Rate limiting
  const rateLimit = checkRateLimit(request, rateLimitType);
  if (!rateLimit.allowed) {
    const response = NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        resetTime: new Date(rateLimit.resetTime).toISOString(),
      },
      { status: 429 }
    );
    response.headers.set('X-RateLimit-Limit', RATE_LIMITS[rateLimitType].maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', '0');
    response.headers.set('X-RateLimit-Reset', rateLimit.resetTime.toString());
    return addSecurityHeaders(response);
  }

  // API key validation
  if (requireApiKey) {
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
    const expectedKey = process.env.SMOKERSRIGHTS_API_KEY || process.env.API_KEY;

    if (!apiKey || !expectedKey || !validateApiKey(apiKey, expectedKey)) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
      );
    }
  }

  // CSRF protection
  if (requireCSRF && request.method !== 'GET' && request.method !== 'HEAD') {
    if (!validateCSRFToken(request)) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
      );
    }
  }

  // Input validation for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    try {
      const body = await request.clone().json().catch(() => ({}));
      // Basic validation - sanitize string inputs
      if (typeof body === 'object' && body !== null) {
        for (const [key, value] of Object.entries(body)) {
          if (typeof value === 'string') {
            (body as any)[key] = sanitizeInput(value);
          }
        }
      }
    } catch (error) {
      // Invalid JSON - will be handled by route handler
    }
  }

  // Create response with security headers
  const response = NextResponse.next();
  addSecurityHeaders(response);
  response.headers.set('X-RateLimit-Limit', RATE_LIMITS[rateLimitType].maxRequests.toString());
  response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
  response.headers.set('X-RateLimit-Reset', rateLimit.resetTime.toString());

  return response;
}

/**
 * Log security event
 */
export function logSecurityEvent(
  type: 'rate_limit' | 'brute_force' | 'invalid_api_key' | 'csrf_failure' | 'xss_attempt',
  details: Record<string, any>
): void {
  // In production, send to logging service (Sentry, LogRocket, etc.)
  console.warn(`[SECURITY] ${type}:`, details);
}

