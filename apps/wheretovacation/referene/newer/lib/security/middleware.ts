/**
 * Enterprise Security Middleware for PetReunion
 * Provides comprehensive security features including rate limiting, 
 * input validation, CORS, authentication, and audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // API endpoints
  '/api/petreunion/report-lost': { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 requests per 15 minutes
  '/api/petreunion/report-found-pet': { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  '/api/petreunion/shelter/add-pet': { windowMs: 60 * 60 * 1000, maxRequests: 50 }, // 50 requests per hour
  '/api/petreunion/match-pets': { windowMs: 60 * 1000, maxRequests: 10 }, // 10 requests per minute
  '/api/admin': { windowMs: 15 * 60 * 1000, maxRequests: 100 }, // 100 requests per 15 minutes
  'default': { windowMs: 15 * 60 * 1000, maxRequests: 1000 } // Default limit
};

// In-memory rate limiting store (for production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security headers configuration
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
};

// Input validation schemas
const VALIDATION_SCHEMAS = {
  petReport: {
    required: ['pet_type', 'breed', 'color', 'location_city', 'location_state', 'owner_name'],
    optional: ['pet_name', 'age', 'gender', 'description', 'photo'],
    validators: {
      pet_type: (value: string) => ['dog', 'cat'].includes(value.toLowerCase()),
      breed: (value: string) => typeof value === 'string' && value.length >= 2 && value.length <= 100,
      color: (value: string) => typeof value === 'string' && value.length >= 2 && value.length <= 50,
      location_city: (value: string) => typeof value === 'string' && value.length >= 2 && value.length <= 100,
      location_state: (value: string) => typeof value === 'string' && value.length === 2,
      owner_name: (value: string) => typeof value === 'string' && value.length >= 2 && value.length <= 100,
      owner_email: (value: string) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      owner_phone: (value: string) => !value || /^[\d\s\-\+\(\)]+$/.test(value),
      description: (value: string) => !value || value.length <= 1000
    }
  }
};

// Audit logging
interface AuditLog {
  timestamp: string;
  userId?: string;
  ip: string;
  userAgent: string;
  endpoint: string;
  method: string;
  action: string;
  status: 'success' | 'failure' | 'blocked';
  details?: any;
}

export class SecurityMiddleware {
  private static instance: SecurityMiddleware;
  private supabase: any;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseServiceKey) {
      this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    }
  }

  static getInstance(): SecurityMiddleware {
    if (!SecurityMiddleware.instance) {
      SecurityMiddleware.instance = new SecurityMiddleware();
    }
    return SecurityMiddleware.instance;
  }

  // Rate limiting middleware
  async rateLimit(request: NextRequest, endpoint: string = 'default'): Promise<{ allowed: boolean; response?: NextResponse }> {
    const config = RATE_LIMITS[endpoint] || RATE_LIMITS.default;
    const ip = this.getClientIP(request);
    const key = `rate_limit:${ip}:${endpoint}`;
    
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Clean up expired entries
    for (const [storeKey, data] of rateLimitStore.entries()) {
      if (data.resetTime < now) {
        rateLimitStore.delete(storeKey);
      }
    }
    
    const current = rateLimitStore.get(key);
    
    if (!current || current.resetTime < now) {
      // New window
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      });
      return { allowed: true };
    }
    
    if (current.count >= config.maxRequests) {
      await this.logSecurityEvent({
        timestamp: new Date().toISOString(),
        ip,
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint,
        method: request.method,
        action: 'rate_limit_exceeded',
        status: 'blocked',
        details: { limit: config.maxRequests, windowMs: config.windowMs }
      });
      
      return {
        allowed: false,
        response: NextResponse.json(
          { error: 'Rate limit exceeded', retryAfter: Math.ceil((current.resetTime - now) / 1000) },
          { status: 429, headers: { 'Retry-After': Math.ceil((current.resetTime - now) / 1000).toString() } }
        )
      };
    }
    
    current.count++;
    return { allowed: true };
  }

  // Input validation middleware
  validateInput(data: any, schema: keyof typeof VALIDATION_SCHEMAS): { valid: boolean; errors?: string[] } {
    const validationSchema = VALIDATION_SCHEMAS[schema];
    if (!validationSchema) {
      return { valid: false, errors: ['Invalid validation schema'] };
    }

    const errors: string[] = [];

    // Check required fields
    for (const field of validationSchema.required) {
      if (!data[field] || data[field] === '') {
        errors.push(`${field} is required`);
      }
    }

    // Validate fields
    for (const [field, validator] of Object.entries(validationSchema.validators)) {
      if (data[field] !== undefined && data[field] !== null) {
        if (!validator(data[field])) {
          errors.push(`${field} is invalid`);
        }
      }
    }

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  // Authentication middleware
  async authenticate(request: NextRequest): Promise<{ authenticated: boolean; userId?: string; response?: NextResponse }> {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        authenticated: false,
        response: NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      };
    }

    const token = authHeader.substring(7);
    
    try {
      if (!this.supabase) {
        return {
          authenticated: false,
          response: NextResponse.json(
            { error: 'Authentication service unavailable' },
            { status: 503 }
          )
        };
      }

      const { data: { user }, error } = await this.supabase.auth.getUser(token);
      
      if (error || !user) {
        return {
          authenticated: false,
          response: NextResponse.json(
            { error: 'Invalid authentication token' },
            { status: 401 }
          )
        };
      }

      return { authenticated: true, userId: user.id };
    } catch (error) {
      return {
        authenticated: false,
        response: NextResponse.json(
          { error: 'Authentication failed' },
          { status: 401 }
        )
      };
    }
  }

  // Security headers middleware
  addSecurityHeaders(response: NextResponse): NextResponse {
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // CORS middleware
  handleCORS(request: NextRequest, response: NextResponse): NextResponse {
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3003',
      'https://petreunion.vercel.app',
      'https://wheretovacation.vercel.app'
    ];

    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }

    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400');

    return response;
  }

  // Security event logging
  async logSecurityEvent(event: AuditLog): Promise<void> {
    try {
      if (!this.supabase) {
        console.warn('Security audit logging unavailable - Supabase not configured');
        return;
      }

      await this.supabase.from('security_audit_logs').insert(event);
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  // Get client IP address
  private getClientIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for') ||
           request.headers.get('x-real-ip') ||
           request.headers.get('cf-connecting-ip') ||
           'unknown';
  }

  // Main middleware function
  async processRequest(request: NextRequest, options: {
    requireAuth?: boolean;
    rateLimitEndpoint?: string;
    validateSchema?: keyof typeof VALIDATION_SCHEMAS;
    auditAction?: string;
  } = {}): Promise<{ allowed: boolean; response?: NextResponse; userId?: string }> {
    const { requireAuth = false, rateLimitEndpoint, validateSchema, auditAction } = options;

    // Rate limiting
    if (rateLimitEndpoint) {
      const rateLimitResult = await this.rateLimit(request, rateLimitEndpoint);
      if (!rateLimitResult.allowed && rateLimitResult.response) {
        return { allowed: false, response: rateLimitResult.response };
      }
    }

    // Authentication
    let userId: string | undefined;
    if (requireAuth) {
      const authResult = await this.authenticate(request);
      if (!authResult.authenticated) {
        return { allowed: false, response: authResult.response };
      }
      userId = authResult.userId;
    }

    // Input validation
    if (validateSchema) {
      try {
        const body = await request.clone().json();
        const validationResult = this.validateInput(body, validateSchema);
        if (!validationResult.valid) {
          return {
            allowed: false,
            response: NextResponse.json(
              { error: 'Validation failed', details: validationResult.errors },
              { status: 400 }
            )
          };
        }
      } catch (error) {
        return {
          allowed: false,
          response: NextResponse.json(
            { error: 'Invalid request body' },
            { status: 400 }
          )
        };
      }
    }

    // Audit logging
    if (auditAction) {
      await this.logSecurityEvent({
        timestamp: new Date().toISOString(),
        userId,
        ip: this.getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: request.nextUrl.pathname,
        method: request.method,
        action: auditAction,
        status: 'success'
      });
    }

    return { allowed: true, userId };
  }
}

// Export singleton instance
export const security = SecurityMiddleware.getInstance();

// Helper function to wrap API handlers with security middleware
export function withSecurity(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean;
    rateLimitEndpoint?: string;
    validateSchema?: keyof typeof VALIDATION_SCHEMAS;
    auditAction?: string;
  } = {}
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      // Process security middleware
      const securityResult = await security.processRequest(request, options);
      
      if (!securityResult.allowed && securityResult.response) {
        return securityResult.response;
      }

      // Execute the actual handler
      const response = await handler(request, context);

      // Add security headers
      security.addSecurityHeaders(response);
      security.handleCORS(request, response);

      return response;
    } catch (error: any) {
      console.error('Security middleware error:', error);
      
      // Log security incident
      await security.logSecurityEvent({
        timestamp: new Date().toISOString(),
        ip: security['getClientIP'](request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: request.nextUrl.pathname,
        method: request.method,
        action: 'security_middleware_error',
        status: 'failure',
        details: { error: error.message }
      });

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// Export the error handling function from the error handler module
export { withErrorHandling } from '@/lib/error/handler';
