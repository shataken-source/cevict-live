import { createClient } from '@supabase/supabase-js';

let supabase: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!url || !key) {
      console.error('[SupabaseClient] Missing credentials:', { url: !!url, key: !!key });
      throw new Error('Supabase credentials not configured');
    }
    
    supabase = createClient(url, key);
  }
  
  return supabase;
}

export function resetSupabaseClient() {
  supabase = null;
}
