import { createClient as createSupabaseClientLib } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables not configured.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createSupabaseClientLib(supabaseUrl, supabaseAnonKey)
  : null;

export const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are required');
  }
  return createSupabaseClientLib(supabaseUrl, supabaseAnonKey);
};

/** Server-side only; use for API routes that need to bypass RLS (e.g. by owner_id). */
export const createSupabaseServiceClient = () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  return createSupabaseClientLib(supabaseUrl, supabaseServiceKey);
};

