"use client"

import { useState } from "react"
import { Filter, SlidersHorizontal, X, Check } from "lucide-react"

interface FilterPanelProps {
  filters?: {
    platform?: string
    confidence?: string[]
    minEdge?: number
  }
  onChange?: (filters: { platform: string; confidence: string[]; minEdge: number }) => void
}

const presets = [
  { name: "High EV Only", filters: { minEdge: 0.05, confidence: ["HIGH"] } },
  { name: "Short-Term Only", filters: { timeframe: "7d" } },
  { name: "Low Correlation", filters: {} },
  { name: "Fund-Grade Signals", filters: { minEdge: 0.03, confidence: ["HIGH", "MEDIUM"], liquidity: "1M+" } },
]

export function FilterPanel({ filters, onChange }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Default values if filters not provided
  const currentFilters = {
    platform: filters?.platform || "all",
    confidence: filters?.confidence || [],
    minEdge: filters?.minEdge || 0
  }

  const togglePlatform = (platform: string) => {
    if (!onChange) return
    const newPlatform = currentFilters.platform === platform ? "all" : platform
    onChange({
      ...currentFilters,
      platform: newPlatform
    })
  }

  const toggleConfidence = (level: string) => {
    if (!onChange) return
    const current = currentFilters.confidence
    const updated = current.includes(level)
      ? current.filter(c => c !== level)
      : [...current, level]
    onChange({
      ...currentFilters,
      confidence: updated
    })
  }

  const handleMinEdgeChange = (value: number) => {
    if (!onChange) return
    onChange({
      ...currentFilters,
      minEdge: value
    })
  }

  const handleReset = () => {
    if (!onChange) return
    onChange({
      platform: "all",
      confidence: [],
      minEdge: 0
    })
  }

  return (
    <div className="bg-panel border border-border rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-text-muted" />
          <span className="font-medium text-text-primary">Filters</span>
        </div>
        <button
          title="Toggle filters"
          onClick={() => setIsOpen(!isOpen)}
          className="text-text-muted hover:text-text-primary"
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>

      {/* Presets */}
      <div className="space-y-2 mb-6">
        <div className="text-xs text-text-muted uppercase tracking-wide">Presets</div>
        {presets.map((preset) => (
          <button
            key={preset.name}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface transition"
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Platform Filter */}
      <div className="space-y-2 mb-6">
        <div className="text-xs text-text-muted uppercase tracking-wide">Platform</div>
        {["Kalshi", "Polymarket", "Sportsbook"].map((platform) => (
          <button
            key={platform}
            onClick={() => togglePlatform(platform)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${currentFilters.platform === platform
              ? "bg-primary/20 text-primary"
              : "text-text-secondary hover:bg-surface"
              }`}
          >
            {platform}
            {currentFilters.platform === platform && <Check size={14} />}
          </button>
        ))}
      </div>

      {/* Confidence Filter */}
      <div className="space-y-2 mb-6">
        <div className="text-xs text-text-muted uppercase tracking-wide">Confidence</div>
        {["HIGH", "MEDIUM", "LOW"].map((level) => (
          <button
            key={level}
            onClick={() => toggleConfidence(level)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${currentFilters.confidence.includes(level)
              ? "bg-primary/20 text-primary"
              : "text-text-secondary hover:bg-surface"
              }`}
          >
            {level}
            {currentFilters.confidence.includes(level) && <Check size={14} />}
          </button>
        ))}
      </div>

      {/* EV Threshold */}
      <div className="space-y-2 mb-6">
        <div className="text-xs text-text-muted uppercase tracking-wide">Min Edge</div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="20"
            value={currentFilters.minEdge * 100}
            onChange={(e) => handleMinEdgeChange(Number(e.target.value) / 100)}
            className="flex-1"
            title="Minimum edge threshold"
          />
          <span className="text-sm text-text-primary w-12 text-right">
            {(currentFilters.minEdge * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={handleReset}
        className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2 text-sm text-text-muted hover:text-text-primary transition"
      >
        <X size={14} />
        Reset Filters
      </button>
    </div>
  )
}
