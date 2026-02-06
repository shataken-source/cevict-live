import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Cevict AI Gateway Middleware
 * ============================
 * Handles security headers, rate limiting setup, and environment detection
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const { pathname } = request.nextUrl
  
  // Determine environment from hostname
  const hostname = request.headers.get('host') || ''
  const isTest = hostname.includes('test.') || hostname.includes('localhost')
  
  // Set environment header for downstream use
  response.headers.set('X-Environment', isTest ? 'test' : 'production')
  response.headers.set('X-Request-Id', crypto.randomUUID())
  
  // Security headers (production gets stricter headers)
  if (!isTest) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  }
  
  // API-specific headers
  if (pathname.startsWith('/api/')) {
    // CORS for API routes
    const origin = request.headers.get('origin')
    
    if (isTest) {
      // Permissive CORS for test
      response.headers.set('Access-Control-Allow-Origin', '*')
    } else if (origin) {
      // Strict CORS for production
      const allowedOrigins = [
        'https://cevict.ai',
        'https://progno.cevict.ai',
        'https://prognostication.com',
        'https://orchestrator.cevict.ai',
        'https://massager.cevict.ai'
      ]
      
      if (allowedOrigins.includes(origin) || origin.endsWith('.cevict.ai')) {
        response.headers.set('Access-Control-Allow-Origin', origin)
      }
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key, X-Request-Id')
    response.headers.set('Access-Control-Max-Age', '86400')
  }
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: response.headers
    })
  }
  
  return response
}

// Apply middleware to all routes except static files
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

