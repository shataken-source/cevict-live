/**
 * SSO Token Validation API
 * Validates a cross-platform session token and creates local session
 * GET /api/sso/validate?token=xxx
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getOrCreateSharedUser } from '@/lib/shared-users';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sessionToken = req.query.token as string;
    if (!sessionToken) {
      return res.status(400).json({ error: 'Session token required' });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Find the session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('platform_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return res.status(401).json({ error: 'Invalid or expired session token' });
    }

    // Get user from auth
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(session.user_id);

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ensure shared user exists
    await getOrCreateSharedUser(user.id, user.email || '');

    // Update session access time
    await supabaseAdmin
      .from('platform_sessions')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', session.id);

    // Return user info (frontend will create local Supabase session)
    return res.status(200).json({
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
    return res.status(500).json({
      error: 'Failed to validate SSO token',
      details: error.message,
    });
  }
}
