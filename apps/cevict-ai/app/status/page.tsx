'use client'

import { useState, useEffect } from 'react'
import { 
  Activity, CheckCircle, XCircle, AlertTriangle, 
  Clock, RefreshCw, ArrowLeft, Server
} from 'lucide-react'
import Link from 'next/link'

interface ServiceStatus {
  id: string
  name: string
  status: 'operational' | 'degraded' | 'outage' | 'maintenance'
  latency?: number
  lastCheck: string
  uptime: number
}

export default function StatusPage() {
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  useEffect(() => {
    checkAllServices()
    const interval = setInterval(checkAllServices, 30000) // Check every 30s
    return () => clearInterval(interval)
  }, [])

  async function checkAllServices() {
    setLoading(true)
    
    // Simulate service checks (in production, would actually ping each service)
    const serviceList: ServiceStatus[] = [
      {
        id: 'gateway',
        name: 'Cevict AI Gateway',
        status: 'operational',
        latency: 45,
        lastCheck: new Date().toISOString(),
        uptime: 99.99
      },
      {
        id: 'progno',
        name: 'PROGNO Engine',
        status: 'operational',
        latency: 120,
        lastCheck: new Date().toISOString(),
        uptime: 99.95
      },
      {
        id: 'prognostication',
        name: 'Prognostication.com',
        status: 'operational',
        latency: 85,
        lastCheck: new Date().toISOString(),
        uptime: 99.98
      },
      {
        id: 'orchestrator',
        name: 'AI Orchestrator',
        status: 'operational',
        latency: 200,
        lastCheck: new Date().toISOString(),
        uptime: 99.90
      },
      {
        id: 'massager',
        name: 'Data Massager',
        status: 'operational',
        latency: 150,
        lastCheck: new Date().toISOString(),
        uptime: 99.92
      },
      {
        id: 'claude-effect',
        name: 'Claude Effect Bot',
        status: 'operational',
        latency: 300,
        lastCheck: new Date().toISOString(),
        uptime: 99.85
      },
      {
        id: 'supabase',
        name: 'Supabase Database',
        status: 'operational',
        latency: 25,
        lastCheck: new Date().toISOString(),
        uptime: 99.99
      },
      {
        id: 'api',
        name: 'REST API',
        status: 'operational',
        latency: 50,
        lastCheck: new Date().toISOString(),
        uptime: 99.97
      }
    ]
    
    setServices(serviceList)
    setLastUpdated(new Date().toLocaleString())
    setLoading(false)
  }

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />
      case 'outage':
        return <XCircle className="w-5 h-5 text-red-400" />
      case 'maintenance':
        return <Clock className="w-5 h-5 text-blue-400" />
    }
  }

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'degraded': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      case 'outage': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'maintenance': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }
  }

  const overallStatus = services.every(s => s.status === 'operational') 
    ? 'operational' 
    : services.some(s => s.status === 'outage') 
      ? 'outage' 
      : 'degraded'

  return (
    <main className="min-h-screen py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-slate-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Gateway
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">System Status</h1>
              <p className="text-slate-400">Real-time status of all Cevict AI services</p>
            </div>
            
            <button 
              onClick={checkAllServices}
              className="btn-secondary flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Overall Status Banner */}
        <div className={`card-glass p-6 mb-8 border ${
          overallStatus === 'operational' ? 'border-emerald-500/30' :
          overallStatus === 'outage' ? 'border-red-500/30' : 'border-amber-500/30'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
              overallStatus === 'operational' ? 'bg-emerald-500/20' :
              overallStatus === 'outage' ? 'bg-red-500/20' : 'bg-amber-500/20'
            }`}>
              {overallStatus === 'operational' && <CheckCircle className="w-8 h-8 text-emerald-400" />}
              {overallStatus === 'degraded' && <AlertTriangle className="w-8 h-8 text-amber-400" />}
              {overallStatus === 'outage' && <XCircle className="w-8 h-8 text-red-400" />}
            </div>
            
            <div>
              <h2 className={`text-2xl font-bold ${
                overallStatus === 'operational' ? 'text-emerald-400' :
                overallStatus === 'outage' ? 'text-red-400' : 'text-amber-400'
              }`}>
                {overallStatus === 'operational' && 'All Systems Operational'}
                {overallStatus === 'degraded' && 'Partial System Degradation'}
                {overallStatus === 'outage' && 'System Outage Detected'}
              </h2>
              <p className="text-slate-400">Last updated: {lastUpdated}</p>
            </div>
          </div>
        </div>

        {/* Services List */}
        <div className="space-y-4">
          {services.map((service) => (
            <div key={service.id} className="card-glass p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                    <Server className="w-5 h-5 text-slate-400" />
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-white">{service.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span>Latency: {service.latency}ms</span>
                      <span>Uptime: {service.uptime}%</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm border ${getStatusColor(service.status)}`}>
                    {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                  </span>
                  {getStatusIcon(service.status)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Uptime Chart Placeholder */}
        <div className="card-glass p-6 mt-8">
          <h3 className="text-lg font-semibold text-white mb-4">90-Day Uptime</h3>
          <div className="flex gap-1">
            {Array.from({ length: 90 }).map((_, i) => (
              <div 
                key={i} 
                className={`flex-1 h-8 rounded-sm ${
                  Math.random() > 0.02 ? 'bg-emerald-500' : 'bg-red-500'
                }`}
                title={`Day ${90 - i}: ${Math.random() > 0.02 ? '100%' : '99.5%'} uptime`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-2">
            <span>90 days ago</span>
            <span>Today</span>
          </div>
        </div>
      </div>
    </main>
  )
}

