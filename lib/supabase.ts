// Supabase clients (anon + admin/service-role)
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

function env(key: string): string | null {
  const v = process.env[key];
  if (!v) return null;
  const trimmed = String(v).trim();
  return trimmed ? trimmed : null;
}

export function getSupabaseUrl(): string | null {
  return env('NEXT_PUBLIC_SUPABASE_URL');
}

export function getSupabaseAnonKey(): string | null {
  return env('NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export function getSupabaseServiceRoleKey(): string | null {
  return env('SUPABASE_SERVICE_ROLE_KEY');
}

// Browser/client-safe client (RLS applies)
export const supabase = (() => {
  const url = getSupabaseUrl();
  const anon = getSupabaseAnonKey();
  if (!url || !anon) return null;
  return createSupabaseClient(url, anon);
})();

export const createClient = (): SupabaseClient | null => {
  const url = getSupabaseUrl();
  const anon = getSupabaseAnonKey();
  if (!url || !anon) return null;
  return createSupabaseClient(url, anon);
};

// Server/admin client (SERVICE ROLE) - use ONLY in route handlers / bots
export function getSupabaseAdminClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}
