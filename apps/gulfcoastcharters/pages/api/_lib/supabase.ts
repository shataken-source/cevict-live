import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export type AppRole = 'admin' | 'captain' | 'user';

function trimEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.trim().replace(/\r\n$/, '').replace(/\n$/, '').replace(/\r$/, '');
}

export function getSupabaseAdmin() {
  const url = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = trimEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) {
    throw new Error('Missing SUPABASE env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export function getSupabaseServer(req: NextApiRequest, res: NextApiResponse) {
  // Uses cookies managed by @supabase/auth-helpers-nextjs
  return createPagesServerClient({ req, res });
}

export async function getAuthedUser(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getSupabaseServer(req, res);
  const { data, error } = await supabase.auth.getUser();
  if (error) return { user: null as any, error };
  return { user: data.user ?? null, error: null };
}

// Dummy default export to satisfy Next.js 16 ApiRouteConfig type constraint.
// This module is a helper, not an actual API route handler.
const supabaseHelperHandler = (req: any, res: any) => {
  if (res && typeof res.status === 'function') {
    res.status(405).json({ error: 'Supabase helper module; not a route handler' });
  }
};

export default supabaseHelperHandler;

