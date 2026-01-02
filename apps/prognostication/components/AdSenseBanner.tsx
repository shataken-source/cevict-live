'use client';

import { useEffect } from 'react';

interface AdSenseBannerProps {
  adSlot: string;
  format?: string;
  style?: React.CSSProperties;
  className?: string;
}

export default function AdSenseBanner({ 
  adSlot, 
  format = 'auto',
  style,
  className = ''
}: AdSenseBannerProps) {
  useEffect(() => {
    try {
      // Wait for AdSense script to load
      if (typeof window !== 'undefined') {
        const initAd = () => {
          try {
            if ((window as any).adsbygoogle && (window as any).adsbygoogle.loaded !== true) {
              ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
            }
          } catch (e) {
            // Silently ignore AdSense errors
          }
        };

        // Try immediately
        initAd();

        // Also try after a short delay in case script is still loading
        const timeout = setTimeout(initAd, 100);
        return () => clearTimeout(timeout);
      }
    } catch (error) {
      // Silently ignore errors
    }
  }, [adSlot]);

  // Don't render in development if no ad slot provided
  if (!adSlot || adSlot === '1234567890') {
    return (
      <div className={`bg-gray-200 dark:bg-gray-800 flex items-center justify-center ${className}`} style={style}>
        <span className="text-gray-500 text-sm">Advertisement</span>
      </div>
    );
  }

  return (
    <ins
      className={`adsbygoogle ${className}`}
      style={{ display: 'block', ...style }}
      data-ad-client="ca-pub-0940073536675562"
      data-ad-slot={adSlot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}

