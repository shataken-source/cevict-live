'use client'

import { useState, useEffect } from 'react'
import { 
  Shield, Heart, AlertTriangle, Clock, 
  CheckCircle, XCircle, Send, RefreshCw,
  ArrowLeft, Bot, Phone, Mail
} from 'lucide-react'
import Link from 'next/link'

interface GuardianStatus {
  status: 'ACTIVE' | 'WARNING' | 'TRIGGERED'
  hours_since_checkin: number
  hours_remaining: number
  last_checkin: string
  timeout_hours: number
  handover_status: string
  anai_active: boolean
}

export default function GuardianPage() {
  const [guardian, setGuardian] = useState<GuardianStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/guardian')
      const data = await res.json()
      setGuardian(data.guardian)
    } catch (error) {
      console.error('Failed to fetch guardian status:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendAction = async (action: string) => {
    setActionLoading(true)
    try {
      const res = await fetch('/api/guardian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
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
    const interval = setInterval(fetchStatus, 30000) // Update every 30s
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30'
      case 'WARNING': return 'text-amber-400 bg-amber-500/20 border-amber-500/30'
      case 'TRIGGERED': return 'text-red-400 bg-red-500/20 border-red-500/30'
      default: return 'text-slate-400 bg-slate-500/20 border-slate-500/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <CheckCircle className="w-8 h-8 text-emerald-400" />
      case 'WARNING': return <AlertTriangle className="w-8 h-8 text-amber-400" />
      case 'TRIGGERED': return <XCircle className="w-8 h-8 text-red-400" />
      default: return <Clock className="w-8 h-8 text-slate-400" />
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Heart className="w-16 h-16 text-red-400 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-400">Loading Guardian Pulse...</p>
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Guardian Pulse</h1>
                <p className="text-xs text-slate-400">Dead Man's Switch</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {guardian && (
              <span className={`px-4 py-2 rounded-full text-sm border ${getStatusColor(guardian.status)}`}>
                {guardian.status}
              </span>
            )}
            <button onClick={fetchStatus} className="text-slate-400 hover:text-white">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Main Status Card */}
        <div className={`card-glass p-8 mb-8 border ${guardian ? getStatusColor(guardian.status) : ''}`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {guardian && getStatusIcon(guardian.status)}
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {guardian?.status === 'ACTIVE' && 'System Active'}
                  {guardian?.status === 'WARNING' && '⚠️ Warning - Check In Soon'}
                  {guardian?.status === 'TRIGGERED' && '🚨 HANDOVER TRIGGERED'}
                </h2>
                <p className="text-slate-400">
                  {guardian?.status === 'ACTIVE' && 'All systems operational. Owner is responsive.'}
                  {guardian?.status === 'WARNING' && 'Approaching timeout. Reply GOTIT to your SMS.'}
                  {guardian?.status === 'TRIGGERED' && 'Control has been transferred to Victoria & Navid.'}
                </p>
              </div>
            </div>
            
            <Heart className={`w-12 h-12 ${
              guardian?.status === 'ACTIVE' ? 'text-emerald-400 animate-pulse' :
              guardian?.status === 'WARNING' ? 'text-amber-400' : 'text-red-400'
            }`} />
          </div>

          {/* Timer Display */}
          {guardian && (
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                <p className="text-3xl font-bold text-white">
                  {guardian.hours_since_checkin.toFixed(1)}h
                </p>
                <p className="text-slate-400 text-sm">Since Last Check-in</p>
              </div>
              
              <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                <p className={`text-3xl font-bold ${
                  guardian.hours_remaining <= 6 ? 'text-red-400' :
                  guardian.hours_remaining <= 12 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {guardian.hours_remaining.toFixed(1)}h
                </p>
                <p className="text-slate-400 text-sm">Until Handover</p>
              </div>
              
              <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                <p className="text-3xl font-bold text-white">
                  {guardian.timeout_hours}h
                </p>
                <p className="text-slate-400 text-sm">Timeout Period</p>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {guardian && (
          <div className="card-glass p-6 mb-8">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Time Elapsed</span>
              <span className="text-white">
                {Math.min(100, (guardian.hours_since_checkin / guardian.timeout_hours) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  guardian.status === 'ACTIVE' ? 'bg-emerald-500' :
                  guardian.status === 'WARNING' ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ 
                  width: `${Math.min(100, (guardian.hours_since_checkin / guardian.timeout_hours) * 100)}%` 
                }}
              />
            </div>
            <div className="flex justify-between text-xs mt-2 text-slate-500">
              <span>Last Check-in: {new Date(guardian.last_checkin).toLocaleString()}</span>
              <span>Timeout: {guardian.timeout_hours}h</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="card-glass p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              Manual Check-in
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Reset the timer manually from this dashboard.
            </p>
            <button 
              onClick={() => sendAction('check_in')}
              disabled={actionLoading}
              className="btn-primary w-full"
            >
              {actionLoading ? 'Processing...' : 'Check In Now'}
            </button>
          </div>

          <div className="card-glass p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-cyan-400" />
              Send Test Heartbeat
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Send a test SMS to verify Sinch configuration.
            </p>
            <button 
              onClick={() => sendAction('test_sms')}
              disabled={actionLoading}
              className="btn-secondary w-full"
            >
              Send Test SMS
            </button>
          </div>
        </div>

        {/* Anai Status */}
        {guardian?.anai_active && (
          <div className="card-glass p-6 mb-8 border border-purple-500/30">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Bot className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-purple-400">Anai is Active</h3>
                <p className="text-slate-400 text-sm">
                  Anai is monitoring the system as interim controller.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Handover Recipients */}
        <div className="card-glass p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Handover Recipients</h3>
          <p className="text-slate-400 text-sm mb-4">
            These people will be notified if the handover is triggered:
          </p>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-800/50 rounded-xl">
              <p className="font-semibold text-white">Victoria</p>
              <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                <Mail className="w-4 h-4" />
                <span>victoria@cevict.com</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                <Phone className="w-4 h-4" />
                <span>Configured in .env</span>
              </div>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-xl">
              <p className="font-semibold text-white">Navid</p>
              <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                <Mail className="w-4 h-4" />
                <span>navid@cevict.com</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                <Phone className="w-4 h-4" />
                <span>Configured in .env</span>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="card-glass p-6 mt-8">
          <h3 className="text-lg font-semibold text-white mb-4">How Guardian Pulse Works</h3>
          <ol className="space-y-3 text-slate-400 text-sm">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">1</span>
              <span>System sends daily heartbeat SMS via Sinch</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">2</span>
              <span>Reply "GOTIT" to reset the 24-hour timer</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">3</span>
              <span>At 12 hours, warning SMS is sent</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">4</span>
              <span>If no response at 24 hours, Empire Handover triggers</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">5</span>
              <span>Victoria and Navid receive control access</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs">6</span>
              <span>Anai activates as interim AI controller</span>
            </li>
          </ol>
        </div>
      </div>
    </main>
  )
}

