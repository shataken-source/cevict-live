'use client';

import Link from 'next/link';
import {
  TrendingUp,
  BarChart3,
  Zap,
  Shield,
  ArrowRight,
  Check,
  Target,
  Brain,
} from 'lucide-react';

export default function PraxisLandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0f]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="font-semibold text-lg">PRAXIS</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#benefits" className="text-sm text-zinc-400 hover:text-white transition">
              Benefits
            </a>
            <a href="#pricing" className="text-sm text-zinc-400 hover:text-white transition">
              Pricing
            </a>
            <Link href="/sign-in" className="text-sm text-zinc-400 hover:text-white transition">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <section className="pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-indigo-400 text-sm font-medium tracking-wide uppercase mb-4">
            Kalshi & Polymarket in one place
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
            Trading analytics for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
              prediction markets
            </span>
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
            One dashboard for P&L, arbitrage detection, and AI insights across Kalshi and Polymarket.
            Free for 1 month, then Pro for live data and alerts.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition"
            >
              1 month free — Get started
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 border border-zinc-600 hover:border-zinc-500 text-zinc-300 font-medium px-6 py-3 rounded-xl transition"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>

      <section className="py-8 px-4 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <p className="text-zinc-500 text-sm text-center mb-4">
            Part of the{' '}
            <a href="https://cevict.ai" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
              cevict.ai
            </a>{' '}
            stack
          </p>
          <p className="text-zinc-600 text-xs text-center max-w-2xl mx-auto">
            <strong className="text-zinc-500">PRAXIS</strong> (this dashboard) · <strong className="text-zinc-500">Alpha-Hunter</strong> (agent: Progno picks, Kalshi/Polymarket arb, paper or live) · <strong className="text-zinc-500">Progno</strong> (sports predictions, no-vig baseline, edge sizing) · <strong className="text-zinc-500">Kalshi &amp; Polymarket</strong> in one view. Baseline + edge + size.
          </p>
        </div>
      </section>

      <section id="benefits" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Why PRAXIS?</h2>
          <p className="text-zinc-400 text-center max-w-2xl mx-auto mb-16">
            Built for traders who use more than one platform and want one place for analytics and edge.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-indigo-500/20 transition">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">One dashboard, two platforms</h3>
              <p className="text-zinc-400 text-sm">
                Import CSV or connect APIs. See P&L, win rate, and history in one place. No more switching between Kalshi and Polymarket tabs.
              </p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-indigo-500/20 transition">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Arbitrage scanner</h3>
              <p className="text-zinc-400 text-sm">
                Spot cross-platform mispricings. Get alerts when opportunities appear. Pro and Enterprise include real-time scan and SMS/email.
              </p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-indigo-500/20 transition">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">AI insights</h3>
              <p className="text-zinc-400 text-sm">
                Get AI-powered analysis on your trades and markets. Pro includes 50 insights per month; Enterprise unlimited.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Simple pricing</h2>
          <p className="text-zinc-400 mb-12">Free for 1 month. Then upgrade to Pro for live data and arbitrage, or continue with limited free (CSV only).</p>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Free</h3>
              <p className="text-2xl font-bold text-white">$0<span className="text-sm font-normal text-zinc-400"> first month</span></p>
              <p className="text-zinc-400 text-sm mt-2 mb-4">Full access for 1 month. CSV import, P&L, 30-day history, win rate. After that: Pro or CSV-only (limited).</p>
              <Link href="/sign-up" className="block w-full text-center border border-zinc-600 hover:border-zinc-500 text-zinc-300 font-medium py-3 rounded-xl transition">
                Start free trial
              </Link>
            </div>
            <div className="rounded-2xl border-2 border-indigo-500/50 bg-indigo-500/5 p-6 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-medium">Popular</span>
              <h3 className="text-lg font-semibold text-white mb-2">Pro</h3>
              <p className="text-2xl font-bold text-white">$29<span className="text-sm font-normal text-zinc-400">/mo</span></p>
              <p className="text-zinc-400 text-sm mt-2 mb-4">Real-time markets, Kalshi/Polymarket API, arbitrage, AI insights (50/mo), alerts</p>
              <Link href="/pricing" className="block w-full text-center bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition">
                Go Pro
              </Link>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Enterprise</h3>
              <p className="text-2xl font-bold text-white">$299<span className="text-sm font-normal text-zinc-400">/mo</span></p>
              <p className="text-zinc-400 text-sm mt-2 mb-4">Everything in Pro + execution, multi-account, team, API, priority support</p>
              <Link href="/pricing" className="block w-full text-center border border-zinc-600 hover:border-zinc-500 text-zinc-300 font-medium py-3 rounded-xl transition">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-10 sm:p-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Ready to trade with a clearer edge?</h2>
          <p className="text-zinc-400 mb-8">1 month free. Sign up, import a CSV or connect live. No credit card required to start.</p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition"
          >
            1 month free — Get started
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="font-semibold text-white">PRAXIS</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-400">
            <a href="#benefits" className="hover:text-white transition">Benefits</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <Link href="/sign-in" className="hover:text-white transition">Sign in</Link>
            <a href="https://cevict.ai" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition">cevict.ai</a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-6 pt-6 border-t border-white/5 text-center text-zinc-500 text-sm">
          Part of the CEVICT suite. Not financial advice. Use at your own risk.
        </div>
      </footer>
    </div>
  );
}
