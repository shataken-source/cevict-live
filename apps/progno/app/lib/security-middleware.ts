/**
 * ENTERPRISE SECURITY MIDDLEWARE
 * Comprehensive security utilities for the progno API
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number; blocked: boolean }>();
const suspiciousIps = new Set<string>();
const blockedIps = new Set<string>();

// Security configuration
export const SECURITY_CONFIG = {
  rateLimit: {
    free: { requests: 60, windowMs: 60000 },      // 60 req/min
    pro: { requests: 300, windowMs: 60000 },      // 300 req/min
    elite: { requests: 1000, windowMs: 60000 },   // 1000 req/min
    admin: { requests: 5000, windowMs: 60000 },   // 5000 req/min
  },
  bruteForce: {
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
  },
  requestValidation: {
    maxBodySize: 1024 * 1024, // 1MB
    maxUrlLength: 2048,
    maxHeaderSize: 8192,
  },
};

/**
 * Get client IP with proxy support
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  // Priority: Cloudflare > X-Real-IP > X-Forwarded-For > fallback
  if (cfConnectingIp) return cfConnectingIp;
  if (realIp) return realIp;
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}

/**
 * Rate limiting middleware
 */
export function checkRateLimit(
  ip: string,
  tier: 'free' | 'pro' | 'elite' | 'admin' = 'free'
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const config = SECURITY_CONFIG.rateLimit[tier];
  
  // Check if IP is blocked
  if (blockedIps.has(ip)) {
    return { allowed: false, remaining: 0, resetTime: now + 86400000 };
  }

  const key = `${ip}:${tier}`;
  const current = rateLimitStore.get(key);

  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
      blocked: false,
    });
    return { allowed: true, remaining: config.requests - 1, resetTime: now + config.windowMs };
  }

  if (current.count >= config.requests) {
    // Mark as suspicious if consistently hitting limits
    if (current.count > config.requests * 2) {
      suspiciousIps.add(ip);
    }
    return { allowed: false, remaining: 0, resetTime: current.resetTime };
  }

  current.count++;
  return { allowed: true, remaining: config.requests - current.count, resetTime: current.resetTime };
}

/**
 * Input sanitization
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/[<>'"]/g, (char) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      };
      return entities[char] || char;
    })
    .trim();
}

/**
 * Validate email format (enterprise-grade)
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 254) return false; // RFC 5321 limit
  
  // Comprehensive email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) return false;
  
  // Check for common disposable email domains
  const disposableDomains = ['tempmail.com', 'guerrillamail.com', '10minutemail.com', 'mailinator.com'];
  const domain = email.split('@')[1]?.toLowerCase();
  if (domain && disposableDomains.some(d => domain.includes(d))) {
    return false;
  }
  
  return true;
}

/**
 * Generate secure request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * CSRF token generation and validation
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function validateCsrfToken(token: string, storedToken: string): boolean {
  if (!token || !storedToken) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(storedToken));
}

/**
 * API key validation with timing-safe comparison
 */
export function validateApiKey(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  if (provided.length !== expected.length) return false;
  
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Security headers
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.stripe.com https://*.supabase.co",
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
}

/**
 * Request validation middleware
 */
export async function validateRequest(request: NextRequest): Promise<{
  valid: boolean;
  error?: string;
  ip: string;
  requestId: string;
}> {
  const ip = getClientIp(request);
  const requestId = generateRequestId();

  // Check if IP is blocked
  if (blockedIps.has(ip)) {
    return { valid: false, error: 'IP blocked', ip, requestId };
  }

  // Validate URL length
  if (request.url.length > SECURITY_CONFIG.requestValidation.maxUrlLength) {
    return { valid: false, error: 'URL too long', ip, requestId };
  }

  // Validate content-type for POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type');
    if (contentType && !contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
      // Allow form data and JSON only
      if (!contentType.includes('application/x-www-form-urlencoded')) {
        return { valid: false, error: 'Invalid content type', ip, requestId };
      }
    }
  }

  return { valid: true, ip, requestId };
}

/**
 * Logging utility for security events
 */
export function logSecurityEvent(event: {
  type: 'rate_limit' | 'auth_failure' | 'suspicious' | 'blocked' | 'error';
  ip: string;
  requestId: string;
  message: string;
  metadata?: Record<string, any>;
}): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: event.type === 'error' ? 'ERROR' : event.type === 'blocked' ? 'WARN' : 'INFO',
    ...event,
  };
  
  // In production, this would go to a logging service (DataDog, Splunk, etc.)
  console.log(`[SECURITY] ${JSON.stringify(logEntry)}`);
  
  // Track suspicious activity
  if (event.type === 'suspicious' || event.type === 'auth_failure') {
    const key = `suspicious:${event.ip}`;
    const current = rateLimitStore.get(key);
    
    if (current) {
      current.count++;
      if (current.count >= SECURITY_CONFIG.bruteForce.maxAttempts) {
        blockedIps.add(event.ip);
        console.warn(`[SECURITY] IP blocked due to suspicious activity: ${event.ip}`);
      }
    } else {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: Date.now() + SECURITY_CONFIG.bruteForce.lockoutDuration,
        blocked: false,
      });
    }
  }
}

/**
 * Create secure error response
 */
export function createSecureErrorResponse(
  message: string,
  status: number,
  requestId: string
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        requestId,
        timestamp: new Date().toISOString(),
      },
    },
    {
      status,
      headers: getSecurityHeaders(),
    }
  );
}

/**
 * Wrap handler with security middleware
 */
export function withSecurity(
  handler: (request: NextRequest, context: { ip: string; requestId: string }) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const validation = await validateRequest(request);
    
    if (!validation.valid) {
      logSecurityEvent({
        type: 'blocked',
        ip: validation.ip,
        requestId: validation.requestId,
        message: validation.error || 'Request blocked',
      });
      return createSecureErrorResponse(
        'Request blocked',
        403,
        validation.requestId
      );
    }

    try {
      const response = await handler(request, {
        ip: validation.ip,
        requestId: validation.requestId,
      });

      // Add security headers to response
      const headers = getSecurityHeaders();
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error: any) {
      logSecurityEvent({
        type: 'error',
        ip: validation.ip,
        requestId: validation.requestId,
        message: error.message || 'Internal error',
        metadata: { stack: error.stack },
      });
      
      return createSecureErrorResponse(
        'An error occurred processing your request',
        500,
        validation.requestId
      );
    }
  };
}

