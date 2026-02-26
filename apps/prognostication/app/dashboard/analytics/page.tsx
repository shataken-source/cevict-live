"use client"

import { useState, useEffect } from "react"
import { TrendingUp, Target, Clock, AlertTriangle, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/server"
import { getSignals } from "@/app/dashboard/actions"

interface PerfRow {
  market: string
  edge: number
  status: string
  confidence: string
  platform: string
  released_at: string
}

export default function AnalyticsPage() {
  const [rows, setRows] = useState<PerfRow[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ followed: 0, winRate: 0, highConf: 0, missed: 0 })

  useEffect(() => {
    async function load() {
      setLoading(true)
      // Fetch all signals (active + resolved)
      const { signals } = await getSignals({ status: "active", limit: 50 })
      const { signals: resolved } = await getSignals({ status: "resolved", limit: 50 })
      const all = [...signals, ...resolved]

      const wins = resolved.filter(s => s.status === "resolved" && s.edge > 0).length
      const total = resolved.length || 1
      const highConf = signals.filter(s => s.confidence === "HIGH").length

      setStats({
        followed: all.length,
        winRate: total > 0 ? Math.round((wins / total) * 100 * 10) / 10 : 0,
        highConf,
        missed: 0,
      })

      setRows(all.slice(0, 10).map(s => ({
        market: s.market,
        edge: s.edge,
        status: s.status,
        confidence: s.confidence,
        platform: s.platform,
        released_at: s.released_at,
      })))
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-text-primary">Analytics</h1>
        <p className="text-text-secondary mt-1">Track your performance and signal effectiveness</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-panel border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={18} className="text-success" />
                <span className="text-sm text-text-muted">Signals Tracked</span>
              </div>
              <div className="text-3xl font-semibold text-text-primary">{stats.followed}</div>
              <div className="text-xs text-text-muted mt-1">Active + resolved</div>
            </div>
            <div className="bg-panel border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Target size={18} className="text-primary" />
                <span className="text-sm text-text-muted">Win Rate</span>
              </div>
              <div className="text-3xl font-semibold text-success">{stats.winRate}%</div>
              <div className="text-xs text-text-muted mt-1">Resolved signals</div>
            </div>
            <div className="bg-panel border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={18} className="text-accent" />
                <span className="text-sm text-text-muted">High Confidence</span>
              </div>
              <div className="text-3xl font-semibold text-text-primary">{stats.highConf}</div>
              <div className="text-xs text-text-muted mt-1">Active signals</div>
            </div>
            <div className="bg-panel border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={18} className="text-warning" />
                <span className="text-sm text-text-muted">Platforms</span>
              </div>
              <div className="text-3xl font-semibold text-text-primary">
                {new Set(rows.map(r => r.platform)).size}
              </div>
              <div className="text-xs text-text-muted mt-1">Active sources</div>
            </div>
          </div>

          <div className="bg-panel border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary">Recent Signal Performance</h3>
            </div>
            {rows.length === 0 ? (
              <div className="p-8 text-center text-text-muted">No signals yet. Data will appear as Alpha Hunter generates trades.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface text-text-muted">
                  <tr>
                    <th className="p-4 text-left">Market</th>
                    <th className="p-4 text-left">Platform</th>
                    <th className="p-4 text-left">Edge</th>
                    <th className="p-4 text-left">Confidence</th>
                    <th className="p-4 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-border hover:bg-surface/50">
                      <td className="p-4 text-text-primary">{r.market}</td>
                      <td className="p-4 text-text-secondary">{r.platform}</td>
                      <td className={`p-4 ${r.edge > 0 ? "text-success" : "text-danger"}`}>
                        {r.edge > 0 ? "+" : ""}{(r.edge * 100).toFixed(1)}%
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          r.confidence === "HIGH" ? "bg-success/20 text-success" :
                          r.confidence === "MEDIUM" ? "bg-primary/20 text-primary" :
                          "bg-surface text-text-muted"
                        }`}>{r.confidence}</span>
                      </td>
                      <td className="p-4">
                        <span className={`text-sm ${
                          r.status === "active" ? "text-success" :
                          r.status === "resolved" ? "text-primary" :
                          "text-text-muted"
                        }`}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
