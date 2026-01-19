'use client';

import { useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const supabase = createSupabaseClient();
      if (mode === 'sign_in') {
        const res = await supabase.auth.signInWithPassword({ email, password });
        if (res.error) throw res.error;
        window.location.href = '/';
      } else {
        const res = await supabase.auth.signUp({ email, password });
        if (res.error) throw res.error;
        setSuccess('Account created. If email confirmation is enabled, check your inbox. Otherwise you can sign in now.');
        setMode('sign_in');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900/60 border border-slate-700 rounded-2xl p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Website Monitor</h1>
          <p className="text-slate-300 text-sm mt-1">Sign in to access your dashboard</p>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
              mode === 'sign_in' ? 'bg-blue-600' : 'bg-white/10 hover:bg-white/15'
            }`}
            onClick={() => setMode('sign_in')}
            type="button"
          >
            Sign in
          </button>
          <button
            className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
              mode === 'sign_up' ? 'bg-blue-600' : 'bg-white/10 hover:bg-white/15'
            }`}
            onClick={() => setMode('sign_up')}
            type="button"
          >
            Sign up
          </button>
        </div>

        {error && <div className="mb-3 text-sm text-red-300 bg-red-950/40 border border-red-800 rounded-lg p-3">{error}</div>}
        {success && (
          <div className="mb-3 text-sm text-green-200 bg-green-950/30 border border-green-800 rounded-lg p-3">
            {success}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-300 mb-1">Email</label>
            <input
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder="you@domain.com"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-1">Password</label>
            <input
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
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
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 rounded-lg px-4 py-2 font-semibold"
            onClick={submit}
            disabled={loading || !email || !password}
            type="button"
          >
            {loading ? 'Working…' : mode === 'sign_in' ? 'Sign in' : 'Create account'}
          </button>
        </div>

        <div className="mt-4 text-xs text-slate-400">
          Needs Supabase env vars: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
        </div>
      </div>
    </div>
  );
}

