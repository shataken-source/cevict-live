'use client'

import { useEffect, useState } from 'react'

interface TickerProps {
  headlines: Array<{
    id: string
    title: string
    is_breaking: boolean
    drama_score: number
  }>
}

export default function Ticker({ headlines }: TickerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const breakingHeadlines = headlines.filter(h => h.is_breaking || h.drama_score >= 8)

  useEffect(() => {
    if (breakingHeadlines.length === 0) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % breakingHeadlines.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [breakingHeadlines.length])

  if (breakingHeadlines.length === 0) return null

  const currentHeadline = breakingHeadlines[currentIndex]
  const bgColor = currentHeadline.drama_score >= 9 ? 'bg-red-600' : 'bg-yellow-500'

  return (
    <div className={`${bgColor} text-white py-2 px-4 sticky top-0 z-50`}>
      <div className="flex items-center gap-4 overflow-hidden">
        <span className="font-bold whitespace-nowrap">🚨 BREAKING:</span>
        <div className="flex-1 overflow-hidden">
          <div className="animate-scroll whitespace-nowrap">
            {currentHeadline.title}
          </div>
        </div>
      </div>
    </div>
  )
}
