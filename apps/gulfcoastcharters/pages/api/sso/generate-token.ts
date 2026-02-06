/**
 * SSO Token Generation API
 * Creates a cross-platform session token for SSO
 * GET /api/sso/generate-token?platform=wtv
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createPlatformSession } from '@/lib/platform-session';
import { getOrCreateSharedUser } from '@/lib/shared-users';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get current user from Supabase session
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Get target platform from query
    const targetPlatform = (req.query.platform as string) || 'wtv';
    if (targetPlatform !== 'gcc' && targetPlatform !== 'wtv') {
      return res.status(400).json({ error: 'Invalid platform. Use "gcc" or "wtv"' });
    }

    // Ensure shared user exists
    await getOrCreateSharedUser(user.id, user.email || '');

    // Generate session token (simple UUID-based token)
    const sessionToken = `sso_${user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    // Create platform session
    const session = await createPlatformSession(
      user.id,
      targetPlatform,
      sessionToken,
      24 // 24 hours
    );

    if (!session) {
      return res.status(500).json({ error: 'Failed to create SSO session' });
    }

    return res.status(200).json({
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
    return res.status(500).json({
      error: 'Failed to generate SSO token',
      details: error.message,
    });
  }
}
