'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

type GoogleAdProps = {
  slot: string;
  style?: React.CSSProperties;
  format?: string;
  responsive?: boolean;
};

function GoogleAdBase({ slot, style, format = 'auto', responsive = true }: GoogleAdProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      // Check if this element already has ads loaded
      const element = document.querySelector(`ins[data-ad-slot="${slot}"]`);
      if (element && (element as HTMLElement).dataset.adsLoaded === 'true') {
        return; // Already loaded
      }

      // Initialize adsbygoogle array if needed
      window.adsbygoogle = window.adsbygoogle || [];
      
      // Push ad configuration
      window.adsbygoogle.push({});
      
      // Mark as loaded
      if (element) {
        (element as HTMLElement).dataset.adsLoaded = 'true';
      }
    } catch (error) {
      // Fail silently if ads are blocked
      console.debug('AdSense blocked or error:', error);
    }
  }, [slot]);

  return (
    <ins
      className="adsbygoogle"
      style={style ?? { display: 'block' }}
      data-ad-client="ca-pub-0940073536675562"
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? 'true' : 'false'}
    />
  );
}

// NOTE: Replace the slot ids ('0000000000', etc.) with your real AdSense unit ids.

export function BannerAd() {
  return (
    <GoogleAdBase
      slot="0000000000"
      style={{ display: 'block', width: '100%', minHeight: 90 }}
      format="auto"
      responsive
    />
  );
}

export function SquareAd() {
  return (
    <GoogleAdBase
      slot="0000000001"
      style={{ display: 'block', width: 300, height: 250 }}
      format="rectangle"
    />
  );
}

export function SkyscraperAd() {
  return (
    <GoogleAdBase
      slot="0000000002"
      style={{ display: 'block', width: 160, height: 600 }}
      format="vertical"
    />
  );
}


