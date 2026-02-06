import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ReactNode } from 'react'
import { AuthProvider } from '@/lib/auth-context'
import FinnConciergeWrapper from '@/components/FinnConciergeWrapper'
import FishyAIChatWrapper from '@/components/FishyAIChatWrapper'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Where To Vacation - Vacation Planning & Booking',
  description: 'Plan your perfect vacation with rentals, hotels, activities, and destination guides',
  keywords: [
    'vacation planning',
    'vacation rentals',
    'hotel bookings',
    'destination guides',
    'travel planning',
    'vacation activities',
  ],
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <FinnConciergeWrapper />
          <FishyAIChatWrapper />
        </AuthProvider>
      </body>
    </html>
  )
}
