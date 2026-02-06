'use client'

import { useEffect, useState } from 'react'
import { TradingStats, Trade } from '@/types/trading'
import { fetchTradingStats, fetchRecentTrades } from '@/lib/api'
import StatsCards from './StatsCards'
import TradingBubbles from './TradingBubbles'
import RecentTrades from './RecentTrades'
import PlatformBreakdown from './PlatformBreakdown'
import PerformanceChart from './PerformanceChart'
import CommandRunner from './CommandRunner'
import FileManager from './FileManager'
import QuickActions from './QuickActions'
import { RefreshCw } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState<TradingStats | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const loadData = async () => {
    try {
      const [statsData, tradesData] = await Promise.all([
        fetchTradingStats(),
        fetchRecentTrades(),
      ])
      // Ensure all nested values are defined
      const safeStats = {
        ...statsData,
        combined: {
          totalBalance: statsData?.combined?.totalBalance ?? 0,
          totalTrades: statsData?.combined?.totalTrades ?? 0,
          totalPnL: statsData?.combined?.totalPnL ?? 0,
          totalWins: statsData?.combined?.totalWins ?? 0,
          totalLosses: statsData?.combined?.totalLosses ?? 0,
          overallWinRate: statsData?.combined?.overallWinRate ?? 0,
        },
        coinbase: {
          balance: statsData?.coinbase?.balance ?? 0,
          totalTrades: statsData?.coinbase?.totalTrades ?? 0,
          wins: statsData?.coinbase?.wins ?? 0,
          losses: statsData?.coinbase?.losses ?? 0,
          buys: statsData?.coinbase?.buys ?? 0,
          sells: statsData?.coinbase?.sells ?? 0,
          totalPnL: statsData?.coinbase?.totalPnL ?? 0,
          winRate: statsData?.coinbase?.winRate ?? 0,
          openPositions: statsData?.coinbase?.openPositions ?? 0,
        },
        kalshi: {
          balance: statsData?.kalshi?.balance ?? 0,
          totalTrades: statsData?.kalshi?.totalTrades ?? 0,
          wins: statsData?.kalshi?.wins ?? 0,
          losses: statsData?.kalshi?.losses ?? 0,
          buys: statsData?.kalshi?.buys ?? 0,
          sells: statsData?.kalshi?.sells ?? 0,
          totalPnL: statsData?.kalshi?.totalPnL ?? 0,
          winRate: statsData?.kalshi?.winRate ?? 0,
          openPositions: statsData?.kalshi?.openPositions ?? 0,
        },
      }
      setStats(safeStats as any)
      setTrades(tradesData || [])
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Loading trading data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full filter blur-3xl animate-pulse animation-delay-2000"></div>
      </div>

      {/* Header */}
      <header className="border-b border-purple-900/30 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50 shadow-xl shadow-purple-900/20">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/50 animate-pulse">
                <span className="text-2xl">💎</span>
              </div>
              <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient">
                  Alpha Hunter Dashboard
                </h1>
                <p className="text-sm text-purple-300/80 mt-1 font-medium">
                  🚀 Kalshi • Coinbase • Micro-Cap • Real-time Intelligence
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {/* Live Indicator */}
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                <div className="w-2 h-2 bg-green-400 rounded-full absolute"></div>
                <span className="text-green-300 text-sm font-semibold ml-2">LIVE</span>
              </div>

              <div className="text-right">
                <p className="text-xs text-purple-400/80 font-medium">Last Update</p>
                <p className="text-sm font-mono text-purple-200 font-bold">
                  {lastUpdate.toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={loadData}
                className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70 hover:scale-105 transform"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 relative z-10">
        {/* Hero Banner */}
        <div className="mb-8 bg-gradient-to-r from-blue-900/30 via-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Total Portfolio Value</h2>
              <p className="text-5xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                ${stats.combined.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-purple-300 mb-1">Total P&L</p>
              <p className={`text-3xl font-bold ${stats.combined.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.combined.totalPnL >= 0 ? '+' : ''}{stats.combined.totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-purple-300 mt-2">Win Rate: {stats.combined.overallWinRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <StatsCards stats={stats} />

        {/* Trading Bubbles Visualization */}
        <div className="mt-8">
          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-900/30 rounded-2xl p-6 shadow-xl shadow-purple-900/20">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Live Trading Activity
            </h3>
            <TradingBubbles trades={trades} />
          </div>
        </div>

        {/* Platform Breakdown */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PlatformBreakdown stats={stats} />
          <PerformanceChart stats={stats} />
        </div>

        {/* Recent Trades */}
        <div className="mt-8">
          <RecentTrades trades={trades} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-900/30 mt-12 py-6 bg-slate-950/50 backdrop-blur-sm relative z-10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-purple-300/80">
            ⚡ Alpha Hunter Trading Dashboard • Auto-refresh every 5 seconds • 32 AI Agents Active
          </p>
          <p className="text-xs text-purple-400/60 mt-2">
            Powered by Claude AI • Real-time Market Intelligence
          </p>
        </div>
      </footer>

      {/* GUI Tools */}
      <CommandRunner />
      <FileManager />
      <QuickActions />
    </div>
  )
}

