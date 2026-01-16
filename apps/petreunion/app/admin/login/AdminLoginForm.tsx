'use client';

import { useState } from 'react';

export function AdminLoginForm(props: { nextPath: string; error?: string | null }) {
  const { nextPath, error } = props;
  const [show, setShow] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Admin Access</h1>
        <p className="mt-1 text-sm text-slate-600">Enter the admin password to unlock admin tools.</p>

        {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

        <form className="mt-6 space-y-4" action="/api/admin/login" method="post">
          <input type="hidden" name="next" value={nextPath} />

          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="password">
              Password
            </label>
            <div className="flex gap-2">
              <input
                id="password"
                name="password"
                type={show ? 'text' : 'password'}
                className="flex-1 rounded-md border px-3 py-2"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                aria-label={show ? 'Hide password' : 'Show password'}
                onClick={() => setShow((s) => !s)}
                className="shrink-0 rounded-md border bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button type="submit" className="w-full rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700">
            Unlock
          </button>
        </form>

        <div className="mt-4 text-xs text-slate-500">
          Tip: You can now log in using <code>ADMIN_KEY</code> too (same as cron key).
          <div className="mt-1 opacity-70">UI build: 2026-01-15a</div>
        </div>
      </div>
    </div>
  );
}

