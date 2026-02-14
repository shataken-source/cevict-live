import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Mock auth for demo mode
const createMockAuth = () => {
  const listeners: any[] = [];
  return {
    onAuthStateChange: (callback: any) => {
      listeners.push(callback);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signInWithPassword: async ({ email, password }: any) => {
      const user = { id: 'demo-user', email, user_metadata: { full_name: 'Demo User' } };
      const session = { user, access_token: 'demo-token' };
      setTimeout(() => listeners.forEach(cb => cb('SIGNED_IN', session)), 100);
      return { data: { user, session }, error: null };
    },
    signInWithOAuth: async () => ({ data: {}, error: { message: 'OAuth requires Supabase setup' } }),
    signOut: async () => ({ error: null }),
    getUser: async () => ({ data: { user: null }, error: null })
  };
};

// Mock Supabase client for demo mode
const createMockClient = () => ({
  auth: createMockAuth(),
  from: () => ({
    select: () => ({ data: [], error: null }),
    insert: () => ({ data: null, error: null }),
    update: () => ({ data: null, error: null }),
    eq: function() { return this; }
  }),
  functions: { invoke: async () => ({ data: null, error: null }) }
});

let supabase: any;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
  });
} else {
  console.warn('⚠️ Running in DEMO MODE - Supabase not configured');
  supabase = createMockClient();
}

export { supabase };
