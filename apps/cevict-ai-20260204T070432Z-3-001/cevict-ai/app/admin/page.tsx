'use client'

import { useState, useEffect } from 'react'
import { 
  Shield, Settings, Users, Activity, Database,
  ArrowLeft, Lock, Eye, EyeOff, RefreshCw,
  Server, Cpu, HardDrive, Wifi
} from 'lucide-react'
import Link from 'next/link'

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Simple auth - in production use proper authentication
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD || password === 'Admin2025!') {
      setIsAuthenticated(true)
      setError('')
    } else {
      setError('Invalid password')
    }
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="card-glass p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Admin Access</h1>
            <p className="text-slate-400">Enter your credentials to continue</p>
          </div>
          
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:outline-none"
                  placeholder="Enter admin password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {error && (
              <p className="text-red-400 text-sm mb-4">{error}</p>
            )}
            
            <button type="submit" className="btn-primary w-full">
              <Lock className="w-4 h-4 mr-2 inline" />
              Unlock Dashboard
            </button>
          </form>
          
          <Link href="/" className="block text-center text-slate-400 hover:text-white mt-4 text-sm">
            ← Back to Gateway
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      {/* Admin Header */}
      <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-xs text-slate-400">Cevict AI Management</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-emerald-400 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" /> Live
            </span>
            <button 
              onClick={() => setIsAuthenticated(false)}
              className="text-slate-400 hover:text-white text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[
            { icon: Users, label: 'Active Users', value: '1,234', change: '+12%' },
            { icon: Activity, label: 'API Requests', value: '45.2K', change: '+8%' },
            { icon: Database, label: 'Data Points', value: '2.1M', change: '+15%' },
            { icon: Cpu, label: 'Predictions', value: '8,456', change: '+22%' }
          ].map((stat, i) => (
            <div key={i} className="card-glass p-6">
              <div className="flex items-center justify-between mb-4">
                <stat.icon className="w-6 h-6 text-indigo-400" />
                <span className="text-emerald-400 text-sm">{stat.change}</span>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-slate-400 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-white/10 pb-4">
          {['overview', 'projects', 'users', 'logs', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                activeTab === tab 
                  ? 'bg-indigo-500 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* System Health */}
            <div className="card-glass p-6">
              <h3 className="text-lg font-semibold text-white mb-4">System Health</h3>
              <div className="space-y-4">
                {[
                  { label: 'CPU Usage', value: 45, icon: Cpu },
                  { label: 'Memory', value: 62, icon: HardDrive },
                  { label: 'Network', value: 28, icon: Wifi },
                  { label: 'Storage', value: 71, icon: Server }
                ].map((metric, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400 flex items-center gap-2">
                        <metric.icon className="w-4 h-4" />
                        {metric.label}
                      </span>
                      <span className="text-white">{metric.value}%</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          metric.value > 80 ? 'bg-red-500' :
                          metric.value > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${metric.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card-glass p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {[
                  { action: 'New prediction generated', project: 'PROGNO', time: '2 min ago' },
                  { action: 'Arbitrage found', project: 'Massager', time: '5 min ago' },
                  { action: 'Bot training completed', project: 'Claude Effect', time: '12 min ago' },
                  { action: 'User signup', project: 'Prognostication', time: '18 min ago' },
                  { action: 'Task orchestrated', project: 'Orchestrator', time: '25 min ago' }
                ].map((activity, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-white text-sm">{activity.action}</p>
                      <p className="text-slate-400 text-xs">{activity.project}</p>
                    </div>
                    <span className="text-slate-500 text-xs">{activity.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="card-glass p-6">
            <h3 className="text-lg font-semibold text-white mb-4">AI Projects Management</h3>
            <div className="space-y-4">
              {[
                { name: 'PROGNO', status: 'live', requests: '12.3K', errors: 2 },
                { name: 'Prognostication', status: 'live', requests: '8.7K', errors: 0 },
                { name: 'AI Orchestrator', status: 'live', requests: '4.2K', errors: 1 },
                { name: 'Data Massager', status: 'live', requests: '2.8K', errors: 0 },
                { name: 'Claude Effect', status: 'beta', requests: '1.5K', errors: 3 }
              ].map((project, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                      <Server className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{project.name}</p>
                      <p className="text-slate-400 text-sm">{project.requests} requests today</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {project.errors > 0 && (
                      <span className="text-red-400 text-sm">{project.errors} errors</span>
                    )}
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      project.status === 'live' 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {project.status}
                    </span>
                    <button className="text-slate-400 hover:text-white">
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="card-glass p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Environment Settings</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Environment</label>
                <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white">
                  <option>Production</option>
                  <option>Test</option>
                  <option>Development</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Rate Limit (requests/min)</label>
                <input 
                  type="number" 
                  defaultValue={100}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white">Debug Mode</p>
                  <p className="text-slate-400 text-sm">Enable verbose logging</p>
                </div>
                <button className="w-12 h-6 rounded-full bg-slate-700 relative">
                  <div className="w-5 h-5 rounded-full bg-slate-400 absolute left-0.5 top-0.5" />
                </button>
              </div>
              <button className="btn-primary">Save Changes</button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

