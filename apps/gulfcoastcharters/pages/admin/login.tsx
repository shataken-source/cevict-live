import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

export default function AdminLoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Removed auto-redirect on mount - let user always see login form
  // Redirect only happens after successful login in submit()

  useEffect(() => {
    if (!router.isReady) return;

    const q = router.query;
    const emailParam = typeof q.email === 'string' ? q.email : '';
    const fromSso = q.sso === '1';

    if (emailParam && !email) {
      setEmail(emailParam);
    }

    if (fromSso && emailParam) {
      setInfo(`SSO validated. Continue as ${emailParam}.`);
    }
  }, [router.isReady, router.query, email]);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      // Get redirect from URL query (same as router.query but reliable at submit time)
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const redirectParam = params?.get('redirect');
      const redirect = (redirectParam && redirectParam.startsWith('/')) ? redirectParam : '/admin';
      console.log('Login redirect target:', redirect);
      
      if (mode === 'sign_in') {
        const res = await supabase.auth.signInWithPassword({ email, password });
        if (res.error) throw res.error;
        
        console.log('Login successful, waiting for session...');
        
        // Wait a bit for session to be established and persisted
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify session exists
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('Session check:', { hasSession: !!session, error: sessionError });
        
        if (session) {
          console.log('Session confirmed, redirecting to:', redirect);
          // Use window.location for full page reload to ensure session is available
          window.location.href = redirect;
        } else {
          console.warn('No session after login, but redirecting anyway (session may be in storage)');
          // Still redirect - session might be in localStorage but not yet in memory
          window.location.href = redirect;
        }
      } else {
        const res = await supabase.auth.signUp({ email, password });
        if (res.error) throw res.error;
        console.log('Signup successful, waiting for session...');
        
        // Wait a bit for session to be established
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify session exists
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('Session confirmed, redirecting to:', redirect);
          window.location.href = redirect;
        } else {
          // Signup might require email confirmation
          console.log('No session after signup (may need email confirmation), redirecting anyway');
          window.location.href = redirect;
        }
      }
    } catch (e: any) {
      console.error('Login error:', e);
      setError(e?.message || 'Failed');
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Admin Login - Gulf Coast Charters</title>
      </Head>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-6 shadow">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
            <p className="text-sm text-gray-600">Sign in to access the admin dashboard</p>
          </div>

          {info && !error && (
            <div className="mb-3 text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-lg p-3">
              {info}
            </div>
          )}

          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setMode('sign_in')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
                mode === 'sign_in' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode('sign_up')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
                mode === 'sign_up' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              Sign up
            </button>
          </div>

          {error ? (
            <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
          ) : null}

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Email</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                placeholder="you@domain.com"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Password</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete={mode === 'sign_in' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit();
                }}
              />
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={loading || !email || !password}
              className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 font-semibold disabled:bg-gray-400"
            >
              {loading ? 'Working…' : mode === 'sign_in' ? 'Sign in' : 'Create account'}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Needs Supabase env vars: <code>NEXT_PUBLIC_SUPABASE_URL</code> + <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
          </p>
        </div>
      </div>
    </>
  );
}

