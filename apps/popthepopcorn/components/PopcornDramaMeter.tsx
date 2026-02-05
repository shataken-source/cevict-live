'use client'

import { getDramaVisual } from '@/lib/brand-guide'

interface PopcornDramaMeterProps {
  score: number // 0-10
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Enhanced Drama Meter with Popcorn Overflow
 * Visual representation of drama score with cinematic effects
 */
export default function PopcornDramaMeter({ score, size = 'md' }: PopcornDramaMeterProps) {
  const visual = getDramaVisual(score)
  
  const sizeClasses = {
    sm: 'h-2 text-sm',
    md: 'h-3 text-base',
    lg: 'h-4 text-lg',
  }

  const emojiSize = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  }

  return (
    <div className="flex items-center gap-3">
      {/* Popcorn emoji with overflow effect */}
      <div className="relative">
        <span className={emojiSize[size]}>{visual.emoji || '🍿'}</span>
        {visual.intensity === 'extreme' && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(3)].map((_, i) => (
              <span
                key={i}
                className="absolute text-sm"
                style={{
                  left: `${-10 + i * 10}px`,
                  top: `${-5 + i * 3}px`,
                  animation: `popcornOverflow 2s ease-out ${i * 0.2}s infinite`,
                }}
              >
                🍿
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="flex-1 relative">
        <div
          className={`${sizeClasses[size]} rounded-full overflow-hidden`}
          style={{
            width: size === 'sm' ? '100px' : size === 'md' ? '150px' : '200px',
            backgroundColor: '#333',
          }}
        >
          <div
            className={`h-full rounded-full transition-all ${visual.animation ? `animate-${visual.animation}` : ''}`}
            style={{
              width: `${(score / 10) * 100}%`,
              backgroundColor: visual.color,
              boxShadow: visual.intensity === 'extreme' ? `0 0 10px ${visual.color}` : 'none',
            }}
          />
        </div>
        {visual.intensity === 'high' || visual.intensity === 'extreme' ? (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              animation: 'dramaPulse 2s infinite',
            }}
          />
        ) : null}
      </div>

      {/* Score */}
      <span
        className={`font-black ${sizeClasses[size]}`}
        style={{ color: visual.color }}
      >
        {score}/10
      </span>
    </div>
  )
}
