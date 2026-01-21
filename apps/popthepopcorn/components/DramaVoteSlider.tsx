'use client'

import { useState, useEffect } from 'react'
import { calculateProbability } from '@/lib/probability-calculator'
import toast from 'react-hot-toast'

interface DramaVoteSliderProps {
  headlineId: string
  initialDramaScore: number
  verificationConfidence?: number
  sentiment?: 'hype' | 'panic' | 'satire' | 'neutral' | 'concern'
}

/**
 * Interactive Drama Vote Slider
 * Gen Z can vote on drama score (1-10) for crowd-sourced probability
 * Shows probability percentage and volatility
 */
export default function DramaVoteSlider({
  headlineId,
  initialDramaScore,
  verificationConfidence,
  sentiment,
}: DramaVoteSliderProps) {
  const [userVote, setUserVote] = useState<number | null>(null)
  const [crowdAverage, setCrowdAverage] = useState(initialDramaScore)
  const [voteCount, setVoteCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [probability, setProbability] = useState<ReturnType<typeof calculateProbability> | null>(null)

  useEffect(() => {
    fetchCrowdStats()
  }, [headlineId])

  useEffect(() => {
    // Recalculate probability when crowd average changes
    const result = calculateProbability(
      crowdAverage,
      userVote ? [{ drama_score: userVote }] : undefined,
      verificationConfidence,
      sentiment
    )
    setProbability(result)
  }, [crowdAverage, userVote, verificationConfidence, sentiment])

  const fetchCrowdStats = async () => {
    try {
      const response = await fetch(`/api/crowd-vote?headlineId=${headlineId}`)
      if (response.ok) {
        const data = await response.json()
        setCrowdAverage(data.crowdAverage || initialDramaScore)
        setVoteCount(data.voteCount || 0)
        if (data.votes && data.votes.length > 0) {
          // Find user's vote (would need IP tracking, simplified here)
          const userVoteData = data.votes[0] // Simplified
          if (userVoteData) {
            setUserVote(userVoteData.drama_score)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching crowd stats:', error)
    }
  }

  const handleVote = async (score: number) => {
    if (loading) return

    setLoading(true)
    try {
      const response = await fetch('/api/crowd-vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          headlineId,
          dramaScore: score,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setUserVote(score)
        setCrowdAverage(data.crowdAverage)
        setVoteCount(data.voteCount)
        toast.success(`Voted ${score}/10! 🍿`)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to vote')
      }
    } catch (error) {
      console.error('Error voting:', error)
      toast.error('Failed to vote')
    } finally {
      setLoading(false)
    }
  }

  const currentScore = userVote !== null ? userVote : crowdAverage

  return (
    <div className="space-y-3">
      {/* Probability Display */}
      {probability && (
        <div className="p-4 bg-gradient-to-r from-[#FFD700] to-[#FF6B35] rounded-lg text-white">
          <div className="text-sm font-semibold mb-2">PROBABILITY CALCULATOR</div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-3xl font-black">{probability.probability}%</div>
              <div className="text-xs opacity-90">{probability.interpretation}</div>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-90">Volatility</div>
              <div className="text-xl font-bold">{probability.volatility}%</div>
            </div>
          </div>
          <div className="text-xs opacity-75">
            Confidence: {probability.confidence}% • {voteCount} votes
          </div>
        </div>
      )}

      {/* Interactive Slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Crowd Drama Vote</span>
          <span className="text-lg font-black text-[#FFD700]">{currentScore}/10</span>
        </div>
        
        {/* Quick Vote Buttons (1-10) */}
        <div className="grid grid-cols-10 gap-1 mb-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
            <button
              key={score}
              onClick={() => handleVote(score)}
              disabled={loading}
              className={`
                py-2 px-1 rounded text-xs font-bold transition-all
                ${userVote === score
                  ? 'bg-[#FFD700] text-black scale-110'
                  : score <= 3
                  ? 'bg-gray-200 hover:bg-gray-300'
                  : score <= 6
                  ? 'bg-yellow-200 hover:bg-yellow-300'
                  : score <= 8
                  ? 'bg-orange-200 hover:bg-orange-300'
                  : 'bg-red-200 hover:bg-red-300'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              title={`Vote ${score}/10`}
            >
              {score}
            </button>
          ))}
        </div>

        {/* Crowd Average Display */}
        {voteCount > 0 && (
          <div className="text-xs text-gray-500 text-center">
            Crowd average: {crowdAverage.toFixed(1)}/10 ({voteCount} {voteCount === 1 ? 'vote' : 'votes'})
          </div>
        )}
      </div>
    </div>
  )
}
