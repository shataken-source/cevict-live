'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, AlertTriangle, Users, BarChart3, LogOut, RefreshCw, Play, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

interface Stats {
  totalHeadlines: number
  topVotedStory: any
  reportedStories: number
  activeAlerts: number
  averageDrama: number
  dramaHistory: Array<{ overall_drama_score: number; recorded_at: string }>
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [reportedStories, setReportedStories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [lastScrapeTime, setLastScrapeTime] = useState<string | null>(null)
  const [scraperRunning, setScraperRunning] = useState(false)
  const [trendsRunning, setTrendsRunning] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const auth = sessionStorage.getItem('admin_auth')
    if (auth === 'authenticated') {
      setAuthenticated(true)
      fetchStats()
      fetchReportedStories()
      fetchLastScrapeTime()
    } else {
      router.push('/admin/login')
    }
  }, [router])

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth')
    sessionStorage.removeItem('admin_token')
    router.push('/admin/login')
  }

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem('admin_token')
    return {
      'x-admin-token': token || '',
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats', {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else if (response.status === 401) {
        // Unauthorized - redirect to login
        sessionStorage.removeItem('admin_auth')
        sessionStorage.removeItem('admin_token')
        router.push('/admin/login')
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReportedStories = async () => {
    try {
      const response = await fetch('/api/admin/reported', {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setReportedStories(data.reported || [])
      } else if (response.status === 401) {
        // Unauthorized - redirect to login
        sessionStorage.removeItem('admin_auth')
        sessionStorage.removeItem('admin_token')
        router.push('/admin/login')
      }
    } catch (error) {
      console.error('Error fetching reported stories:', error)
    }
  }

  const fetchLastScrapeTime = async () => {
    try {
      const response = await fetch('/api/admin/scraper', {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setLastScrapeTime(data.lastScrapeTime)
      }
    } catch (error) {
      console.error('Error fetching last scrape time:', error)
    }
  }

  const handleRunScraper = async () => {
    setScraperRunning(true)
    try {
      const response = await fetch('/api/admin/scraper', {
        method: 'POST',
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        toast.success('Scraper started! This may take a few minutes.')
        // Wait a bit then refresh stats
        setTimeout(() => {
          fetchStats()
          fetchLastScrapeTime()
        }, 5000)
      } else if (response.status === 401) {
        sessionStorage.removeItem('admin_auth')
        sessionStorage.removeItem('admin_token')
        router.push('/admin/login')
      } else {
        toast.error('Failed to start scraper')
      }
    } catch (error) {
      console.error('Error running scraper:', error)
      toast.error('Error starting scraper')
    } finally {
      setScraperRunning(false)
    }
  }

  const handleRunTrends = async () => {
    setTrendsRunning(true)
    try {
      const response = await fetch('/api/admin/trends', {
        method: 'POST',
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        toast.success('Trend monitor started!')
        setTimeout(() => {
          fetchStats()
        }, 3000)
      } else if (response.status === 401) {
        sessionStorage.removeItem('admin_auth')
        sessionStorage.removeItem('admin_token')
        router.push('/admin/login')
      } else {
        toast.error('Failed to start trend monitor')
      }
    } catch (error) {
      console.error('Error running trends:', error)
      toast.error('Error starting trend monitor')
    } finally {
      setTrendsRunning(false)
    }
  }

  const handleRefreshStats = () => {
    fetchStats()
    fetchReportedStories()
    fetchLastScrapeTime()
    toast.success('Stats refreshed!')
  }

  const handleReview = async (reportId: string, status: string) => {
    try {
      const response = await fetch('/api/admin/reported', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ reportId, status }),
      })

      if (response.ok) {
        fetchReportedStories()
        fetchStats()
      } else if (response.status === 401) {
        sessionStorage.removeItem('admin_auth')
        sessionStorage.removeItem('admin_token')
        router.push('/admin/login')
      }
    } catch (error) {
      console.error('Error reviewing report:', error)
    }
  }

  if (!authenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Loading admin dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:underline">
              <ArrowLeft size={20} />
              Back to Home
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
        </div>

        {/* Scraper Controls */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Scraper Controls</h2>
            <button
              onClick={handleRefreshStats}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <RefreshCw size={20} />
              Refresh Stats
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">News Scraper</h3>
                <button
                  onClick={handleRunScraper}
                  disabled={scraperRunning}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play size={16} />
                  {scraperRunning ? 'Running...' : 'Run Scraper'}
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Scrapes news from all configured RSS feeds and calculates drama scores.
              </p>
              {lastScrapeTime && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock size={14} />
                  <span>Last run: {new Date(lastScrapeTime).toLocaleString()}</span>
                </div>
              )}
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Trend Monitor</h3>
                <button
                  onClick={handleRunTrends}
                  disabled={trendsRunning}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play size={16} />
                  {trendsRunning ? 'Running...' : 'Run Trends'}
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Updates drama scores based on current engagement and voting patterns.
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Scraping may take several minutes. Check the browser console or server logs for progress. 
              Stats will auto-refresh after completion.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Headlines</p>
                  <p className="text-3xl font-bold">{stats.totalHeadlines}</p>
                </div>
                <BarChart3 className="text-blue-500" size={32} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Avg Drama Score</p>
                  <p className="text-3xl font-bold">{stats.averageDrama.toFixed(1)}/10</p>
                </div>
                <TrendingUp className="text-orange-500" size={32} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Reported Stories</p>
                  <p className="text-3xl font-bold">{stats.reportedStories}</p>
                </div>
                <AlertTriangle className="text-red-500" size={32} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Active Alerts</p>
                  <p className="text-3xl font-bold">{stats.activeAlerts}</p>
                </div>
                <Users className="text-green-500" size={32} />
              </div>
            </div>
          </div>
        )}

        {/* Top Voted Story */}
        {stats?.topVotedStory && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-2xl font-bold mb-4">Top Voted Story</h2>
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="text-xl font-semibold mb-2">{stats.topVotedStory.title}</h3>
              <p className="text-gray-600 mb-2">
                {stats.topVotedStory.source} • Drama: {stats.topVotedStory.drama_score}/10
              </p>
              <div className="flex items-center gap-4">
                <span className="text-green-600">👍 {stats.topVotedStory.upvotes}</span>
                <span className="text-red-600">👎 {stats.topVotedStory.downvotes}</span>
                <a
                  href={stats.topVotedStory.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View Story →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Drama History Chart */}
        {stats?.dramaHistory && stats.dramaHistory.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-2xl font-bold mb-4">Drama Score History</h2>
            <div className="flex items-end gap-2 h-48">
              {stats.dramaHistory.slice(-24).map((entry, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-blue-500 rounded-t transition-all"
                    style={{
                      height: `${(entry.overall_drama_score / 10) * 100}%`,
                      minHeight: '4px',
                    }}
                    title={`${entry.overall_drama_score}/10`}
                  />
                  {index % 6 === 0 && (
                    <span className="text-xs text-gray-500 mt-2">
                      {new Date(entry.recorded_at).getHours()}:00
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reported Stories */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4">Reported Stories</h2>
          {reportedStories.length === 0 ? (
            <p className="text-gray-500">No reported stories pending review</p>
          ) : (
            <div className="space-y-4">
              {reportedStories.map((report) => (
                <div key={report.id} className="border-l-4 border-yellow-500 pl-4 py-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{report.headline?.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Reason: {report.reason} • Status: {report.status}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Reported {new Date(report.created_at).toLocaleString()}
                      </p>
                    </div>
                    {report.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReview(report.id, 'reviewed')}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReview(report.id, 'dismissed')}
                          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
