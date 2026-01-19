import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function createSupabaseAdminClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase admin not configured (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required)');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

