/**
 * Cevict AI - Enterprise Security Layer
 * ======================================
 * Rate limiting, CORS, CSP, and authentication utilities
 */

import { getConfig, getEnvironment } from './config'

// ============================================
// RATE LIMITING
// ============================================

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

export function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetIn: number } {
  const config = getConfig()
  const now = Date.now()
  
  const entry = rateLimitStore.get(identifier)
  
  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.security.rateLimitWindowMs
    })
    return {
      allowed: true,
      remaining: config.security.rateLimitRequests - 1,
      resetIn: config.security.rateLimitWindowMs
    }
  }
  
  if (entry.count >= config.security.rateLimitRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.resetTime - now
    }
  }
  
  entry.count++
  return {
    allowed: true,
    remaining: config.security.rateLimitRequests - entry.count,
    resetIn: entry.resetTime - now
  }
}

// ============================================
// CORS VALIDATION
// ============================================

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false
  
  const config = getConfig()
  const allowedOrigins = config.security.corsOrigins
  
  // Wildcard check
  if (allowedOrigins.includes('*')) return true
  
  // Exact match
  if (allowedOrigins.includes(origin)) return true
  
  // Wildcard subdomain match
  for (const allowed of allowedOrigins) {
    if (allowed.startsWith('https://*.')) {
      const domain = allowed.replace('https://*.', '')
      if (origin.endsWith(domain)) return true
    }
  }
  
  return false
}

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = isOriginAllowed(origin)
  
  return {
    'Access-Control-Allow-Origin': allowed ? (origin || '*') : '',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-Id',
    'Access-Control-Max-Age': '86400'
  }
}

// ============================================
// CONTENT SECURITY POLICY
// ============================================

export function getCSPHeaders(): Record<string, string> {
  const config = getConfig()
  
  if (!config.security.cspEnabled) {
    return {}
  }
  
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co https://*.vercel.app wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
  
  return {
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  }
}

// ============================================
// API KEY VALIDATION
// ============================================

export function validateApiKey(apiKey: string | null): { valid: boolean; tier: string } {
  if (!apiKey) {
    return { valid: false, tier: 'none' }
  }
  
  // Check format: cevict_[env]_[tier]_[key]
  const parts = apiKey.split('_')
  if (parts.length !== 4 || parts[0] !== 'cevict') {
    return { valid: false, tier: 'none' }
  }
  
  const [, env, tier] = parts
  
  // Validate environment
  const currentEnv = getEnvironment()
  if (env === 'test' && currentEnv === 'production') {
    return { valid: false, tier: 'none' }
  }
  
  // Validate tier
  if (!['free', 'pro', 'elite', 'enterprise'].includes(tier)) {
    return { valid: false, tier: 'none' }
  }
  
  // In production, would validate against database
  return { valid: true, tier }
}

// ============================================
// REQUEST SANITIZATION
// ============================================

export function sanitizeInput(input: string): string {
  // Remove potential XSS vectors
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
}

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = {} as T
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeInput(value) as any
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key as keyof T] = sanitizeObject(value)
    } else {
      sanitized[key as keyof T] = value
    }
  }
  
  return sanitized
}

// ============================================
// AUDIT LOGGING
// ============================================

export interface AuditLogEntry {
  timestamp: string
  action: string
  userId?: string
  ip?: string
  userAgent?: string
  resource: string
  status: 'success' | 'failure'
  details?: Record<string, any>
}

const auditLog: AuditLogEntry[] = []

export function logAuditEvent(entry: Omit<AuditLogEntry, 'timestamp'>): void {
  const fullEntry: AuditLogEntry = {
    ...entry,
    timestamp: new Date().toISOString()
  }
  
  auditLog.push(fullEntry)
  
  // In production, would send to logging service
  if (getEnvironment() !== 'production') {
    console.log('[AUDIT]', JSON.stringify(fullEntry))
  }
}

export function getAuditLog(limit: number = 100): AuditLogEntry[] {
  return auditLog.slice(-limit)
}

// ============================================
// SECURITY HEADERS MIDDLEWARE
// ============================================

export function getSecurityHeaders(): Record<string, string> {
  return {
    ...getCSPHeaders(),
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-DNS-Prefetch-Control': 'on'
  }
}

