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
    // Prefer `profiles.user_id` (common schema). Fallback to `profiles.id` for legacy schemas.
    {
      const { data, error } = await admin.from('profiles').select('role').eq('user_id', user.id).maybeSingle();
      if (!error) {
        const r = normalizeRole((data as any)?.role);
        if (r) return r;
      }
    }
    {
      const { data, error } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (!error) {
        const r = normalizeRole((data as any)?.role);
        if (r) return r;
      }
    }
  } catch {
    // ignore, fallback below
  }

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
    res.status(403).json({ error: 'Forbidden (insufficient role)', role });
    return false;
  }

  return true;
}

