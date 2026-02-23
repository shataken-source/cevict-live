"use client"

import { TrendingUp, TrendingDown, Activity, Clock, Copy, ExternalLink } from "lucide-react"
import { useState } from "react"

interface Signal {
  id: string
  market: string
  platform: "Kalshi" | "Polymarket" | "Sportsbook"
  direction: "YES" | "NO" | "LONG" | "SHORT"
  modelProbability: number
  marketProbability: number
  edge: number
  confidence: "HIGH" | "MEDIUM" | "LOW"
  liquidity: string
  timeframe: string
  timestamp: string
  status?: "active" | "expired" | "won" | "lost"
  marketId?: string
}

interface SignalCardProps {
  signal: Signal
  onClick?: () => void
}

export function SignalCard({ signal, onClick }: SignalCardProps) {
  const isLong = signal.direction === "YES" || signal.direction === "LONG"
  const isHighConfidence = signal.confidence === "HIGH"
  const [copied, setCopied] = useState(false)

  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation()
    const text = `${signal.market}\n${signal.direction} @ ${(signal.marketProbability * 100).toFixed(0)}%\nEdge: ${(signal.edge * 100).toFixed(1)}%\nConfidence: ${signal.confidence}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openKalshi = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (signal.platform === "Kalshi" && signal.marketId) {
      window.open(`https://kalshi.com/markets/${signal.marketId}`, '_blank')
    }
  }

  return (
    <div
      onClick={onClick}
      className="bg-panel border border-border rounded-xl p-6 hover:border-primary transition-all cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-1 bg-surface rounded text-xs text-text-muted">
              {signal.platform}
            </span>
            {isHighConfidence && (
              <span className="text-amber-400 text-xs">🔥 High Confidence</span>
            )}
          </div>
          <h3 className="font-semibold text-text-primary">{signal.market}</h3>
        </div>
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${isLong
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
          : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
          }`}>
          {isLong ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {signal.direction}
        </div>
      </div>

      {/* Probability Comparison */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-xs text-text-muted mb-1">Model</div>
          <div className="text-lg font-semibold text-primary">
            {(signal.modelProbability * 100).toFixed(0)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-text-muted mb-1">Market</div>
          <div className="text-lg font-semibold text-text-secondary">
            {(signal.marketProbability * 100).toFixed(0)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-text-muted mb-1">Edge</div>
          <div className={`text-lg font-semibold ${signal.edge > 0 ? "text-success" : "text-danger"
            }`}>
            {signal.edge > 0 ? "+" : ""}{(signal.edge * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-text-muted">Confidence</span>
          <span className={`
            ${signal.confidence === "HIGH" ? "text-success" : ""}
            ${signal.confidence === "MEDIUM" ? "text-warning" : ""}
            ${signal.confidence === "LOW" ? "text-danger" : ""}
          `}>
            {signal.confidence}
          </span>
        </div>
        <div className="w-full bg-border h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${signal.confidence === "HIGH"
              ? "bg-gradient-to-r from-primary to-accent w-[90%]"
              : signal.confidence === "MEDIUM"
                ? "bg-gradient-to-r from-primary to-accent w-[70%]"
                : "bg-gradient-to-r from-warning to-accent w-[50%]"
              }`}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-text-muted pt-4 border-t border-border">
        <div className="flex items-center gap-4">
          <span>Liquidity: {signal.liquidity}</span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {signal.timeframe}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {signal.status && (
            <span className={`
              px-2 py-0.5 rounded text-xs
              ${signal.status === "won" ? "bg-success/20 text-success" : ""}
              ${signal.status === "lost" ? "bg-danger/20 text-danger" : ""}
              ${signal.status === "active" ? "bg-accent/20 text-accent" : ""}
            `}>
              {signal.status.toUpperCase()}
            </span>
          )}
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-surface transition"
            title="Copy pick details"
          >
            <Copy size={12} />
            {copied ? "Copied!" : "Copy"}
          </button>
          {signal.platform === "Kalshi" && signal.marketId && (
            <button
              onClick={openKalshi}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-surface transition text-primary"
              title="Open in Kalshi"
            >
              <ExternalLink size={12} />
              Trade
            </button>
          )}
          <span className="group-hover:text-primary transition">View Details →</span>
        </div>
      </div>
    </div>
  )
}
