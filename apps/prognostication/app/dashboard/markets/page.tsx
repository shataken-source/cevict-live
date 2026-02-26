"use client"

import { useState, useEffect } from "react"
import { Search, Loader2 } from "lucide-react"
import { getMarkets, getSignals, type Market } from "@/app/dashboard/actions"

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterPlatform, setFilterPlatform] = useState<string>("all")
  const [signalCount, setSignalCount] = useState(0)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [mktRes, sigRes] = await Promise.all([
        getMarkets({ platform: filterPlatform === "all" ? undefined : filterPlatform, search: searchTerm || undefined, limit: 100 }),
        getSignals({ limit: 50 }),
      ])
      setMarkets(mktRes.markets)
      setSignalCount(sigRes.signals.filter(s => s.status === "active").length)
      setLoading(false)
    }
    load()
  }, [filterPlatform, searchTerm])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">Market Scanner</h1>
          <p className="text-text-secondary mt-1">Active prediction markets across Kalshi and Polymarket</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input
              type="text"
              placeholder="Search markets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-panel border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary w-64"
            />
          </div>
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="bg-panel border border-border rounded-lg px-4 py-2 text-sm text-text-primary"
          >
            <option value="all">All Platforms</option>
            <option value="Kalshi">Kalshi</option>
            <option value="Polymarket">Polymarket</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-panel border border-border rounded-xl p-4">
          <div className="text-sm text-text-muted">Markets Found</div>
          <div className="text-2xl font-semibold text-text-primary mt-1">{markets.length}</div>
        </div>
        <div className="bg-panel border border-border rounded-xl p-4">
          <div className="text-sm text-text-muted">Active Signals</div>
          <div className="text-2xl font-semibold text-success mt-1">{signalCount}</div>
        </div>
        <div className="bg-panel border border-border rounded-xl p-4">
          <div className="text-sm text-text-muted">Platform Filter</div>
          <div className="text-2xl font-semibold text-text-primary mt-1">{filterPlatform === "all" ? "All" : filterPlatform}</div>
        </div>
      </div>

      <div className="bg-panel border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : markets.length === 0 ? (
          <div className="p-8 text-center text-text-muted">No markets found. Markets will populate when the markets table has data.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface text-text-muted">
              <tr>
                <th className="p-4 text-left">Market</th>
                <th className="p-4 text-left">Platform</th>
                <th className="p-4 text-left">Category</th>
                <th className="p-4 text-left">Yes Price</th>
                <th className="p-4 text-left">No Price</th>
                <th className="p-4 text-left">Volume</th>
                <th className="p-4 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((m) => (
                <tr key={m.id} className="border-t border-border hover:bg-surface/50 transition">
                  <td className="p-4 font-medium text-text-primary">{m.name}</td>
                  <td className="p-4 text-text-secondary">{m.platform}</td>
                  <td className="p-4"><span className="px-2 py-1 bg-surface rounded text-xs text-text-secondary">{m.category}</span></td>
                  <td className="p-4 text-text-primary">${m.yes_price.toFixed(2)}</td>
                  <td className="p-4 text-text-primary">${m.no_price.toFixed(2)}</td>
                  <td className="p-4 text-text-secondary">{m.volume}</td>
                  <td className="p-4">
                    {m.has_signal ? (
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                        <span className="text-success text-sm">Signal</span>
                      </div>
                    ) : (
                      <span className="text-text-muted text-sm">{m.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
