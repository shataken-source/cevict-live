/**
 * Security Headers Middleware
 * Adds security headers to all responses
 */

import { NextResponse } from 'next/server'

export interface SecurityHeadersConfig {
  csp?: string
  hsts?: boolean
  frameOptions?: 'DENY' | 'SAMEORIGIN'
  contentTypeOptions?: boolean
  xssProtection?: boolean
  referrerPolicy?: string
}

const DEFAULT_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https: blob:",
  "connect-src 'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co",
  "frame-src 'self' https://js.stripe.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

/**
 * Add security headers to response
 */
export function addSecurityHeaders(
  response: NextResponse,
  config: SecurityHeadersConfig = {}
): NextResponse {
  const {
    csp = DEFAULT_CSP,
    hsts = process.env.NODE_ENV === 'production',
    frameOptions = 'DENY',
    contentTypeOptions = true,
    xssProtection = true,
    referrerPolicy = 'strict-origin-when-cross-origin',
  } = config

  // Content Security Policy
  response.headers.set('Content-Security-Policy', csp)

  // X-Frame-Options
  response.headers.set('X-Frame-Options', frameOptions)

  // X-Content-Type-Options
  if (contentTypeOptions) {
    response.headers.set('X-Content-Type-Options', 'nosniff')
  }

  // X-XSS-Protection
  if (xssProtection) {
    response.headers.set('X-XSS-Protection', '1; mode=block')
  }

  // Referrer Policy
  response.headers.set('Referrer-Policy', referrerPolicy)

  // Strict Transport Security (HSTS) - only in production
  if (hsts) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  )

  return response
}

/**
 * Create a response with security headers
 */
export function createSecureResponse(
  body: any,
  init?: ResponseInit
): NextResponse {
  const response = NextResponse.json(body, init)
  return addSecurityHeaders(response)
}
