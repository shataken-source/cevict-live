'use client';

import { useEffect, useState } from 'react';

export default function AdminAuth({ children }: { children: React.ReactNode }) {
  const [isAuth, setAuth] = useState(false);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [show, setShow] = useState(false);
  const [checking, setChecking] = useState(true);

  // Admin auth is cookie-based (set by /api/admin/login). Validate by calling an admin API.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/env-status', { method: 'GET' });
        if (!cancelled) setAuth(res.ok);
      } catch {
        if (!cancelled) setAuth(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-sm text-gray-600">Checking admin session…</div>
        </div>
      </div>
    );
  }

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">🔐</div>
            <h1 className="text-3xl font-bold mb-2">Admin Access</h1>
          </div>

          <form className="space-y-6" action="/api/admin/login" method="post">
            <input type="hidden" name="next" value="/admin" />

            <div className="flex gap-2">
              <input
                type={show ? 'text' : 'password'}
                name="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="flex-1 px-4 py-3 border rounded-lg"
                placeholder="Password"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="shrink-0 rounded-lg border bg-white px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? 'Hide' : 'Show'}
              </button>
            </div>

            {err ? <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{err}</div> : null}

            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700">
              Unlock
            </button>
          </form>

          <div className="mt-6 pt-6 border-t text-center">
            <a href="/" className="text-sm text-gray-600">
              ← Back
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      <div className="fixed top-4 right-4">
        <form
          action="/api/admin/logout"
          method="post"
          onSubmit={() => {
            setAuth(false);
          }}
        >
          <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">
            🔒 Logout
          </button>
        </form>
      </div>
    </>
  );
}
