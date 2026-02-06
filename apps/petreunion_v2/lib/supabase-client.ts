import { createClient } from '@supabase/supabase-js';

// Trim Windows line endings and whitespace from env values
function trimEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.trim().replace(/\r\n$/, '').replace(/\n$/, '').replace(/\r$/, '');
}

export function getSupabaseClient() {
  const supabaseUrl = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = trimEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const anonKey = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const supabaseKey = serviceKey || anonKey;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase config (v2 app) missing:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!serviceKey,
      hasAnonKey: !!anonKey,
    });
    throw new Error(
      'Supabase configuration missing. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createClient(supabaseUrl, supabaseKey);
}

