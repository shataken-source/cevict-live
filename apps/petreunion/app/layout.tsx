import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ReactNode } from 'react'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

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
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
