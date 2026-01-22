/**
 * TypeScript Type Definitions
 * Replaces 'any' types with proper interfaces
 */

export interface Headline {
  id: string
  title: string
  url: string
  source: string
  category: 'politics' | 'tech' | 'entertainment' | 'business' | 'sports' | 'lifestyle' | 'social' | 'viral' | 'other'
  drama_score: number
  upvotes: number
  downvotes: number
  posted_at: string
  scraped_at: string
  is_breaking: boolean
  image_url?: string | null
  description?: string | null
  source_verification?: 'verified' | 'unverified' | 'user_report' | 'viral' | 'official' | 'ai_generated' | 'satire' | 'misleading' | null
  video_script?: string | null
  discord_sent: boolean
  telegram_sent: boolean
  verification_status?: 'verified' | 'unverified' | 'ai_generated' | 'satire' | 'misleading' | null
  verification_confidence?: number | null
  verification_risk?: 'high' | 'medium' | 'low' | null
  verification_summary?: string | null
  evidence_links?: unknown[] | null
  red_flags?: unknown[] | null
  bias_label?: 'mainstream' | 'alternative' | 'neutral' | null
  sentiment?: 'hype' | 'panic' | 'satire' | 'neutral' | 'concern' | null
  provenance?: unknown | null
  vibe_score?: number | null
  source_trace?: unknown | null
  created_at: string
  updated_at: string
}

export interface Vote {
  id: string
  headline_id: string
  ip_address: string
  vote_type: 'upvote' | 'downvote'
  created_at: string
}

export interface Reaction {
  id: string
  headline_id: string
  ip_address: string
  reaction_type: '🔥' | '🧢' | '🧐' | '🍿' | '📈' | '📉' | '🎭'
  created_at: string
}

export interface CrowdDramaVote {
  id: string
  headline_id: string
  ip_address: string
  drama_score: number
  created_at: string
  updated_at: string
}

export interface UserAlert {
  id: string
  phone_number?: string | null
  email?: string | null
  keywords?: string[] | null
  is_active: boolean
  created_at: string
}

export interface TrendingTopic {
  id: string
  topic: string
  source: 'twitter' | 'google' | 'reddit' | 'manual'
  category?: string | null
  drama_score?: number | null
  created_at: string
  expires_at: string
}

export interface StoryArc {
  id: string
  title: string
  description?: string | null
  related_headlines?: string[] | null
  created_at: string
  updated_at: string
}

export interface AdminStats {
  totalHeadlines: number
  topVotedStory: Headline | null
  reportedStories: number
  activeAlerts: number
  averageDrama: number
  dramaHistory: Array<{
    overall_drama_score: number
    recorded_at: string
  }>
}

export interface ReportedStory {
  id: string
  headline_id: string
  reason: string
  status: 'pending' | 'reviewed' | 'dismissed'
  created_at: string
  headline?: Headline | null
}

export interface ApiError {
  error: string
  message?: string
  details?: unknown
}

export interface ApiSuccess<T = unknown> {
  success: true
  data?: T
  [key: string]: unknown
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string
  'X-RateLimit-Remaining': string
  'X-RateLimit-Reset': string
  'Retry-After'?: string
}
