'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  const isLoginRoute = useMemo(() => pathname === '/login', [pathname]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // Allow /login without session.
      if (isLoginRoute) {
        if (!cancelled) setReady(true);
        return;
      }

      try {
        const supabase = createSupabaseClient();
        const { data } = await supabase.auth.getSession();
        const hasSession = !!data.session;
        if (!hasSession) {
          window.location.href = '/login';
          return;
        }
      } catch {
        // If Supabase isn't configured, don't hard-block the UI.
      }

      if (!cancelled) setReady(true);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [isLoginRoute]);

  if (!ready && !isLoginRoute) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-sm text-slate-300">Checking session…</div>
      </div>
    );
  }

  return <>{children}</>;
}

