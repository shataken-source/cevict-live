import { createClient } from '@supabase/supabase-js';

/**
 * Trim Windows line endings (\r\n) and whitespace from environment variables
 * This fixes issues when keys are copied from files with line endings
 */
function trimEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.trim().replace(/\r\n$/, '').replace(/\n$/, '').replace(/\r$/, '');
}

/**
 * Get Supabase client with properly trimmed keys
 * Uses service role key if available, falls back to anon key
 */
export function getSupabaseClient() {
  const supabaseUrl = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = trimEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const anonKey = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const supabaseKey = serviceKey || anonKey;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase config check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!serviceKey,
      hasAnonKey: !!anonKey,
      urlLength: supabaseUrl?.length,
      keyLength: supabaseKey?.length,
    });
    throw new Error('Supabase configuration missing. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  // Log which key type is being used (for debugging)
  if (serviceKey) {
    console.log('Using SERVICE_ROLE key for Supabase');
  } else if (anonKey) {
    console.log('Using ANON key for Supabase (fallback)');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Get Supabase URL (trimmed)
 */
export function getSupabaseUrl(): string | undefined {
  return trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

/**
 * Get Supabase key (trimmed)
 */
export function getSupabaseKey(): string | undefined {
  return trimEnv(process.env.SUPABASE_SERVICE_ROLE_KEY) || trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
