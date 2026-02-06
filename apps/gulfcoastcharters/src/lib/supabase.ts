import { createClient } from '@supabase/supabase-js';

function trimEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.trim().replace(/\r\n$/, '').replace(/\n$/, '').replace(/\r$/, '');
}

const supabaseUrl = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseKey = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
  db: {
    schema: 'public',
  },
  // Don't override headers - let supabase-js manage Accept headers automatically
  // This prevents 406 errors
});
