'use client';

import Link from 'next/link';
import {
  Globe, Activity, Bell, BarChart3, Bot, Sparkles, Zap,
  Check, ChevronRight, LayoutDashboard, Shield, ArrowUpRight,
  Wifi, Users, Clock, Terminal,
} from 'lucide-react';

/* ── Tiny reusable pieces ─────────────────────────── */
const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <div className="glass glass-hover p-5 group">
    <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center mb-3 group-hover:bg-sky-500/15 transition">
      {icon}
    </div>
    <h3 className="text-sm font-semibold mb-1.5">{title}</h3>
    <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
  </div>
);

const PlanFeature = ({ children, muted }: { children: React.ReactNode; muted?: boolean }) => (
  <li className={`flex items-start gap-2 text-xs ${muted ? 'text-slate-600' : 'text-slate-400'}`}>
    {!muted && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />}
    {muted && <span className="w-3.5 h-3.5 shrink-0" />}
    {children}
  </li>
);

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div className="text-center">
    <div className="text-2xl sm:text-3xl font-bold tracking-tight">{value}</div>
    <div className="text-xs text-slate-500 mt-0.5">{label}</div>
  </div>
);

export default function MonitorLandingPage() {
  return (
    <div className="min-h-screen text-white">

      {/* ── Nav ─────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.04] bg-[#06080f]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/landing" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-sky-400" />
            </div>
            <span className="font-semibold text-sm">Monitor</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-5">
            <a href="#features" className="text-xs text-slate-500 hover:text-white transition">Features</a>
            <a href="#plans" className="text-xs text-slate-500 hover:text-white transition">Plans</a>
            <Link href="/docs" className="text-xs text-slate-500 hover:text-white transition">Docs</Link>
            <Link href="/sign-up" className="text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 px-3.5 py-1.5 rounded-lg transition">
              Sign up free
            </Link>
            <Link href="/sign-in" className="text-xs font-medium bg-sky-500 hover:bg-sky-400 text-[#06080f] px-3.5 py-1.5 rounded-lg transition">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 animate-fade-in">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[11px] font-medium px-3 py-1 rounded-full mb-6">
            <Wifi className="w-3 h-3" /> Real-time multi-site monitoring
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-5 leading-[1.15]">
            One dashboard for<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
              every site you run
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto mb-8 leading-relaxed">
            Uptime, response time, visitors, bot health, and AI diagnostics — all in one place.
            Built for freelancers, agencies, and anyone managing multiple properties.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/sign-in" className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-[#06080f] font-semibold px-5 py-2.5 rounded-xl text-sm transition">
              Get started <ChevronRight className="w-4 h-4" />
            </Link>
            <a href="#plans" className="inline-flex items-center gap-2 glass glass-hover px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300">
              View plans
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────── */}
      <section className="py-10 px-4 border-y border-white/[0.04]">
        <div className="max-w-3xl mx-auto flex items-center justify-around gap-6 animate-fade-in">
          <Stat value="< 1s" label="Avg check time" />
          <div className="w-px h-10 bg-white/[0.06]" />
          <Stat value="99.9%" label="Platform uptime" />
          <div className="w-px h-10 bg-white/[0.06] hidden sm:block" />
          <div className="hidden sm:block"><Stat value="24/7" label="Monitoring" /></div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────── */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Everything you need to stay on top</h2>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">No enterprise bloat. Just the tools that matter for people running real sites.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
            <FeatureCard icon={<LayoutDashboard className="w-5 h-5 text-sky-400" />} title="Multi-site dashboard" desc="Add every URL in one place. Status, latency, and metrics at a glance — no more pinging sites one by one." />
            <FeatureCard icon={<Activity className="w-5 h-5 text-sky-400" />} title="Uptime & latency" desc="Automatic checks on your schedule. Historical uptime percentage and response times to prove SLA or spot trends." />
            <FeatureCard icon={<Bell className="w-5 h-5 text-sky-400" />} title="SMS & email alerts" desc="Get notified the moment a site goes down or a bot breaks. Critical-only mode keeps noise low." />
            <FeatureCard icon={<BarChart3 className="w-5 h-5 text-sky-400" />} title="Visitor analytics" desc="Track unique visitors per site, per day. Push data via API — perfect for client reports." />
            <FeatureCard icon={<Bot className="w-5 h-5 text-sky-400" />} title="Bot & script health" desc="Monitor scrapers, cron jobs, and workers. See running / waiting / broken status and get alerted on failures." />
            <FeatureCard icon={<Sparkles className="w-5 h-5 text-violet-400" />} title="AI diagnostics" desc="Ask questions about errors, downtime, or bot issues. Context-aware Claude assistant built right into the dashboard." />
          </div>
        </div>
      </section>

      {/* ── Who it's for ────────────────────────────── */}
      <section className="py-14 px-4 border-y border-white/[0.04]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg font-bold text-center mb-8">Built for</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
            {[
              { icon: <Terminal className="w-4 h-4 text-sky-400" />, who: 'Freelancers', what: 'Keep client sites up and report on uptime without extra tools.' },
              { icon: <Users className="w-4 h-4 text-sky-400" />, who: 'Agencies', what: 'One dashboard for every client site; alerts and stats in one place.' },
              { icon: <Zap className="w-4 h-4 text-sky-400" />, who: 'Indie hackers', what: 'Monitor multiple products and side projects from a single view.' },
              { icon: <Globe className="w-4 h-4 text-sky-400" />, who: 'Teams', what: 'Shared visibility on internal tools, APIs, and customer-facing sites.' },
            ].map(({ icon, who, what }) => (
              <div key={who} className="glass p-4 text-center">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center mx-auto mb-2">{icon}</div>
                <p className="text-xs font-semibold mb-1">{who}</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">{what}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Plans ───────────────────────────────────── */}
      <section id="plans" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Plans that scale with you</h2>
            <p className="text-xs text-slate-500">Start free. Upgrade when you need more sites or features.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto stagger">
            {/* Free */}
            <div className="glass p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold">Free</h3>
              </div>
              <div className="mb-4">
                <span className="text-2xl font-bold">$0</span>
                <span className="text-xs text-slate-600 ml-1">/ mo</span>
              </div>
              <p className="text-xs text-slate-500 mb-5">Try it out or monitor a couple of sites.</p>
              <ul className="space-y-2.5 mb-6 flex-1">
                <PlanFeature>Up to 2 websites</PlanFeature>
                <PlanFeature>Checks every 5 min</PlanFeature>
                <PlanFeature>7 days history</PlanFeature>
                <PlanFeature>Visitor stats & bot status</PlanFeature>
                <PlanFeature muted>No SMS alerts</PlanFeature>
                <PlanFeature muted>Community support</PlanFeature>
              </ul>
              <Link href="/sign-in" className="block w-full text-center glass glass-hover py-2.5 rounded-xl text-xs font-medium text-slate-300 transition">
                Get started
              </Link>
            </div>

            {/* Pro */}
            <div className="glass p-5 flex flex-col relative border-sky-500/30">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/25 text-sky-400 text-[10px] font-medium">
                Popular
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-semibold">Pro</h3>
              </div>
              <div className="mb-4">
                <span className="text-2xl font-bold">$39</span>
                <span className="text-xs text-slate-600 ml-1">/ mo</span>
              </div>
              <p className="text-xs text-slate-500 mb-5">For pros and small teams with more sites.</p>
              <ul className="space-y-2.5 mb-6 flex-1">
                <PlanFeature>Up to 15 websites</PlanFeature>
                <PlanFeature>Checks every 1 min</PlanFeature>
                <PlanFeature>90 days history</PlanFeature>
                <PlanFeature>SMS & email alerts</PlanFeature>
                <PlanFeature>AI chat assistant</PlanFeature>
                <PlanFeature>Priority support</PlanFeature>
              </ul>
              <Link href="/sign-in" className="block w-full text-center bg-sky-500 hover:bg-sky-400 text-[#06080f] font-semibold py-2.5 rounded-xl text-xs transition">
                Get Pro
              </Link>
            </div>

            {/* Ultra */}
            <div className="glass p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold">Ultra</h3>
              </div>
              <div className="mb-4">
                <span className="text-2xl font-bold">$99</span>
                <span className="text-xs text-slate-600 ml-1">/ mo</span>
              </div>
              <p className="text-xs text-slate-500 mb-5">Power users and larger portfolios.</p>
              <ul className="space-y-2.5 mb-6 flex-1">
                <PlanFeature>Up to 25 websites</PlanFeature>
                <PlanFeature>Checks every 1 min</PlanFeature>
                <PlanFeature>1 year history</PlanFeature>
                <PlanFeature>SMS, email & webhook alerts</PlanFeature>
                <PlanFeature>AI chat & full API access</PlanFeature>
                <PlanFeature>Command Center (multi-app)</PlanFeature>
                <PlanFeature>Dedicated support</PlanFeature>
              </ul>
              <Link href="/sign-in" className="block w-full text-center glass glass-hover py-2.5 rounded-xl text-xs font-medium text-slate-300 transition">
                Get Ultra
              </Link>
            </div>
          </div>

          <p className="text-center text-slate-600 text-[11px] mt-6">
            Annual billing available at a discount. Integrates with cevict.ai for unified auth and dashboard.
          </p>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 animate-fade-in">
        <div className="max-w-2xl mx-auto text-center glass p-10 sm:p-12 border-sky-500/15">
          <h2 className="text-xl sm:text-2xl font-bold mb-3">
            Ready to see all your sites in one place?
          </h2>
          <p className="text-xs text-slate-500 mb-6 max-w-md mx-auto">
            Add your first site and run a check in under a minute. No credit card required for Free.
          </p>
          <Link href="/sign-in" className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-[#06080f] font-semibold px-5 py-2.5 rounded-xl text-sm transition">
            Open dashboard <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <span className="text-xs font-semibold">Monitor</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-600">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#plans" className="hover:text-white transition">Plans</a>
            <Link href="/status" className="hover:text-white transition">Status</Link>
            <Link href="/docs" className="hover:text-white transition">Docs</Link>
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
            <a href="https://cevict.ai" target="_blank" rel="noopener noreferrer" className="hover:text-sky-400 transition">cevict.ai</a>
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-5 pt-5 border-t border-white/[0.04] text-center text-[11px] text-slate-700">
          Part of the CEVICT suite. Use standalone or inside cevict.ai with your other tools.
        </div>
      </footer>
    </div>
  );
}
