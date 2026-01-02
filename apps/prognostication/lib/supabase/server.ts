import { createClient, SupabaseClient } from "@supabase/supabase-js"

let supabaseClient: SupabaseClient | null = null

function getClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return null
  }

  try {
    supabaseClient = createClient(url, key)
    return supabaseClient
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    return null
  }
}

// Export createClient for backward compatibility
export { createClient };

// Lazy initialization - only creates client when first accessed
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient()
    if (!client) {
      // Return a no-op function or throw based on what's expected
      if (prop === 'from') {
        return () => ({
          select: () => ({ data: null, error: { message: 'Supabase not configured' } }),
          insert: () => ({ data: null, error: { message: 'Supabase not configured' } }),
          update: () => ({ data: null, error: { message: 'Supabase not configured' } }),
          delete: () => ({ data: null, error: { message: 'Supabase not configured' } }),
        })
      }
      throw new Error('Supabase client not initialized. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    }
    const value = client[prop as keyof SupabaseClient]
    // If it's a function, bind it to the client
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  }
})
