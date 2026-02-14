import { NextRequest, NextResponse } from 'next/server';
import { 
  authenticateWithFacebook,
  validateSession,
  invalidateSession
} from '../../../../lib/facebook-auth-service';

/**
 * POST /api/auth/facebook
 * 
 * Authenticate with Facebook
 * Receives Facebook access token from client SDK and creates/logs in user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      );
    }

    // Get request metadata
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;
    
    // Detect device type from user agent
    let deviceType = 'desktop';
    if (userAgent) {
      if (/mobile/i.test(userAgent)) deviceType = 'mobile';
      else if (/tablet/i.test(userAgent)) deviceType = 'tablet';
    }

    // Authenticate
    const result = await authenticateWithFacebook(accessToken, {
      ipAddress,
      userAgent,
      deviceType
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Authentication failed' },
        { status: 401 }
      );
    }

    // Set session cookie
    const response = NextResponse.json({
      success: true,
      user: result.user,
      isNewUser: result.isNewUser,
      message: result.isNewUser 
        ? 'Welcome to PetReunion! Your account has been created.' 
        : 'Welcome back!'
    });

    // Set HTTP-only cookie for session token
    response.cookies.set('petreunion_session', result.session!.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(result.session!.expiresAt)
    });

    return response;

  } catch (error: any) {
    console.error('[Auth Facebook] Error:', error);
    return NextResponse.json(
      { error: 'Authentication failed', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/facebook
 * 
 * Get current user from session cookie
 */
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('petreunion_session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ authenticated: false });
    }

    const user = await validateSession(sessionToken);

    if (!user) {
      // Clear invalid cookie
      const response = NextResponse.json({ authenticated: false });
      response.cookies.delete('petreunion_session');
      return response;
    }

    return NextResponse.json({
      authenticated: true,
      user
    });

  } catch (error: any) {
    console.error('[Auth Facebook GET] Error:', error);
    return NextResponse.json({ authenticated: false });
  }
}

/**
 * DELETE /api/auth/facebook
 * 
 * Logout - invalidate session
 */
export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('petreunion_session')?.value;

    if (sessionToken) {
      await invalidateSession(sessionToken);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    response.cookies.delete('petreunion_session');

    return response;

  } catch (error: any) {
    console.error('[Auth Facebook DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}

