"use client"

import { Lock, TrendingUp, BarChart3, PieChart, ArrowRight, Sparkles } from "lucide-react"
import Link from "next/link"

export default function FundPage() {
  return (
    <div className="space-y-8">
      {/* Locked Header */}
      <div className="bg-panel border border-border rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock size={24} className="text-primary" />
        </div>
        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          Fund Performance Access
        </h1>
        <p className="text-text-secondary max-w-md mx-auto mb-6">
          This section contains institutional-grade fund performance data, 
          AUM metrics, and allocation strategies. Available for Elite subscribers 
          and verified LPs only.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link 
            href="/pricing"
            className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition"
          >
            Upgrade to Elite
          </Link>
          <button className="px-6 py-3 bg-surface border border-border text-text-primary rounded-xl hover:border-primary transition">
            Request LP Access
          </button>
        </div>
      </div>

      {/* Teaser Metrics (Blurred) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-panel border border-border rounded-xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-panel/80 backdrop-blur-sm flex items-center justify-center">
            <Lock size={20} className="text-text-muted" />
          </div>
          <div className="text-sm text-text-muted mb-1">AUM</div>
          <div className="text-3xl font-semibold text-text-primary">$52.1M</div>
          <div className="text-xs text-success mt-1">+12% this quarter</div>
        </div>

        <div className="bg-panel border border-border rounded-xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-panel/80 backdrop-blur-sm flex items-center justify-center">
            <Lock size={20} className="text-text-muted" />
          </div>
          <div className="text-sm text-text-muted mb-1">YTD Return</div>
          <div className="text-3xl font-semibold text-success">+27.4%</div>
          <div className="text-xs text-text-muted mt-1">Net of fees</div>
        </div>

        <div className="bg-panel border border-border rounded-xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-panel/80 backdrop-blur-sm flex items-center justify-center">
            <Lock size={20} className="text-text-muted" />
          </div>
          <div className="text-sm text-text-muted mb-1">Sharpe Ratio</div>
          <div className="text-3xl font-semibold text-text-primary">2.1</div>
          <div className="text-xs text-text-muted mt-1">Trailing 12M</div>
        </div>

        <div className="bg-panel border border-border rounded-xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-panel/80 backdrop-blur-sm flex items-center justify-center">
            <Lock size={20} className="text-text-muted" />
          </div>
          <div className="text-sm text-text-muted mb-1">Max Drawdown</div>
          <div className="text-3xl font-semibold text-danger">-4.2%</div>
          <div className="text-xs text-text-muted mt-1">Since inception</div>
        </div>
      </div>

      {/* Fund Features Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-panel border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <Sparkles size={20} className="text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">Early Signal Access</h3>
              <p className="text-xs text-text-muted">30-120 seconds before public</p>
            </div>
          </div>
          <p className="text-sm text-text-secondary">
            Fund subscribers receive signals in the first release window, 
            capturing edge before market adjustment.
          </p>
        </div>

        <div className="bg-panel border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-success" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">Auto-Execution</h3>
              <p className="text-xs text-text-muted">Kelly sizing + risk controls</p>
            </div>
          </div>
          <p className="text-sm text-text-secondary">
            Automated position sizing using fractional Kelly criterion 
            with portfolio correlation checks.
          </p>
        </div>

        <div className="bg-panel border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <BarChart3 size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">Quarterly Reporting</h3>
              <p className="text-xs text-text-muted">Institutional-grade statements</p>
            </div>
          </div>
          <p className="text-sm text-text-secondary">
            Detailed performance reports with trade logs, 
            exposure breakdowns, and risk metrics.
          </p>
        </div>

        <div className="bg-panel border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
              <PieChart size={20} className="text-warning" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">Risk Engine</h3>
              <p className="text-xs text-text-muted">Cluster detection + exposure limits</p>
            </div>
          </div>
          <p className="text-sm text-text-secondary">
            Real-time correlation monitoring with automatic 
            exposure rebalancing across market clusters.
          </p>
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-panel border border-border rounded-xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-text-primary">Fund Structure</h2>
          <p className="text-text-secondary mt-2">
            2/20 fee structure with quarterly liquidity
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="text-center p-4">
            <div className="text-3xl font-semibold text-text-primary">2%</div>
            <div className="text-sm text-text-muted">Management Fee</div>
          </div>
          <div className="text-center p-4">
            <div className="text-3xl font-semibold text-text-primary">20%</div>
            <div className="text-sm text-text-muted">Performance Fee</div>
          </div>
          <div className="text-center p-4">
            <div className="text-3xl font-semibold text-text-primary">$100K</div>
            <div className="text-sm text-text-muted">Minimum Investment</div>
          </div>
        </div>

        <div className="text-center">
          <Link 
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition"
          >
            Request Allocation Access
            <ArrowRight size={18} />
          </Link>
          <p className="text-xs text-text-muted mt-4">
            Subject to verification and accreditation requirements
          </p>
        </div>
      </div>
    </div>
  )
}
