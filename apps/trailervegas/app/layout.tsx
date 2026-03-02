import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TrailerVegas — Grade Your Sports Picks',
  description: 'Upload your sports picks, pay $10, and get a detailed grading report with win rate, ROI, and league breakdowns.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
