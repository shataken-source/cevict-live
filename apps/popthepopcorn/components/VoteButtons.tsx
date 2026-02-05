'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import toast from 'react-hot-toast'

interface VoteButtonsProps {
  headlineId: string
  initialUpvotes: number
  initialDownvotes: number
}

export default function VoteButtons({ headlineId, initialUpvotes, initialDownvotes }: VoteButtonsProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes)
  const [downvotes, setDownvotes] = useState(initialDownvotes)
  const [hasVoted, setHasVoted] = useState(false)
  const [voteType, setVoteType] = useState<'up' | 'down' | null>(null)

  const handleVote = async (type: 'up' | 'down') => {
    if (hasVoted) {
      toast.error('You have already voted on this story')
      return
    }

    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headlineId, voteType: type === 'up' ? 'upvote' : 'downvote' }),
      })

      if (response.ok) {
        if (type === 'up') {
          setUpvotes(prev => prev + 1)
        } else {
          setDownvotes(prev => prev + 1)
        }
        setHasVoted(true)
        setVoteType(type)
        toast.success(`Vote recorded!`)
      } else {
        toast.error('Failed to record vote')
      }
    } catch (error) {
      toast.error('Error recording vote')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleVote('up')}
        className={`flex items-center gap-1 px-2 py-1 rounded ${
          voteType === 'up' ? 'bg-green-100' : 'hover:bg-gray-100'
        }`}
        disabled={hasVoted}
      >
        <ThumbsUp size={16} />
        <span>{upvotes}</span>
      </button>
      <button
        onClick={() => handleVote('down')}
        className={`flex items-center gap-1 px-2 py-1 rounded ${
          voteType === 'down' ? 'bg-red-100' : 'hover:bg-gray-100'
        }`}
        disabled={hasVoted}
      >
        <ThumbsDown size={16} />
        <span>{downvotes}</span>
      </button>
    </div>
  )
}
