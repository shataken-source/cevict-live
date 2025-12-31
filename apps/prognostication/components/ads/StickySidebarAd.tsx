'use client';

import AdBanner from './AdBanner';

interface StickySidebarAdProps {
  position: 'left' | 'right';
  adSlot: string;
  className?: string;
  offsetTop?: number;
}

export default function StickySidebarAd({ 
  position, 
  adSlot, 
  className = '', 
  offsetTop = 100 
}: StickySidebarAdProps) {
  const positionStyles = {
    left: 'left: 4px;',
    right: 'right: 4px;'
  };

  return (
    <div 
      className={`hidden xl:block fixed top-24 z-30 ${className}`}
      style={{
        position: 'fixed',
        top: `${offsetTop}px`,
        [position === 'left' ? 'left' : 'right']: '16px'
      }}
    >
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-2 py-1 text-xs text-gray-600 text-center border-b">
          Advertisement
        </div>
        <AdBanner 
          adSlot={adSlot} 
          adFormat="skyscraper" 
          width={160} 
          height={600}
          className="w-full"
        />
      </div>
    </div>
  );
}
