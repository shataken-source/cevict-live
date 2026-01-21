'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Ticker from '@/components/Ticker'
import Headline from '@/components/Headline'
import DramaMeter from '@/components/DramaMeter'
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
}

export default function Home() {
  const [headlines, setHeadlines] = useState<Headline[]>([])
  const [overallDrama, setOverallDrama] = useState(5)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [loading, setLoading] = useState(true)

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
        const errorData = await response.json()
        console.error('[Frontend] API error:', errorData)
        toast.error(`Failed to load headlines: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('[Frontend] Error fetching headlines:', error)
      toast.error('Failed to load headlines')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHeadlines()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchHeadlines()
    }, 60000) // Refresh every 60 seconds

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

  const primaryHeadline = headlines.find(h => h.is_breaking || h.drama_score >= 8) || headlines[0]
  const secondaryHeadlines = headlines.filter(h => h.id !== primaryHeadline?.id)

  const politicsHeadlines = secondaryHeadlines.filter(h => h.category === 'politics').slice(0, 10)
  const techHeadlines = secondaryHeadlines.filter(h => h.category === 'tech' || h.category === 'business').slice(0, 10)
  const entertainmentHeadlines = secondaryHeadlines.filter(h => h.category === 'entertainment').slice(0, 10)

  const trendingTopics = Array.from(
    new Set(
      headlines
        .flatMap(h => h.title.toLowerCase().split(/\s+/))
        .filter(word => word.length > 4)
    )
  ).slice(0, 15)

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
                onClick={fetchHeadlines}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                title="Refresh headlines"
              >
                Refresh
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4">
        {/* Primary Headline */}
        {primaryHeadline && (
          <Headline headline={primaryHeadline} isPrimary />
        )}

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Politics Column */}
          <div>
            <h2 className="text-2xl font-bold mb-4 border-b-2 border-black pb-2">
              POLITICS
            </h2>
            <div className="space-y-0">
              {politicsHeadlines.length > 0 ? (
                politicsHeadlines.map((headline) => (
                  <Headline key={headline.id} headline={headline} />
                ))
              ) : (
                <p className="text-gray-500 p-4">No politics headlines yet</p>
              )}
            </div>
          </div>

          {/* Tech & Business Column */}
          <div>
            <h2 className="text-2xl font-bold mb-4 border-b-2 border-black pb-2">
              TECH & BUSINESS
            </h2>
            <div className="space-y-0">
              {techHeadlines.length > 0 ? (
                techHeadlines.map((headline) => (
                  <Headline key={headline.id} headline={headline} />
                ))
              ) : (
                <p className="text-gray-500 p-4">No tech headlines yet</p>
              )}
            </div>
          </div>

          {/* Entertainment Column */}
          <div>
            <h2 className="text-2xl font-bold mb-4 border-b-2 border-black pb-2">
              ENTERTAINMENT & CULTURE
            </h2>
            <div className="space-y-0">
              {entertainmentHeadlines.length > 0 ? (
                entertainmentHeadlines.map((headline) => (
                  <Headline key={headline.id} headline={headline} />
                ))
              ) : (
                <p className="text-gray-500 p-4">No entertainment headlines yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Trending Topics */}
        {trendingTopics.length > 0 && (
          <div className="mt-8 p-4 border-t-2 border-black">
            <h2 className="text-xl font-bold mb-4">TRENDING TOPICS</h2>
            <div className="flex flex-wrap gap-2">
              {trendingTopics.map((topic, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-100 rounded-full text-sm hover:bg-gray-200 cursor-pointer"
                >
                  #{topic}
                </span>
              ))}
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
        <p>PopThePopcorn 🍿 - Real-time news aggregation with AI-powered drama scoring</p>
        <p className="mt-2">
          <a href="/admin/login" className="underline">Admin Dashboard</a> | 
          <a href="/feed" className="underline ml-2">RSS Feed</a>
        </p>
      </footer>
    </div>
  )
}
