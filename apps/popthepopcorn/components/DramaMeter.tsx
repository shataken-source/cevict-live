'use client'

interface DramaMeterProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
}

export default function DramaMeter({ score, size = 'md' }: DramaMeterProps) {
  const getColor = (score: number) => {
    if (score >= 9) return 'bg-red-600'
    if (score >= 7) return 'bg-orange-500'
    if (score >= 4) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getEmoji = (score: number) => {
    if (score >= 9) return '🔴'
    if (score >= 7) return '🟠'
    if (score >= 4) return '🟡'
    return '🟢'
  }

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-4',
    lg: 'h-6'
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-2xl">{getEmoji(score)}</span>
      <div className="flex-1 bg-gray-200 rounded-full overflow-hidden" style={{ width: size === 'sm' ? '100px' : size === 'md' ? '150px' : '200px' }}>
        <div
          className={`${getColor(score)} ${sizeClasses[size]} transition-all duration-500`}
          style={{ width: `${(score / 10) * 100}%` }}
        />
      </div>
      <span className="font-bold text-lg">{score}/10</span>
    </div>
  )
}
