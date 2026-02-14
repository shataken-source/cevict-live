import './globals.css'
import type { Metadata } from 'next'
import { ReactNode } from 'react'
import { ClerkProvider } from '@clerk/nextjs'

export const metadata: Metadata = {
  title: 'Launchpad - Project Control Center',
  description: 'Manage all your development projects',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
