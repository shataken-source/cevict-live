import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export type AppRole = 'admin' | 'captain' | 'user';

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
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

