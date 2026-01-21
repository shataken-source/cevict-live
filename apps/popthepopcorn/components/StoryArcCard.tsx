'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Play, Bell, BellOff, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

interface StoryArc {
  id: string
  title: string
  description?: string
  category: string
  season_number: number
  status: 'ongoing' | 'concluded' | 'archived'
  total_episodes: number
  total_drama_score: number
  last_episode_at?: string
}

interface StoryArcCardProps {
  arc: StoryArc
}

export default function StoryArcCard({ arc }: StoryArcCardProps) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check subscription status (would need user identifier)
    // For now, default to false
  }, [])

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/story-arcs/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          arcId: arc.id,
          action: isSubscribed ? 'unsubscribe' : 'subscribe',
        }),
      })

      if (response.ok) {
        setIsSubscribed(!isSubscribed)
        toast.success(isSubscribed ? 'Unsubscribed from arc' : 'Subscribed to arc!')
      } else {
        toast.error('Failed to update subscription')
      }
    } catch (error) {
      console.error('Error subscribing:', error)
      toast.error('Failed to update subscription')
    } finally {
      setLoading(false)
    }
  }

  // Calculate progress (episodes / estimated total)
  const progress = Math.min(100, (arc.total_episodes / 10) * 100) // Assume ~10 episodes per season

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded uppercase">
              Season {arc.season_number}
            </span>
            <span className="text-xs text-gray-500">{arc.category}</span>
            {arc.status === 'ongoing' && (
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                🔴 LIVE
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold mb-1">{arc.title}</h3>
          {arc.description && (
            <p className="text-sm text-gray-600 mb-2">{arc.description.substring(0, 150)}...</p>
          )}
        </div>
      </div>

      {/* Progress Bar (Netflix-style) */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-gray-300 font-semibold">Episode {arc.total_episodes}</span>
          <span className="flex items-center gap-1 text-[#FFD700] font-bold">
            <TrendingUp size={12} />
            {arc.total_drama_score} drama points
          </span>
        </div>
        <div className="w-full bg-[#0A0A0A] rounded-full h-3 border border-[#333] overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#FFD700] to-[#FF6B35] h-3 rounded-full transition-all shadow-lg shadow-[#FFD700]/50"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Link
          href={`/arc/${arc.id}`}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#FFD700] to-[#FF6B35] text-black rounded-lg hover:from-[#FFC700] hover:to-[#FF5B25] text-sm font-black transition-all shadow-lg shadow-[#FFD700]/30"
        >
          <Play size={16} />
          Watch Arc
        </Link>
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2.5 border-2 rounded-lg text-sm font-bold transition-all ${
            isSubscribed
              ? 'bg-green-900/30 border-green-500 text-green-300 hover:bg-green-900/40'
              : 'bg-[#0A0A0A] border-[#333] text-gray-300 hover:border-[#FFD700] hover:text-[#FFD700]'
          }`}
        >
          {isSubscribed ? <BellOff size={16} /> : <Bell size={16} />}
          {isSubscribed ? 'Subscribed' : 'Subscribe'}
        </button>
      </div>
    </div>
  )
}
