import type { NextApiRequest, NextApiResponse } from 'next';
import type { User } from '@supabase/supabase-js';
import { getAuthedUser, getSupabaseAdmin, type AppRole } from './supabase';

function normalizeRole(v: unknown): AppRole | null {
  const s = String(v || '').trim().toLowerCase();
  if (s === 'admin' || s === 'captain' || s === 'user') return s;
  return null;
}

async function getRoleForUser(user: User): Promise<AppRole | null> {
  try {
    const admin = getSupabaseAdmin();
    // Check profiles table - supports both schemas: profiles.id = auth.users.id OR profiles.user_id = auth.users.id
    // Also supports both role models: is_admin (boolean) OR role (text)
    
    // Try profiles.id = auth.users.id (production schema: profiles.id = auth.users.id)
    {
      const { data, error } = await admin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
      if (error) {
        console.warn('[RBAC] Error checking profiles.id:', error.message);
      } else if (data) {
        console.log('[RBAC] Found profile by id:', { userId: user.id, is_admin: (data as any)?.is_admin });
        // Check is_admin boolean (production schema)
        if ((data as any)?.is_admin === true) return 'admin';
      }
    }
    
    // Try profiles.user_id = auth.users.id (alternative schema)
    {
      const { data, error } = await admin.from('profiles').select('is_admin').eq('user_id', user.id).maybeSingle();
      if (error) {
        console.warn('[RBAC] Error checking profiles.user_id:', error.message);
      } else if (data) {
        console.log('[RBAC] Found profile by user_id:', { userId: user.id, is_admin: (data as any)?.is_admin });
        // Check is_admin boolean
        if ((data as any)?.is_admin === true) return 'admin';
      }
    }
    
    // Legacy: Try role column if it exists (for backward compatibility with old schemas)
    // Only try this if is_admin didn't work
    try {
      const { data, error } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (!error && data && (data as any)?.role) {
        console.log('[RBAC] Found profile with role (legacy):', { userId: user.id, role: (data as any)?.role });
        const r = normalizeRole((data as any)?.role);
        if (r) return r;
      }
    } catch {
      // role column doesn't exist - that's fine, we're using is_admin
    }
  } catch (err: any) {
    console.error('[RBAC] Exception in getRoleForUser:', err?.message);
  }

  // Fallback: Check environment variable for admin emails
  const allow = String(process.env.GCC_ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (user.email && allow.includes(user.email.toLowerCase())) return 'admin';

  return 'user';
}

/**
 * GCC admin RBAC gate.
 * Returns true if authorized; otherwise writes the response and returns false.
 */
export async function requireRole(req: NextApiRequest, res: NextApiResponse, roles: AppRole[] = ['user']) {
  // Server-to-server backdoor for automation (keep secret; do NOT expose to client code).
  const adminKey = String(process.env.GCC_ADMIN_KEY || '').trim();
  const presented = String(req.headers['x-admin-key'] || '').trim();
  if (adminKey && presented && presented === adminKey) {
    return true;
  }

  const { user } = await getAuthedUser(req, res);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized (no Supabase session)' });
    return false;
  }

  const role = await getRoleForUser(user as any);
  if (!role || !roles.includes(role)) {
    // Debug: Log what we found
    console.error('[RBAC] Access denied:', {
      userId: user.id,
      userEmail: user.email,
      foundRole: role,
      requiredRoles: roles,
    });
    res.status(403).json({ 
      error: 'Forbidden (insufficient role)', 
      role: role || 'none',
      userId: user.id,
      userEmail: user.email,
    });
    return false;
  }

  return true;
}

