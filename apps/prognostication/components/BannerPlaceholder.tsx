'use client';

import AdBanner from './ads/AdBanner';

// Extend Window interface to include adsbygoogle
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface BannerPlaceholderProps {
  position: 'header' | 'sidebar' | 'footer' | 'in-content' | 'leaderboard';
  className?: string;
  adSlot?: string;
}

export default function BannerPlaceholder({
  position,
  className = '',
  adSlot = '1234567890' // Default placeholder slot
}: BannerPlaceholderProps) {
  // Ad initialization is handled by AdBanner component
  // No need to push here - AdBanner will handle it

  // Position-specific configurations
  const configs = {
    header: {
      format: 'leaderboard' as const,
      width: 728,
      height: 90,
      containerClass: 'w-full bg-gray-50 border-b border-gray-200 py-2',
      innerClass: 'max-w-7xl mx-auto px-4 flex justify-center items-center gap-4'
    },
    sidebar: {
      format: 'skyscraper' as const,
      width: 160,
      height: 600,
      containerClass: 'w-full bg-gray-50 border border-gray-200 rounded-lg p-4',
      innerClass: 'flex flex-col items-center gap-2'
    },
    footer: {
      format: 'banner' as const,
      width: 728,
      height: 90,
      containerClass: 'w-full bg-gray-50 border-t border-gray-200 py-4',
      innerClass: 'max-w-7xl mx-auto px-4 flex justify-center items-center gap-4'
    },
    'in-content': {
      format: 'rectangle' as const,
      width: 300,
      height: 250,
      containerClass: 'w-full bg-gray-50 border border-gray-200 rounded-lg p-4 my-8',
      innerClass: 'flex flex-col items-center gap-2'
    },
    leaderboard: {
      format: 'leaderboard' as const,
      width: 728,
      height: 90,
      containerClass: 'w-full bg-gray-50 border border-gray-200 rounded-lg p-4',
      innerClass: 'flex flex-col items-center gap-2'
    }
  };

  const config = configs[position];

  return (
    <div className={`${config.containerClass} ${className}`}>
      <div className={config.innerClass}>
        <div className="text-xs text-gray-500 uppercase tracking-wide">Advertisement</div>
        <AdBanner
          adSlot={adSlot}
          adFormat={config.format}
          width={config.width}
          height={config.height}
          responsive={true}
        />
      </div>
    </div>
  );
}

