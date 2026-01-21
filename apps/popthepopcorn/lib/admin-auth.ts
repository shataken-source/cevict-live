import { NextRequest } from 'next/server'

/**
 * Check if request is authenticated for admin routes
 * In production, use proper session management or JWT tokens
 */
export function isAdminAuthenticated(request: NextRequest): boolean {
  // Check for admin password in header (sent from client after login)
  const adminToken = request.headers.get('x-admin-token')
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  
  // Simple token check - in production, use proper JWT or session tokens
  return adminToken === adminPassword
}
