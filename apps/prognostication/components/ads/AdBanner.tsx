'use client';

import { useEffect, useRef } from 'react';

// Extend Window interface to include adsbygoogle
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdBannerProps {
  adSlot: string;
  adFormat: 'banner' | 'skyscraper' | 'rectangle' | 'leaderboard';
  width?: number;
  height?: number;
  className?: string;
  responsive?: boolean;
}

export default function AdBanner({
  adSlot,
  adFormat,
  width,
  height,
  className = '',
  responsive = true
}: AdBannerProps) {
  const adInitialized = useRef(false);

  // Ad format dimensions
  const dimensions = {
    banner: { width: width || 468, height: height || 60 },
    skyscraper: { width: width || 120, height: height || 600 },
    rectangle: { width: width || 300, height: height || 250 },
    leaderboard: { width: width || 728, height: height || 90 }
  };

  const { width: adWidth, height: adHeight } = dimensions[adFormat];

  useEffect(() => {
    // Only initialize once per component instance
    if (adInitialized.current) return;

    try {
      // Check if this specific ad slot is already initialized
      const thisAd = document.querySelector(`ins[data-ad-slot="${adSlot}"]`);
      if (thisAd?.getAttribute('data-adsbygoogle-status') === 'done') {
        adInitialized.current = true;
        return;
      }

      // Initialize the ad
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      adInitialized.current = true;
    } catch (err) {
      // Silently suppress AdSense errors in development (common with Fast Refresh)
      if (process.env.NODE_ENV === 'production') {
        console.error('AdSense error:', err);
      }
    }
  }, [adSlot]);

  return (
    <div className={`ad-container ${className}`}>
      {/* Google AdSense ad */}
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          width: adWidth,
          height: adHeight
        }}
        data-ad-client="ca-pub-0940073536675562"
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}
