'use client'

import { useEffect } from 'react'

interface AdBannerProps {
  slot: string
  format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle'
  style?: React.CSSProperties
}

/**
 * Google AdSense Banner Ad
 * 
 * To use:
 * 1. Sign up for Google AdSense at https://www.google.com/adsense
 * 2. Add your publisher ID to .env.local: NEXT_PUBLIC_ADSENSE_PUBLISHER_ID=pub-XXXXXXXX
 * 3. Create ad units in AdSense dashboard, use the slot ID here
 */
export default function AdBanner({ slot, format = 'auto', style }: AdBannerProps) {
  useEffect(() => {
    // Load AdSense script if not already loaded
    const publisherId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID
    
    if (!publisherId) {
      console.warn('[AdSense] Publisher ID not set. Add NEXT_PUBLIC_ADSENSE_PUBLISHER_ID to .env.local')
      return
    }

    const existingScript = document.querySelector(`script[src*="${publisherId}"]`)
    
    if (!existingScript) {
      const script = document.createElement('script')
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`
      script.async = true
      script.crossOrigin = 'anonymous'
      document.head.appendChild(script)
    }

    // Push ad to window.adsbygoogle
    try {
      if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
        ;(window as any).adsbygoogle.push({})
      }
    } catch (e) {
      console.error('[AdSense] Error pushing ad:', e)
    }
  }, [slot])

  const publisherId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID

  if (!publisherId) {
    return (
      <div 
        className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4 text-center"
        style={style}
      >
        <p className="text-amber-400 text-sm">
          🍿 Ad Space - Set NEXT_PUBLIC_ADSENSE_PUBLISHER_ID in .env.local to enable
        </p>
      </div>
    )
  }

  return (
    <div style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={publisherId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}

// Predefined ad slots for common placements
export const AdSlots = {
  HEADER: 'header-banner',
  SIDEBAR: 'sidebar-unit',
  IN_FEED: 'in-feed-native',
  FOOTER: 'footer-banner',
}
