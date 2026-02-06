'use client';

import Link from 'next/link';
import {
  Globe,
  Activity,
  Bell,
  BarChart3,
  Bot,
  MessageSquare,
  Zap,
  Check,
  ChevronRight,
  LayoutDashboard,
  Smartphone,
  Shield,
} from 'lucide-react';

export default function MonitorLandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0e17] text-white antialiased">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0e17]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="font-semibold text-lg">Website Monitor</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#benefits" className="text-sm text-slate-400 hover:text-white transition">
              Benefits
            </a>
            <a href="#tiers" className="text-sm text-slate-400 hover:text-white transition">
              Plans
            </a>
            <Link
              href="/"
              className="text-sm font-medium bg-cyan-500 hover:bg-cyan-400 text-[#0a0e17] px-4 py-2 rounded-lg transition"
            >
              Open dashboard
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-cyan-400 text-sm font-medium tracking-wide uppercase mb-4">
            Multi-site monitoring for teams & agencies
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
            One dashboard for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              all your websites
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            Stop juggling tabs and tools. Monitor uptime, response times, visitor stats, and bot health
            for every site—from a single place. Built for freelancers, agencies, and anyone running
            multiple properties.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-[#0a0e17] font-semibold px-6 py-3 rounded-xl transition"
            >
              Get started
              <ChevronRight className="w-5 h-5" />
            </Link>
            <a
              href="#tiers"
              className="inline-flex items-center gap-2 border border-slate-600 hover:border-slate-500 text-slate-300 font-medium px-6 py-3 rounded-xl transition"
            >
              View plans
            </a>
          </div>
        </div>
      </section>

      {/* Social proof / use case strip */}
      <section className="py-8 px-4 border-y border-white/5">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-slate-500 text-sm">
            Trusted for client sites, side projects, and internal tools · Part of the{' '}
            <a
              href="https://cevict.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300"
            >
              cevict.ai
            </a>{' '}
            suite
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Why use Website Monitor?</h2>
          <p className="text-slate-400 text-center max-w-2xl mx-auto mb-16">
            Built for people who manage more than one site—without the complexity of enterprise tools.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-cyan-500/20 transition">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4">
                <LayoutDashboard className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">One dashboard, many sites</h3>
              <p className="text-slate-400 text-sm">
                Add all your URLs in one place. See status, response time, and key metrics at a
                glance. No more pinging sites one by one or losing track of which client site is down.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-cyan-500/20 transition">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4">
                <Activity className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Uptime & response time</h3>
              <p className="text-slate-400 text-sm">
                Automatic checks on your schedule. Know immediately when a site goes down or gets
                slow. Historical uptime percentage and response times so you can prove SLA or spot
                trends.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-cyan-500/20 transition">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4">
                <Bell className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Alerts when it matters</h3>
              <p className="text-slate-400 text-sm">
                Get SMS or email when a site goes down or a bot breaks. Configure per-site and
                choose critical-only so you’re not spammed. React fast, before users or clients notice.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-cyan-500/20 transition">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Visitor analytics</h3>
              <p className="text-slate-400 text-sm">
                Track unique visitors and visits per site, per day. Push data from your own
                analytics or scripts via API. Perfect for client reports or keeping an eye on
                traffic across properties.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-cyan-500/20 transition">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4">
                <Bot className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Bot & script health</h3>
              <p className="text-slate-400 text-sm">
                Monitor scrapers, cron jobs, and other bots per site. See running / waiting / broken
                at a glance. Get alerted when a bot fails so you can fix it before data or
                workflows break.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-cyan-500/20 transition">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">AI assistant</h3>
              <p className="text-slate-400 text-sm">
                Ask questions about a site’s status, errors, or bot issues. Get diagnostic help and
                fix suggestions in plain language. Context-aware so you spend less time digging through logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-16 px-4 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Who it’s for</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div>
              <p className="font-semibold text-white mb-1">Freelancers</p>
              <p className="text-slate-400 text-sm">Keep client sites up and report on uptime without extra tools.</p>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Agencies</p>
              <p className="text-slate-400 text-sm">One dashboard for every client site; alerts and stats in one place.</p>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Indie hackers</p>
              <p className="text-slate-400 text-sm">Monitor multiple products and side projects from a single view.</p>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Teams</p>
              <p className="text-slate-400 text-sm">Shared visibility on internal tools, APIs, and customer-facing sites.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section id="tiers" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Plans that scale with you</h2>
          <p className="text-slate-400 text-center max-w-2xl mx-auto mb-16">
            Start free, upgrade when you need more sites or features. All plans include the core
            dashboard and uptime checks.
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-slate-400" />
                <h3 className="text-lg font-semibold text-white">Free</h3>
              </div>
              <div className="mb-6">
                <span className="text-3xl font-bold text-white">$0</span>
                <span className="text-slate-400 text-sm ml-1">/ month</span>
              </div>
              <p className="text-slate-400 text-sm mb-6">Best for trying out or a handful of sites.</p>
              <ul className="space-y-3 text-sm text-slate-300 mb-8 flex-1">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> Up to 3 websites
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> Checks every 5 minutes
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> 7 days of history
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> Visitor stats (manual/API)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> Bot status tracking
                </li>
                <li className="flex items-center gap-2 text-slate-500">
                  <span className="w-4 h-4 shrink-0" /> No SMS alerts
                </li>
                <li className="flex items-center gap-2 text-slate-500">
                  <span className="w-4 h-4 shrink-0" /> Community support
                </li>
              </ul>
              <Link
                href="/"
                className="block w-full text-center border border-slate-600 hover:border-slate-500 text-slate-300 font-medium py-3 rounded-xl transition"
              >
                Get started
              </Link>
            </div>

            {/* Pro - featured */}
            <div className="rounded-2xl border-2 border-cyan-500/50 bg-cyan-500/5 p-6 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-medium">
                Most popular
              </div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-semibold text-white">Pro</h3>
              </div>
              <div className="mb-6">
                <span className="text-3xl font-bold text-white">$19</span>
                <span className="text-slate-400 text-sm ml-1">/ month</span>
              </div>
              <p className="text-slate-400 text-sm mb-6">For pros and small teams with more sites and needs.</p>
              <ul className="space-y-3 text-sm text-slate-300 mb-8 flex-1">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> Up to 15 websites
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> Checks every 1 minute
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> 90 days of history
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> SMS & email alerts
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> AI chat assistant
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> Visitor stats & bot status
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> Priority support
                </li>
              </ul>
              <Link
                href="/"
                className="block w-full text-center bg-cyan-500 hover:bg-cyan-400 text-[#0a0e17] font-semibold py-3 rounded-xl transition"
              >
                Start Pro trial
              </Link>
            </div>

            {/* Team */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-slate-400" />
                <h3 className="text-lg font-semibold text-white">Team</h3>
              </div>
              <div className="mb-6">
                <span className="text-3xl font-bold text-white">$49</span>
                <span className="text-slate-400 text-sm ml-1">/ month</span>
              </div>
              <p className="text-slate-400 text-sm mb-6">Unlimited sites and power-user features.</p>
              <ul className="space-y-3 text-sm text-slate-300 mb-8 flex-1">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> Unlimited websites
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> Checks every 1 minute
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> 1 year of history
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> SMS, email, webhook alerts
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> AI chat & API access
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> Command Center (multi-app ops)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> Dedicated support
                </li>
              </ul>
              <Link
                href="/"
                className="block w-full text-center border border-slate-600 hover:border-slate-500 text-slate-300 font-medium py-3 rounded-xl transition"
              >
                Contact sales
              </Link>
            </div>
          </div>

          <p className="text-center text-slate-500 text-sm mt-8">
            All plans can be billed annually for a discount. Integrates with cevict.ai for a unified
            dashboard and auth.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-10 sm:p-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Ready to see all your sites in one place?
          </h2>
          <p className="text-slate-400 mb-8">
            Open the dashboard, add your first site, and run a check in under a minute. No credit card for Free.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-[#0a0e17] font-semibold px-6 py-3 rounded-xl transition"
          >
            Open dashboard
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="font-semibold text-white">Website Monitor</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <a href="#benefits" className="hover:text-white transition">Benefits</a>
            <a href="#tiers" className="hover:text-white transition">Plans</a>
            <a
              href="https://cevict.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-cyan-400 transition"
            >
              cevict.ai
            </a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-6 pt-6 border-t border-white/5 text-center text-slate-500 text-sm">
          Part of the CEVICT suite. Use it as a standalone app or inside cevict.ai with your other tools.
        </div>
      </footer>
    </div>
  );
}
