'use client'

import { useState, useEffect } from 'react'
import { calculateProbability } from '@/lib/probability-calculator'
import SquishyButton from './SquishyButton'
import { awardSalt } from '@/lib/virtual-currency'
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
      {/* Probability Display - Cyber Style */}
      {probability && (
        <div className="p-5 bg-gradient-to-br from-[#FFD700] via-[#FF6B35] to-[#FF4444] rounded-2xl text-black border-2 border-[#FFD700] shadow-2xl shadow-[#FFD700]/50">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-black uppercase tracking-wider">PROBABILITY CALCULATOR</div>
            <span className="text-xs px-2 py-0.5 bg-black/20 rounded border border-black/30">
              ⚠️ AI Prediction
            </span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-5xl font-black mb-1">{probability.probability}%</div>
              <div className="text-sm font-bold opacity-90">{probability.interpretation}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold uppercase opacity-80 mb-1">Volatility</div>
              <div className="text-2xl font-black">{probability.volatility}%</div>
            </div>
          </div>
          <div className="text-xs font-semibold opacity-80 pt-3 border-t border-black/20">
            Confidence: {probability.confidence}% • {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
          </div>
        </div>
      )}

      {/* Interactive Slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Crowd Drama Vote</span>
          <span className="text-lg font-black text-[#FFD700]">{currentScore}/10</span>
        </div>
        
        {/* Quick Vote Buttons (1-10) - Squishy Tactile UI */}
        <div className="grid grid-cols-10 gap-1 mb-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
            <SquishyButton
              key={score}
              onClick={() => handleVote(score)}
              score={score}
              disabled={loading}
              className={`
                py-2 px-1 rounded-lg text-xs font-bold
                ${userVote === score
                  ? 'bg-[#FFD700] text-black shadow-lg'
                  : score <= 3
                  ? 'bg-gray-200 hover:bg-gray-300'
                  : score <= 6
                  ? 'bg-yellow-200 hover:bg-yellow-300'
                  : score <= 8
                  ? 'bg-orange-200 hover:bg-orange-300'
                  : 'bg-red-200 hover:bg-red-300'
                }
              `}
            >
              {score}
            </SquishyButton>
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
