'use client'

import { useState, useEffect } from 'react'
import { 
  Bot, Play, Square, RefreshCw, Check, X,
  AlertTriangle, Activity, Server, Zap,
  Shield, Eye, Settings, ChevronRight,
  ArrowLeft, CheckCircle, XCircle, Clock
} from 'lucide-react'
import Link from 'next/link'

interface BotStatus {
  id: string
  name: string
  status: 'active' | 'idle' | 'error'
  lastActivity?: string
}

interface DashboardData {
  status: string
  mode: string
  uptime: number
  services: Array<{ name: string; status: string; latency: number }>
  stats: {
    issuesDetected: number
    issuesResolved: number
    autoRepairs: number
    pendingApprovals: number
  }
  recentIssues: any[]
  recentDecisions: any[]
}

export default function BotsPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [bots, setBots] = useState<BotStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Fetch bot status
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/bots')
      const data = await res.json()
      setDashboard(data.dashboard)
      setBots(data.bots)
    } catch (error) {
      console.error('Failed to fetch bot status:', error)
    } finally {
      setLoading(false)
    }
  }

  // Send action to bots
  const sendAction = async (action: string, params?: any) => {
    setActionLoading(true)
    try {
      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, params })
      })
      const data = await res.json()
      if (data.success) {
        await fetchStatus()
      }
      return data
    } catch (error) {
      console.error('Action failed:', error)
    } finally {
      setActionLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000) // Poll every 5s
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'operational':
      case 'healthy':
        return 'text-emerald-400 bg-emerald-500/20'
      case 'idle':
      case 'stopped':
        return 'text-slate-400 bg-slate-500/20'
      case 'error':
      case 'down':
        return 'text-red-400 bg-red-500/20'
      default:
        return 'text-amber-400 bg-amber-500/20'
    }
  }

  const formatUptime = (ms: number) => {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    return `${hours}h ${minutes}m`
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Bot className="w-16 h-16 text-indigo-400 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-400">Loading bot system...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Autonomous Bots</h1>
                <p className="text-xs text-slate-400">Self-healing AI infrastructure</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(dashboard?.status || 'stopped')}`}>
              {dashboard?.status || 'Stopped'}
            </span>
            <button onClick={fetchStatus} className="text-slate-400 hover:text-white">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Control Panel */}
        <div className="card-glass p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Bot Control Center</h2>
              <p className="text-sm text-slate-400">Manage autonomous AI operations</p>
            </div>
            
            <div className="flex items-center gap-3">
              {dashboard?.status === 'operational' ? (
                <button 
                  onClick={() => sendAction('stop')}
                  disabled={actionLoading}
                  className="btn-secondary flex items-center gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
                >
                  <Square className="w-4 h-4" />
                  Stop System
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => sendAction('start', { mode: 'supervised' })}
                    disabled={actionLoading}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Start Supervised
                  </button>
                  <button 
                    onClick={() => sendAction('start', { mode: 'autonomous' })}
                    disabled={actionLoading}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Start Autonomous
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mode Selector */}
          {dashboard?.status === 'operational' && (
            <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl">
              <span className="text-slate-400 text-sm">Mode:</span>
              {['autonomous', 'supervised', 'manual'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => sendAction('setMode', { mode })}
                  className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${
                    dashboard?.mode === mode
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {mode}
                </button>
              ))}
              
              <div className="ml-auto text-sm text-slate-400">
                Uptime: {formatUptime(dashboard?.uptime || 0)}
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Issues Detected', value: dashboard?.stats.issuesDetected || 0, icon: AlertTriangle, color: 'amber' },
            { label: 'Issues Resolved', value: dashboard?.stats.issuesResolved || 0, icon: CheckCircle, color: 'emerald' },
            { label: 'Auto Repairs', value: dashboard?.stats.autoRepairs || 0, icon: Zap, color: 'cyan' },
            { label: 'Pending Approvals', value: dashboard?.stats.pendingApprovals || 0, icon: Clock, color: 'purple' }
          ].map((stat, i) => (
            <div key={i} className="card-glass p-6">
              <div className="flex items-center justify-between mb-4">
                <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
              </div>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
              <p className="text-slate-400 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Bots Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {bots.map((bot) => (
            <div key={bot.id} className="card-glass p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    bot.status === 'active' ? 'bg-emerald-500/20' :
                    bot.status === 'error' ? 'bg-red-500/20' : 'bg-slate-500/20'
                  }`}>
                    <Bot className={`w-5 h-5 ${
                      bot.status === 'active' ? 'text-emerald-400' :
                      bot.status === 'error' ? 'text-red-400' : 'text-slate-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{bot.name}</h3>
                    <p className="text-xs text-slate-400 capitalize">{bot.status}</p>
                  </div>
                </div>
                
                <div className={`w-3 h-3 rounded-full ${
                  bot.status === 'active' ? 'bg-emerald-400 animate-pulse' :
                  bot.status === 'error' ? 'bg-red-400' : 'bg-slate-500'
                }`} />
              </div>
              
              {bot.lastActivity && (
                <p className="text-xs text-slate-500">
                  Last activity: {new Date(bot.lastActivity).toLocaleTimeString()}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Services Status */}
        <div className="card-glass p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Monitored Services</h3>
          <div className="space-y-3">
            {dashboard?.services.map((service, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-slate-400" />
                  <span className="text-white">{service.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-slate-400 text-sm">{service.latency}ms</span>
                  <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(service.status)}`}>
                    {service.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Issues */}
          <div className="card-glass p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Issues</h3>
            {dashboard?.recentIssues.length === 0 ? (
              <p className="text-slate-400 text-sm">No recent issues detected</p>
            ) : (
              <div className="space-y-3">
                {dashboard?.recentIssues.map((issue: any, i: number) => (
                  <div key={i} className="p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">{issue.service}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        issue.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                        issue.severity === 'high' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {issue.severity}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs truncate">{issue.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Decisions */}
          <div className="card-glass p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Bot Decisions</h3>
            {dashboard?.recentDecisions.length === 0 ? (
              <p className="text-slate-400 text-sm">No decisions made yet</p>
            ) : (
              <div className="space-y-3">
                {dashboard?.recentDecisions.map((decision: any, i: number) => (
                  <div key={i} className="p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium truncate flex-1">
                        {decision.action.split(':')[0]}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        decision.approved ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {decision.approved ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs">
                      Confidence: {Math.round(decision.confidence * 100)}%
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pending Approvals */}
        {(dashboard?.stats.pendingApprovals || 0) > 0 && (
          <div className="card-glass p-6 mt-8 border border-amber-500/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
                <h3 className="text-lg font-semibold text-white">Pending Approvals</h3>
              </div>
              <button 
                onClick={() => sendAction('approveAll')}
                className="btn-primary text-sm py-2"
              >
                <Check className="w-4 h-4 mr-2 inline" />
                Approve All
              </button>
            </div>
            <p className="text-slate-400 text-sm">
              {dashboard?.stats.pendingApprovals} action(s) waiting for approval
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

