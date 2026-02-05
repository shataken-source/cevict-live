'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PrognoRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to homepage
    router.replace('/');
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#1e1b4b',
      color: 'white',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔄</div>
        <div>Redirecting to homepage...</div>
      </div>
    </div>
  );
}

