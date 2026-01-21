'use client'

import Link from 'next/link'
import VoteButtons from './VoteButtons'
import ReactionButtons from './ReactionButtons'
import DramaMeter from './DramaMeter'
import PopcornDramaMeter from './PopcornDramaMeter'
import VibeMeter from './VibeMeter'
import { Share2, ExternalLink, Clock, TrendingUp, FileText } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { generateVersusFrame } from '@/lib/brand-guide'

interface HeadlineProps {
  headline: {
    id: string
    title: string
    url: string
    source: string
    category: string
    drama_score: number
    upvotes: number
    downvotes: number
    posted_at: string
    is_breaking: boolean
    description?: string
    source_verification?: 'verified' | 'unverified' | 'user_report' | 'viral' | 'official' | 'ai_generated' | 'satire' | 'misleading'
    video_script?: string
    verification_status?: 'verified' | 'unverified' | 'ai_generated' | 'satire' | 'misleading'
    verification_confidence?: number
    sentiment?: 'hype' | 'panic' | 'satire' | 'neutral' | 'concern'
    vibe_score?: number
    source_trace?: any
    provenance?: any
  }
  isPrimary?: boolean
}

export default function Headline({ headline, isPrimary = false }: HeadlineProps) {
  const timeAgo = formatDistanceToNow(new Date(headline.posted_at), { addSuffix: true })

  const getDramaEmojis = (score: number) => {
    if (score >= 9) return '🔥🔥🔥'
    if (score >= 7) return '🔥🔥'
    if (score >= 4) return '🔥'
    return ''
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: headline.title,
          text: headline.description || headline.title,
          url: headline.url,
        })
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(headline.url)
      alert('Link copied to clipboard!')
    }
  }

  if (isPrimary) {
    return (
      <div className={`mb-8 p-6 border-2 ${headline.is_breaking ? 'border-red-500 breaking-pulse' : 'border-gray-300'}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs text-gray-500 uppercase">{headline.category}</span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-500">{headline.source}</span>
              {headline.source_verification && (
                <>
                  <span className="text-xs text-gray-500">•</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    headline.source_verification === 'verified' || headline.source_verification === 'official'
                      ? 'bg-green-100 text-green-700'
                      : headline.source_verification === 'viral'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {headline.source_verification === 'verified' ? '✓ Verified' :
                     headline.source_verification === 'official' ? '✓ Official' :
                     headline.source_verification === 'viral' ? '🔥 Viral' :
                     headline.source_verification === 'user_report' ? '👤 User Report' :
                     '⚠️ Unverified'}
                  </span>
                </>
              )}
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-500">{timeAgo}</span>
            </div>
            <h1 className="text-4xl font-bold mb-4 leading-tight">
              <Link href={headline.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {headline.title}
              </Link>
            </h1>
            {headline.description && (
              <p className="text-lg text-gray-700 mb-4">{headline.description}</p>
            )}
            
            {/* Vibe-O-Meter */}
            {headline.sentiment && headline.vibe_score !== undefined && (
              <div className="mb-4">
                <VibeMeter sentiment={headline.sentiment} score={headline.vibe_score} size="md" />
              </div>
            )}

            {/* Receipts / Source Trace */}
            {headline.source_trace && headline.source_trace.timeline && (
              <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={14} className="text-gray-600" />
                  <span className="text-xs font-semibold text-gray-700">SOURCE TRACE</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  {headline.source_trace.timeline.map((trace: any, idx: number) => (
                    <span key={idx} className="flex items-center gap-1">
                      {idx > 0 && <span>→</span>}
                      <span className="px-2 py-0.5 bg-white rounded border">{trace.platform}</span>
                      <span className="text-gray-400">
                        {formatDistanceToNow(new Date(trace.timestamp), { addSuffix: true })}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <PopcornDramaMeter score={headline.drama_score} size="md" />
            {headline.verification_confidence !== undefined && (
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                {headline.verification_confidence}% confidence
              </span>
            )}
            {/* Versus Frame - "Mainstream vs. The Leaks" */}
            <span className="text-xs px-2 py-1 bg-[#FFD700] text-black rounded font-bold">
              {generateVersusFrame(headline)}
            </span>
          </div>
          <div className="flex flex-col gap-4">
            {/* Crowd Drama Vote & Probability */}
            <DramaVoteSlider
              headlineId={headline.id}
              initialDramaScore={headline.drama_score}
              verificationConfidence={headline.verification_confidence}
              sentiment={headline.sentiment}
            />

            {/* Gen Z Reactions */}
            <ReactionButtons headlineId={headline.id} />
            
            <div className="flex items-center gap-4">
              <VoteButtons
                headlineId={headline.id}
                initialUpvotes={headline.upvotes}
                initialDownvotes={headline.downvotes}
              />
              <button
                onClick={handleShare}
                className="flex items-center gap-1 px-3 py-1 border rounded hover:bg-gray-100"
              >
                <Share2 size={16} />
                Share
              </button>
              <Link
                href={headline.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:underline"
              >
                Read <ExternalLink size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-4 border-b ${headline.is_breaking ? 'border-l-4 border-l-red-500' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-500">{headline.source}</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500">{timeAgo}</span>
            {headline.is_breaking && (
              <>
                <span className="text-xs text-red-600 font-bold">BREAKING</span>
              </>
            )}
          </div>
          <h3 className="text-lg font-semibold mb-2">
            <Link href={headline.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {headline.title}
            </Link>
          </h3>
          
          {/* Vibe-O-Meter for feed items */}
          {headline.sentiment && headline.vibe_score !== undefined && (
            <div className="mb-2">
              <VibeMeter sentiment={headline.sentiment} score={headline.vibe_score} size="sm" />
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600">{getDramaEmojis(headline.drama_score)}</span>
            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{headline.drama_score}/10</span>
            {headline.verification_confidence !== undefined && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                {headline.verification_confidence}% confidence
              </span>
            )}
          </div>

          {/* Source Trace (Receipts) - Compact version for feed */}
          {headline.source_trace && headline.source_trace.timeline && headline.source_trace.timeline.length > 1 && (
            <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
              <FileText size={12} />
              <span>
                {headline.source_trace.timeline.map((trace: any, idx: number) => (
                  <span key={idx}>
                    {idx > 0 && ' → '}
                    {trace.platform}
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <ReactionButtons headlineId={headline.id} />
          <VoteButtons
            headlineId={headline.id}
            initialUpvotes={headline.upvotes}
            initialDownvotes={headline.downvotes}
          />
        </div>
      </div>
    </div>
  )
}
