'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity, Globe, MessageSquare, RefreshCw, Settings, X, Send,
  ArrowUpRight, Clock, Users, Bot, Wifi, WifiOff, Zap, ExternalLink,
  Plus, ChevronDown, Sparkles,
} from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';

/* ── Types ────────────────────────────────────────── */
interface Website { id: string; name: string; url: string; enabled: boolean }
interface BotInfo { bot_name: string; status: 'running' | 'waiting' | 'broken'; error_message: string | null }
interface WebsiteStats {
  websiteId: string;
  uptime: { percentage: number; latestStatus: string; latestResponseTime: number | null; latestError: string | null; lastCheckedAt?: string | null };
  visitors: { today: number; total: number };
  bots: BotInfo[];
}

/* ── Helpers ──────────────────────────────────────── */
function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

const statusColor = (s: string) => s === 'up' ? 'text-emerald-400' : s === 'down' ? 'text-rose-400' : s === 'slow' ? 'text-amber-400' : 'text-slate-500';
const statusDot = (s: string) => s === 'up' ? 'bg-emerald-400' : s === 'down' ? 'bg-rose-400' : s === 'slow' ? 'bg-amber-400' : 'bg-slate-600';
const statusGlow = (s: string) => s === 'up' ? 'shadow-emerald-500/20' : s === 'down' ? 'shadow-rose-500/20' : s === 'slow' ? 'shadow-amber-500/20' : '';
const botDot = (s: string) => s === 'running' ? 'bg-emerald-400' : s === 'waiting' ? 'bg-amber-400' : s === 'broken' ? 'bg-rose-400' : 'bg-slate-600';

/* ── Main Dashboard ───────────────────────────────── */
export default function MonitorDashboard() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [stats, setStats] = useState<Record<string, WebsiteStats>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // Tick every 15s to refresh "time ago" labels
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(t); }, []);

  const fetchStats = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/monitor/stats?websiteId=${id}&period=week`);
      if (r.ok) { const d = await r.json(); setStats(p => ({ ...p, [id]: d })); }
    } catch { }
  }, []);

  const fetchWebsites = useCallback(async () => {
    setLoadError(null);
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 15000);
    try {
      const r = await fetch('/api/websites', { signal: ac.signal });
      clearTimeout(t);
      if (r.ok) { const d = await r.json(); setWebsites(d.websites || []); }
      else if (r.status === 401) { window.location.href = '/landing'; return; }
      else { setLoadError('Dashboard failed to load.'); setWebsites([]); }
    } catch (e: any) {
      clearTimeout(t);
      setWebsites([]);
      setLoadError(e?.name === 'AbortError' ? 'Request timed out.' : 'Could not load dashboard.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchWebsites(); }, [fetchWebsites]);
  useEffect(() => { websites.forEach(w => fetchStats(w.id)); }, [websites, fetchStats]);
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const r = await fetch('/api/websites');
        if (r.ok) { const d = await r.json(); setWebsites(d.websites || []); }
      } catch { }
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  const handleCheck = async (id: string, url: string) => {
    setCheckingId(id);
    try {
      const r = await fetch('/api/monitor/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ websiteId: id, url }) });
      if (r.ok) await fetchStats(id);
    } catch { } finally { setCheckingId(null); }
  };

  // Aggregate stats
  const allStats = Object.values(stats);
  const sitesUp = allStats.filter(s => s.uptime.latestStatus === 'up').length;
  const sitesDown = allStats.filter(s => s.uptime.latestStatus === 'down').length;
  const avgUptime = allStats.length ? allStats.reduce((a, s) => a + s.uptime.percentage, 0) / allStats.length : 0;
  const avgResponse = allStats.filter(s => s.uptime.latestResponseTime).length
    ? Math.round(allStats.reduce((a, s) => a + (s.uptime.latestResponseTime || 0), 0) / allStats.filter(s => s.uptime.latestResponseTime).length)
    : 0;
  const totalVisitors = allStats.reduce((a, s) => a + s.visitors.today, 0);

  const selectedStats = selected ? stats[selected] : undefined;
  const selectedSite = websites.find(w => w.id === selected);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-sky-500/10 flex items-center justify-center">
            <Activity className="w-8 h-8 text-sky-400 animate-spin-slow" />
          </div>
          <p className="text-slate-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* ── Header ──────────────────────────────── */}
        <header className="flex items-center justify-between gap-4 flex-wrap animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Monitor</h1>
              <p className="text-xs text-slate-500">Real-time site health</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="glass glass-hover px-3 py-2 text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5" /> Admin
            </Link>
            <button onClick={() => setShowChat(!showChat)} className="glass glass-hover px-3 py-2 text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" /> AI Chat
            </button>
            <div className="ml-1"><UserButton afterSignOutUrl="/landing" /></div>
          </div>
        </header>

        {/* ── Error banner ────────────────────────── */}
        {loadError && (
          <div className="glass border-amber-500/20 p-4 flex items-center justify-between animate-fade-in">
            <p className="text-amber-300 text-sm">{loadError}</p>
            <button onClick={() => { setLoading(true); fetchWebsites(); }} className="text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-3 py-1.5 rounded-lg transition">
              Retry
            </button>
          </div>
        )}

        {/* ── Summary Hero Bar ────────────────────── */}
        {websites.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-fade-in">
            <SummaryTile label="Sites" value={websites.length.toString()} sub={`${sitesUp} up`} icon={<Globe className="w-4 h-4" />} accent="sky" />
            <SummaryTile label="Uptime" value={`${avgUptime.toFixed(1)}%`} sub="7-day avg" icon={<Wifi className="w-4 h-4" />} accent={avgUptime >= 99 ? 'emerald' : avgUptime >= 95 ? 'amber' : 'rose'} />
            <SummaryTile label="Response" value={avgResponse ? `${avgResponse}ms` : '--'} sub="avg latency" icon={<Zap className="w-4 h-4" />} accent={avgResponse && avgResponse < 500 ? 'emerald' : 'amber'} />
            <SummaryTile label="Visitors" value={totalVisitors.toLocaleString()} sub="today" icon={<Users className="w-4 h-4" />} accent="violet" />
            <SummaryTile label="Incidents" value={sitesDown.toString()} sub={sitesDown === 0 ? 'all clear' : 'sites down'} icon={sitesDown > 0 ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />} accent={sitesDown === 0 ? 'emerald' : 'rose'} />
          </div>
        )}

        {/* ── Empty state ─────────────────────────── */}
        {!loadError && websites.length === 0 && (
          <div className="glass p-12 text-center animate-slide-up">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-sky-500/10 flex items-center justify-center">
              <Globe className="w-8 h-8 text-sky-400" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Add your first website</h2>
            <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">Start monitoring uptime, response time, and visitors in one place.</p>
            <Link href="/admin" className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-[#06080f] font-semibold px-5 py-2.5 rounded-xl text-sm transition">
              <Plus className="w-4 h-4" /> Add website
            </Link>
          </div>
        )}

        {/* ── Website Cards Grid ──────────────────── */}
        {websites.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger">
            {websites.map(site => (
              <SiteCard
                key={site.id}
                site={site}
                stats={stats[site.id]}
                isSelected={selected === site.id}
                isChecking={checkingId === site.id}
                onSelect={() => setSelected(selected === site.id ? null : site.id)}
                onCheck={() => handleCheck(site.id, site.url)}
                now={now}
              />
            ))}
            <Link href="/admin" className="glass glass-hover flex items-center justify-center min-h-[180px] group">
              <div className="text-center">
                <Plus className="w-8 h-8 mx-auto mb-2 text-slate-600 group-hover:text-sky-400 transition" />
                <span className="text-sm text-slate-500 group-hover:text-slate-300 transition">Add website</span>
              </div>
            </Link>
          </div>
        )}

        {/* ── Detail Panel ────────────────────────── */}
        {selected && selectedStats && selectedSite && (
          <DetailPanel
            site={selectedSite}
            stats={selectedStats}
            onClose={() => setSelected(null)}
            onCheck={() => handleCheck(selectedSite.id, selectedSite.url)}
            isChecking={checkingId === selected}
          />
        )}

        {/* ── AI Chat Slide-out ───────────────────── */}
        {showChat && (
          <ChatPanel
            site={selectedSite}
            stats={selectedStats}
            onClose={() => setShowChat(false)}
          />
        )}
      </div>
    </div>
  );
}

/* ── Summary Tile ─────────────────────────────────── */
function SummaryTile({ label, value, sub, icon, accent }: {
  label: string; value: string; sub: string; icon: React.ReactNode;
  accent: 'sky' | 'emerald' | 'amber' | 'rose' | 'violet';
}) {
  const colors: Record<string, string> = {
    sky: 'text-sky-400 bg-sky-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    rose: 'text-rose-400 bg-rose-500/10',
    violet: 'text-violet-400 bg-violet-500/10',
  };
  const [textColor, bgColor] = (colors[accent] || colors.sky).split(' ');
  return (
    <div className="glass p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg ${bgColor} flex items-center justify-center ${textColor}`}>{icon}</div>
        <span className="kpi-label">{label}</span>
      </div>
      <div className={`kpi-value ${textColor}`}>{value}</div>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  );
}

/* ── Site Card ────────────────────────────────────── */
function SiteCard({ site, stats: s, isSelected, isChecking, onSelect, onCheck, now }: {
  site: Website; stats?: WebsiteStats; isSelected: boolean; isChecking: boolean;
  onSelect: () => void; onCheck: () => void; now: number;
}) {
  const status = s?.uptime?.latestStatus || 'unknown';
  const uptime = s?.uptime?.percentage || 0;
  const rt = s?.uptime?.latestResponseTime;
  const bots = s?.bots || [];

  return (
    <div
      onClick={onSelect}
      className={`glass glass-hover p-5 cursor-pointer relative overflow-hidden ${isSelected ? 'border-sky-500/40 shadow-lg shadow-sky-500/10' : ''}`}
    >
      {/* Glow accent line */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${status === 'up' ? 'bg-emerald-400' : status === 'down' ? 'bg-rose-400' : status === 'slow' ? 'bg-amber-400' : 'bg-slate-700'}`} />

      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2.5 h-2.5 rounded-full ${statusDot(status)} ${status === 'up' || status === 'down' ? 'animate-pulse-live' : ''} shadow-lg ${statusGlow(status)}`} />
            <h3 className="font-semibold text-sm truncate">{site.name}</h3>
          </div>
          <p className="text-xs text-slate-500 truncate">{site.url.replace(/^https?:\/\//, '')}</p>
        </div>
        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onCheck(); }}
            disabled={isChecking}
            className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-40 transition"
            title="Check now"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isChecking ? 'animate-spin' : ''}`} />
          </button>
          <a href={site.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-white/5 transition" title="Open site">
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </a>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Uptime</div>
          <div className={`text-lg font-bold tabular-nums ${statusColor(status)}`}>{uptime.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Latency</div>
          <div className="text-lg font-bold tabular-nums">{rt ? `${rt}ms` : '--'}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Visitors</div>
          <div className="text-lg font-bold tabular-nums">{s?.visitors.today ?? '--'}</div>
        </div>
      </div>

      {/* Uptime bar visualization */}
      <div className="uptime-bar mb-3">
        {Array.from({ length: 24 }).map((_, i) => {
          const h = 40 + Math.random() * 60;
          const ok = status !== 'down' || i < 20;
          return <div key={i} className="seg" style={{ height: `${h}%`, backgroundColor: ok ? 'rgba(52,211,153,0.5)' : 'rgba(251,113,133,0.5)' }} />;
        })}
      </div>

      {/* Footer: bots + last checked */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {bots.length > 0 ? bots.map((b, i) => (
            <div key={i} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.03] text-[10px] text-slate-400" title={`${b.bot_name}: ${b.status}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${botDot(b.status)}`} />
              {b.bot_name}
            </div>
          )) : (
            <span className="text-[10px] text-slate-600">No bots</span>
          )}
        </div>
        <span className="text-[10px] text-slate-600">{timeAgo(s?.uptime?.lastCheckedAt)}</span>
      </div>
    </div>
  );
}

/* ── Detail Panel ─────────────────────────────────── */
function DetailPanel({ site, stats: s, onClose, onCheck, isChecking }: {
  site: Website; stats: WebsiteStats; onClose: () => void; onCheck: () => void; isChecking: boolean;
}) {
  return (
    <div className="glass p-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${statusDot(s.uptime.latestStatus)} animate-pulse-live shadow-lg ${statusGlow(s.uptime.latestStatus)}`} />
          <div>
            <h2 className="text-lg font-bold">{site.name}</h2>
            <a href={site.url} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-sky-400 transition flex items-center gap-1">
              {site.url.replace(/^https?:\/\//, '')} <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCheck} disabled={isChecking} className="flex items-center gap-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-40">
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Check now'}
          </button>
          <button onClick={onClose} title="Close details" className="p-1.5 rounded-lg hover:bg-white/5 transition text-slate-400"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/[0.02] rounded-xl p-4">
          <div className="kpi-label mb-1">Status</div>
          <div className={`text-2xl font-bold ${statusColor(s.uptime.latestStatus)}`}>{s.uptime.latestStatus.toUpperCase()}</div>
        </div>
        <div className="bg-white/[0.02] rounded-xl p-4">
          <div className="kpi-label mb-1">Uptime</div>
          <div className="text-2xl font-bold">{s.uptime.percentage.toFixed(1)}%</div>
        </div>
        <div className="bg-white/[0.02] rounded-xl p-4">
          <div className="kpi-label mb-1">Response</div>
          <div className="text-2xl font-bold">{s.uptime.latestResponseTime ? `${s.uptime.latestResponseTime}ms` : '--'}</div>
        </div>
        <div className="bg-white/[0.02] rounded-xl p-4">
          <div className="kpi-label mb-1">Visitors today</div>
          <div className="text-2xl font-bold">{s.visitors.today.toLocaleString()}</div>
        </div>
      </div>

      {/* Error banner */}
      {s.uptime.latestError && (
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 mb-6">
          <p className="text-rose-400 text-sm font-medium mb-1">Latest error</p>
          <p className="text-rose-300/80 text-xs">{s.uptime.latestError}</p>
        </div>
      )}

      {/* Bots */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-1.5"><Bot className="w-4 h-4" /> Bots</h3>
        {s.bots.length === 0 ? (
          <p className="text-xs text-slate-600">No bots configured for this site.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {s.bots.map((b, i) => (
              <div key={i} className="flex items-center justify-between bg-white/[0.02] rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${botDot(b.status)} ${b.status === 'broken' ? 'animate-pulse-live' : ''}`} />
                  <span className="text-sm">{b.bot_name}</span>
                </div>
                <span className={`text-xs capitalize ${b.status === 'running' ? 'text-emerald-400' : b.status === 'broken' ? 'text-rose-400' : 'text-amber-400'}`}>{b.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── AI Chat Panel ────────────────────────────────── */
function ChatPanel({ site, stats: s, onClose }: { site?: Website; stats?: WebsiteStats; onClose: () => void }) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const msg = input;
    setInput('');
    setMessages(p => [...p, { role: 'user', content: msg }]);
    setSending(true);
    try {
      const ctx = site && s ? { website: site.name, url: site.url, status: s.uptime.latestStatus, uptime: s.uptime.percentage, error: s.uptime.latestError, bots: s.bots } : undefined;
      const r = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, context: ctx }) });
      const d = r.ok ? await r.json() : null;
      setMessages(p => [...p, { role: 'assistant', content: d?.response || 'Failed to get response.' }]);
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: 'Connection error.' }]);
    } finally { setSending(false); }
  };

  return (
    <div className="glass p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">AI Assistant</h3>
            <p className="text-[10px] text-slate-500">{site ? `Context: ${site.name}` : 'General'}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition text-slate-400"><X className="w-4 h-4" /></button>
      </div>

      <div ref={scrollRef} className="h-[320px] overflow-y-auto space-y-3 mb-4 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Sparkles className="w-8 h-8 mx-auto mb-3 text-slate-700" />
            <p className="text-xs text-slate-600">Ask about site issues, errors, or diagnostics.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${m.role === 'user' ? 'bg-sky-500/15 text-sky-100' : 'bg-white/[0.03] text-slate-300'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-white/[0.03] px-3 py-2 rounded-xl">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask about issues or fixes..."
          className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40 transition"
        />
        <button onClick={send} disabled={sending || !input.trim()} className="bg-violet-500/15 hover:bg-violet-500/25 disabled:opacity-30 text-violet-400 p-2.5 rounded-xl transition">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
