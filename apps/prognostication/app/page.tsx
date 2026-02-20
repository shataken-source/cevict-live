'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TrendingUp, Shield, Zap, BarChart3, ArrowRight } from 'lucide-react'

interface PublicStats {
    todaySignals: number;
    winRate: number;
    totalPicks: number;
    activeTraders: number;
    volumeTracked: number;
    source: string;
}

function fmt(n: number): string {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M+`;
    if (n >= 1_000) return `${n.toLocaleString()}`;
    return String(n);
}

export default function HomePage() {
    const [mounted, setMounted] = useState(false)
    const [liveStats, setLiveStats] = useState<PublicStats | null>(null)

    useEffect(() => {
        setMounted(true)
        fetch('/api/stats/public')
            .then(r => r.json())
            .then(setLiveStats)
            .catch(() => { })
    }, [])

    return (
        <div className="min-h-screen bg-background">
            {/* Navigation */}
            <nav className="border-b border-border">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-glow-sm">
                            <span className="text-white font-bold text-sm">P</span>
                        </div>
                        <div>
                            <div className="font-semibold text-text-primary">Prognostication</div>
                            <div className="text-xs text-text-muted">Institutional</div>
                        </div>
                    </Link>
                    <div className="flex items-center gap-8">
                        <Link href="/pricing" className="text-text-secondary hover:text-text-primary transition">
                            Pricing
                        </Link>
                        <Link href="/accuracy" className="text-text-secondary hover:text-text-primary transition">
                            Accuracy
                        </Link>
                        <Link
                            href="/dashboard"
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition"
                        >
                            Dashboard
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />

                <div className="max-w-7xl mx-auto px-6 py-24 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className={mounted ? 'animate-fade-in' : ''}>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-panel border border-border rounded-full mb-8">
                                <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                                <span className="text-sm text-text-secondary">Live: {liveStats?.todaySignals ?? '...'} signals today</span>
                            </div>

                            <h1 className="text-5xl md:text-6xl font-bold text-text-primary mb-6 leading-tight">
                                Trade Probability{' '}
                                <span className="text-gradient">Like a Quant</span>
                            </h1>

                            <p className="text-xl text-text-secondary mb-8 max-w-xl">
                                AI-powered probability intelligence for Kalshi, Polymarket, and prediction markets.
                                Real edge, real-time.
                            </p>

                            <div className="flex flex-wrap gap-4 mb-8">
                                <Link
                                    href="/pricing"
                                    className="px-8 py-4 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition shadow-glow"
                                >
                                    Get Live Signals
                                </Link>
                                <Link
                                    href="/dashboard"
                                    className="px-8 py-4 bg-panel border border-border text-text-primary rounded-xl font-medium hover:border-primary transition"
                                >
                                    View Dashboard
                                </Link>
                            </div>

                            <div className="flex items-center gap-8 text-sm text-text-muted">
                                <span className="flex items-center gap-2">
                                    <Shield size={16} className="text-success" />
                                    {liveStats ? fmt(liveStats.activeTraders) : '...'} Active Traders
                                </span>
                                <span className="flex items-center gap-2">
                                    <BarChart3 size={16} className="text-success" />
                                    {liveStats ? fmt(liveStats.volumeTracked) : '...'} Volume Tracked
                                </span>
                                <span className="flex items-center gap-2">
                                    <Zap size={16} className="text-success" />
                                    {liveStats ? `${liveStats.winRate}%` : '...'} Win Rate
                                </span>
                            </div>
                        </div>

                        <div className={`${mounted ? 'animate-slide-up' : ''} delay-200`}>
                            <div className="bg-panel border border-border rounded-2xl p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-semibold text-text-primary">Live Market Edge</h3>
                                    <span className="text-xs text-success flex items-center gap-1">
                                        <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                                        Real-time
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    {[
                                        { market: 'Chiefs Win SB', edge: '+9%', prob: '58%' },
                                        { market: 'BTC > $100K EOY', edge: '+11%', prob: '72%' },
                                        { market: 'Fed Rate Cut Mar', edge: '-13%', prob: '35%' },
                                    ].map((signal, i) => (
                                        <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                                            <div>
                                                <div className="font-medium text-text-primary">{signal.market}</div>
                                                <div className="text-xs text-text-muted">Kalshi</div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`font-semibold ${signal.edge.startsWith('+') ? 'text-success' : 'text-danger'}`}>
                                                    {signal.edge}
                                                </div>
                                                <div className="text-xs text-text-muted">Model: {signal.prob}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <Link
                                    href="/dashboard"
                                    className="mt-6 w-full py-3 bg-surface border border-border rounded-lg text-text-secondary hover:text-text-primary hover:border-primary transition flex items-center justify-center gap-2"
                                >
                                    View All Signals
                                    <ArrowRight size={16} />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-24 border-t border-border">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-semibold text-text-primary mb-4">
                            Institutional-Grade Edge Detection
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { icon: TrendingUp, title: 'AI Signal Engine', desc: 'Advanced probability models with real-time edge detection.' },
                            { icon: BarChart3, title: 'EV Calculator', desc: 'Expected value calculations with confidence intervals.' },
                            { icon: Zap, title: 'Arbitrage Detection', desc: 'Cross-platform mispricing detection.' },
                        ].map((f, i) => (
                            <div key={i} className="bg-panel border border-border rounded-xl p-6 hover:border-primary transition">
                                <f.icon className="text-primary mb-4" size={32} />
                                <h3 className="font-semibold text-text-primary mb-2">{f.title}</h3>
                                <p className="text-text-secondary text-sm">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-border py-12">
                <div className="max-w-7xl mx-auto px-6 text-center text-sm text-text-muted">
                    © 2026 Prognostication. All rights reserved.
                </div>
            </footer>
        </div>
    )
}
