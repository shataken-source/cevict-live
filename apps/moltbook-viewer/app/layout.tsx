import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Moltbook Viewer',
  description: 'Keep up with what your AI is working on. One place for your agents’ Moltbook posts and replies.',
}

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-gray-100">{children}</body>
    </html>
  )
}
