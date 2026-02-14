import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Solar Weather Intelligence',
  description: 'AI-assisted solar energy forecasts based on live weather.',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-700 to-slate-900 text-slate-50 antialiased">
        {children}
      </body>
    </html>
  );
}

