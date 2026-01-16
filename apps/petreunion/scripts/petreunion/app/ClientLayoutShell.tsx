'use client';

import dynamic from 'next/dynamic';

const PetReunionNav = dynamic(() => import('@/components/petreunion/PetReunionNav'), {
  ssr: false,
});

const PetReunionFooter = dynamic(() => import('@/components/petreunion/PetReunionFooter'), {
  ssr: false,
});

const ErrorBoundary = dynamic(() => import('@/components/errors/ErrorBoundary'), {
  ssr: false,
});

export default function ClientLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col">
        <PetReunionNav />
        <main className="flex-1">{children}</main>
        <PetReunionFooter />
      </div>
    </ErrorBoundary>
  );
}
