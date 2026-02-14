import { createClient } from '@supabase/supabase-js';

// Get keys from the environment variables (which Next.js loads from .env.local)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create the single Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
