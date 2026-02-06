'use client'

import Link from 'next/link'
import VoteButtons from './VoteButtons'
import ReactionButtons from './ReactionButtons'
import DramaMeter from './DramaMeter'
import PopcornDramaMeter from './PopcornDramaMeter'
import DramaVoteSlider from './DramaVoteSlider'
import PopcornAnimation from './PopcornAnimation'
import ShareCard from './ShareCard'
import VibeMeter from './VibeMeter'
import { Share2, ExternalLink, Clock, TrendingUp, FileText } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { generateVersusFrame } from '@/lib/brand-guide'
import { calculateProbability } from '@/lib/probability-calculator'

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
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {/* Breaking Badge */}
            {headline.is_breaking && (
              <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 bg-[#FF4444] text-white rounded-full text-xs font-black uppercase breaking-pulse">
                🚨 BREAKING NOW
              </div>
            )}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                headline.category === 'politics' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : headline.category === 'tech' 
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' 
                  : 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300'
              }`}>
                {headline.category}
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className={`text-xs font-semibold ${headline.verification_status === 'verified' ? 'text-green-400' : 'text-gray-400'}`}>
                {headline.source}
              </span>
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
              <div className="mb-4">
                <p className={`text-lg leading-relaxed mb-2 ${headline.verification_status === 'verified' ? 'text-gray-200' : 'text-gray-300'}`}>
                  {headline.description}
                </p>
                {/* AI Transparency Label - 2026 EU AI Act Compliance */}
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="px-2 py-0.5 bg-purple-900/30 text-purple-300 rounded border border-purple-700/50">
                    🤖 AI-Generated Summary
                  </span>
                  <span className="px-2 py-0.5 bg-orange-900/30 text-orange-300 rounded border border-orange-700/50">
                    ⚠️ AI Prediction (Probability Calculator)
                  </span>
                  {headline.verification_confidence !== undefined && (
                    <span className="px-2 py-0.5 bg-blue-900/30 text-blue-300 rounded border border-blue-700/50">
                      {headline.verification_confidence}% confidence
                    </span>
                  )}
                </div>
              </div>
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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <PopcornAnimation dramaScore={headline.drama_score} isBreaking={headline.is_breaking} />
            <PopcornDramaMeter score={headline.drama_score} size="lg" />
            {/* Versus Frame - "Mainstream vs. The Leaks" */}
            <div className="px-3 py-1.5 bg-gradient-to-r from-[#FFD700] to-[#FF6B35] text-black rounded-lg font-black text-xs uppercase">
              {generateVersusFrame(headline)}
            </div>
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
                className="flex items-center gap-1 text-blue-500 hover:text-blue-400 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
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
    <div className={`p-5 ${headline.is_breaking ? 'border-l-4 border-l-[#FF4444]' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {headline.is_breaking && (
              <span className="px-2 py-0.5 bg-[#FF4444] text-white rounded text-xs font-black uppercase">
                🚨 BREAKING
              </span>
            )}
            <span className={`text-xs font-semibold ${headline.verification_status === 'verified' ? 'text-green-400' : 'text-gray-400'}`}>
              {headline.source}
            </span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500">{timeAgo}</span>
            {headline.verification_status && (
              <>
                <span className="text-xs text-gray-500">•</span>
                <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                  headline.verification_status === 'verified'
                    ? 'bg-green-900/30 text-green-300 border border-green-700/50'
                    : headline.verification_status === 'ai_generated'
                    ? 'bg-red-900/30 text-red-300 border border-red-700/50'
                    : headline.verification_status === 'satire'
                    ? 'bg-purple-900/30 text-purple-300 border border-purple-700/50'
                    : 'bg-yellow-900/30 text-yellow-300 border border-yellow-700/50'
                }`}>
                  {headline.verification_status === 'verified' ? '✓ Verified' :
                   headline.verification_status === 'ai_generated' ? '🤖 AI' :
                   headline.verification_status === 'satire' ? '🎭 Satire' :
                   headline.verification_status === 'misleading' ? '⚠️ Misleading' :
                   '⚠️ Unverified'}
                </span>
              </>
            )}
          </div>
          <h3 className="text-xl font-black mb-3 leading-tight">
            <Link 
              href={headline.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:underline transition-colors hover:text-[#FFD700]"
            >
              {headline.title}
            </Link>
          </h3>
          
          {/* Vibe-O-Meter for feed items */}
          {headline.sentiment && headline.vibe_score !== undefined && (
            <div className="mb-2">
              <VibeMeter sentiment={headline.sentiment} score={headline.vibe_score} size="sm" />
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap mb-3">
            <PopcornDramaMeter score={headline.drama_score} size="sm" />
            {headline.verification_confidence !== undefined && (
              <span className="text-xs px-2 py-1 bg-blue-900/30 text-blue-300 rounded border border-blue-700/50 font-semibold">
                {headline.verification_confidence}% confidence
              </span>
            )}
            {/* Versus Frame for feed items */}
            <span className="text-xs px-2 py-1 bg-[#FFD700] bg-opacity-20 text-[#FFD700] rounded border border-[#FFD700] font-bold">
              {generateVersusFrame(headline)}
            </span>
          </div>
          
          {/* Crowd Drama Vote & Probability for feed items */}
          <DramaVoteSlider
            headlineId={headline.id}
            initialDramaScore={headline.drama_score}
            verificationConfidence={headline.verification_confidence}
            sentiment={headline.sentiment}
          />

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
        <div className="flex flex-col items-end gap-3">
          <ShareCard
            headline={{
              title: headline.title,
              url: headline.url,
              drama_score: headline.drama_score,
              probability: calculateProbability(
                headline.drama_score,
                undefined,
                headline.verification_confidence,
                headline.sentiment
              ).probability,
            }}
          />
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
