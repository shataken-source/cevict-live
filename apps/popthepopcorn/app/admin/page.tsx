'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, AlertTriangle, Users, BarChart3, LogOut, RefreshCw, Play, Clock, Settings, Save } from 'lucide-react'
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
  const [settings, setSettings] = useState<Record<string, { value: string; description?: string; category?: string; is_sensitive?: boolean }>>({})
  const [editingSettings, setEditingSettings] = useState<Record<string, string>>({})
  const [savingSettings, setSavingSettings] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const auth = sessionStorage.getItem('admin_auth')
    if (auth === 'authenticated') {
      setAuthenticated(true)
      fetchStats()
      fetchReportedStories()
      fetchLastScrapeTime()
      fetchSettings()
    } else {
      router.push('/admin/login')
    }
  }, [router])

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth')
    sessionStorage.removeItem('admin_token')
    router.push('/admin/login')
  }

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings', {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings || {})
        // Initialize editing state with current values
        const editing: Record<string, string> = {}
        Object.keys(data.settings || {}).forEach(key => {
          editing[key] = data.settings[key].value
        })
        setEditingSettings(editing)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const handleSettingChange = (key: string, value: string) => {
    setEditingSettings(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSaveSetting = async (key: string) => {
    setSavingSettings(true)
    try {
      const value = editingSettings[key] || ''
      const setting = settings[key]
      
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key,
          value,
          description: setting?.description,
          category: setting?.category,
        }),
      })

      if (response.ok) {
        toast.success(`Setting ${key} saved successfully`)
        await fetchSettings() // Refresh settings
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to save setting')
      }
    } catch (error) {
      console.error('Error saving setting:', error)
      toast.error('Failed to save setting')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleSaveAllSettings = async () => {
    setSavingSettings(true)
    try {
      const promises = Object.keys(editingSettings).map(key => {
        const value = editingSettings[key] || ''
        const setting = settings[key]
        
        return fetch('/api/admin/settings', {
          method: 'PUT',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key,
            value,
            description: setting?.description,
            category: setting?.category,
          }),
        })
      })

      await Promise.all(promises)
      toast.success('All settings saved successfully')
      await fetchSettings() // Refresh settings
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save some settings')
    } finally {
      setSavingSettings(false)
    }
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
    const startTime = Date.now()
    
    try {
      const response = await fetch('/api/admin/scraper', {
        method: 'POST',
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Scraper started! Running in background...', {
          duration: 5000,
          icon: '🚀',
        })
        
        // Show progress updates - poll for new headlines
        let checkCount = 0
        const maxChecks = 12 // Check for 2 minutes (12 * 10 seconds)
        let lastHeadlineCount = stats?.totalHeadlines || 0
        
        // Show initial feedback
        toast.loading('Scraper started! Monitoring progress...', {
          id: 'scraper-progress',
          duration: 10000,
        })
        
        const checkProgress = setInterval(async () => {
          checkCount++
          
          try {
            // Fetch stats directly to get current count
            const statsResponse = await fetch('/api/admin/stats', {
              headers: getAuthHeaders(),
            })
            
            if (statsResponse.ok) {
              const statsData = await statsResponse.json()
              const currentCount = statsData.totalHeadlines || 0
              
              // Update state
              setStats(statsData)
              await fetchLastScrapeTime()
              
              // Check if new headlines were added
              if (currentCount > lastHeadlineCount) {
                const added = currentCount - lastHeadlineCount
                toast.dismiss('scraper-progress')
                toast.success(`✅ ${added} new headline${added > 1 ? 's' : ''} added! (Total: ${currentCount})`, {
                  duration: 5000,
                  icon: '📰',
                })
                lastHeadlineCount = currentCount
              } else if (checkCount === 1) {
                // First check - update loading message
                toast.loading(`Scraper running... (${currentCount} headlines so far)`, {
                  id: 'scraper-progress',
                  duration: 10000,
                })
              } else if (checkCount % 3 === 0) {
                // Every 30 seconds, show still running
                toast.loading(`Still running... (${currentCount} headlines, checked ${checkCount} times)`, {
                  id: 'scraper-progress',
                  duration: 10000,
                })
              }
            }
          } catch (error) {
            console.error('Error checking progress:', error)
          }
          
          if (checkCount >= maxChecks) {
            clearInterval(checkProgress)
            setScraperRunning(false)
            toast.dismiss('scraper-progress')
            toast.success('Scraper monitoring complete! Check stats below for final results.', {
              duration: 5000,
            })
            fetchStats() // Final refresh
          }
        }, 10000) // Check every 10 seconds
        
        // Also set a timeout to reset button after reasonable time
        setTimeout(() => {
          clearInterval(checkProgress)
          setScraperRunning(false)
        }, 120000) // 2 minutes max
      } else if (response.status === 401) {
        sessionStorage.removeItem('admin_auth')
        sessionStorage.removeItem('admin_token')
        router.push('/admin/login')
        setScraperRunning(false)
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.message || 'Failed to start scraper')
        setScraperRunning(false)
      }
    } catch (error) {
      console.error('Error running scraper:', error)
      toast.error('Error starting scraper. Check console for details.')
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
                  {scraperRunning ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Running... (checking progress)
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      Run Scraper
                    </>
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Scrapes news from all configured RSS feeds and calculates drama scores.
              </p>
              {scraperRunning && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                  <div className="flex items-center gap-2">
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Scraper is running... Checking for new headlines every 10 seconds.</span>
                  </div>
                  <div className="mt-1 text-xs text-blue-600">
                    Check the "Total Headlines" stat below - it will update as headlines are added.
                  </div>
                </div>
              )}
              {lastScrapeTime && (
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
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

        {/* Settings */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Settings size={24} />
              Settings
            </h2>
            <button
              onClick={handleSaveAllSettings}
              disabled={savingSettings}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={16} />
              Save All
            </button>
          </div>

          <div className="space-y-6">
            {/* Trending Topics Settings */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-700">Trending Topics</h3>
              <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Twitter Trends Location
                    {settings['TWITTER_TRENDS_LOCATION']?.description && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({settings['TWITTER_TRENDS_LOCATION'].description})
                      </span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingSettings['TWITTER_TRENDS_LOCATION'] || ''}
                      onChange={(e) => handleSettingChange('TWITTER_TRENDS_LOCATION', e.target.value)}
                      placeholder="worldwide, usa, uk, canada, australia"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleSaveSetting('TWITTER_TRENDS_LOCATION')}
                      disabled={savingSettings}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Google Trends Location
                    {settings['GOOGLE_TRENDS_LOCATION']?.description && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({settings['GOOGLE_TRENDS_LOCATION'].description})
                      </span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingSettings['GOOGLE_TRENDS_LOCATION'] || ''}
                      onChange={(e) => handleSettingChange('GOOGLE_TRENDS_LOCATION', e.target.value)}
                      placeholder="US, GB, CA, AU, DE, FR, ES, IT, JP, IN, BR, etc."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleSaveSetting('GOOGLE_TRENDS_LOCATION')}
                      disabled={savingSettings}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Scraper Settings */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-700">Scraper</h3>
              <div className="space-y-4 pl-4 border-l-2 border-green-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Items Per Source
                    {settings['SCRAPER_ITEMS_PER_SOURCE']?.description && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({settings['SCRAPER_ITEMS_PER_SOURCE'].description})
                      </span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={editingSettings['SCRAPER_ITEMS_PER_SOURCE'] || '20'}
                      onChange={(e) => handleSettingChange('SCRAPER_ITEMS_PER_SOURCE', e.target.value)}
                      min="1"
                      max="100"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleSaveSetting('SCRAPER_ITEMS_PER_SOURCE')}
                      disabled={savingSettings}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Display Settings */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-700">Display</h3>
              <div className="space-y-4 pl-4 border-l-2 border-purple-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Headlines Per Category
                    {settings['HEADLINES_PER_CATEGORY']?.description && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({settings['HEADLINES_PER_CATEGORY'].description})
                      </span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={editingSettings['HEADLINES_PER_CATEGORY'] || '10'}
                      onChange={(e) => handleSettingChange('HEADLINES_PER_CATEGORY', e.target.value)}
                      min="1"
                      max="50"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleSaveSetting('HEADLINES_PER_CATEGORY')}
                      disabled={savingSettings}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Auto-Refresh Interval (seconds)
                    {settings['AUTO_REFRESH_INTERVAL']?.description && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({settings['AUTO_REFRESH_INTERVAL'].description})
                      </span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={editingSettings['AUTO_REFRESH_INTERVAL'] || '60'}
                      onChange={(e) => handleSettingChange('AUTO_REFRESH_INTERVAL', e.target.value)}
                      min="10"
                      max="300"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleSaveSetting('AUTO_REFRESH_INTERVAL')}
                      disabled={savingSettings}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Discord Integration */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-700">Discord Integration</h3>
              <div className="space-y-4 pl-4 border-l-2 border-indigo-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discord Webhook URL
                    {settings['DISCORD_WEBHOOK_URL']?.description && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({settings['DISCORD_WEBHOOK_URL'].description})
                      </span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={editingSettings['DISCORD_WEBHOOK_URL'] || ''}
                      onChange={(e) => handleSettingChange('DISCORD_WEBHOOK_URL', e.target.value)}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleSaveSetting('DISCORD_WEBHOOK_URL')}
                      disabled={savingSettings}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Breaking news (drama score ≥ 7) will automatically post to Discord
                  </p>
                </div>
              </div>
            </div>

            {/* Custom Settings */}
            {Object.keys(settings).filter(key => 
              !['TWITTER_TRENDS_LOCATION', 'GOOGLE_TRENDS_LOCATION', 'SCRAPER_ITEMS_PER_SOURCE', 'HEADLINES_PER_CATEGORY', 'AUTO_REFRESH_INTERVAL', 'DISCORD_WEBHOOK_URL'].includes(key)
            ).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-700">Other Settings</h3>
                <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                  {Object.keys(settings).filter(key => 
                    !['TWITTER_TRENDS_LOCATION', 'GOOGLE_TRENDS_LOCATION', 'SCRAPER_ITEMS_PER_SOURCE', 'HEADLINES_PER_CATEGORY', 'AUTO_REFRESH_INTERVAL', 'DISCORD_WEBHOOK_URL'].includes(key)
                  ).map(key => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {key}
                        {settings[key]?.description && (
                          <span className="text-xs text-gray-500 ml-2">
                            ({settings[key].description})
                          </span>
                        )}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type={settings[key]?.is_sensitive ? 'password' : 'text'}
                          value={editingSettings[key] || ''}
                          onChange={(e) => handleSettingChange(key, e.target.value)}
                          placeholder={settings[key]?.is_sensitive ? '••••••••' : 'Enter value'}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => handleSaveSetting(key)}
                          disabled={savingSettings}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(settings).length === 0 && (
              <p className="text-gray-500 text-center py-8">
                No settings found. Settings will appear here once they are created.
                <br />
                <span className="text-sm">You can create settings by using the API or they will be created automatically when first used.</span>
              </p>
            )}
          </div>
        </div>

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
