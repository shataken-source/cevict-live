import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

let cachedAdminClient: SupabaseClient | null = null

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Server-side Supabase client that reads session from cookies (App Router).
 * Use in API routes / Server Components to get the authenticated user.
 */
export async function getServerUser(): Promise<{ id: string; email?: string } | null> {
  if (!supabaseUrl || !supabaseAnonKey) return null
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set() {},
      remove() {},
    },
  })
  const { data: { user } } = await supabase.auth.getUser()
  return user ? { id: user.id, email: user.email ?? undefined } : null
}

/**
 * Get Supabase admin client (service role key)
 * Returns null if env vars are missing (for graceful degradation)
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  if (cachedAdminClient) return cachedAdminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return null
  }

  cachedAdminClient = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
    },
  })

  return cachedAdminClient
}
