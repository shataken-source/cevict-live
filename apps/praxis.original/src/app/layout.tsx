import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import { ThemeWrapper } from '@/components/ThemeSync';
import { ClerkHeader } from '@/components/ClerkHeader';

export const metadata: Metadata = {
  title: 'PRAXIS | AI-Powered Trading Analytics',
  description: 'The ultimate probability trading platform. Real-time analytics, AI insights, cross-platform arbitrage detection.',
  keywords: ['trading', 'kalshi', 'polymarket', 'prediction markets', 'analytics', 'AI'],
  icons: {
    icon: [{ url: '/icon.png', type: 'image/png', sizes: '512x512' }],
    shortcut: '/favicon.ico',
  },
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
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkLocalization = {
    signIn: {
      start: {
        title: 'Sign in to PRAXIS',
        subtitle: 'Welcome back! Please sign in to continue',
      },
    },
    signUp: {
      start: {
        title: 'Sign up for PRAXIS',
      },
    },
  };

  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      localization={clerkLocalization}
    >
      <html lang="en">
        <body className="antialiased">
          <ThemeWrapper>
            <ClerkHeader />
            {children}
          </ThemeWrapper>
        </body>
      </html>
    </ClerkProvider>
  );
}
