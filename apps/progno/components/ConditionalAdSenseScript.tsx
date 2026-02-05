'use client';

import { shouldShowAds, checkPageContent } from '@/lib/adsense-utils';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useState } from 'react';

/**
 * Conditionally loads AdSense script only on pages with sufficient content
 * This prevents AdSense policy violations for pages without publisher content
 *
 * Note: Meta tag is placed in layout.tsx metadata, not here (meta tags must be in <head>)
 */
export default function ConditionalAdSenseScript() {
  const pathname = usePathname();
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Always load on homepage for Google verification
    const isHomepage = pathname === '/' || pathname === '';

    // Check if ads should be shown on this page
    // Homepage always loads script (for Google verification), other pages need content
    const hasContent = checkPageContent();
    const canShowAds = isHomepage || (shouldShowAds(pathname || '') && hasContent);
    setShouldLoad(canShowAds);
  }, [pathname]);

  if (!shouldLoad) {
    return null;
  }

  return (
    <Script
      id="progno-adsense"
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0940073536675562"
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}

