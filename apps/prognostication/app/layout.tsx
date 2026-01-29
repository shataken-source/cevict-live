import InstallPrompt from '@/components/InstallPrompt'
import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { ReactNode } from 'react'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' })

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  title: 'Prognostication.com - AI Kalshi Prediction Market Picks',
  description: 'Get AI-powered Kalshi prediction market picks with 65%+ accuracy. Expert analysis on Politics, Economics, Weather, Entertainment, Crypto & more. Beat the prediction markets.',
  keywords: [
    'Kalshi picks',
    'prediction market tips',
    'election betting',
    'Fed rate predictions',
    'weather betting',
    'Oscar predictions',
    'crypto predictions',
    'AI market analysis',
    'event contracts',
    'prediction markets',
  ],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Prognostication',
  },
  openGraph: {
    title: 'Prognostication.com - AI Kalshi Prediction Market Intelligence',
    description: 'AI-powered Kalshi picks for Politics, Economics, Weather, Entertainment & more',
    type: 'website',
    url: 'https://prognostication.com',
    images: [
      {
        url: 'https://prognostication.com/og-kalshi.jpg',
        width: 1200,
        height: 630,
        alt: 'Prognostication - AI Kalshi Picks',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prognostication.com - AI Kalshi Prediction Market Picks',
    description: 'AI-powered prediction market intelligence for Kalshi',
    images: ['https://prognostication.com/og-kalshi.jpg'],
  },
  other: {
    'google-adsense-account': 'ca-pub-0940073536675562',
  },
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        <meta name="google-adsense-account" content="ca-pub-0940073536675562" />
        {/* AdSense: in head on every page so Google can verify (crawler sees initial HTML) */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0940073536675562"
          crossOrigin="anonymous"
        />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} antialiased`}>
        {children}
        <InstallPrompt />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
