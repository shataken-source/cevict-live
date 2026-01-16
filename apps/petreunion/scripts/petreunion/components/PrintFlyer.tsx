'use client';

import { Printer } from 'lucide-react';

interface PrintFlyerProps {
  pet: {
    name: string;
    type: string;
    breed?: string;
    color?: string;
    location: string;
    description?: string;
    photoUrl?: string | null;
    dateLost?: string;
    contact?: string;
  };
}

export default function PrintFlyer({ pet }: PrintFlyerProps) {
  const handlePrint = () => {
    const currentId = (() => {
      try {
        const m = window.location.pathname.match(/\/pets\/([^/]+)$/);
        return m ? m[1] : null;
      } catch {
        return null;
      }
    })();

    const id = (currentId || '').trim();
    const target = id ? `/flyer/${encodeURIComponent(id)}` : '/flyer/unknown';
    window.open(target, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handlePrint}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        background: 'white',
        color: '#667eea',
        border: '2px solid #667eea',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#667eea';
        e.currentTarget.style.color = 'white';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'white';
        e.currentTarget.style.color = '#667eea';
      }}
      aria-label="Print pet flyer"
    >
      <Printer size={16} />
      Print Flyer
    </button>
  );
}

