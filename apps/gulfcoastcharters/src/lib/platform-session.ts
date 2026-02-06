/**
 * Platform Session Helper
 * Simple utility to create and manage cross-platform SSO sessions
 * 
 * This is the easiest implementation - just a helper function to use the new table
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Use service role for admin operations
const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export interface PlatformSession {
  id: string;
  user_id: string;
  platform: 'gcc' | 'wtv' | 'both';
  session_token: string;
  expires_at: string;
  created_at: string;
  last_accessed_at: string;
  is_active: boolean;
}

/**
 * Create a new platform session
 * This is the simplest implementation - just creates a session record
 */
export async function createPlatformSession(
  userId: string,
  platform: 'gcc' | 'wtv' | 'both',
  sessionToken: string,
  expiresInHours: number = 24
): Promise<PlatformSession | null> {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not configured');
    return null;
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  const { data, error } = await supabaseAdmin
    .from('platform_sessions')
    .insert({
      user_id: userId,
      platform,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating platform session:', error);
    return null;
  }

  return data as PlatformSession;
}

/**
 * Get active sessions for a user
 */
export async function getUserSessions(
  userId: string,
  platform?: 'gcc' | 'wtv' | 'both'
): Promise<PlatformSession[]> {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not configured');
    return [];
  }

  let query = supabaseAdmin
    .from('platform_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString());

  if (platform) {
    query = query.eq('platform', platform);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user sessions:', error);
    return [];
  }

  return (data || []) as PlatformSession[];
}

/**
 * Deactivate a session (logout)
 */
export async function deactivateSession(sessionToken: string): Promise<boolean> {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not configured');
    return false;
  }

  const { error } = await supabaseAdmin
    .from('platform_sessions')
    .update({ is_active: false })
    .eq('session_token', sessionToken);

  if (error) {
    console.error('Error deactivating session:', error);
    return false;
  }

  return true;
}

/**
 * Update last accessed time (for session refresh)
 */
export async function updateSessionAccess(sessionToken: string): Promise<boolean> {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not configured');
    return false;
  }

  const { error } = await supabaseAdmin
    .from('platform_sessions')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('session_token', sessionToken)
    .eq('is_active', true);

  if (error) {
    console.error('Error updating session access:', error);
    return false;
  }

  return true;
}
