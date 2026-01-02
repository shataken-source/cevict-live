import SmokersRightsAds from '@/components/AdLayout';
import AgeGateWrapper from '@/components/AgeGateWrapper';
import AdSenseScript from '@/components/AdSenseScript';
import ConditionalAdSenseScript from '@/components/ConditionalAdSenseScript';
import ErrorBoundary from '@/components/errors/ErrorBoundary';
import { ToasterProvider } from '@/components/ui/toaster';
import { UnifiedAuthProvider } from '@/shared/auth/UnifiedAuth';
import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ReactNode } from 'react';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SmokersRights.com - Freedom of Choice & Harm Reduction',
  description: 'Your utility for civil liberties and harm reduction. Explore smoking and vaping laws across the Southeast United States.',
  keywords: ['smoking laws', 'vaping regulations', 'civil liberties', 'harm reduction', 'smoker-friendly places'],
  other: {
    'google-adsense-account': 'ca-pub-0940073536675562',
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="google-adsense-account" content="ca-pub-0940073536675562" />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <UnifiedAuthProvider>
            <ToasterProvider>
              <AgeGateWrapper />
              <AdSenseScript />
              <ConditionalAdSenseScript />
              <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
                <SmokersRightsAds>{children}</SmokersRightsAds>
              </div>
            </ToasterProvider>
          </UnifiedAuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
