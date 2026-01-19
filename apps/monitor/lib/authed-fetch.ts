import { createSupabaseClient } from '@/lib/supabase';

/**
 * Client-side fetch that automatically attaches Supabase session Bearer token.
 * This lets our Next route handlers call `requireUser()` consistently.
 */
export async function authedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});

  try {
    const supabase = createSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  } catch {
    // If Supabase isn't configured yet (or running SSR), fall back to unauth'd fetch.
  }

  return fetch(input, { ...init, headers });
}

