/**
 * Enterprise-level authentication and authorization
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export interface AuthUser {
  id: string;
  email?: string;
  role?: 'admin' | 'shelter' | 'user';
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

/**
 * Check if user is authenticated
 */
export async function checkAuth(): Promise<AuthResult> {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get user role from metadata or user_metadata
    const role = user.user_metadata?.role || 'user';

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: role as 'admin' | 'shelter' | 'user'
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Authentication failed' };
  }
}

/**
 * Check if user has admin role
 */
export async function requireAdmin(): Promise<AuthResult> {
  const auth = await checkAuth();
  
  if (!auth.success || !auth.user) {
    return { success: false, error: 'Authentication required' };
  }

  if (auth.user.role !== 'admin') {
    return { success: false, error: 'Admin access required' };
  }

  return auth;
}

/**
 * Check if user has shelter or admin role
 */
export async function requireShelterOrAdmin(): Promise<AuthResult> {
  const auth = await checkAuth();
  
  if (!auth.success || !auth.user) {
    return { success: false, error: 'Authentication required' };
  }

  if (auth.user.role !== 'admin' && auth.user.role !== 'shelter') {
    return { success: false, error: 'Shelter or admin access required' };
  }

  return auth;
}

/**
 * Generate secure API key for admin operations
 */
export function generateApiKey(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate API key from environment
 */
export function validateApiKey(providedKey: string): boolean {
  const validKey = process.env.ADMIN_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!validKey) return false;
  
  // Use constant-time comparison to prevent timing attacks
  try {
    const crypto = require('crypto');
    return crypto.timingSafeEqual(
      Buffer.from(providedKey),
      Buffer.from(validKey)
    );
  } catch {
    // Fallback for environments without crypto
    return providedKey === validKey;
  }
}

