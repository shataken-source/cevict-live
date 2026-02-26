"use client"

import { useState, useEffect } from "react"
import { StatCard } from "@/components/dashboard/StatCard"
import { SignalTable } from "@/components/dashboard/SignalTable"
import { getDashboardStats, getSignals, type Signal } from "@/app/dashboard/actions"
import { TrendingUp, Filter, Download, ArrowRight, Activity, Loader2 } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const [stats, setStats] = useState({
    winRate: 0,
    activeEdges: 0,
    avgEV: 0,
    arbOpportunities: 0,
    signalsToday: 0
  })
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      // Sync live data first
      try { await fetch("/api/signals/sync", { cache: "no-store" }) } catch {}

      const [{ stats: data }, { signals: sigs }] = await Promise.all([
        getDashboardStats(),
        getSignals({ limit: 5 }),
      ])
      setStats(data)
      setSignals(sigs)
      setLoading(false)
    }
    fetchData()
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-text-primary">Market Overview</h1>
        <p className="text-text-secondary mt-2">Real-time probability edge across prediction markets</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Win Rate (30D)"
              value={`${(stats.winRate * 100).toFixed(1)}%`}
              positive={stats.winRate > 0.5}
              trend="Resolved signals"
            />
            <StatCard
              title="Active Edges"
              value={String(stats.activeEdges)}
              trend={`${stats.signalsToday} today`}
            />
            <StatCard
              title="Average EV"
              value={`+${(stats.avgEV * 100).toFixed(1)}%`}
              positive={stats.avgEV > 0}
              trend="Per signal"
            />
            <StatCard
              title="Signals Today"
              value={String(stats.signalsToday)}
              trend="Auto-synced"
            />
          </div>

          <div className="flex items-center gap-4">
            <Link href="/dashboard/signals" className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition">
              <TrendingUp size={16} />
              View All Signals
            </Link>
            <Link href="/dashboard/markets" className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-text-primary rounded-lg text-sm hover:border-primary transition">
              <Activity size={16} />
              Market Scanner
            </Link>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="text-primary" size={24} />
                <h2 className="text-xl font-semibold text-text-primary">Recent Signals</h2>
                {signals.length > 0 && (
                  <span className="text-sm text-text-muted">({signals.length} shown)</span>
                )}
              </div>
              <Link href="/dashboard/signals" className="text-sm text-primary hover:underline flex items-center gap-1">
                View All <ArrowRight size={14} />
              </Link>
            </div>
            <SignalTable initialSignals={signals} />
          </div>

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
                </div>
              </div>
              <Link href="/dashboard/fund" className="px-4 py-2 bg-surface border border-border text-text-primary rounded-lg hover:border-primary transition">
                Learn More
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
