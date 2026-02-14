'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import KeyManagement from '@/components/KeyManagement'

type Project = {
  name: string
  path: string
  port: number
  description: string
  running: boolean
  url: string
}

type ProjectHealth = {
  name: string
  status: 'up' | 'down' | 'unknown'
  latencyMs?: number
}

type LiveStats = {
  boats: { total: number; available: number; byType: Record<string, number> }
  rentals: { total: number; available: number; byType: Record<string, number> }
  activities: { total: number; indoor: number; outdoor: number }
  bookings: { today: number; thisWeek: number; revenue: number }
  users: { active: number; newToday: number }
  finn: { conversations: number; bookings: number; satisfaction: number }
  prognostication: {
    revenue: { mrr: number; arr: number }
    subscribers: {
      total: number
      pro: { total: number; weekly: number; monthly: number }
      elite: { total: number; weekly: number; monthly: number }
    }
  }
}

export default function Launchpad() {
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [health, setHealth] = useState<Record<string, ProjectHealth>>({})
  const [lastHealthCheck, setLastHealthCheck] = useState<string>('')
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null)
  const [currentTime, setCurrentTime] = useState<string>('')
  const [mounted, setMounted] = useState(false)
  const [brainStatus, setBrainStatus] = useState<{
    reachable: boolean;
    healthy: boolean;
    issues: string[];
  }>({
    reachable: false,
    healthy: false,
    issues: [],
  })

  // Update time on client only
  useEffect(() => {
    setMounted(true)
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleString())
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const projects: Project[] = [
    { name: 'Prognostication', path: 'prognostication', port: 3005, description: 'Sports betting picks platform', running: false, url: 'http://localhost:3005' },
    { name: 'PROGNO', path: 'progno', port: 3008, description: 'Prediction engine', running: false, url: 'http://localhost:3008' },
    { name: 'PetReunion', path: 'petreunion', port: 3007, description: 'Lost pet finder', running: false, url: 'http://localhost:3007' },
    { name: 'PopThePopcorn', path: 'popthepopcorn', port: 3006, description: 'Entertainment news', running: false, url: 'http://localhost:3006' },
    { name: 'SmokersRights', path: 'smokersrights', port: 3010, description: 'Advocacy platform', running: false, url: 'http://localhost:3010' },
    { name: 'Gulf Coast Charters', path: 'gcc', port: 3009, description: 'All charter types', running: false, url: 'http://localhost:3009' },
    { name: 'WTV (Where To Vacation)', path: 'wheretovacation', port: 3011, description: 'Vacation planning', running: false, url: 'http://localhost:3011' },
  ]

  // Load live stats from all apps
  useEffect(() => {
    const loadLiveStats = async () => {
      try {
        const [boatsRes, rentalsRes, activitiesRes, bookingsRes, prognosticationRes] = await Promise.all([
          fetch('http://localhost:3009/api/boats?available=true').catch(() => null),
          fetch('http://localhost:3011/api/rentals?available=true').catch(() => null),
          fetch('http://localhost:3009/api/activities/local').catch(() => null),
          fetch('/api/stats/bookings').catch(() => null),
          fetch('/api/stats/prognostication').catch(() => null),
        ])

        const boats = boatsRes?.ok ? await boatsRes.json() : []
        const rentals = rentalsRes?.ok ? await rentalsRes.json() : []
        const activities = activitiesRes?.ok ? await activitiesRes.json() : []
        const bookings = bookingsRes?.ok ? await bookingsRes.json() : { today: 0, thisWeek: 0, revenue: 0 }
        const prognostication = prognosticationRes?.ok ? await prognosticationRes.json() : {
          revenue: { mrr: 0, arr: 0 },
          subscribers: {
            total: 0,
            pro: { total: 0, weekly: 0, monthly: 0 },
            elite: { total: 0, weekly: 0, monthly: 0 },
          },
        }

        // Count by type
        const boatsByType: Record<string, number> = {}
        boats.forEach((boat: any) => {
          const type = boat.charter_type || 'other'
          boatsByType[type] = (boatsByType[type] || 0) + 1
        })

        const rentalsByType: Record<string, number> = {}
        rentals.forEach((rental: any) => {
          const type = rental.rental_type || 'other'
          rentalsByType[type] = (rentalsByType[type] || 0) + 1
        })

        setLiveStats({
          boats: { total: boats.length, available: boats.filter((b: any) => b.available).length, byType: boatsByType },
          rentals: { total: rentals.length, available: rentals.filter((r: any) => r.available).length, byType: rentalsByType },
          activities: { total: activities.length, indoor: activities.filter((a: any) => a.category === 'indoor').length, outdoor: activities.length - activities.filter((a: any) => a.category === 'indoor').length },
          bookings: bookings,
          users: { active: 0, newToday: 0 },
          finn: { conversations: 0, bookings: 0, satisfaction: 95 },
          prognostication: prognostication.success ? prognostication : {
            revenue: prognostication.revenue || { mrr: 0, arr: 0 },
            subscribers: prognostication.subscribers || {
              total: 0,
              pro: { total: 0, weekly: 0, monthly: 0 },
              elite: { total: 0, weekly: 0, monthly: 0 },
            },
          },
        })
      } catch (error) {
        console.error('Error loading live stats:', error)
      }
    }

    loadLiveStats()
    const id = setInterval(loadLiveStats, 30000) // Update every 30 seconds
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const loadHealth = async () => {
      try {
        const res = await fetch('/api/health')
        if (!res.ok) return
        const data = await res.json()
        if (!data?.projects) return
        const map: Record<string, ProjectHealth> = {}
        for (const p of data.projects as any[]) {
          map[p.name] = {
            name: p.name,
            status: p.status || 'unknown',
            latencyMs: p.latencyMs,
          }
        }
        setHealth(map)
        setLastHealthCheck(new Date().toLocaleTimeString())
      } catch {
        // ignore errors, keep last known
      }
    }

    loadHealth()
    const id = setInterval(loadHealth, 10000) // Check every 10 seconds
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const loadBrain = async () => {
      try {
        const res = await fetch('/api/brain/status')
        if (!res.ok) {
          setBrainStatus({
            reachable: false,
            healthy: false,
            issues: ['Brain API not reachable'],
          })
          return
        }
        const data = await res.json()
        setBrainStatus({
          reachable: !!data?.brainReachable,
          healthy: !!data?.brainHealthy,
          issues: Array.isArray(data?.health?.issues)
            ? data.health.issues.map((i: any) => i?.message || JSON.stringify(i)).slice(0, 4)
            : data?.error ? [data.error] : [],
        })
      } catch (err: any) {
        setBrainStatus({
          reachable: false,
          healthy: false,
          issues: [err?.message || 'Failed to connect to Brain'],
        })
      }
    }
    loadBrain()
    const id = setInterval(loadBrain, 30000)
    return () => clearInterval(id)
  }, [])

  const clearCacheAndRestart = async () => {
    setLoading(true)
    setOutput('[SYS] Clearing caches for all projects...')

    try {
      const response = await fetch('/api/clear-cache', { method: 'POST' })
      const data = await response.json()

      if (data.success) {
        setOutput('[OK] Caches cleared. Restart dev servers as needed.')
      } else {
        setOutput('[ERR] Failed to clear caches')
      }
    } catch (error) {
      setOutput('[ERR] ' + error)
    }

    setLoading(false)
  }

  const startProject = async (project: Project) => {
    setLoading(true)
    setOutput(`[BOOT] Starting ${project.name} on port ${project.port}...`)

    try {
      const response = await fetch('/api/start-project', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ path: project.path, port: project.port })
      })

      const data = await response.json()

      if (data.success) {
        setOutput(`[OK] ${project.name} start command issued on port ${project.port}`)
      } else {
        setOutput(`[ERR] Failed to start ${project.name}`)
      }
    } catch (error) {
      setOutput('[ERR] ' + error)
    }

    setLoading(false)
  }

  const killPort = async (port: number) => {
    setLoading(true)
    setOutput(`[KILL] Terminating port ${port}...`)

    try {
      const response = await fetch('/api/kill-port', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ port })
      })

      const data = await response.json()

      if (data.success) {
        setOutput(`[OK] Port ${port} terminated`)
      } else {
        setOutput(`[ERR] Failed to kill port ${port}`)
      }
    } catch (error) {
      setOutput('[ERR] ' + error)
    }

    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, #0a0e27 0%, #020617 45%, #000000 100%)',
      color: '#e5e7eb',
      padding: '3rem',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Mono", Menlo, Monaco, Consolas, monospace',
      fontSize: '1.1rem', // Larger for TV
    }}>
      <div style={{ maxWidth: '1920px', margin: '0 auto' }}>
        {/* Header - Large for TV */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '3rem',
          padding: '2rem',
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '20px',
          border: '2px solid rgba(34, 197, 94, 0.3)',
          boxShadow: '0 0 40px rgba(34, 197, 94, 0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <div style={{ fontSize: '5rem' }}>🚀</div>
          <div>
              <h1 style={{ fontSize: '4.5rem', fontWeight: 'bold', marginBottom: '0.5rem', background: 'linear-gradient(135deg, #22c55e 0%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              LAUNCHPAD
            </h1>
              <p style={{ color: '#94a3b8', fontSize: '1.5rem' }}>
                Real-Time Operations Dashboard · Live Data Monitor
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Link href="/landing" style={{ color: '#94a3b8', fontSize: '1rem', textDecoration: 'none' }}>About</Link>
              <UserButton afterSignOutUrl="/landing" />
            </div>
            <div style={{ fontSize: '1.2rem', color: '#6b7280' }} suppressHydrationWarning>
              {mounted ? currentTime : 'Loading...'}
            </div>
            <div style={{ fontSize: '1rem', color: '#6b7280' }}>
              brain:{' '}
              <span style={{
                color: brainStatus.reachable ? (brainStatus.healthy ? '#22c55e' : '#eab308') : '#ef4444',
                fontSize: '1.2rem',
                fontWeight: 'bold',
              }}>
                {brainStatus.reachable
                  ? brainStatus.healthy
                    ? '● ONLINE'
                    : '● DEGRADED'
                  : '● OFFLINE'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Stats Grid - TV Optimized */}
        {liveStats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            marginBottom: '3rem',
          }}>
            {/* Boats Stat Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%)',
              borderRadius: '20px',
              padding: '2rem',
              border: '2px solid rgba(59, 130, 246, 0.4)',
              boxShadow: '0 0 30px rgba(59, 130, 246, 0.2)',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚤</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {liveStats.boats.total}
              </div>
              <div style={{ fontSize: '1.2rem', color: '#94a3b8', marginBottom: '1rem' }}>Total Boats</div>
              <div style={{ fontSize: '1rem', color: '#22c55e' }}>
                {liveStats.boats.available} available
              </div>
              <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#64748b' }}>
                {Object.entries(liveStats.boats.byType).slice(0, 3).map(([type, count]) => (
                  <div key={type} style={{ marginTop: '0.5rem' }}>
                    {type.replace(/_/g, ' ')}: {count}
                  </div>
                ))}
              </div>
            </div>

            {/* Rentals Stat Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(147, 51, 234, 0.1) 100%)',
              borderRadius: '20px',
              padding: '2rem',
              border: '2px solid rgba(168, 85, 247, 0.4)',
              boxShadow: '0 0 30px rgba(168, 85, 247, 0.2)',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏠</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {liveStats.rentals.total}
              </div>
              <div style={{ fontSize: '1.2rem', color: '#94a3b8', marginBottom: '1rem' }}>Total Rentals</div>
              <div style={{ fontSize: '1rem', color: '#22c55e' }}>
                {liveStats.rentals.available} available
              </div>
            </div>

            {/* Activities Stat Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)',
              borderRadius: '20px',
              padding: '2rem',
              border: '2px solid rgba(16, 185, 129, 0.4)',
              boxShadow: '0 0 30px rgba(16, 185, 129, 0.2)',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {liveStats.activities.total}
              </div>
              <div style={{ fontSize: '1.2rem', color: '#94a3b8', marginBottom: '1rem' }}>Local Activities</div>
              <div style={{ fontSize: '1rem', color: '#94a3b8' }}>
                {liveStats.activities.indoor} indoor · {liveStats.activities.outdoor} outdoor
              </div>
            </div>

            {/* Bookings Stat Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.1) 100%)',
              borderRadius: '20px',
              padding: '2rem',
              border: '2px solid rgba(245, 158, 11, 0.4)',
              boxShadow: '0 0 30px rgba(245, 158, 11, 0.2)',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {liveStats.bookings.today}
              </div>
              <div style={{ fontSize: '1.2rem', color: '#94a3b8', marginBottom: '1rem' }}>Bookings Today</div>
              <div style={{ fontSize: '1rem', color: '#22c55e' }}>
                ${liveStats.bookings.revenue.toLocaleString()} revenue
              </div>
            </div>

            {/* Finn AI Stat Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(219, 39, 119, 0.1) 100%)',
              borderRadius: '20px',
              padding: '2rem',
              border: '2px solid rgba(236, 72, 153, 0.4)',
              boxShadow: '0 0 30px rgba(236, 72, 153, 0.2)',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {liveStats.finn.satisfaction}%
              </div>
              <div style={{ fontSize: '1.2rem', color: '#94a3b8', marginBottom: '1rem' }}>Finn Satisfaction</div>
              <div style={{ fontSize: '1rem', color: '#94a3b8' }}>
                {liveStats.finn.conversations} conversations
              </div>
            </div>

            {/* Prognostication Revenue Stat Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.1) 100%)',
              borderRadius: '20px',
              padding: '2rem',
              border: '2px solid rgba(251, 191, 36, 0.4)',
              boxShadow: '0 0 30px rgba(251, 191, 36, 0.2)',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💰</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                ${liveStats.prognostication.revenue.mrr.toLocaleString()}
              </div>
              <div style={{ fontSize: '1.2rem', color: '#94a3b8', marginBottom: '1rem' }}>Prognostication MRR</div>
              <div style={{ fontSize: '1rem', color: '#22c55e', marginBottom: '0.5rem' }}>
                ${liveStats.prognostication.revenue.arr.toLocaleString()} ARR
              </div>
              <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '1rem' }}>
                {liveStats.prognostication.subscribers.total} subscribers
              </div>
            </div>

            {/* Prognostication Subscribers Breakdown Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(124, 58, 237, 0.1) 100%)',
              borderRadius: '20px',
              padding: '2rem',
              border: '2px solid rgba(139, 92, 246, 0.4)',
              boxShadow: '0 0 30px rgba(139, 92, 246, 0.2)',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {liveStats.prognostication.subscribers.total}
              </div>
              <div style={{ fontSize: '1.2rem', color: '#94a3b8', marginBottom: '1rem' }}>Subscribers</div>
              <div style={{ fontSize: '1rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: '#a78bfa' }}>Pro:</span> {liveStats.prognostication.subscribers.pro.total}
                  <span style={{ fontSize: '0.85rem', color: '#64748b', marginLeft: '0.5rem' }}>
                    ({liveStats.prognostication.subscribers.pro.weekly}W / {liveStats.prognostication.subscribers.pro.monthly}M)
                  </span>
                </div>
                <div>
                  <span style={{ color: '#fbbf24' }}>Elite:</span> {liveStats.prognostication.subscribers.elite.total}
                  <span style={{ fontSize: '0.85rem', color: '#64748b', marginLeft: '0.5rem' }}>
                    ({liveStats.prognostication.subscribers.elite.weekly}W / {liveStats.prognostication.subscribers.elite.monthly}M)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Health Matrix - Enhanced */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.85)',
          borderRadius: '20px',
          padding: '2.5rem',
          marginBottom: '3rem',
          border: '2px solid rgba(34, 197, 94, 0.35)',
          boxShadow: '0 0 40px rgba(34, 197, 94, 0.15)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold' }}>
              ▌ SYSTEM HEALTH MATRIX
            </h2>
            <div style={{ fontSize: '1rem', color: '#6b7280' }}>
              last scan: {lastHealthCheck || 'scanning...'}
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
          }}>
            {projects.map((project) => {
              const h = health[project.name]
              const status = h?.status || 'unknown'
              const color =
                status === 'up' ? '#22c55e' :
                status === 'down' ? '#ef4444' :
                '#eab308'
              const label =
                status === 'up' ? 'UP' :
                status === 'down' ? 'DOWN' :
                'UNKNOWN'
              return (
                <div
                  key={project.name}
                  style={{
                    padding: '1.5rem',
                    borderRadius: '15px',
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: `2px solid ${color}40`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    transition: 'transform 0.2s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)'
                    e.currentTarget.style.borderColor = `${color}80`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.borderColor = `${color}40`
                  }}
                  onClick={() => window.open(project.url, '_blank')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.1rem', color: '#e5e7eb', fontWeight: 'bold' }}>{project.name}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                      <span style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '999px',
                        backgroundColor: color,
                        boxShadow: `0 0 12px ${color}`,
                        animation: status === 'up' ? 'pulse 2s infinite' : 'none',
                      }} />
                      <span style={{ color, fontWeight: 'bold' }}>{label}</span>
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
                    <span>dev:{project.port}</span>
                    <span>{h?.latencyMs != null ? `${h.latencyMs}ms` : '—'}</span>
                  </div>
                  <div style={{
                    marginTop: '0.5rem',
                    height: '4px',
                    borderRadius: '999px',
                    background: 'rgba(15,23,42,1)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: h?.latencyMs ? `${Math.min(100, Math.max(5, 120 - h.latencyMs))}%` : '12%',
                      height: '100%',
                      background: `linear-gradient(90deg, ${color}, #22c55e)`,
                      boxShadow: `0 0 12px ${color}`,
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Brain Monitor - Enhanced */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.9)',
          borderRadius: '20px',
          padding: '2.5rem',
          marginBottom: '3rem',
          border: '2px solid rgba(59, 130, 246, 0.5)',
          boxShadow: '0 0 40px rgba(59, 130, 246, 0.15)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold' }}>🧠 Brain Monitor</h2>
            <span style={{ fontSize: '1.2rem', color: '#9ca3af' }}>
              status:{' '}
              <strong style={{
                color: brainStatus.reachable
                  ? (brainStatus.healthy ? '#22c55e' : '#eab308')
                  : '#ef4444',
                fontSize: '1.5rem',
              }}>
                {brainStatus.reachable
                  ? brainStatus.healthy
                    ? '● OK'
                    : '● DEGRADED'
                  : '● DOWN'}
              </strong>
            </span>
          </div>
          {brainStatus.issues.length > 0 ? (
            <div style={{
              fontFamily: 'monospace',
              fontSize: '1rem',
              color: '#fde68a',
              background: '#451a03',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1rem',
              border: '2px solid #f59e0b',
            }}>
              {brainStatus.issues.map((msg, idx) => (
                <div key={idx} style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                  ▌ {msg}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '1.1rem', color: '#22c55e', marginBottom: '1rem', padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '10px' }}>
              ✓ No critical bot/health issues reported.
            </div>
          )}
        </div>

        {/* Quick Actions - Larger for TV */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.85)',
          borderRadius: '20px',
          padding: '2.5rem',
          marginBottom: '3rem',
        }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>
            ⚙️ Quick Actions
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
          }}>
            <button
              onClick={clearCacheAndRestart}
              disabled={loading}
              style={{
                padding: '2rem',
                background: loading ? '#475569' : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                borderRadius: '15px',
                border: 'none',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1.2rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 6px 20px rgba(239, 68, 68, 0.4)',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0) scale(1)')}
              >
              🧹 Clear All Caches
            </button>

            <button
              onClick={() => {
                projects.forEach(p => killPort(p.port))
              }}
              disabled={loading}
              style={{
                padding: '2rem',
                background: loading ? '#475569' : 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
                borderRadius: '15px',
                border: 'none',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1.2rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 6px 20px rgba(245, 158, 11, 0.4)',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0) scale(1)')}
              >
              🔪 Kill All Ports
            </button>

            <a
              href="/command-center"
              style={{
                padding: '2rem',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                borderRadius: '15px',
                border: 'none',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1.2rem',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(99, 102, 241, 0.4)',
                transition: 'transform 0.2s',
                textDecoration: 'none',
                display: 'block',
                textAlign: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0) scale(1)')}
              >
              🎛️ Command Center
            </a>

            <a
              href="/affiliates"
              style={{
                padding: '2rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '15px',
                border: 'none',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1.2rem',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
                transition: 'transform 0.2s',
                textDecoration: 'none',
                display: 'block',
                textAlign: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0) scale(1)')}
              >
              💰 Manage Affiliates
            </a>
          </div>
        </div>

        {/* Projects Grid - Enhanced */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.85)',
          borderRadius: '20px',
          padding: '2.5rem',
          marginBottom: '3rem',
        }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>
            📂 Projects
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '2rem',
          }}>
            {projects.map((project) => (
              <div
                key={project.path}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '15px',
                  padding: '2rem',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)'
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(59, 130, 246, 0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                onClick={() => window.open(project.url, '_blank')}
              >
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>
                  {project.name}
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '0.75rem' }}>
                  {project.description}
                </p>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Port {project.port} · Click to open
                </p>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      startProject(project)
                    }}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      background: loading ? '#475569' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      borderRadius: '10px',
                      border: 'none',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ▶ Start
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      killPort(project.port)
                    }}
                    disabled={loading}
                    style={{
                      padding: '1rem 1.5rem',
                      background: loading ? '#475569' : '#dc2626',
                      borderRadius: '10px',
                      border: 'none',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ⛔
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Management Tool */}
        <div style={{ marginBottom: '3rem' }}>
          <KeyManagement />
        </div>

        {/* Output Console */}
        {output && (
          <div style={{
            background: '#0f172a',
            borderRadius: '15px',
            padding: '2rem',
            border: '2px solid rgba(16, 185, 129, 0.3)',
            fontFamily: 'monospace',
            fontSize: '1.1rem',
            color: '#10b981',
            maxHeight: '300px',
            overflow: 'auto',
            }}>
              {output}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
