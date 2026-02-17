"use client"

import { useState } from "react"
import { Search, Filter, ArrowUpDown, ExternalLink, Bell } from "lucide-react"

interface Market {
  id: string
  name: string
  platform: "Kalshi" | "Polymarket"
  category: string
  volume: string
  yesPrice: number
  noPrice: number
  impliedYes: number
  impliedNo: number
  volume24h: string
  expires: string
  hasSignal: boolean
}

const sampleMarkets: Market[] = [
  {
    id: "mkt_001",
    name: "Chiefs to Win Super Bowl LIX",
    platform: "Kalshi",
    category: "Sports",
    volume: "$12.4M",
    yesPrice: 0.54,
    noPrice: 0.47,
    impliedYes: 54,
    impliedNo: 47,
    volume24h: "$2.1M",
    expires: "Feb 9, 2025",
    hasSignal: true
  },
  {
    id: "mkt_002",
    name: "Bitcoin > $100K by EOY 2025",
    platform: "Polymarket",
    category: "Crypto",
    volume: "$8.9M",
    yesPrice: 0.61,
    noPrice: 0.40,
    impliedYes: 61,
    impliedNo: 40,
    volume24h: "$890K",
    expires: "Dec 31, 2025",
    hasSignal: true
  },
  {
    id: "mkt_003",
    name: "Fed Rate Cut March 2025",
    platform: "Kalshi",
    category: "Finance",
    volume: "$4.2M",
    yesPrice: 0.48,
    noPrice: 0.53,
    impliedYes: 48,
    impliedNo: 53,
    volume24h: "$1.2M",
    expires: "Mar 19, 2025",
    hasSignal: false
  },
  {
    id: "mkt_004",
    name: "Trump Wins 2024 Election",
    platform: "Polymarket",
    category: "Politics",
    volume: "$45.2M",
    yesPrice: 0.52,
    noPrice: 0.49,
    impliedYes: 52,
    impliedNo: 49,
    volume24h: "$5.8M",
    expires: "Nov 5, 2024",
    hasSignal: false
  }
]

export default function MarketsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterPlatform, setFilterPlatform] = useState<string>("all")

  const filteredMarkets = sampleMarkets.filter(market => {
    const matchesSearch = market.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPlatform = filterPlatform === "all" || market.platform === filterPlatform
    return matchesSearch && matchesPlatform
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">Market Scanner</h1>
          <p className="text-text-secondary mt-1">
            Active prediction markets across Kalshi and Polymarket
          </p>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-panel border border-border rounded-xl p-4">
          <div className="text-sm text-text-muted">Active Markets</div>
          <div className="text-2xl font-semibold text-text-primary mt-1">1,247</div>
        </div>
        <div className="bg-panel border border-border rounded-xl p-4">
          <div className="text-sm text-text-muted">Total Volume</div>
          <div className="text-2xl font-semibold text-text-primary mt-1">$892M</div>
        </div>
        <div className="bg-panel border border-border rounded-xl p-4">
          <div className="text-sm text-text-muted">Markets with Signals</div>
          <div className="text-2xl font-semibold text-success mt-1">142</div>
        </div>
        <div className="bg-panel border border-border rounded-xl p-4">
          <div className="text-sm text-text-muted">Avg Daily Volume</div>
          <div className="text-2xl font-semibold text-text-primary mt-1">$24M</div>
        </div>
      </div>

      {/* Markets Table */}
      <div className="bg-panel border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface text-text-muted">
            <tr>
              <th className="p-4 text-left">Market</th>
              <th className="p-4 text-left">Platform</th>
              <th className="p-4 text-left">Category</th>
              <th className="p-4 text-left">Yes Price</th>
              <th className="p-4 text-left">No Price</th>
              <th className="p-4 text-left">Implied %</th>
              <th className="p-4 text-left">Volume</th>
              <th className="p-4 text-left">Expires</th>
              <th className="p-4 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredMarkets.map((market) => (
              <tr 
                key={market.id} 
                className="border-t border-border hover:bg-surface/50 transition"
              >
                <td className="p-4">
                  <div className="font-medium text-text-primary">{market.name}</div>
                </td>
                <td className="p-4 text-text-secondary">{market.platform}</td>
                <td className="p-4">
                  <span className="px-2 py-1 bg-surface rounded text-xs text-text-secondary">
                    {market.category}
                  </span>
                </td>
                <td className="p-4 text-text-primary">${market.yesPrice.toFixed(2)}</td>
                <td className="p-4 text-text-primary">${market.noPrice.toFixed(2)}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-border h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-primary h-full rounded-full" 
                        style={{ width: `${market.impliedYes}%` }}
                      />
                    </div>
                    <span className="text-sm">{market.impliedYes}%</span>
                  </div>
                </td>
                <td className="p-4 text-text-secondary">{market.volume}</td>
                <td className="p-4 text-text-muted">{market.expires}</td>
                <td className="p-4">
                  {market.hasSignal ? (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                      <span className="text-success text-sm">Active Signal</span>
                    </div>
                  ) : (
                    <span className="text-text-muted text-sm">Scanning...</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
