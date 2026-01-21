'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Ticker from '@/components/Ticker'
import Headline from '@/components/Headline'
import DramaMeter from '@/components/DramaMeter'
import ReactionButtons from '@/components/ReactionButtons'
import { Settings, Bell } from 'lucide-react'
import toast from 'react-hot-toast'

interface Headline {
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
  verification_risk?: 'high' | 'medium' | 'low'
  sentiment?: 'hype' | 'panic' | 'satire' | 'neutral' | 'concern'
  vibe_score?: number
  source_trace?: any
  provenance?: any
}

interface TrendingTopic {
  name: string
  tweetCount?: number
  source?: 'twitter' | 'google' | 'both' | 'unknown'
  fetchedAt: string
}

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

export default function Home() {
  const [headlines, setHeadlines] = useState<Headline[]>([])
  const [overallDrama, setOverallDrama] = useState(5)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [loading, setLoading] = useState(true)
  const [twitterTrends, setTwitterTrends] = useState<TrendingTopic[]>([])
  const [storyArcs, setStoryArcs] = useState<StoryArc[]>([])
  const [showArcs, setShowArcs] = useState(false)
  const [bingeMode, setBingeMode] = useState(false)
  const [darkMode, setDarkMode] = useState(true) // Default to dark mode (cinema feel)

  const fetchHeadlines = async () => {
    try {
      const response = await fetch('/api/headlines')
      if (response.ok) {
        const data = await response.json()
        console.log('[Frontend] Fetched headlines:', data.headlines?.length || 0)
        console.log('[Frontend] Sample headlines:', data.headlines?.slice(0, 3))
        setHeadlines(data.headlines || [])
        setOverallDrama(data.overallDrama || 5)
        setLastUpdated(new Date())
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }))
        console.error('[Frontend] API error:', errorData)
        const errorMessage = errorData.message || errorData.error || 'Unknown error'
        toast.error(`Failed to load headlines: ${errorMessage}`)
        
        // Log more details for debugging
        if (errorData.details) {
          console.error('[Frontend] Error details:', errorData.details)
        }
      }
    } catch (error) {
      console.error('[Frontend] Error fetching headlines:', error)
      toast.error('Failed to load headlines')
    } finally {
      setLoading(false)
    }
  }

  const fetchTwitterTrends = async () => {
    try {
      const response = await fetch('/api/trends')
      if (response.ok) {
        const data = await response.json()
        setTwitterTrends(data.trends || [])
      }
    } catch (error) {
      // Silently fail - Twitter trends are optional
      console.log('[Frontend] Twitter trends not available')
    }
  }

  useEffect(() => {
    fetchHeadlines()
    fetchTwitterTrends()
    fetchStoryArcs()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    // Get refresh interval from settings (default 60 seconds)
    const refreshInterval = parseInt(process.env.NEXT_PUBLIC_AUTO_REFRESH_INTERVAL || '60', 10) * 1000
    
    const interval = setInterval(() => {
      fetchHeadlines()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh])

  // Debug logging
  useEffect(() => {
    if (headlines.length > 0) {
      console.log('[Frontend] Total headlines:', headlines.length)
      const categories = [...new Set(headlines.map(h => h.category))]
      console.log('[Frontend] Categories:', categories)
      console.log('[Frontend] Politics count:', headlines.filter(h => h.category === 'politics').length)
      console.log('[Frontend] Tech/Business count:', headlines.filter(h => h.category === 'tech' || h.category === 'business').length)
      console.log('[Frontend] Entertainment count:', headlines.filter(h => h.category === 'entertainment').length)
    }
  }, [headlines])

  const primaryHeadline = headlines.find(h => h.is_breaking || h.drama_score >= 9) || headlines[0]
  const feedHeadlines = headlines.filter(h => h.id !== primaryHeadline?.id)

  const headlinesPerCategory = parseInt(process.env.NEXT_PUBLIC_HEADLINES_PER_CATEGORY || '10', 10)
  // Gen Z-focused categorization
  const entertainmentHeadlines = secondaryHeadlines.filter(h => 
    h.category === 'entertainment' || h.category === 'viral'
  ).slice(0, headlinesPerCategory)
  const techHeadlines = secondaryHeadlines.filter(h => 
    h.category === 'tech' || h.category === 'social' || h.category === 'business'
  ).slice(0, headlinesPerCategory)
  const politicsHeadlines = secondaryHeadlines.filter(h => h.category === 'politics').slice(0, headlinesPerCategory)

  // Use trends from API if available, otherwise fall back to extracted keywords
  const trendingTopics = twitterTrends.length > 0
    ? twitterTrends.slice(0, 15)
    : Array.from(
        new Set(
          headlines
            .flatMap(h => h.title.toLowerCase().split(/\s+/))
            .filter(word => word.length > 4)
        )
      ).map(name => ({ name, source: 'unknown' as const, fetchedAt: new Date().toISOString() })).slice(0, 15)

  const highDramaAlerts = headlines.filter(h => h.drama_score >= 7)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Loading headlines...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Ticker */}
      {headlines.length > 0 && <Ticker headlines={headlines} />}

      {/* Header */}
      <header className="border-b-2 border-black p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold">PopThePopcorn 🍿</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setBingeMode(true)}
                className="px-4 py-2 bg-[#FFD700] text-black font-bold rounded-lg hover:bg-[#FFC700] transition-all flex items-center gap-2"
                title="Binge Mode - Quick-Pop Feed"
              >
                <Zap size={18} />
                Binge Mode
              </button>
              <button 
                onClick={fetchHeadlines}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                title="Refresh headlines"
              >
                Refresh
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 hover:bg-gray-100 rounded"
                title="Toggle dark mode"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              <button className="p-2 hover:bg-gray-100 rounded">
                <Bell size={20} />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded">
                <Settings size={20} />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-sm text-gray-600">Drama Level:</span>
                <DramaMeter score={overallDrama} size="md" />
              </div>
              <div>
                <span className="text-sm text-gray-600">Last Updated: </span>
                <span className="text-sm font-semibold">
                  {lastUpdated.toLocaleTimeString()}
                </span>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Auto-refresh</span>
            </label>
          </div>
        </div>
      </header>

      {/* Main Content - Vertical Feed (TikTok-style) */}
      <main className="max-w-4xl mx-auto p-4">
        {/* Story Arcs Section (The "Lore" System) */}
        {storyArcs.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Tv size={20} />
                <h2 className="text-2xl font-bold">📺 Story Arcs</h2>
                <span className="text-sm text-gray-500">(Netflix-style news seasons)</span>
              </div>
              <button
                onClick={() => setShowArcs(!showArcs)}
                className="text-sm text-blue-600 hover:underline"
              >
                {showArcs ? 'Hide' : 'Show All'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {storyArcs.slice(0, showArcs ? storyArcs.length : 2).map((arc) => (
                <StoryArcCard key={arc.id} arc={arc} />
              ))}
            </div>
          </div>
        )}

        {/* Primary Headline */}
        {primaryHeadline && (
          <div className={`mb-6 rounded-xl overflow-hidden border-2 ${primaryHeadline.drama_score >= 9 ? 'border-[#FF4444] breaking-pulse' : 'border-[#FFD700]'}`}>
            <Headline headline={primaryHeadline} isPrimary />
          </div>
        )}

        {/* Vertical Feed - Gen Z Style (TikTok-like) */}
        <div className="space-y-4">
          {/* All headlines in vertical feed, sorted by drama score */}
          {feedHeadlines.length > 0 ? (
            feedHeadlines.map((headline) => (
              <div
                key={headline.id}
                className={`${darkMode ? 'bg-[#1A1A1A] border-[#333]' : 'bg-white border-gray-200'} border rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all hover:-translate-y-1`}
                style={{
                  boxShadow: headline.drama_score >= 8 ? `0 4px 20px ${headline.drama_score >= 9 ? 'rgba(255, 68, 68, 0.3)' : 'rgba(255, 215, 0, 0.2)'}` : undefined,
                }}
              >
                <Headline headline={headline} />
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} text-lg`}>No headlines yet</p>
              <p className={`${darkMode ? 'text-gray-500' : 'text-gray-400'} text-sm mt-2`}>Run the scraper to get started</p>
            </div>
          )}
        </div>

        {/* Trending Topics */}
        {trendingTopics.length > 0 && (
          <div className="mt-8 p-4 border-t-2 border-black">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              TRENDING TOPICS
              {twitterTrends.length > 0 && (
                <span className="text-sm font-normal text-gray-600">
                  ({twitterTrends.filter(t => t.source === 'both').length > 0 && '🔥 '}
                  from {twitterTrends.some(t => t.source === 'google' || t.source === 'both') ? 'Google Trends & ' : ''}Twitter/X)
                </span>
              )}
            </h2>
            <div className="flex flex-wrap gap-2">
              {trendingTopics.map((trend, index) => {
                // Handle both object and string formats for backward compatibility
                const trendObj = typeof trend === 'string' 
                  ? { name: trend, source: 'unknown' as const, fetchedAt: new Date().toISOString() }
                  : trend
                const isBoth = trendObj.source === 'both'
                const isGoogle = trendObj.source === 'google'
                const isTwitter = trendObj.source === 'twitter'
                
                // Find matching trend from API for tweet count
                const apiTrend = twitterTrends.find(t => t.name === trendObj.name)
                
                return (
                  <span
                    key={index}
                    className={`px-3 py-1 rounded-full text-sm hover:opacity-80 cursor-pointer flex items-center gap-1 ${
                      isBoth 
                        ? 'bg-gradient-to-r from-blue-100 to-red-100 border border-blue-300' 
                        : isGoogle
                        ? 'bg-red-100 border border-red-300'
                        : 'bg-gray-100 border border-gray-300'
                    }`}
                    title={
                      apiTrend?.tweetCount 
                        ? `${apiTrend.tweetCount.toLocaleString()} tweets` 
                        : isBoth 
                        ? 'Trending on both Twitter and Google'
                        : isGoogle
                        ? 'Trending on Google'
                        : isTwitter
                        ? 'Trending on Twitter'
                        : 'Trending topic'
                    }
                  >
                    {isBoth && <span className="text-orange-500">🔥</span>}
                    {isTwitter && !isBoth && <span className="text-blue-500">𝕏</span>}
                    {isGoogle && !isBoth && <span className="text-red-500">G</span>}
                    #{trendObj.name}
                    {apiTrend?.tweetCount && (
                      <span className="text-xs text-gray-500">({apiTrend.tweetCount.toLocaleString()})</span>
                    )}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Drama Alerts Sidebar */}
        {highDramaAlerts.length > 0 && (
          <div className="mt-8 p-4 border-2 border-red-500 bg-red-50">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              🚨 DRAMA DETECTED
            </h2>
            <ul className="space-y-2">
              {highDramaAlerts.slice(0, 5).map((headline) => (
                <li key={headline.id} className="flex items-start gap-2">
                  <span className="font-bold text-red-600">{headline.drama_score}/10</span>
                  <Link href={headline.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {headline.title}
                  </Link>
                </li>
              ))}
            </ul>
            <button className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              Subscribe to Alerts
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t-2 border-black p-4 text-center text-sm text-gray-600">
        <p>PopThePopcorn 🍿 - Contextual Intelligence Hub for Gen Z</p>
        <p className="mt-2 text-xs text-gray-500">
          AI-powered verification • Source trace receipts • Real-time sentiment analysis
        </p>
        <p className="mt-2">
          <a href="/admin/login" className="underline">Admin Dashboard</a> | 
          <a href="/feed" className="underline ml-2">RSS Feed</a>
        </p>
      </footer>

      {/* AI Chatbot - The Kernel */}
      <ChatBot />
    </div>
  )
}
