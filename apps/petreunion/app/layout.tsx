import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import Script from 'next/script'
import { ReactNode } from 'react'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_GOOGLE_ADS_CLIENT_ID || 'ca-pub-0940073536675562'
const SITE_VERIFY = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || ''

export const metadata: Metadata = {
  ...(SITE_VERIFY && { verification: { google: SITE_VERIFY } }),
  title: 'PetReunion - Completely Free Lost & Found Pet Recovery',
  description: 'Completely free. Report lost or found pets, search listings—no sign-up required. AI-written, AI-maintained. Together we bring them home.',
  keywords: [
    'lost pets',
    'AI-built',
    'AI-maintained',
    'pet recovery',
    'found pets',
    'pet reunion',
    'lost dog',
    'lost cat',
    'pet search',
  ],
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {SITE_VERIFY ? <meta name="google-site-verification" content={SITE_VERIFY} /> : null}
        <meta name="google-adsense-account" content={ADSENSE_CLIENT} />
      </head>
      <body className={inter.className}>
        {/* AdSense: beforeInteractive injects into head so Google can verify and serve ads */}
        <Script
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          strategy="beforeInteractive"
          crossOrigin="anonymous"
        />
        <div className="min-h-screen flex flex-col">
          <main className="flex-1">{children}</main>
          <footer className="text-center py-4 text-xs text-gray-500 border-t border-gray-200">
            <Link href="/about" className="hover:text-gray-700">About</Link>
            {' · '}
            <Link href="/privacy" className="hover:text-gray-700">Privacy</Link>
            {' · '}
            <Link href="/first-24-hours" className="hover:text-gray-700">First 24 hours</Link>
            <br className="mt-1" />
            AI-written, AI-maintained. This site was built and is maintained by AI.
          </footer>
        </div>
      </body>
    </html>
  )
}
