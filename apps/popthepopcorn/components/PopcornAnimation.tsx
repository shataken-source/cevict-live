'use client'

import { useState, useEffect } from 'react'

interface PopcornAnimationProps {
  dramaScore: number
  isBreaking?: boolean
}

/**
 * Animated Popcorn - The Core Vibe
 * Celebrates the original concept: eating popcorn while watching drama unfold
 * More popcorn = more drama
 */
export default function PopcornAnimation({ dramaScore, isBreaking = false }: PopcornAnimationProps) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    if (isBreaking || dramaScore >= 9) {
      setAnimated(true)
      const timer = setTimeout(() => setAnimated(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [isBreaking, dramaScore])

  // More drama = more popcorn
  const popcornCount = dramaScore >= 9 ? 5 : dramaScore >= 7 ? 3 : dramaScore >= 5 ? 2 : 1

  return (
    <div className="relative inline-flex items-center">
      {[...Array(popcornCount)].map((_, i) => (
        <span
          key={i}
          className={`text-2xl transition-all ${
            animated ? 'animate-bounce' : ''
          }`}
          style={{
            animationDelay: `${i * 0.1}s`,
            transform: animated ? `translateY(-${i * 5}px) rotate(${i * 10}deg)` : 'none',
          }}
        >
          🍿
        </span>
      ))}
      {isBreaking && (
        <span className="text-xl ml-1 animate-pulse">🔥</span>
      )}
    </div>
  )
}
