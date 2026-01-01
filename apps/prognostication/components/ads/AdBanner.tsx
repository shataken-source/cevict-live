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

// Global map to track initialized ad slots (prevents duplicates across component instances)
const initializedAdSlots = new Set<string>();

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
    // Check global registry first (prevents duplicates across all component instances)
    if (initializedAdSlots.has(adSlot)) {
      adInitialized.current = true;
      return;
    }

    // Only initialize once per component instance
    if (adInitialized.current) return;

    try {
      // Wait for the DOM element to be available
      const thisAd = document.querySelector(`ins[data-ad-slot="${adSlot}"]`);
      if (!thisAd) {
        // Element not ready yet, try again after a short delay
        setTimeout(() => {
          const retryAd = document.querySelector(`ins[data-ad-slot="${adSlot}"]`);
          if (retryAd && !initializedAdSlots.has(adSlot)) {
            const status = retryAd.getAttribute('data-adsbygoogle-status');
            if (!status || status === '') {
              (window.adsbygoogle = window.adsbygoogle || []).push({});
              initializedAdSlots.add(adSlot);
              adInitialized.current = true;
            }
          }
        }, 100);
        return;
      }

      // Check if this specific ad slot is already initialized (any status means it's been processed)
      const status = thisAd.getAttribute('data-adsbygoogle-status');
      if (status && status !== '') {
        // Already initialized (could be 'done', 'loading', etc.)
        initializedAdSlots.add(adSlot);
        adInitialized.current = true;
        return;
      }

      // Initialize the ad only if not already initialized
      if (!initializedAdSlots.has(adSlot)) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        initializedAdSlots.add(adSlot);
        adInitialized.current = true;
      }
    } catch (err) {
      // Silently suppress AdSense errors in development (common with Fast Refresh)
      if (process.env.NODE_ENV === 'production') {
        console.error('AdSense error:', err);
      }
      // Mark as initialized even on error to prevent retries
      initializedAdSlots.add(adSlot);
      adInitialized.current = true;
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
