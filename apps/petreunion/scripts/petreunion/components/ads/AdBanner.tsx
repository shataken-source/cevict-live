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
  const adElementRef = useRef<HTMLDivElement>(null);

  // Ad format dimensions
  const dimensions = {
    banner: { width: width || 468, height: height || 60 },
    skyscraper: { width: width || 120, height: height || 600 },
    rectangle: { width: width || 300, height: height || 250 },
    leaderboard: { width: width || 728, height: height || 90 }
  };

  const { width: adWidth, height: adHeight } = dimensions[adFormat];

  useEffect(() => {
    // Prevent double initialization
    if (adInitialized.current) {
      return;
    }

    // Wait for the ad element to be in the DOM and AdSense script to load
    if (!adElementRef.current || typeof window === 'undefined') {
      return;
    }

    const adElement = adElementRef.current.querySelector('.adsbygoogle') as HTMLElement;
    if (!adElement) {
      return;
    }

    // Check if this specific ad element already has ads initialized
    const status = adElement.getAttribute('data-adsbygoogle-status');
    if (status === 'done' || status === 'filled') {
      adInitialized.current = true;
      return;
    }

    // Wait for AdSense script to be loaded
    const checkAndPush = () => {
      if (!window.adsbygoogle) {
        return;
      }

      // Double-check status before pushing
      const currentStatus = adElement.getAttribute('data-adsbygoogle-status');
      if (currentStatus === 'done' || currentStatus === 'filled' || adInitialized.current) {
        adInitialized.current = true;
        return;
      }

      try {
        // Check if this ad slot was already pushed by checking all adsbygoogle elements
        const allAds = document.querySelectorAll('.adsbygoogle');
        let alreadyPushed = false;
        const currentAdSlot = adElement.getAttribute('data-ad-slot');
        allAds.forEach((ad) => {
          const adSlot = ad.getAttribute('data-ad-slot');
          const adStatus = ad.getAttribute('data-adsbygoogle-status');
          if (adSlot === currentAdSlot && adStatus && ad !== adElement) {
            alreadyPushed = true;
          }
        });

        if (!alreadyPushed && !adInitialized.current) {
          window.adsbygoogle.push({});
          adInitialized.current = true;
        }
      } catch (err) {
        // Silently handle errors (ad might already be initialized)
        console.warn('AdSense push warning:', err);
        adInitialized.current = true;
      }
    };

    // If script is already loaded, push immediately
    if (window.adsbygoogle) {
      // Small delay to ensure DOM is ready
      setTimeout(checkAndPush, 100);
    } else {
      // Wait for script to load
      const scriptCheck = setInterval(() => {
        if (window.adsbygoogle) {
          clearInterval(scriptCheck);
          setTimeout(checkAndPush, 100);
        }
      }, 100);

      // Cleanup after 5 seconds
      setTimeout(() => clearInterval(scriptCheck), 5000);
    }

    // Cleanup function
    return () => {
      adInitialized.current = true;
    };
  }, [adSlot]);

  return (
    <div ref={adElementRef} className={`ad-container ${className}`}>
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

