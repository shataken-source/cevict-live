'use client';

import { HelpCircle } from 'lucide-react';
import { useState } from 'react';

interface HelpfulTooltipProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function HelpfulTooltip({ content, position = 'top' }: HelpfulTooltipProps) {
  const [show, setShow] = useState(false);

  const positionStyles = {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px' },
    left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '8px' },
    right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '8px' }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'help',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          color: '#667eea'
        }}
        aria-label="Help"
      >
        <HelpCircle size={16} />
      </button>
      {show && (
        <div
          style={{
            position: 'absolute',
            ...positionStyles[position],
            background: '#1f2937',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            maxWidth: '200px',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            whiteSpace: 'normal',
            lineHeight: '1.4'
          }}
          role="tooltip"
        >
          {content}
          <div
            style={{
              position: 'absolute',
              ...(position === 'top' ? { top: '100%', left: '50%', transform: 'translateX(-50%)', borderTop: '6px solid #1f2937', borderLeft: '6px solid transparent', borderRight: '6px solid transparent' } :
                position === 'bottom' ? { bottom: '100%', left: '50%', transform: 'translateX(-50%)', borderBottom: '6px solid #1f2937', borderLeft: '6px solid transparent', borderRight: '6px solid transparent' } :
                position === 'left' ? { left: '100%', top: '50%', transform: 'translateY(-50%)', borderLeft: '6px solid #1f2937', borderTop: '6px solid transparent', borderBottom: '6px solid transparent' } :
                { right: '100%', top: '50%', transform: 'translateY(-50%)', borderRight: '6px solid #1f2937', borderTop: '6px solid transparent', borderBottom: '6px solid transparent' })
            }}
          />
        </div>
      )}
    </div>
  );
}

