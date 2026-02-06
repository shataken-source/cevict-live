import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'PRAXIS | AI-Powered Trading Analytics',
  description: 'The ultimate probability trading platform. Real-time analytics, AI insights, cross-platform arbitrage detection.',
  keywords: ['trading', 'kalshi', 'polymarket', 'prediction markets', 'analytics', 'AI'],
  openGraph: {
    title: 'PRAXIS - AI-Powered Trading Analytics',
    description: 'The ultimate probability trading platform for Kalshi & Polymarket.',
    url: 'https://cevict.ai',
    siteName: 'PRAXIS',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PRAXIS - AI-Powered Trading Analytics',
    description: 'The ultimate probability trading platform for prediction markets.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className="bg-[#0a0a0f] text-white antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
