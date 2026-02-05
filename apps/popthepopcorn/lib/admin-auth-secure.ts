/**
 * Secure Admin Authentication
 * Uses JWT tokens with proper expiration and rate limiting
 */

import { NextRequest } from 'next/server'
import { SignJWT, jwtVerify } from 'jose'
import { checkRateLimit, getClientIp, RATE_LIMITS } from './rate-limiter'

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || process.env.ADMIN_PASSWORD || ''
)

const TOKEN_EXPIRY = 8 * 60 * 60 * 1000 // 8 hours

/**
 * Validate that ADMIN_PASSWORD is set (no default)
 */
export function validateAdminConfig(): { valid: boolean; error?: string } {
  if (!process.env.ADMIN_PASSWORD) {
    return {
      valid: false,
      error: 'ADMIN_PASSWORD environment variable is required. No default password allowed for security.',
    }
  }

  if (process.env.ADMIN_PASSWORD.length < 12) {
    return {
      valid: false,
      error: 'ADMIN_PASSWORD must be at least 12 characters long.',
    }
  }

  if (!process.env.ADMIN_JWT_SECRET) {
    // Use ADMIN_PASSWORD as JWT secret if JWT_SECRET not set (not ideal but better than nothing)
    console.warn('[Admin Auth] ADMIN_JWT_SECRET not set, using ADMIN_PASSWORD. Set ADMIN_JWT_SECRET for better security.')
  }

  return { valid: true }
}

/**
 * Generate JWT token for admin session
 */
export async function generateAdminToken(): Promise<string> {
  const secret = process.env.ADMIN_JWT_SECRET
    ? new TextEncoder().encode(process.env.ADMIN_JWT_SECRET)
    : JWT_SECRET

  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret)

  return token
}

/**
 * Verify JWT token
 */
export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const secret = process.env.ADMIN_JWT_SECRET
      ? new TextEncoder().encode(process.env.ADMIN_JWT_SECRET)
      : JWT_SECRET

    const { payload } = await jwtVerify(token, secret)
    return payload.role === 'admin'
  } catch (error) {
    return false
  }
}

/**
 * Check if request is authenticated for admin routes
 */
export async function isAdminAuthenticated(request: NextRequest): Promise<boolean> {
  // Check for JWT token in header
  const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                request.headers.get('x-admin-token') ||
                request.cookies.get('admin_token')?.value

  if (!token) {
    return false
  }

  return await verifyAdminToken(token)
}

/**
 * Authenticate admin login with rate limiting
 */
export async function authenticateAdmin(
  request: NextRequest,
  password: string
): Promise<{ success: boolean; token?: string; error?: string; retryAfter?: number }> {
  // Validate config first
  const configCheck = validateAdminConfig()
  if (!configCheck.valid) {
    return {
      success: false,
      error: configCheck.error || 'Admin authentication not configured',
    }
  }

  // Rate limiting for login attempts
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit(`admin-login:${ip}`, RATE_LIMITS.login)

  if (!rateLimit.allowed) {
    return {
      success: false,
      error: 'Too many login attempts. Please try again later.',
      retryAfter: rateLimit.retryAfter,
    }
  }

  // Verify password (constant-time comparison)
  const adminPassword = process.env.ADMIN_PASSWORD!
  const passwordMatch = await constantTimeCompare(password, adminPassword)

  if (!passwordMatch) {
    return {
      success: false,
      error: 'Invalid password',
    }
  }

  // Generate JWT token
  const token = await generateAdminToken()

  return {
    success: true,
    token,
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
async function constantTimeCompare(a: string, b: string): Promise<boolean> {
  if (a.length !== b.length) {
    return false
  }

  // Use Node.js crypto.timingSafeEqual
  const crypto = await import('crypto')
  const encoder = new TextEncoder()
  const aBuffer = encoder.encode(a)
  const bBuffer = encoder.encode(b)
  
  try {
    return crypto.timingSafeEqual(aBuffer, bBuffer)
  } catch {
    // Fallback if buffers are different lengths (shouldn't happen after length check)
    return false
  }
}
