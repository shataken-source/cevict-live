"use client"

import { useState, useEffect, useCallback } from "react"
import { SignalTable } from "@/components/dashboard/SignalTable"
import { FilterPanel } from "@/components/dashboard/FilterPanel"
import { StatCard } from "@/components/dashboard/StatCard"
import { getSignals, type Signal } from "@/app/dashboard/actions"
import { TrendingUp, Filter, Download, Loader2 } from "lucide-react"

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [synced, setSynced] = useState(false)

  const [filters, setFilters] = useState({
    platform: "all" as string,
    confidence: [] as string[],
    minEdge: 0,
  })

  const syncSignals = useCallback(async () => {
    try {
      await fetch("/api/signals/sync", { cache: "no-store" })
      setSynced(true)
    } catch {
      // Non-critical — signals table may already have data
    }
  }, [])

  const fetchSignals = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { signals: data, error: err } = await getSignals({
      platform: filters.platform === "all" ? undefined : filters.platform,
      confidence: filters.confidence.length > 0 ? filters.confidence : undefined,
      minEdge: filters.minEdge > 0 ? filters.minEdge : undefined,
      limit: 50
    })

    if (err) {
      setError(err)
    } else {
      setSignals(data)
    }

    setLoading(false)
  }, [filters])

  // Sync live data on mount, then fetch
  useEffect(() => {
    syncSignals().then(() => fetchSignals())
  }, [syncSignals, fetchSignals])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      await syncSignals()
      await fetchSignals()
    }, 30000)
    return () => clearInterval(interval)
  }, [syncSignals, fetchSignals])

  const activeSignals = signals.filter(s => s.status === "active" && s.edge > 0)
  const highConfidenceSignals = activeSignals.filter(s => s.confidence === "HIGH")
  const avgEdge = activeSignals.length > 0
    ? activeSignals.reduce((sum, s) => sum + s.edge, 0) / activeSignals.length
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">Signal Feed</h1>
          <p className="text-text-secondary mt-1">
            Real-time probability edge across prediction markets
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => { await syncSignals(); await fetchSignals() }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-panel border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Signals"
          value={String(activeSignals.length)}
          trend={`${signals.filter(s => s.status === "active").length} total`}
        />
        <StatCard
          title="Avg Edge"
          value={`+${(avgEdge * 100).toFixed(1)}%`}
          positive
          trend="Last 24h"
        />
        <StatCard
          title="High Confidence"
          value={String(highConfidenceSignals.length)}
          trend="Updated now"
        />
        <StatCard
          title="Your Win Rate"
          value="64.2%"
          positive
          trend="30D trailing"
        />
      </div>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Filter Sidebar */}
        <div className="w-64 shrink-0">
          <FilterPanel
            filters={filters}
            onChange={setFilters}
          />
        </div>

        {/* Signal Table */}
        <div className="flex-1">
          {error ? (
            <div className="bg-panel border border-border rounded-xl p-12 text-center">
              <p className="text-danger mb-4">{error}</p>
              <button
                onClick={async () => { await syncSignals(); await fetchSignals() }}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition"
              >
                Retry
              </button>
            </div>
          ) : (
            <SignalTable
              initialSignals={signals}
              filters={filters}
            />
          )}
        </div>
      </div>
    </div>
  )
}
