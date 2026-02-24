import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import FinnConcierge from '../components/FinnConcierge';

export const metadata: Metadata = {
  title: 'Where To Vacation - Your Gulf Coast Vacation Guide',
  description: 'Discover the best vacation rentals, activities, and local insights for your perfect Gulf Coast getaway.',
  other: {
    'google-adsense-account': 'ca-pub-0940073536675562',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="google-adsense-account" content="ca-pub-0940073536675562" />
      </head>
      <body className="antialiased">
        <Script
          id="wtv-adsense"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0940073536675562"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        {children}
        <FinnConcierge />
      </body>
    </html>
  );
}

