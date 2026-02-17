"use client"

import { Lock, Database, History, LineChart, ArrowRight, Sparkles } from "lucide-react"
import Link from "next/link"

export default function BacktestsPage() {
  return (
    <div className="space-y-8">
      {/* Locked Header */}
      <div className="bg-panel border border-border rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock size={24} className="text-primary" />
        </div>
        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          Historical Backtesting
        </h1>
        <p className="text-text-secondary max-w-md mx-auto mb-6">
          Run strategy simulations on historical market data. 
          Validate model performance across time periods and market conditions.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link 
            href="/pricing"
            className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition"
          >
            Upgrade to Elite
          </Link>
          <button className="px-6 py-3 bg-surface border border-border text-text-primary rounded-xl hover:border-primary transition">
            View Sample Report
          </button>
        </div>
      </div>

      {/* Teaser Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-panel border border-border rounded-xl p-6">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
            <History size={20} className="text-primary" />
          </div>
          <h3 className="font-semibold text-text-primary mb-2">Historical Replay</h3>
          <p className="text-sm text-text-secondary">
            Replay any time period with model signals to see how the strategy would have performed.
          </p>
        </div>

        <div className="bg-panel border border-border rounded-xl p-6">
          <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center mb-4">
            <LineChart size={20} className="text-success" />
          </div>
          <h3 className="font-semibold text-text-primary mb-2">Equity Curves</h3>
          <p className="text-sm text-text-secondary">
            Visualize cumulative returns, drawdowns, and Sharpe ratios across test periods.
          </p>
        </div>

        <div className="bg-panel border border-border rounded-xl p-6">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
            <Database size={20} className="text-accent" />
          </div>
          <h3 className="font-semibold text-text-primary mb-2">12,000+ Markets</h3>
          <p className="text-sm text-text-secondary">
            Backtested across sports, politics, crypto, and entertainment markets.
          </p>
        </div>
      </div>

      {/* Sample Results (Blurred) */}
      <div className="bg-panel border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border bg-surface">
          <h3 className="font-semibold text-text-primary">Sample Backtest Results</h3>
        </div>
        <div className="p-8 relative">
          <div className="absolute inset-0 bg-panel/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="text-center">
              <Lock size={32} className="text-text-muted mx-auto mb-2" />
              <p className="text-text-muted">Available on Elite Plan</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-surface rounded-lg">
              <div className="text-sm text-text-muted">Total Return</div>
              <div className="text-2xl font-semibold text-success">+142.3%</div>
            </div>
            <div className="p-4 bg-surface rounded-lg">
              <div className="text-sm text-text-muted">Sharpe Ratio</div>
              <div className="text-2xl font-semibold text-text-primary">2.4</div>
            </div>
            <div className="p-4 bg-surface rounded-lg">
              <div className="text-sm text-text-muted">Max Drawdown</div>
              <div className="text-2xl font-semibold text-danger">-8.2%</div>
            </div>
            <div className="p-4 bg-surface rounded-lg">
              <div className="text-sm text-text-muted">Win Rate</div>
              <div className="text-2xl font-semibold text-text-primary">64.8%</div>
            </div>
          </div>

          <div className="h-48 bg-surface rounded-lg flex items-end p-4 gap-2">
            {[40, 55, 45, 70, 65, 80, 75, 90, 85, 100, 95, 110].map((h, i) => (
              <div 
                key={i} 
                className="flex-1 bg-primary/30 rounded-t"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-panel border border-border rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Ready to Validate Your Edge?
        </h2>
        <p className="text-text-secondary mb-6">
          Upgrade to Elite and access comprehensive backtesting tools.
        </p>
        <Link 
          href="/pricing"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition"
        >
          Upgrade to Elite
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  )
}
