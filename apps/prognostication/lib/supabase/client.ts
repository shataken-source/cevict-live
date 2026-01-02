import { createClient, SupabaseClient } from "@supabase/supabase-js"

let supabaseClient: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (supabaseClient) return supabaseClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // Return a mock client that throws on use, rather than crashing at build time
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set')
  }

  supabaseClient = createClient(url, key)
  return supabaseClient
}

// Lazy initialization - only creates client when first accessed
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient()
    const value = client[prop as keyof SupabaseClient]
    // If it's a function, bind it to the client
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  }
})
