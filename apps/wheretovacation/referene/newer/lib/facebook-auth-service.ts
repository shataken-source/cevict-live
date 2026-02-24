/**
 * FACEBOOK OAUTH SERVICE
 * 
 * Handles Facebook authentication for PetReunion
 * 
 * Flow:
 * 1. User clicks "Continue with Facebook"
 * 2. Facebook SDK opens login popup
 * 3. User grants permissions (email, public_profile)
 * 4. We receive access token
 * 5. Verify token with Facebook Graph API
 * 6. Create or login user in our database
 * 7. Issue session token
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface FacebookProfile {
  id: string;
  email?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
}

export interface User {
  id: string;
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role: 'user' | 'admin' | 'shelter' | 'officer' | 'volunteer';
  isActive: boolean;
  createdAt: string;
}

export interface AuthSession {
  sessionId: string;
  userId: string;
  token: string;
  expiresAt: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  session?: AuthSession;
  error?: string;
  isNewUser?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// FACEBOOK TOKEN VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verify Facebook access token and get user profile
 */
export async function verifyFacebookToken(accessToken: string): Promise<FacebookProfile | null> {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    console.error('[Facebook Auth] Missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET');
    return null;
  }

  try {
    // Step 1: Verify the token is valid for our app
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`;
    const debugResponse = await fetch(debugUrl);
    const debugData = await debugResponse.json();

    if (!debugData.data?.is_valid) {
      console.error('[Facebook Auth] Invalid token:', debugData.data?.error?.message);
      return null;
    }

    // Verify token is for our app
    if (debugData.data.app_id !== appId) {
      console.error('[Facebook Auth] Token is for a different app');
      return null;
    }

    // Step 2: Get user profile
    const profileUrl = `https://graph.facebook.com/me?fields=id,email,name,first_name,last_name,picture.width(200).height(200)&access_token=${accessToken}`;
    const profileResponse = await fetch(profileUrl);
    const profile: FacebookProfile = await profileResponse.json();

    if (!profile.id) {
      console.error('[Facebook Auth] Could not get profile');
      return null;
    }

    return profile;

  } catch (error: any) {
    console.error('[Facebook Auth] Token verification error:', error.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// USER CREATION / LOGIN
// ═══════════════════════════════════════════════════════════════

/**
 * Find or create user from Facebook profile
 */
export async function findOrCreateFacebookUser(
  profile: FacebookProfile,
  accessToken: string
): Promise<{ user: User | null; isNewUser: boolean }> {
  if (!supabase) {
    return { user: null, isNewUser: false };
  }

  try {
    // Check if OAuth account exists
    const { data: existingOAuth } = await supabase
      .from('oauth_accounts')
      .select('user_id')
      .eq('provider', 'facebook')
      .eq('provider_account_id', profile.id)
      .single();

    let userId: string;
    let isNewUser = false;

    if (existingOAuth) {
      // Existing user - update tokens
      userId = existingOAuth.user_id;

      await supabase
        .from('oauth_accounts')
        .update({
          access_token: accessToken,
          provider_data: profile,
          updated_at: new Date().toISOString()
        })
        .eq('provider', 'facebook')
        .eq('provider_account_id', profile.id);

    } else {
      // Check if user with this email exists
      let existingUser = null;
      if (profile.email) {
        const { data } = await supabase
          .from('users')
          .select('id')
          .eq('email', profile.email)
          .single();
        existingUser = data;
      }

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create new user
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({
            email: profile.email,
            email_verified: !!profile.email,
            display_name: profile.name,
            first_name: profile.first_name,
            last_name: profile.last_name,
            avatar_url: profile.picture?.data?.url,
            role: 'user',
            is_active: true
          })
          .select('id')
          .single();

        if (userError || !newUser) {
          throw new Error('Failed to create user');
        }

        userId = newUser.id;
        isNewUser = true;
      }

      // Link OAuth account
      await supabase
        .from('oauth_accounts')
        .insert({
          user_id: userId,
          provider: 'facebook',
          provider_account_id: profile.id,
          provider_email: profile.email,
          access_token: accessToken,
          provider_data: profile
        });
    }

    // Get full user data
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!userData) {
      return { user: null, isNewUser: false };
    }

    const user: User = {
      id: userData.id,
      email: userData.email,
      displayName: userData.display_name,
      firstName: userData.first_name,
      lastName: userData.last_name,
      avatarUrl: userData.avatar_url,
      role: userData.role,
      isActive: userData.is_active,
      createdAt: userData.created_at
    };

    return { user, isNewUser };

  } catch (error: any) {
    console.error('[Facebook Auth] User creation error:', error.message);
    return { user: null, isNewUser: false };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a new session for the user
 */
export async function createSession(
  userId: string,
  options?: {
    ipAddress?: string;
    userAgent?: string;
    deviceType?: string;
    expiresInDays?: number;
  }
): Promise<AuthSession | null> {
  if (!supabase) return null;

  try {
    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Set expiration (default 30 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (options?.expiresInDays || 30));

    // Create session
    const { data: session, error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        token_hash: tokenHash,
        ip_address: options?.ipAddress,
        user_agent: options?.userAgent,
        device_type: options?.deviceType,
        expires_at: expiresAt.toISOString()
      })
      .select('id, expires_at')
      .single();

    if (error || !session) {
      throw new Error('Failed to create session');
    }

    return {
      sessionId: session.id,
      userId,
      token, // Return the actual token (not the hash)
      expiresAt: session.expires_at
    };

  } catch (error: any) {
    console.error('[Facebook Auth] Session creation error:', error.message);
    return null;
  }
}

/**
 * Validate a session token
 */
export async function validateSession(token: string): Promise<User | null> {
  if (!supabase) return null;

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find active session
    const { data: session } = await supabase
      .from('user_sessions')
      .select('user_id, expires_at')
      .eq('token_hash', tokenHash)
      .eq('is_active', true)
      .single();

    if (!session) {
      return null;
    }

    // Check expiration
    if (new Date(session.expires_at) < new Date()) {
      await invalidateSession(token);
      return null;
    }

    // Update last used
    await supabase
      .from('user_sessions')
      .update({ last_used_at: new Date().toISOString() })
      .eq('token_hash', tokenHash);

    // Get user
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user_id)
      .eq('is_active', true)
      .single();

    if (!userData) {
      return null;
    }

    return {
      id: userData.id,
      email: userData.email,
      displayName: userData.display_name,
      firstName: userData.first_name,
      lastName: userData.last_name,
      avatarUrl: userData.avatar_url,
      role: userData.role,
      isActive: userData.is_active,
      createdAt: userData.created_at
    };

  } catch (error: any) {
    console.error('[Facebook Auth] Session validation error:', error.message);
    return null;
  }
}

/**
 * Invalidate a session (logout)
 */
export async function invalidateSession(token: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('token_hash', tokenHash);

    return true;
  } catch {
    return false;
  }
}

/**
 * Invalidate all sessions for a user (logout everywhere)
 */
export async function invalidateAllSessions(userId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', userId);

    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN AUTH FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Complete Facebook authentication flow
 * Called from the API route with the Facebook access token
 */
export async function authenticateWithFacebook(
  accessToken: string,
  options?: {
    ipAddress?: string;
    userAgent?: string;
    deviceType?: string;
  }
): Promise<AuthResult> {
  try {
    // Step 1: Verify token and get profile
    const profile = await verifyFacebookToken(accessToken);
    
    if (!profile) {
      return { success: false, error: 'Invalid Facebook token' };
    }

    // Step 2: Find or create user
    const { user, isNewUser } = await findOrCreateFacebookUser(profile, accessToken);
    
    if (!user) {
      return { success: false, error: 'Failed to create user account' };
    }

    // Step 3: Create session
    const session = await createSession(user.id, options);
    
    if (!session) {
      return { success: false, error: 'Failed to create session' };
    }

    return {
      success: true,
      user,
      session,
      isNewUser
    };

  } catch (error: any) {
    console.error('[Facebook Auth] Authentication error:', error.message);
    return { success: false, error: error.message };
  }
}

