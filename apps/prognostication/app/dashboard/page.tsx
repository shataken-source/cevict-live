"use client"

import { useState, useEffect } from "react"
import { StatCard } from "@/components/dashboard/StatCard"
import { SignalTable } from "@/components/dashboard/SignalTable"
import { getDashboardStats } from "@/app/dashboard/actions"
import { TrendingUp, Filter, Download, ArrowRight, Activity, Loader2 } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const [stats, setStats] = useState({
    winRate: 0.638,
    activeEdges: 14,
    avgEV: 0.082,
    arbOpportunities: 3,
    signalsToday: 142
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const { stats: data } = await getDashboardStats()
      setStats(data)
      setLoading(false)
    }
    fetchStats()
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-text-primary">Market Overview</h1>
        <p className="text-text-secondary mt-2">
          Real-time probability edge across prediction markets
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Win Rate (30D)"
          value={`${(stats.winRate * 100).toFixed(1)}%`}
          positive
          trend="+2.3% vs last month"
        />
        <StatCard
          title="Active Edges"
          value={String(stats.activeEdges)}
          trend="3 high confidence"
        />
        <StatCard
          title="Average EV"
          value={`+${(stats.avgEV * 100).toFixed(1)}%`}
          positive
          trend="Per signal"
        />
        <StatCard
          title="Arb Opportunities"
          value={String(stats.arbOpportunities)}
          trend="Cross-platform"
        />
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/signals"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition"
        >
          <TrendingUp size={16} />
          View All Signals
        </Link>
        <Link
          href="/dashboard/markets"
          className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-text-primary rounded-lg text-sm hover:border-primary transition"
        >
          <Activity size={16} />
          Market Scanner
        </Link>
        <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-text-secondary rounded-lg text-sm hover:border-primary transition">
          <Filter size={16} />
          Filter View
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-text-secondary rounded-lg text-sm hover:border-primary transition ml-auto">
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Signal Feed */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-primary" size={24} />
            <h2 className="text-xl font-semibold text-text-primary">Recent Signals</h2>
            <span className="text-sm text-text-muted">(5 of 142 today)</span>
          </div>
          <Link
            href="/dashboard/signals"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View All
            <ArrowRight size={14} />
          </Link>
        </div>
        <SignalTable />
      </div>

      {/* Fund Teaser */}
      <div className="bg-panel border border-border rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
              <TrendingUp size={24} className="text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">Interested in managed strategies?</h3>
              <p className="text-text-secondary text-sm mt-1">
                Our fund offers early signal access, auto-execution, and institutional-grade risk management.
              </p>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="text-text-muted">$52.1M AUM</span>
                <span className="text-text-muted">•</span>
                <span className="text-success">+27.4% YTD</span>
                <span className="text-text-muted">•</span>
                <span className="text-text-muted">2.1 Sharpe</span>
              </div>
            </div>
          </div>
          <Link
            href="/dashboard/fund"
            className="px-4 py-2 bg-surface border border-border text-text-primary rounded-lg hover:border-primary transition"
          >
            Learn More
          </Link>
        </div>
      </div>
    </div>
  )
}
