"use client"

import { Bell, Search, User, Activity, TrendingUp, Zap } from "lucide-react"

export function Topbar() {
  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-8 sticky top-0 z-50">
      {/* Live Model Metrics - Center */}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-success" />
          <span className="text-xs text-text-muted">Live Accuracy (30D)</span>
          <span className="font-semibold text-text-primary">63.8%</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-accent" />
          <span className="text-xs text-text-muted">Avg EV (7D)</span>
          <span className="font-semibold text-accent">+3.1%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
          <span className="text-xs text-text-muted">Signals Today</span>
          <span className="font-semibold text-text-primary">142</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-warning" />
          <span className="text-xs text-text-muted">Active Markets</span>
          <span className="font-semibold text-text-primary">Kalshi / Polymarket</span>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            type="text"
            placeholder="Search markets, events, tickers..."
            className="bg-panel border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary w-72"
          />
        </div>

        <button title="Notifications" className="relative p-2 text-text-secondary hover:text-text-primary transition">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
        </button>

        <button title="Account" className="flex items-center gap-2 p-2 text-text-secondary hover:text-text-primary transition">
          <div className="w-8 h-8 bg-panel border border-border rounded-full flex items-center justify-center">
            <User size={16} />
          </div>
        </button>
      </div>
    </header>
  )
}
