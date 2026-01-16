'use client';

import PetReunionNav from '@/components/petreunion/PetReunionNav';
import PetReunionFooter from '@/components/petreunion/PetReunionFooter';
import ErrorBoundary from '@/components/errors/ErrorBoundary';
import { usePathname } from 'next/navigation';

function useSafePathname(): string {
  try {
    return usePathname() || '';
  } catch {
    // In some edge contexts (e.g. non-router renders), Next's PathnameContext may be missing.
    // Fall back to the browser location to avoid crashing the whole app.
    return typeof window !== 'undefined' ? window.location.pathname || '' : '';
  }
}

export default function ClientLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = useSafePathname();
  const isFlyer = pathname === '/flyer' || pathname.startsWith('/flyer/');

  return (
    <ErrorBoundary>
      {isFlyer ? (
        // Print view: render flyer ONLY (no nav/footer/background) to avoid extra print pages.
        <main>{children}</main>
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col">
          <PetReunionNav />
          <main className="flex-1">{children}</main>
          <PetReunionFooter />
        </div>
      )}
    </ErrorBoundary>
  );
}
