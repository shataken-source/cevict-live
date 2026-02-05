'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface ReactionButtonsProps {
  headlineId: string
}

/**
 * Gen Z Emoji Reactions
 * 🔥 = Fire/Hype
 * 🧢 = Cap/Fake
 * 🧐 = Interesting/Curious
 * 🍿 = Drama/Popcorn
 * 📈 = Hype/Positive
 * 📉 = Panic/Negative
 * 🎭 = Satire/Funny
 */
const REACTIONS = [
  { emoji: '🔥', label: 'Fire', color: 'hover:bg-orange-100' },
  { emoji: '🧢', label: 'Cap', color: 'hover:bg-red-100' },
  { emoji: '🧐', label: 'Interesting', color: 'hover:bg-blue-100' },
  { emoji: '🍿', label: 'Drama', color: 'hover:bg-yellow-100' },
  { emoji: '📈', label: 'Hype', color: 'hover:bg-green-100' },
  { emoji: '📉', label: 'Panic', color: 'hover:bg-red-100' },
  { emoji: '🎭', label: 'Satire', color: 'hover:bg-purple-100' },
]

export default function ReactionButtons({ headlineId }: ReactionButtonsProps) {
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({})
  const [userReactions, setUserReactions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchReactions()
  }, [headlineId])

  const fetchReactions = async () => {
    try {
      const response = await fetch(`/api/reactions?headlineId=${headlineId}`)
      if (response.ok) {
        const data = await response.json()
        setReactionCounts(data.reactionCounts || {})
      }
    } catch (error) {
      console.error('Error fetching reactions:', error)
    }
  }

  const handleReaction = async (reactionType: string) => {
    if (loading) return

    setLoading(true)
    try {
      const response = await fetch('/api/reactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          headlineId,
          reactionType,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setReactionCounts(data.reactionCounts || {})
        
        // Toggle user reaction state
        if (data.removed) {
          setUserReactions(prev => {
            const next = new Set(prev)
            next.delete(reactionType)
            return next
          })
        } else {
          setUserReactions(prev => new Set(prev).add(reactionType))
        }
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to add reaction')
      }
    } catch (error) {
      console.error('Error adding reaction:', error)
      toast.error('Failed to add reaction')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {REACTIONS.map(({ emoji, label, color }) => {
        const count = reactionCounts[emoji] || 0
        const isActive = userReactions.has(emoji)

        return (
          <button
            key={emoji}
            onClick={() => handleReaction(emoji)}
            disabled={loading}
            className={`
              flex items-center gap-1 px-2 py-1 rounded-full text-sm
              border transition-all
              ${isActive 
                ? 'bg-blue-100 border-blue-300 scale-110' 
                : 'bg-white border-gray-300 hover:border-gray-400'
              }
              ${color}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            title={label}
          >
            <span className="text-lg">{emoji}</span>
            {count > 0 && (
              <span className="text-xs font-semibold text-gray-700">{count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
