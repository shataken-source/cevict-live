/**
 * SSO Token Validation API (WTV)
 * Validates a cross-platform session token and creates local session
 * GET /api/sso/validate?token=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getOrCreateSharedUser } from '@/lib/shared-users';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionToken = searchParams.get('token');

    if (!sessionToken) {
      return NextResponse.json({ error: 'Session token required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Find the session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('platform_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid or expired session token' }, { status: 401 });
    }

    // Get user from auth
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(session.user_id);

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Ensure shared user exists
    await getOrCreateSharedUser(user.id, user.email || '');

    // Invalidate token after single use (prevents replay attacks)
    await supabaseAdmin
      .from('platform_sessions')
      .update({ is_active: false, last_accessed_at: new Date().toISOString() })
      .eq('id', session.id);

    // Return user info (frontend will create local Supabase session)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      platform: session.platform,
      message: 'SSO session validated. Frontend should create local session.',
    });
  } catch (error: any) {
    console.error('Error validating SSO token:', error);
    return NextResponse.json({
      error: 'Failed to validate SSO token',
      details: error.message,
    }, { status: 500 });
  }
}
