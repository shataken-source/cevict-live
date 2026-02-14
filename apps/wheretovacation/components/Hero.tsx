'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { t } from '@/lib/translations'

interface HeroProps {
  onExplore?: () => void
  language?: string
}

export function Hero({ onExplore, language = 'en' }: HeroProps) {
  const title = t(language, 'hero.title')
  const tagline = t(language, 'hero.tagline')
  const explore = t(language, 'hero.exploreProperties')
  const listYourProperty = t(language, 'hero.listYourProperty')

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
      {/* Background image - luxury waterfront */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat hero-bg-image"
        role="img"
        aria-label="Luxury waterfront vacation rental"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />

      <div className="relative z-10 container mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white drop-shadow-lg mb-4">
          {title}
        </h1>
        <p className="text-lg md:text-xl text-white/95 max-w-2xl mx-auto mb-10 drop-shadow">
          {tagline}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {onExplore ? (
            <button
              type="button"
              onClick={onExplore}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              {explore}
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <Link
              href="/#properties"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              {explore}
              <ArrowRight className="w-5 h-5" />
            </Link>
          )}
          <Link
            href="/rentals"
            className="inline-flex items-center justify-center px-8 py-4 bg-white/10 border-2 border-white/80 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors backdrop-blur-sm"
          >
            {listYourProperty}
          </Link>
        </div>
      </div>
    </section>
  )
}
