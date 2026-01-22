import { NextRequest, NextResponse } from 'next/server'
import { authenticateAdmin } from '@/lib/admin-auth-secure'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      )
    }

    const result = await authenticateAdmin(request, password)

    if (!result.success) {
      const response = NextResponse.json(
        { success: false, error: result.error || 'Authentication failed' },
        { status: 401 }
      )

      // Add rate limit headers if retry after is provided
      if (result.retryAfter) {
        response.headers.set('Retry-After', result.retryAfter.toString())
      }

      return response
    }

    // Set httpOnly cookie for token
    const response = NextResponse.json({
      success: true,
      token: result.token,
    })

    if (result.token) {
      response.cookies.set('admin_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60, // 8 hours
        path: '/',
      })
    }

    return response
  } catch (error) {
    console.error('[Admin Auth] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
