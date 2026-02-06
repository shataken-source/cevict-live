import '../styles/globals.css'

import Head from 'next/head'
import Script from 'next/script'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_GOOGLE_ADS_CLIENT_ID || 'ca-pub-0940073536675562'

function shouldShowAds(pathname) {
  const p = String(pathname || '').toLowerCase()
  if (p.startsWith('/admin')) return false
  if (p.startsWith('/api')) return false
  if (p.startsWith('/payment/success')) return false
  if (p.startsWith('/payment/cancel')) return false
  if (p.startsWith('/404') || p.startsWith('/not-found') || p.startsWith('/error')) return false
  return true
}

function hasPublisherContent() {
  if (typeof document === 'undefined') return false
  const el =
    document.querySelector('main') ||
    document.querySelector('article') ||
    document.querySelector('[role="main"]') ||
    document.body

  const text = (el?.textContent || '').trim().replace(/\s+/g, ' ')
  return text.length >= 300
}

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const [loadAds, setLoadAds] = useState(false)

  useEffect(() => {
    // Delay a bit to let the page render, then decide.
    const t = setTimeout(() => {
      const ok = shouldShowAds(router?.pathname) && hasPublisherContent()
      setLoadAds(ok)
    }, 800)
    return () => clearTimeout(t)
  }, [router?.pathname])

  return (
    <>
      <Head>
        <meta name="google-adsense-account" content={ADSENSE_CLIENT} />
        <link rel="icon" href="/icon-192.png" type="image/png" />
        <link rel="shortcut icon" href="/icon-192.png" type="image/png" />
      </Head>

      {loadAds ? (
        <Script
          id="gcc-adsense"
          async
          strategy="afterInteractive"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
        />
      ) : null}

      <Toaster richColors position="top-right" />
      <Component {...pageProps} />
    </>
  )
}
