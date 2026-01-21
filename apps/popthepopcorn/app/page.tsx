'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Ticker from '@/components/Ticker'
import Headline from '@/components/Headline'
import DramaMeter from '@/components/DramaMeter'
import PopcornDramaMeter from '@/components/PopcornDramaMeter'
import ReactionButtons from '@/components/ReactionButtons'
import ChatBot from '@/components/ChatBot'
import StoryArcCard from '@/components/StoryArcCard'
import AgeGate from '@/components/AgeGate'
import PopcornAnimation from '@/components/PopcornAnimation'
import KeyboardShortcuts from '@/components/KeyboardShortcuts'
import { Settings, Bell, Tv, Zap, Coins, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateVersusFrame } from '@/lib/brand-guide'
import { getUserBalance, updateStreak, getStreakBadge } from '@/lib/virtual-currency'

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
  const [ageVerified, setAgeVerified] = useState(false)
  const [userBalance, setUserBalance] = useState({ kernels: 0, salt: 0, streak: 0, lastActiveDate: '' })

  const fetchHeadlines = async () => {
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch('/api/headlines', {
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const data = await response.json()
        const fetchedHeadlines = data.headlines || []
        console.log('[Frontend] Fetched headlines:', fetchedHeadlines.length)
        console.log('[Frontend] Sample headlines:', fetchedHeadlines.slice(0, 3))
        console.log('[Frontend] Setting headlines state with', fetchedHeadlines.length, 'items')
        setHeadlines(fetchedHeadlines)
        setOverallDrama(data.overallDrama || 5)
        setLastUpdated(new Date())
        
        // Debug: Log after state update
        setTimeout(() => {
          console.log('[Frontend] Headlines state after update:', fetchedHeadlines.length)
        }, 100)
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
    } catch (error: any) {
      console.error('[Frontend] Error fetching headlines:', error)
      if (error.name === 'AbortError') {
        toast.error('Request timed out. Please check your connection.')
      } else {
        toast.error('Failed to load headlines')
      }
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

  const fetchStoryArcs = async () => {
    try {
      const response = await fetch('/api/story-arcs?limit=6')
      if (response.ok) {
        const data = await response.json()
        setStoryArcs(data.arcs || [])
      }
    } catch (error) {
      console.error('Error fetching story arcs:', error)
    }
  }

  useEffect(() => {
    // Safety timeout: never hang for more than 15 seconds
    const safetyTimeout = setTimeout(() => {
      console.warn('[Frontend] Safety timeout: forcing loading to false')
      setLoading(false)
    }, 15000)

    // Check age verification
    if (typeof window !== 'undefined') {
      const verified = sessionStorage.getItem('age_verified')
      if (verified === 'true') {
        setAgeVerified(true)
      } else {
        // If not verified, show age gate immediately (don't wait for API)
        setLoading(false)
        clearTimeout(safetyTimeout)
      }
    } else {
      // Server-side: don't block on loading
      setLoading(false)
      clearTimeout(safetyTimeout)
    }

    return () => clearTimeout(safetyTimeout)
  }, [])

  useEffect(() => {
    if (!ageVerified) return

    // Set loading to true when starting to fetch
    setLoading(true)

    // Load user balance and update streak
    const loadUserData = async () => {
      if (typeof window === 'undefined') return
      
      try {
        const userIdentifier = localStorage.getItem('user_id') || 'anonymous'
        if (!localStorage.getItem('user_id')) {
          localStorage.setItem('user_id', `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
        }
        
        const balance = await getUserBalance(userIdentifier)
        const streak = await updateStreak(userIdentifier)
        setUserBalance({ ...balance, streak })
      } catch (error) {
        console.error('Error loading user data:', error)
        // Don't block on user data errors
      }
    }

    // Fetch all data in parallel
    Promise.all([
      fetchHeadlines(),
      fetchTwitterTrends().catch(() => {}), // Optional, don't block
      fetchStoryArcs().catch(() => {}), // Optional, don't block
      loadUserData(),
    ]).finally(() => {
      // Ensure loading is false even if some requests fail
      setLoading(false)
    })
  }, [ageVerified])

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
    console.log('[Frontend] Headlines state changed. Count:', headlines.length)
    if (headlines.length > 0) {
      console.log('[Frontend] Total headlines:', headlines.length)
      console.log('[Frontend] First headline:', headlines[0]?.title?.substring(0, 50))
      const categories = [...new Set(headlines.map(h => h.category))]
      console.log('[Frontend] Categories:', categories)
      console.log('[Frontend] Politics count:', headlines.filter(h => h.category === 'politics').length)
      console.log('[Frontend] Tech/Business count:', headlines.filter(h => h.category === 'tech' || h.category === 'business').length)
      console.log('[Frontend] Entertainment count:', headlines.filter(h => h.category === 'entertainment').length)
    } else {
      console.warn('[Frontend] Headlines array is empty!')
    }
  }, [headlines])

  const primaryHeadline = headlines.length > 0 
    ? (headlines.find(h => h.is_breaking || h.drama_score >= 9) || headlines[0])
    : null
  const feedHeadlines = headlines.length > 0 && primaryHeadline
    ? headlines.filter(h => h.id !== primaryHeadline.id)
    : headlines

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

  // Age gate
  if (!ageVerified) {
    return <AgeGate onVerified={() => setAgeVerified(true)} />
  }

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'cyber-gradient text-white' : 'bg-white text-black'}`}>
      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts
        onBingeMode={() => setBingeMode(true)}
        onRefresh={fetchHeadlines}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
      />

      {/* Ticker */}
      {headlines.length > 0 && <Ticker headlines={headlines} />}

      {/* Header - The Arena */}
      <header className={`${darkMode ? 'border-[#333] cyber-glow' : 'border-black'} border-b-2 p-4 sticky top-0 z-40 ${darkMode ? 'bg-[#0A0A0A] bg-opacity-95 backdrop-blur-sm' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className={`text-4xl font-black ${darkMode ? 'text-white' : 'text-black'}`}>
                  <span className="text-[#FFD700]">Pop</span>The<span className="text-[#FFD700]">Popcorn</span>
                </h1>
                <PopcornAnimation dramaScore={overallDrama} isBreaking={headlines.some(h => h.is_breaking)} />
              </div>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                The Arena • News as Entertainment • aka "The Kernel" • 🍿 Watching the drama unfold
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Virtual Currency Display */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FFD700] bg-opacity-20 rounded-lg border border-[#FFD700]">
                <Coins size={16} className="text-[#FFD700]" />
                <span className="text-sm font-bold text-[#FFD700]">{userBalance.salt} Salt</span>
                {userBalance.streak >= 3 && (
                  <span className="text-xs ml-1">{getStreakBadge(userBalance.streak)} {userBalance.streak} day streak</span>
                )}
              </div>
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
                className={`px-3 py-1 text-sm border rounded transition-all ${
                  darkMode 
                    ? 'border-[#333] hover:border-[#FFD700] hover:bg-[#FFD700] hover:bg-opacity-10' 
                    : 'border-gray-300 hover:bg-gray-100'
                }`}
                title="Refresh headlines (Ctrl/Cmd + R)"
              >
                Refresh
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded transition-all ${
                  darkMode 
                    ? 'hover:bg-[#FFD700] hover:bg-opacity-20' 
                    : 'hover:bg-gray-100'
                }`}
                title="Toggle dark mode (Ctrl/Cmd + D)"
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
        {/* Story Arcs Section (The "Lore" System) - Netflix-style */}
        {storyArcs.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${darkMode ? 'bg-[#FFD700] bg-opacity-20' : 'bg-[#FFD700] bg-opacity-10'}`}>
                  <Tv size={24} className="text-[#FFD700]" />
                </div>
                <div>
                  <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-black'}`}>
                    📺 Story Arcs
                  </h2>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Netflix-style news seasons • Subscribe for episode alerts
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowArcs(!showArcs)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  darkMode 
                    ? 'bg-[#FFD700] bg-opacity-20 text-[#FFD700] hover:bg-opacity-30 border border-[#FFD700]' 
                    : 'bg-[#FFD700] text-black hover:bg-[#FFC700]'
                }`}
              >
                {showArcs ? 'Hide' : `Show All (${storyArcs.length})`}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {storyArcs.slice(0, showArcs ? storyArcs.length : 2).map((arc) => (
                <StoryArcCard key={arc.id} arc={arc} />
              ))}
            </div>
          </div>
        )}

        {/* Primary Headline - The Main Event */}
        {primaryHeadline && (
          <div className={`mb-8 rounded-2xl overflow-hidden border-2 ${
            primaryHeadline.drama_score >= 9 
              ? 'border-[#FF4444] breaking-pulse cyber-glow' 
              : primaryHeadline.drama_score >= 7
              ? 'border-[#FF6B35]'
              : 'border-[#FFD700]'
          } ${darkMode ? 'bg-[#1A1A1A]' : 'bg-white'} relative`}>
            {/* Popcorn particles for extreme drama */}
            {primaryHeadline.drama_score >= 9 && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                {[...Array(3)].map((_, i) => (
                  <span
                    key={i}
                    className="popcorn-particle"
                    style={{
                      left: `${20 + i * 30}%`,
                      bottom: '10%',
                      animationDelay: `${i * 0.3}s`,
                    }}
                  >
                    🍿
                  </span>
                ))}
              </div>
            )}
            <div className={`p-1 ${primaryHeadline.drama_score >= 9 ? 'bg-gradient-to-r from-[#FF4444] to-[#FF6B35]' : 'bg-gradient-to-r from-[#FFD700] to-[#FF6B35]'}`}>
              <div className={`${darkMode ? 'bg-[#1A1A1A]' : 'bg-white'} rounded-xl relative z-10`}>
                <Headline headline={primaryHeadline} isPrimary />
              </div>
            </div>
          </div>
        )}

        {/* Bento Grid 2.0 Layout (Optional - can toggle) */}
        <div className="space-y-4">
          {/* All headlines in vertical feed, sorted by drama score */}
          {headlines.length > 0 ? (
            feedHeadlines.map((headline) => (
              <div
                key={headline.id}
                className={`bento-card ${darkMode ? 'bg-[#1A1A1A] border-[#333] cyber-glow' : 'bg-white border-gray-200'} border overflow-hidden shadow-sm hover:shadow-lg transition-all`}
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

        {/* Drama Alerts - High Stakes Section */}
        {highDramaAlerts.length > 0 && (
          <div className={`mt-8 p-6 rounded-2xl border-2 border-[#FF4444] ${darkMode ? 'bg-gradient-to-br from-red-900/20 to-orange-900/20 cyber-glow' : 'bg-red-50'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl">🚨</div>
              <div>
                <h2 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-black'}`}>
                  DRAMA DETECTED
                </h2>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  High-stakes stories (7+ drama)
                </p>
              </div>
            </div>
            <ul className="space-y-3 mb-4">
              {highDramaAlerts.slice(0, 5).map((headline) => (
                <li key={headline.id} className={`flex items-start gap-3 p-3 rounded-lg ${darkMode ? 'bg-[#0A0A0A] border border-[#333]' : 'bg-white border border-red-200'}`}>
                  <div className={`text-2xl font-black ${headline.drama_score >= 9 ? 'text-[#FF4444]' : 'text-[#FF6B35]'}`}>
                    {headline.drama_score}/10
                  </div>
                  <Link 
                    href={headline.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={`flex-1 hover:underline ${darkMode ? 'text-white' : 'text-black'}`}
                  >
                    {headline.title}
                  </Link>
                </li>
              ))}
            </ul>
            <button className={`w-full px-6 py-3 font-bold rounded-lg transition-all ${
              darkMode 
                ? 'bg-[#FF4444] text-white hover:bg-[#FF5555]' 
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}>
              🔔 Subscribe to Drama Alerts
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
