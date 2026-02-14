import { createClient as createSupabaseClientLib } from '@supabase/supabase-js';

const useProd = process.env.USE_PROD_SUPABASE === 'true';
const supabaseUrl = useProd
  ? (process.env.NEXT_PUBLIC_SUPABASE_URL_PROD || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '')
  : (process.env.NEXT_PUBLIC_SUPABASE_URL_TEST || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '');
const supabaseAnonKey = useProd
  ? (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
  : (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_TEST || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
const supabaseServiceKey = useProd
  ? (process.env.SUPABASE_SERVICE_ROLE_KEY_PROD || process.env.SUPABASE_SERVICE_ROLE_KEY || '')
  : (process.env.SUPABASE_SERVICE_ROLE_KEY_TEST || process.env.SUPABASE_SERVICE_ROLE_KEY || '');

if (!supabaseUrl) {
  console.warn('⚠️ Supabase URL not configured.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createSupabaseClientLib(supabaseUrl, supabaseAnonKey)
  : null;

export const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required');
  }
  return createSupabaseClientLib(supabaseUrl, supabaseAnonKey);
};

/** Server-side only; use for API routes that need to bypass RLS. */
export const createSupabaseServiceClient = () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  return createSupabaseClientLib(supabaseUrl, supabaseServiceKey);
};
