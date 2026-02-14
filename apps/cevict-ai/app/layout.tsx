import type { Metadata } from 'next'
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-space-grotesk'
})

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-jetbrains'
})

export const metadata: Metadata = {
  title: 'Cevict AI | Enterprise AI Platform',
  description: 'Unified gateway to Cevict AI projects - PROGNO, Orchestrator, Massager, and more',
  keywords: ['AI', 'Machine Learning', 'Sports Predictions', 'Multi-Agent', 'Data Processing'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-slate-950 text-white antialiased">
        {children}
      </body>
    </html>
  )
}

