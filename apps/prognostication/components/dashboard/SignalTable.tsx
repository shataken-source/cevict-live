"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronDown, ChevronUp, ArrowUpDown, Filter, Copy, Bell, Bookmark, Loader2 } from "lucide-react"
import { getSignals, type Signal } from "@/app/dashboard/actions"

interface SignalTableProps {
  initialSignals?: Signal[]
  filters?: {
    platform?: string
    confidence?: string[]
    minEdge?: number
    limit?: number
  }
}

export function SignalTable({ initialSignals = [], filters }: SignalTableProps) {
  const [signals, setSignals] = useState<Signal[]>(initialSignals)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sortColumn, setSortColumn] = useState<keyof Signal>("edge")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [loading, setLoading] = useState(initialSignals.length === 0)
  const [error, setError] = useState<string | null>(null)

  const fetchSignals = useCallback(async () => {
    if (initialSignals.length > 0 && !filters) return

    setLoading(true)
    setError(null)

    const { signals: data, error: err } = await getSignals({
      platform: filters?.platform,
      confidence: filters?.confidence,
      minEdge: filters?.minEdge,
      limit: filters?.limit || 50
    })

    if (err) {
      setError(err)
    } else {
      setSignals(data)
    }

    setLoading(false)
  }, [filters, initialSignals.length])

  useEffect(() => {
    fetchSignals()
  }, [fetchSignals])

  useEffect(() => {
    const interval = setInterval(fetchSignals, 30000)
    return () => clearInterval(interval)
  }, [fetchSignals])

  const handleSort = (column: keyof Signal) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("desc")
    }
  }

  const sortedSignals = [...signals].sort((a, b) => {
    const aVal = a[sortColumn]
    const bVal = b[sortColumn]
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal
    }
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDirection === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    }
    return 0
  })

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  if (loading && signals.length === 0) {
    return (
      <div className="bg-panel border border-border rounded-xl p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-text-muted">Loading signals...</p>
      </div>
    )
  }

  if (error && signals.length === 0) {
    return (
      <div className="bg-panel border border-border rounded-xl p-12 text-center">
        <p className="text-danger mb-4">Failed to load signals</p>
        <button
          onClick={fetchSignals}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition"
        >
          Retry
        </button>
      </div>
    )
  }

  const getEdgeStyle = (edge: number) => {
    if (edge >= 0.05) return "text-success font-semibold bg-success/10 px-2 py-1 rounded"
    if (edge >= 0.02) return "text-success/80 px-2 py-1"
    return "text-text-muted px-2 py-1"
  }

  const getConfidenceBadge = (confidence: string) => {
    const styles = {
      HIGH: "bg-success/20 text-success",
      MEDIUM: "bg-warning/20 text-warning",
      LOW: "bg-text-muted/20 text-text-muted"
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${styles[confidence as keyof typeof styles]}`}>
        {confidence}
      </span>
    )
  }

  return (
    <div className="bg-panel border border-border rounded-xl overflow-hidden">
      {/* Table Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-surface">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-text-primary">Live Signal Feed</h3>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-text-muted" />}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSignals}
            className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary transition"
          >
            <Filter size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead className="bg-surface text-text-muted">
          <tr>
            <th
              className="p-4 text-left cursor-pointer hover:text-text-primary transition"
              onClick={() => handleSort("market")}
            >
              <div className="flex items-center gap-1">
                Market
                <ArrowUpDown size={14} />
              </div>
            </th>
            <th className="p-4 text-left">Platform</th>
            <th className="p-4 text-left">Direction</th>
            <th
              className="p-4 text-left cursor-pointer hover:text-text-primary transition"
              onClick={() => handleSort("market_prob")}
            >
              <div className="flex items-center gap-1">
                Market %
                <ArrowUpDown size={14} />
              </div>
            </th>
            <th
              className="p-4 text-left cursor-pointer hover:text-text-primary transition"
              onClick={() => handleSort("model_prob")}
            >
              <div className="flex items-center gap-1">
                Model %
                <ArrowUpDown size={14} />
              </div>
            </th>
            <th
              className="p-4 text-left cursor-pointer hover:text-text-primary transition"
              onClick={() => handleSort("edge")}
            >
              <div className="flex items-center gap-1">
                Edge
                <ArrowUpDown size={14} />
              </div>
            </th>
            <th className="p-4 text-left">Confidence</th>
            <th className="p-4 text-left">Liquidity</th>
            <th className="p-4 text-left">Released</th>
          </tr>
        </thead>
        <tbody>
          {sortedSignals.length === 0 ? (
            <tr>
              <td colSpan={9} className="p-12 text-center text-text-muted">
                No signals found. Try adjusting your filters.
              </td>
            </tr>
          ) : (
            sortedSignals.map((signal) => (
              <>
                <tr
                  key={signal.id}
                  className="border-t border-border hover:bg-surface/50 transition cursor-pointer"
                  onClick={() => setExpandedId(expandedId === signal.id ? null : signal.id)}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">{signal.market}</span>
                      {expandedId === signal.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </td>
                  <td className="p-4 text-text-secondary">{signal.platform}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded ${signal.direction === "YES" ? "bg-success/20 text-success" : "bg-danger/20 text-danger"}`}>
                      {signal.direction}
                    </span>
                  </td>
                  <td className="p-4 text-text-secondary">{(signal.market_prob * 100).toFixed(0)}%</td>
                  <td className="p-4 text-text-primary font-medium">{(signal.model_prob * 100).toFixed(0)}%</td>
                  <td className="p-4">
                    <span className={getEdgeStyle(signal.edge)}>
                      {signal.edge > 0 ? "+" : ""}{(signal.edge * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-4">{getConfidenceBadge(signal.confidence)}</td>
                  <td className="p-4 text-text-secondary">{signal.liquidity}</td>
                  <td className="p-4 text-text-muted text-xs">{formatTimeAgo(signal.released_at)}</td>
                </tr>

                {expandedId === signal.id && (
                  <tr>
                    <td colSpan={9} className="p-0">
                      <div className="bg-surface/50 border-t border-border p-6">
                        <div className="grid md:grid-cols-3 gap-6">
                          {/* Core Metrics */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-text-primary">Signal Details</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-text-muted">Signal ID</span>
                                <span className="text-text-primary font-mono">{signal.id}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-text-muted">Platform</span>
                                <span className="text-text-primary">{signal.platform}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-text-muted">Timeframe</span>
                                <span className="text-text-primary">{signal.timeframe}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-text-muted">Released</span>
                                <span className="text-text-primary">{formatTimeAgo(signal.released_at)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Audit Trail */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-text-primary">Audit Trail</h4>
                            <div className="bg-panel border border-border rounded-lg p-3">
                              <div className="text-xs text-text-muted mb-1">Immutable Hash</div>
                              <div className="font-mono text-sm text-text-primary flex items-center gap-2">
                                {signal.audit_hash}
                                <button
                                  title="Copy hash"
                                  className="text-text-muted hover:text-text-primary"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigator.clipboard.writeText(signal.audit_hash)
                                  }}
                                >
                                  <Copy size={14} />
                                </button>
                              </div>
                              <p className="text-xs text-text-muted mt-2">
                                Signals are logged immutably at release
                              </p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-text-primary">Actions</h4>
                            <div className="space-y-2">
                              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition">
                                <Bookmark size={16} />
                                Add to Watchlist
                              </button>
                              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-surface border border-border text-text-primary rounded-lg hover:border-primary transition">
                                <Bell size={16} />
                                Set Alert
                              </button>
                              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-surface border border-border text-text-secondary rounded-lg hover:border-primary transition text-xs">
                                Export Signal (CSV/JSON)
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Risk Warning */}
                        <div className="mt-6 p-4 bg-warning/10 border border-warning/30 rounded-lg">
                          <p className="text-sm text-warning">
                            <strong>Correlation Warning:</strong> This signal is highly correlated with 2 open NFL futures positions.
                            Consider exposure limits before sizing.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
