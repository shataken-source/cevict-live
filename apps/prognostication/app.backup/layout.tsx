import './globals.css'
import type { Metadata } from 'next'
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'Prognostication - Premium Sports Picks',
  description: 'Get accurate sports predictions and betting picks. Free and premium picks available.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0940073536675562"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className="antialiased">
        <nav className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 shadow-lg">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold">Prognostication</h1>
            <div className="flex gap-6">
              <a href="/" className="hover:underline">Home</a>
              <a href="/free-picks" className="hover:underline">Free Picks</a>
              <a href="/premium-picks" className="hover:underline bg-yellow-500 text-black px-4 py-2 rounded font-semibold">Premium</a>
            </div>
          </div>
        </nav>
        <main>{children}</main>
        <footer className="bg-gray-900 text-white p-8 mt-12">
          <div className="container mx-auto text-center">
            <p>&copy; 2025 Prognostication. All rights reserved.</p>
            <p className="text-sm text-gray-400 mt-2">Premium sports predictions powered by data</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
