import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { validateStartup } from '@/lib/startup-validation'

// Validate environment on startup (non-blocking)
if (typeof window === 'undefined') {
  // Server-side only
  validateStartup()
}

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#FFD700',
}

export const metadata: Metadata = {
  title: 'PopThePopcorn - Breaking News with Drama',
  description: 'Gen Z-focused breaking news aggregator with AI-powered drama scoring. Get the tea, stay informed.',
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
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://popthepopcorn.com',
    siteName: 'PopThePopcorn',
    title: 'PopThePopcorn - Breaking News with Drama',
    description: 'Gen Z-focused breaking news aggregator with AI-powered drama scoring',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PopThePopcorn - Breaking News with Drama',
    description: 'Gen Z-focused breaking news aggregator with AI-powered drama scoring',
    creator: '@popthepopcorn',
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
  verification: {
    // Add your verification codes here when available
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // yahoo: 'your-yahoo-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
