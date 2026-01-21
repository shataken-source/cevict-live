import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#FFD700',
}

export const metadata: Metadata = {
  title: 'PopThePopcorn - The Kernel | News as Entertainment',
  description: 'The Arena • News as Entertainment • Spectator Era • AI-powered verification • Source trace receipts • Real-time sentiment analysis',
  keywords: ['news', 'breaking news', 'gen z', 'drama', 'entertainment', 'the kernel', 'popcorn'],
  authors: [{ name: 'PopThePopcorn' }],
  creator: 'PopThePopcorn',
  publisher: 'PopThePopcorn',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://popthepopcorn.com'),
  openGraph: {
    title: 'PopThePopcorn - The Kernel 🍿',
    description: 'The Arena • News as Entertainment • Did you check The Kernel today?',
    url: '/',
    siteName: 'PopThePopcorn',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PopThePopcorn - The Kernel',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PopThePopcorn - The Kernel 🍿',
    description: 'The Arena • News as Entertainment • Watching the drama unfold',
    creator: '@PopThePopcorn',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'The Kernel',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍿</text></svg>" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="The Kernel" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
