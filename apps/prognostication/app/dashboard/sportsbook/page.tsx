"use client"

import { useState, useEffect } from "react"
import { StatCard } from "@/components/dashboard/StatCard"
import { Activity, TrendingUp, Filter, Calendar, Trophy, AlertCircle } from "lucide-react"
import Link from "next/link"

interface PrognoPick {
  gameId: string
  game: string
  sport: string
  league?: string
  homeTeam?: string
  awayTeam?: string
  pick: string
  confidencePct: number
  edgePct: number
  kickoff?: string
  keyFactors?: string[]
  rationale?: string
  predictedScore?: {
    home: number
    away: number
  }
  isKalshi?: boolean
  kalshiMarket?: {
    ticker: string
    title: string
    probability: number
    volume: number
    lastPrice: number
  }
}

interface TieredPicks {
  free: PrognoPick[]
  pro: PrognoPick[]
  elite: PrognoPick[]
  total: number
  source: string
  timestamp: string
}

export default function SportsbookPage() {
  const [picks, setPicks] = useState<TieredPicks | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSport, setSelectedSport] = useState<string>("all")
  const [userTier, setUserTier] = useState<"free" | "pro" | "elite">("free")

  useEffect(() => {
    async function fetchPicks() {
      try {
        setLoading(true)

        // Get user's tier from session/local storage or API
        const tier = localStorage.getItem("userTier") as "free" | "pro" | "elite" || "free"
        setUserTier(tier)

        const response = await fetch("/api/picks/today", {
          cache: "no-store"
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch picks: ${response.status}`)
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || "Failed to load picks")
        }

        setPicks({
          free: data.free || [],
          pro: data.pro || [],
          elite: data.elite || [],
          total: data.total || 0,
          source: data.source || "progno",
          timestamp: data.timestamp
        })
      } catch (err) {
        console.error("Error fetching picks:", err)
        setError(err instanceof Error ? err.message : "Failed to load picks")
      } finally {
        setLoading(false)
      }
    }

    fetchPicks()

    // Auto-refresh every 5 minutes for live Progno picks
    const interval = setInterval(fetchPicks, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Get all available picks based on tier
  const getAvailablePicks = (): PrognoPick[] => {
    if (!picks) return []

    let availablePicks = [...picks.free]

    if (userTier === "pro" || userTier === "elite") {
      availablePicks = [...availablePicks, ...picks.pro]
    }

    if (userTier === "elite") {
      availablePicks = [...availablePicks, ...picks.elite]
    }

    // Filter by selected sport
    if (selectedSport !== "all") {
      availablePicks = availablePicks.filter(p =>
        p.sport?.toLowerCase() === selectedSport.toLowerCase()
      )
    }

    return availablePicks
  }

  const availablePicks = getAvailablePicks()

  // Get unique sports for filter
  const sports = picks ?
    [...new Set([...picks.free, ...picks.pro, ...picks.elite].map(p => p.sport))].filter(Boolean) :
    []

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return { label: "HIGH", class: "bg-success/20 text-success" }
    if (confidence >= 65) return { label: "MEDIUM", class: "bg-warning/20 text-warning" }
    return { label: "LOW", class: "bg-text-muted/20 text-text-muted" }
  }

  const getEdgeStyle = (edge: number) => {
    if (edge >= 8) return "text-success font-semibold bg-success/10 px-2 py-1 rounded"
    if (edge >= 4) return "text-success/80 px-2 py-1"
    return "text-text-muted px-2 py-1"
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">Sportsbook</h1>
          <p className="text-text-secondary mt-2">
            AI-powered probability picks from Progno engine
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
            className="px-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary"
            title="Filter by sport"
          >
            <option value="all">All Sports</option>
            {sports.map(sport => (
              <option key={sport} value={sport}>{sport}</option>
            ))}
          </select>
          <Link
            href="/docs/USER_GUIDE_SPORTS_PROBABILITIES.md"
            className="px-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary transition flex items-center gap-2"
          >
            <AlertCircle size={16} />
            How It Works
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Available Picks"
          value={String(availablePicks.length)}
          trend={`${picks?.total || 0} total analyzed`}
        />
        <StatCard
          title="Avg Edge"
          value={availablePicks.length > 0
            ? `+${(availablePicks.reduce((sum, p) => sum + p.edgePct, 0) / availablePicks.length).toFixed(1)}%`
            : "0%"
          }
          positive
          trend="Expected value"
        />
        <StatCard
          title="High Confidence"
          value={String(availablePicks.filter(p => p.confidencePct >= 80).length)}
          trend="80%+ confidence"
        />
        <StatCard
          title="Data Source"
          value={loading ? "Loading..." : error ? "Error" : picks?.source ? picks.source.charAt(0).toUpperCase() + picks.source.slice(1) : "Unknown"}
          trend={picks?.timestamp ? new Date(picks.timestamp).toLocaleTimeString() : "No data"}
        />
      </div>

      {/* Tier Info Banner */}
      <div className="bg-panel border border-border rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="text-accent" size={20} />
          <div>
            <span className="text-text-primary font-medium">
              Your Plan: {userTier.charAt(0).toUpperCase() + userTier.slice(1)}
            </span>
            <span className="text-text-secondary text-sm ml-2">
              {userTier === "free" && "2 picks/day • Upgrade for more"}
              {userTier === "pro" && "5 picks/day • Includes analysis"}
              {userTier === "elite" && "Unlimited • Early access + backtests"}
            </span>
          </div>
        </div>
        {userTier !== "elite" && (
          <Link
            href="/pricing"
            className="text-sm text-primary hover:underline"
          >
            Upgrade
          </Link>
        )}
      </div>

      {/* Picks Table */}
      <div className="bg-panel border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-text-muted" />
            <h3 className="font-semibold text-text-primary">Today&apos;s Probability Picks</h3>
          </div>
          {loading && (
            <span className="text-sm text-text-muted">Updating...</span>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-text-muted">Loading picks from Progno...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
            <p className="text-danger mb-2">Failed to load picks</p>
            <p className="text-text-muted text-sm mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition"
            >
              Retry
            </button>
          </div>
        ) : availablePicks.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <p className="text-text-muted">No picks available for selected filters</p>
            {userTier === "free" && (
              <p className="text-sm text-text-secondary mt-2">
                Free tier limited to 2 picks/day.
                <Link href="/pricing" className="text-primary hover:underline ml-1">Upgrade for more</Link>
              </p>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface text-text-muted">
              <tr>
                <th className="p-4 text-left">Game</th>
                <th className="p-4 text-left">Sport</th>
                <th className="p-4 text-left">Pick</th>
                <th className="p-4 text-left">Confidence</th>
                <th className="p-4 text-left">Edge</th>
                <th className="p-4 text-left">Analysis</th>
              </tr>
            </thead>
            <tbody>
              {availablePicks.map((pick) => {
                const confidenceBadge = getConfidenceBadge(pick.confidencePct)
                return (
                  <tr
                    key={pick.gameId}
                    className="border-t border-border hover:bg-surface/50 transition"
                  >
                    <td className="p-4">
                      <div className="font-medium text-text-primary">{pick.game}</div>
                      {pick.kickoff && (
                        <div className="text-xs text-text-muted flex items-center gap-1 mt-1">
                          <Calendar size={12} />
                          {new Date(pick.kickoff).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-surface rounded text-xs text-text-secondary">
                        {pick.sport}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-text-primary">{pick.pick}</span>
                      {pick.predictedScore && (
                        <div className="text-xs text-text-muted mt-1">
                          Predicted: {pick.predictedScore.away}-{pick.predictedScore.home}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${confidenceBadge.class}`}>
                        {confidenceBadge.label} ({pick.confidencePct}%)
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={getEdgeStyle(pick.edgePct)}>
                        +{pick.edgePct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-4">
                      {pick.keyFactors && pick.keyFactors.length > 0 ? (
                        <ul className="text-xs text-text-secondary space-y-1">
                          {pick.keyFactors.slice(0, 2).map((factor, idx) => (
                            <li key={idx}>• {factor}</li>
                          ))}
                        </ul>
                      ) : pick.rationale ? (
                        <p className="text-xs text-text-secondary line-clamp-2">
                          {pick.rationale}
                        </p>
                      ) : (
                        <span className="text-xs text-text-muted">No analysis available</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Kalshi Integration Notice */}
      {availablePicks.some(p => p.isKalshi) && (
        <div className="bg-accent/10 border border-accent/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="text-accent mt-0.5" size={18} />
            <div>
              <h4 className="font-medium text-text-primary">Kalshi Markets Available</h4>
              <p className="text-sm text-text-secondary mt-1">
                Some picks have corresponding Kalshi prediction markets. Look for the Kalshi icon to trade directly on regulated prediction markets.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Data Pipeline Info */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <h4 className="font-medium text-text-primary mb-2">Data Pipeline Status</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${picks?.source === "live" ? "bg-success" : picks?.source === "database" ? "bg-primary" : picks?.source === "mock" ? "bg-warning" : "bg-danger"}`} />
            <span className="text-text-secondary">Data Source:</span>
            <span className={picks?.source === "live" ? "text-success" : picks?.source === "database" ? "text-primary" : picks?.source === "mock" ? "text-warning" : "text-danger"}>
              {picks?.source === "live" ? "Live API" : picks?.source === "database" ? "Database" : picks?.source === "mock" ? "Mock Data" : error ? "Error" : "Unknown"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-text-secondary">Last Update:</span>
            <span className="text-text-primary">
              {picks?.timestamp ? new Date(picks.timestamp).toLocaleTimeString() : "Never"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-text-secondary">Auto-Refresh:</span>
            <span className="text-success">Every 60s</span>
          </div>
        </div>
      </div>
    </div>
  )
}

