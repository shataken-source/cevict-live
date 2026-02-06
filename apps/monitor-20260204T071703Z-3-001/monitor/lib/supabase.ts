import { createClient as createSupabaseClientLib } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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

