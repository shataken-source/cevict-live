import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ReactNode } from 'react'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SmokersRights.com - The Legal Navigator for Adult Tobacco Rights',
  description: 'Know your rights. Navigate the laws. Travel with confidence. Your authoritative guide to smoking and vaping laws across all 50 states.',
  keywords: [
    'smoking laws',
    'vaping laws',
    'tobacco regulations',
    'state laws',
    'smokers rights',
    'legal information',
    'travel smoking laws',
    'workplace smoking rights',
    'state by state smoking laws',
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
