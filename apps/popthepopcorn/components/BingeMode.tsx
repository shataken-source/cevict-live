'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { getDramaVisual } from '@/lib/brand-guide'

interface BingeModeProps {
  headlines: Array<{
    id: string
    title: string
    url: string
    source: string
    drama_score: number
    category: string
  }>
  onClose: () => void
}

/**
 * Binge Mode - "Quick-Pop" Feed
 * TikTok-style vertical swipe through 10-word summaries
 * 60 seconds to see 20 stories
 * Embraces "Popcorn Brain" - 6-8 second attention window
 */
export default function BingeMode({ headlines, onClose }: BingeModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [startTime] = useState(Date.now())
  const [timeRemaining, setTimeRemaining] = useState(60)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter to top 20 high-drama stories
  const bingeStories = headlines
    .filter(h => h.drama_score >= 5)
    .sort((a, b) => b.drama_score - a.drama_score)
    .slice(0, 20)

  // Auto-advance every 3 seconds (6-8 second window with buffer)
  useEffect(() => {
    if (bingeStories.length === 0) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= bingeStories.length - 1) {
          onClose() // End of binge
          return prev
        }
        return prev + 1
      })
    }, 3000) // 3 seconds per story

    return () => clearInterval(interval)
  }, [bingeStories.length, onClose])

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      const remaining = Math.max(0, 60 - elapsed)
      setTimeRemaining(Math.floor(remaining))
      
      if (remaining <= 0) {
        onClose()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime, onClose])

  // Generate 10-word summary
  const getSummary = (title: string): string => {
    const words = title.split(' ').slice(0, 10)
    return words.join(' ') + (title.split(' ').length > 10 ? '...' : '')
  }

  const currentStory = bingeStories[currentIndex]
  if (!currentStory) {
    return null
  }

  const dramaVisual = getDramaVisual(currentStory.drama_score)

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-yellow-400 z-10"
      >
        <X size={24} />
      </button>

      {/* Timer */}
      <div className="absolute top-4 left-4 text-white text-sm">
        <div className="flex items-center gap-2">
          <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-400 transition-all"
              style={{ width: `${(timeRemaining / 60) * 100}%` }}
            />
          </div>
          <span className="font-bold">{timeRemaining}s</span>
        </div>
      </div>

      {/* Story counter */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
        {currentIndex + 1} / {bingeStories.length}
      </div>

      {/* Main card */}
      <div
        ref={containerRef}
        className="w-full max-w-md mx-4 text-center"
        style={{
          animation: 'slideIn 0.4s ease-out',
        }}
      >
        <div
          className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 border-2"
          style={{
            borderColor: dramaVisual.color,
            boxShadow: `0 0 30px ${dramaVisual.color}40`,
          }}
        >
          {/* Drama score with popcorn overflow */}
          <div className="mb-6 relative">
            <div className="text-6xl mb-2">{dramaVisual.emoji}</div>
            <div
              className="text-4xl font-black mb-2"
              style={{ color: dramaVisual.color }}
            >
              {currentStory.drama_score}/10
            </div>
            {dramaVisual.intensity === 'extreme' && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className="absolute text-2xl"
                    style={{
                      left: `${20 + i * 15}%`,
                      top: `${10 + i * 5}%`,
                      animation: `popcornOverflow 2s ease-out ${i * 0.2}s infinite`,
                    }}
                  >
                    🍿
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 10-word summary */}
          <h2 className="text-2xl font-bold text-white mb-4 leading-tight">
            {getSummary(currentStory.title)}
          </h2>

          {/* Source */}
          <div className="text-sm text-gray-400 mb-6">
            {currentStory.source} • {currentStory.category}
          </div>

          {/* Swipe hint */}
          <div className="text-xs text-gray-500 mt-8">
            Swipe or wait 3s for next story
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <button
        onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
        disabled={currentIndex === 0}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-yellow-400 disabled:opacity-30"
      >
        <ChevronLeft size={32} />
      </button>
      <button
        onClick={() => setCurrentIndex((prev) => Math.min(bingeStories.length - 1, prev + 1))}
        disabled={currentIndex >= bingeStories.length - 1}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-yellow-400 disabled:opacity-30"
      >
        <ChevronRight size={32} />
      </button>
    </div>
  )
}
