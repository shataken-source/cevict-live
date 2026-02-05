'use client'

import { getVibeMeterVisual, getSentimentEmoji, type Sentiment } from '@/lib/sentiment-analyzer'

interface VibeMeterProps {
  sentiment: Sentiment
  score: number // -100 to +100
  size?: 'sm' | 'md' | 'lg'
}

export default function VibeMeter({ sentiment, score, size = 'md' }: VibeMeterProps) {
  const visual = getVibeMeterVisual(score)
  const emoji = getSentimentEmoji(sentiment)

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{emoji}</span>
      <div className="flex-1 bg-gray-200 rounded-full overflow-hidden" style={{ width: size === 'sm' ? '100px' : size === 'md' ? '150px' : '200px' }}>
        <div
          className={`${sizeClasses[size]} rounded-full transition-all`}
          style={{
            width: `${visual.barWidth}%`,
            backgroundColor: visual.color,
          }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700" style={{ minWidth: '40px' }}>
        {visual.label}
      </span>
    </div>
  )
}
