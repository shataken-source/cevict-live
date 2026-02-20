/**
 * Supabase Client
 * Centralized Supabase client configuration
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl) console.error('[Supabase] NEXT_PUBLIC_SUPABASE_URL is not set')
if (!supabaseKey) console.error('[Supabase] Neither SUPABASE_SERVICE_ROLE_KEY nor NEXT_PUBLIC_SUPABASE_ANON_KEY is set')

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
})

export { createClient }
