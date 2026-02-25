/**
 * SSO Token Generation API (WTV)
 * Creates a cross-platform session token for SSO
 * GET /api/sso/generate-token?platform=gcc
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createPlatformSession } from '@/lib/platform-session';
import { getOrCreateSharedUser } from '@/lib/shared-users';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get current user from Supabase session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get target platform from query
    const searchParams = request.nextUrl.searchParams;
    const targetPlatform = searchParams.get('platform') || 'gcc';
    if (targetPlatform !== 'gcc' && targetPlatform !== 'wtv') {
      return NextResponse.json({ error: 'Invalid platform. Use "gcc" or "wtv"' }, { status: 400 });
    }

    // Ensure shared user exists
    await getOrCreateSharedUser(user.id, user.email || '');

    // Generate session token (cryptographically secure)
    const { randomBytes } = await import('crypto');
    const sessionToken = `sso_${randomBytes(32).toString('hex')}`;

    // Create platform session
    const session = await createPlatformSession(
      user.id,
      targetPlatform as 'gcc' | 'wtv',
      sessionToken,
      24 // 24 hours
    );

    if (!session) {
      return NextResponse.json({ error: 'Failed to create SSO session' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      session_token: sessionToken,
      platform: targetPlatform,
      expires_at: session.expires_at,
      redirect_url: targetPlatform === 'gcc'
        ? `${process.env.NEXT_PUBLIC_GCC_URL || 'http://localhost:3000'}/sso/validate?token=${sessionToken}`
        : `${process.env.NEXT_PUBLIC_WTV_URL || 'http://localhost:3001'}/sso/validate?token=${sessionToken}`,
    });
  } catch (error: any) {
    console.error('Error generating SSO token:', error);
    return NextResponse.json({
      error: 'Failed to generate SSO token',
      details: error.message,
    }, { status: 500 });
  }
}
