import React, { ReactNode } from 'react';
import ConditionalAdSenseScript from '@/components/ConditionalAdSenseScript';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Progno - Sports Prediction Platform',
  description: 'Advanced sports prediction and analytics platform with data-driven insights.',
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
        {/* AdSense script loaded conditionally via ConditionalAdSenseScript component */}
      </head>
      <body>
        <ConditionalAdSenseScript />
        {children}
      </body>
    </html>
  );
}
