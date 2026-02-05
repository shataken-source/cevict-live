import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { ReactNode } from 'react'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_GOOGLE_ADS_CLIENT_ID || 'ca-pub-0940073536675562'

export const metadata: Metadata = {
  title: 'PetReunion - Lost Pet Recovery Platform',
  description: 'Help reunite lost pets with their families through our community-powered platform',
  keywords: [
    'lost pets',
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
        <meta name="google-adsense-account" content={ADSENSE_CLIENT} />
      </head>
      <body className={inter.className}>
        {/* AdSense: beforeInteractive injects into head so Google can verify and serve ads */}
        <Script
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          strategy="beforeInteractive"
          crossOrigin="anonymous"
        />
        {children}
      </body>
    </html>
  )
}
