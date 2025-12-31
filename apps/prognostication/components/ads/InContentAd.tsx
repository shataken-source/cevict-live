'use client';

import AdBanner from './AdBanner';

interface InContentAdProps {
  adSlot: string;
  title?: string;
  showLabel?: boolean;
  className?: string;
}

export default function InContentAd({ 
  adSlot, 
  title = "Continue Reading", 
  showLabel = true,
  className = '' 
}: InContentAdProps) {
  return (
    <div className={`my-8 border-t border-b border-gray-200 py-6 ${className}`}>
      {showLabel && (
        <div className="text-center mb-4">
          <span className="text-xs text-gray-500 uppercase tracking-wide">Advertisement</span>
        </div>
      )}
      
      <div className="flex justify-center">
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
            <p className="text-sm text-gray-600">Support our journalism by checking out our partners</p>
          </div>
          
          <AdBanner 
            adSlot={adSlot} 
            adFormat="rectangle" 
            width={300} 
            height={250}
            className="mx-auto"
          />
          
          <div className="text-center">
            <p className="text-xs text-gray-500">
              <a href="/advertise" className="hover:text-gray-700 underline">
                Advertise with us
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
