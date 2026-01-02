'use client';

import Script from 'next/script';

/**
 * AdSense Script Loader
 * Always loads AdSense script for Google verification
 * The script must be present for Google to verify the site
 */
export default function AdSenseScript() {
  return (
    <Script
      id="adsense-script"
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0940073536675562"
      strategy="afterInteractive"
      crossOrigin="anonymous"
    />
  );
}

