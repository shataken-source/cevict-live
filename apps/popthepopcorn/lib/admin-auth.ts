import { NextRequest } from 'next/server'
import { isAdminAuthenticated as verifyAdminToken } from './admin-auth-secure'

/**
 * Check if request is authenticated for admin routes
 * Uses secure JWT token verification
 */
export async function isAdminAuthenticated(request: NextRequest): Promise<boolean> {
  return await verifyAdminToken(request)
}
