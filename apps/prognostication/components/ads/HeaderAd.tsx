'use client';

import AdBanner from './AdBanner';

interface HeaderAdProps {
  adSlot: string;
  className?: string;
  sticky?: boolean;
}

export default function HeaderAd({ adSlot, className = '', sticky = false }: HeaderAdProps) {
  return (
    <div className={`w-full bg-gray-50 border-b border-gray-200 ${className} ${
      sticky ? 'sticky top-0 z-30' : ''
    }`}>
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex justify-center items-center">
          <div className="text-xs text-gray-500 mr-4 uppercase tracking-wide">Advertisement</div>
          <AdBanner 
            adSlot={adSlot} 
            adFormat="leaderboard" 
            width={728} 
            height={90}
            className="flex-shrink-0"
          />
        </div>
      </div>
    </div>
  );
}
