import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'PopThePopcorn 🍿 - Breaking News & Drama',
  description: 'Drudge Report-style news aggregator with real-time drama scoring',
  openGraph: {
    title: 'PopThePopcorn 🍿',
    description: 'Breaking news and trending stories with AI-powered drama scoring',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
