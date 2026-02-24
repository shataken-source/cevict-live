// app/progno/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import EnhancedEarlyLinesSection from '../../../components/admin/EnhancedEarlyLinesSection';
import PrintBetsSection from '../../../components/admin/PrintBetsSection';
import ReportsSection from '../../../components/admin/ReportsSection';
import EarlyLinesSection from '../../../components/admin/EarlyLinesSection';

// -- Constants ----------------------------------------------------------------
const SPORTS_LIST = [
  { key: 'basketball_nba', label: 'NBA', icon: '🏀' },
  { key: 'basketball_ncaab', label: 'NCAAB', icon: '🏀' },
  { key: 'icehockey_nhl', label: 'NHL', icon: '🏒' },
  { key: 'americanfootball_nfl', label: 'NFL', icon: '🏈' },
  { key: 'baseball_mlb', label: 'MLB', icon: '⚾' },
  { key: 'baseball_ncaa', label: 'NCAA BBall', icon: '⚾' },
  { key: 'americanfootball_ncaaf', label: 'NCAAF', icon: '🏈' },
];

const ENV_VARS = [
  'CRON_SECRET', 'ODDS_API_KEY', 'ODDS_API_KEY_2', 'NEXT_PUBLIC_ODDS_API_KEY',
  'BETSTACK_API_KEY', 'SPORTS_BLAZE_API_KEY', 'ADMIN_PASSWORD', 'PROGNO_ADMIN_PASSWORD',
  'ANTHROPIC_API_KEY', 'API_SPORTS_KEY', 'SPORTSDATA_IO_KEY',
  'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
  'CRON_APP_URL', 'NEXT_PUBLIC_PROGNO_URL', 'FILTER_STRATEGY', 'HOME_ONLY_MODE',
  'OPENWEATHER_API_KEY', 'WEATHERAPI_KEY',
];

// -- Date utils ---------------------------------------------------------------
function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function getToday(): string { return toLocalDateStr(new Date()); }
function getYesterday(): string { const d = new Date(); d.setDate(d.getDate() - 1); return toLocalDateStr(d); }
function addDays(s: string, n: number): string { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return toLocalDateStr(d); }
function subtractDays(s: string, n: number): string { return addDays(s, -n); }
function fmt(o: number | null | undefined): string { if (o == null) return '—'; return o > 0 ? `+${o}` : String(o); }
function fmtTime(iso: string): string {
  try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }); }
  catch { return iso; }
}

// -- Theme --------------------------------------------------------------------
const C = {
  bg: '#04080f',
  card: '#080f1a',
  cardAlt: '#0a1220',
  border: '#12233a',
  borderBright: '#1e3a5f',
  green: '#00e676',
  greenDim: '#00b84d',
  blue: '#29b6f6',
  blueDim: '#0288d1',
  amber: '#ffc107',
  amberDim: '#cc9900',
  red: '#ef5350',
  purple: '#ab47bc',
  text: '#9ab8d4',
  textBright: '#ddeeff',
  textDim: '#3a5570',
  mono: '"JetBrains Mono","Fira Code","Cascadia Code",Consolas,monospace',
  sans: 'system-ui,-apple-system,sans-serif',
};

// -- Mini components ----------------------------------------------------------
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px 20px', ...style }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: C.textDim, marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
      {children}
    </div>
  );
}

function Badge({ children, color = C.blue }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{ background: `${color}20`, color, border: `1px solid ${color}40`, borderRadius: 3, padding: '2px 7px', fontSize: 10, fontFamily: C.mono, fontWeight: 700, letterSpacing: '0.5px' }}>
      {children}
    </span>
  );
}

function Btn({ children, onClick, disabled, color = C.blue, style }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; color?: string; style?: React.CSSProperties;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '7px 15px', background: disabled ? '#0a1422' : `${color}18`, color: disabled ? C.textDim : color,
      border: `1px solid ${disabled ? C.border : color + '50'}`, borderRadius: 5, cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: 12, fontFamily: C.mono, fontWeight: 600, letterSpacing: '0.5px', transition: 'all 0.15s', ...style,
    }}>
      {children}
    </button>
  );
}

function StatusLine({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <div style={{ marginTop: 10, padding: '10px 14px', background: ok ? `${C.green}10` : `${C.red}10`, border: `1px solid ${ok ? C.green : C.red}30`, borderRadius: 5, fontFamily: C.mono, fontSize: 12, color: ok ? C.green : C.red }}>
      {ok ? '✓ ' : '✗ '}{msg}
    </div>
  );
}

function DarkResultsTable({ rows }: { rows: any[] }) {
  const sorted = [...rows].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: C.mono, fontSize: 11 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.borderBright}` }}>
            {['#', 'MATCH', 'PICK', 'H/A', 'CONF%', 'ODDS', 'STATUS', 'SCORE'].map(h => (
              <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: C.textDim, fontWeight: 700, letterSpacing: 1, fontSize: 9 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            const status = r.status || r.result || '';
            const statusColor = status === 'WIN' || status === 'win' ? C.green : status === 'LOSS' || status === 'loss' || status === 'LOSE' || status === 'lose' ? C.red : C.amber;
            return (
              <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? 'transparent' : '#070e18' }}>
                <td style={{ padding: '7px 10px', color: C.textDim }}>{i + 1}</td>
                <td style={{ padding: '7px 10px', color: C.textBright }}>{r.home_team} vs {r.away_team}<br /><span style={{ color: C.textDim, fontSize: 10 }}>{r.sport}</span></td>
                <td style={{ padding: '7px 10px', color: C.blue }}>{r.pick}</td>
                <td style={{ padding: '7px 10px' }}><Badge color={r.is_home ? C.green : C.amber}>{r.is_home ? 'H' : 'A'}</Badge></td>
                <td style={{ padding: '7px 10px', color: C.textBright }}>{r.confidence ?? '—'}%</td>
                <td style={{ padding: '7px 10px', color: (r.odds ?? 0) > 0 ? C.green : C.text }}>{fmt(r.odds)}</td>
                <td style={{ padding: '7px 10px' }}>{status ? <Badge color={statusColor}>{status.toUpperCase()}</Badge> : <span style={{ color: C.textDim }}>pending</span>}</td>
                <td style={{ padding: '7px 10px', color: C.textDim }}>{r.home_score != null ? `${r.home_score}-${r.away_score}` : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// -- Types --------------------------------------------------------------------
type TabId = 'odds' | 'picks' | 'results' | 'lines' | 'early' | 'analyzer' | 'config';

const TABS: { id: TabId; label: string }[] = [
  { id: 'odds', label: 'LIVE ODDS' },
  { id: 'picks', label: 'PICKS' },
  { id: 'results', label: 'RESULTS' },
  { id: 'lines', label: 'LINE MOVES' },
  { id: 'early', label: 'EARLY LINES' },
  { id: 'analyzer', label: 'ANALYZER' },
  { id: 'config', label: 'CONFIG' },
];

// -- Main component -----------------------------------------------------------
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>('odds');
  const [secret, setSecret] = useState('');

  // dates
  const [gameDate, setGameDate] = useState(() => getToday());
  const [earlyOffset, setEarlyOffset] = useState(4);
  const earlyDate = subtractDays(gameDate, earlyOffset);
  // Note: earlyOffset is MAX days for the range (0 to earlyOffset)
  const regularDate = gameDate;
  const resultsDate = getYesterday();
  const cronFileDate = getToday();

  // live odds
  const [liveOdds, setLiveOdds] = useState<any[]>([]);
  const [oddsLoading, setOddsLoading] = useState(false);
  const [oddsError, setOddsError] = useState<string | null>(null);
  const [selectedSports, setSelectedSports] = useState<string[]>(['basketball_nba', 'basketball_ncaab', 'icehockey_nhl']);
  const [oddsFilter, setOddsFilter] = useState('');
  const [oddsSort, setOddsSort] = useState<'time' | 'sport' | 'edge'>('time');
  const [oddsLastFetched, setOddsLastFetched] = useState<string | null>(null);

  // cron
  const [cronLog, setCronLog] = useState<{ job: string; ok: boolean; msg: string } | null>(null);
  const [cronLoading, setCronLoading] = useState<string | null>(null);

  // results
  const [resultsList, setResultsList] = useState<any[]>([]);
  const [resultsListDate, setResultsListDate] = useState<string | null>(null);
  const [fallbackSummary, setFallbackSummary] = useState<Record<string, string | number> | null>(null);
  const [scoresByLeague, setScoresByLeague] = useState<Record<string, { count: number; source: 'odds' | 'fallback' }> | null>(null);

  // line compare
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareResult, setCompareResult] = useState<any>(null);

  // keys
  const [keys, setKeys] = useState<{ id: string; label: string; createdAt: string }[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [keyLabel, setKeyLabel] = useState('');
  const [keyValue, setKeyValue] = useState('');
  const [keyLog, setKeyLog] = useState<string | null>(null);

  // trading settings
  const [tradeSettings, setTradeSettings] = useState<{ enabled: boolean; stakeCents: number; minConfidence: number; maxPicksPerDay: number; dryRun: boolean } | null>(null);
  const [tradeMsg, setTradeMsg] = useState<string | null>(null);
  const loadTrading = async () => {
    if (!secret.trim()) { setTradeMsg('Enter admin secret first.'); return; }
    setTradeMsg(null);
    try {
      const res = await fetch('/api/progno/admin/trading/settings', { headers: { Authorization: `Bearer ${secret.trim()}` }, cache: 'no-store' });
      const j = await res.json();
      if (res.ok && j.success) setTradeSettings(j.settings);
      else setTradeMsg(j.error || 'Failed to load trading settings');
    } catch (e: any) { setTradeMsg(e?.message || 'Failed to load'); }
  };
  const saveTrading = async () => {
    if (!secret.trim() || !tradeSettings) { setTradeMsg('Enter secret and adjust settings.'); return; }
    setTradeMsg(null);
    try {
      const res = await fetch('/api/progno/admin/trading/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret.trim()}` }, body: JSON.stringify(tradeSettings) });
      const j = await res.json();
      if (res.ok && j.success) { setTradeSettings(j.settings); setTradeMsg('Saved.'); } else setTradeMsg(j.error || 'Save failed');
    } catch (e: any) { setTradeMsg(e?.message || 'Save failed'); }
  };
  const runKalshiNow = async () => {
    if (!secret.trim()) { setTradeMsg('Enter admin secret first.'); return; }
    // Save current settings first so execute reads the latest dryRun/enabled state
    if (tradeSettings) {
      try {
        await fetch('/api/progno/admin/trading/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret.trim()}` }, body: JSON.stringify(tradeSettings) });
      } catch { /* proceed anyway */ }
    }
    setTradeMsg('Running...');
    try {
      const res = await fetch('/api/progno/admin/trading/execute', { method: 'POST', headers: { Authorization: `Bearer ${secret.trim()}` } });
      const j = await res.json();
      if (res.ok && j.success) {
        const mode = j.dryRun ? 'DRY-RUN' : 'LIVE';
        const matched = (j.matched ?? 0) || ((j.dryRuns || 0) + (j.submitted || 0));
        const counts = `${j.totalPicks} picks · ${matched} matched · ${j.noMarket ?? 0} no market · ${j.errors ?? 0} errors`;
        console.log('[kalshi-debug]', j.debug);
        setTradeMsg(`${mode}: ${counts} @ ${j.stakePerPick ?? '$5.00'} each | markets fetched: ${j.debug?.marketsFetched ?? '?'} | configured: ${j.configured}`);
      } else setTradeMsg(j.error || 'Execute failed');
    } catch (e: any) { setTradeMsg(e?.message || 'Execute failed'); }
  };

  // cron jobs editor
  const [cronJobs, setCronJobs] = useState<any[]>([]);
  const [cronMsg, setCronMsg] = useState<string | null>(null);
  const loadCronJobs = async () => {
    if (!secret.trim()) { setCronMsg('Enter admin secret first.'); return; }
    setCronMsg(null);
    try {
      const res = await fetch('/api/progno/admin/cron/jobs', { headers: { Authorization: `Bearer ${secret.trim()}` }, cache: 'no-store' });
      const j = await res.json();
      if (res.ok && j.success) setCronJobs(Array.isArray(j.jobs) ? j.jobs : []);
      else setCronMsg(j.error || 'Failed to load jobs');
    } catch (e: any) { setCronMsg(e?.message || 'Failed to load'); }
  };
  const addCronJob = async (name: string, url: string, schedule: string) => {
    if (!secret.trim()) return;
    try {
      const res = await fetch('/api/progno/admin/cron/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret.trim()}` }, body: JSON.stringify({ name, url, schedule, method: 'GET', enabled: true }) });
      const j = await res.json();
      if (res.ok && j.success) { setCronJobs(j.jobs || []); setCronMsg('Job saved.'); } else setCronMsg(j.error || 'Failed to save job');
    } catch (e: any) { setCronMsg(e?.message || 'Failed to save job'); }
  };
  const deleteCronJob = async (id: string) => {
    if (!secret.trim()) return;
    try { const res = await fetch('/api/progno/admin/cron/jobs', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret.trim()}` }, body: JSON.stringify({ id }) }); const j = await res.json(); if (res.ok && j.success) setCronJobs(j.jobs || []); } catch { }
  };

  useEffect(() => {
    const today = getToday();
    if (gameDate !== today) setGameDate(today);
  }, []);

  // -- Live Odds ---------------------------------------------------------------
  const fetchLiveOdds = async () => {
    if (!secret.trim()) { setOddsError('Enter admin secret first'); return; }
    if (selectedSports.length === 0) { setOddsError('Select at least one sport'); return; }
    setOddsLoading(true);
    setOddsError(null);
    try {
      const res = await fetch(`/api/progno/admin/live-odds?sports=${selectedSports.join(',')}`, { headers: { Authorization: `Bearer ${secret.trim()}` }, cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setLiveOdds(data.games || []);
        setOddsLastFetched(new Date().toLocaleTimeString());
        if (data.errors && Object.keys(data.errors).length > 0) {
          setOddsError(`Partial errors: ${JSON.stringify(data.errors)}`);
        }
      } else {
        setOddsError(data.error || 'Failed to fetch odds');
      }
    } catch (e: any) {
      setOddsError(e?.message || 'Network error');
    } finally {
      setOddsLoading(false);
    }
  };

  const toggleSport = (key: string) => {
    setSelectedSports(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  // -- Cron --------------------------------------------------------------------
  const runCron = async (job: 'daily-predictions' | 'daily-results') => {
    if (!secret.trim()) { setCronLog({ job, ok: false, msg: 'Enter admin secret first.' }); return; }
    setCronLoading(job);
    setCronLog(null);
    setFallbackSummary(null);
    setScoresByLeague(null);
    try {
      const body: any = { secret: secret.trim(), job };
      if (job === 'daily-results') body.date = resultsDate;
      const res = await fetch('/api/progno/admin/run-cron', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok && data.success) {
        const summary = data.data?.summary;
        let msg: string;
        if (job === 'daily-results' && summary && typeof summary === 'object') {
          const { total, correct, pending, graded, winRate } = summary as any;
          const wrong = (graded ?? 0) - (correct ?? 0);
          msg = `${total ?? 0} picks: ${correct ?? 0} correct, ${wrong} wrong, ${pending ?? 0} pending. Win rate ${winRate ?? 0}% (of ${graded ?? 0} graded).`;
          setResultsList(Array.isArray(data.data?.results) ? data.data.results : []);
          setResultsListDate(resultsDate);
          setFallbackSummary(data.data?.fallbackSummary ?? null);
          setScoresByLeague(data.data?.scoresByLeague ?? null);
        } else {
          msg = data.data?.message ?? (summary ? JSON.stringify(summary) : 'Done');
          if (job !== 'daily-results') setResultsList([]);
        }
        setCronLog({ job, ok: true, msg });
      } else {
        setCronLog({ job, ok: false, msg: data.error || data.detail?.error || JSON.stringify(data) });
      }
    } catch (e: any) {
      setCronLog({ job, ok: false, msg: e?.message || 'Request failed' });
    } finally {
      setCronLoading(null);
    }
  };

  const runBothPredictions = async () => {
    if (!secret.trim()) { setCronLog({ job: 'daily-predictions', ok: false, msg: 'Enter admin secret first.' }); return; }
    setCronLoading('daily-predictions');
    setCronLog(null);
    try {
      const baseBody = { secret: secret.trim(), job: 'daily-predictions' };
      const res1 = await fetch('/api/progno/admin/run-cron', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...baseBody, earlyLines: false }) });
      const data1 = await res1.json();
      if (!res1.ok || !data1.success) { setCronLog({ job: 'daily-predictions', ok: false, msg: data1.error || data1.detail?.error || 'Regular run failed.' }); return; }
      const msg1 = data1.data?.message ?? '';
      const res2 = await fetch('/api/progno/admin/run-cron', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...baseBody, earlyLines: true }) });
      const data2 = await res2.json();
      if (!res2.ok || !data2.success) { setCronLog({ job: 'daily-predictions', ok: false, msg: (data2.error || 'Early run failed') + '. Regular already saved.' }); return; }
      const msg2 = data2.data?.message ?? '';
      setCronLog({ job: 'daily-predictions', ok: true, msg: `${msg1} ${msg2}` });
    } catch (e: any) {
      setCronLog({ job: 'daily-predictions', ok: false, msg: e?.message || 'Request failed' });
    } finally {
      setCronLoading(null);
    }
  };

  // -- Keys --------------------------------------------------------------------
  const loadKeys = async () => {
    if (!secret.trim()) return;
    setKeysLoading(true);
    try {
      const res = await fetch('/api/progno/admin/keys', { headers: { Authorization: `Bearer ${secret.trim()}` } });
      const data = await res.json();
      setKeys(data.success && Array.isArray(data.keys) ? data.keys : []);
    } catch { setKeys([]); } finally { setKeysLoading(false); }
  };

  const addKey = async () => {
    if (!secret.trim() || !keyValue.trim()) { setKeyLog('Secret and key value are required.'); return; }
    setKeyLog(null);
    try {
      const res = await fetch('/api/progno/admin/keys', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret.trim()}` }, body: JSON.stringify({ label: keyLabel.trim() || 'Odds API', value: keyValue.trim() }) });
      const data = await res.json();
      if (data.success) { setKeyValue(''); setKeyLabel(''); setKeyLog('Key added.'); loadKeys(); }
      else setKeyLog(data.error || 'Failed');
    } catch (e: any) { setKeyLog(e?.message || 'Failed'); }
  };

  const deleteKey = async (id: string) => {
    if (!secret.trim()) return;
    try {
      const res = await fetch('/api/progno/admin/keys', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret.trim()}` }, body: JSON.stringify({ id }) });
      if (res.ok) loadKeys();
    } catch { }
  };

  // -- Line compare ------------------------------------------------------------
  const runEarlyVsRegular = async () => {
    if (!secret.trim()) { setCompareResult({ error: 'Enter admin secret first.' }); return; }
    setCompareLoading(true);
    setCompareResult(null);
    try {
      const res = await fetch('/api/progno/admin/early-vs-regular', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: secret.trim(), earlyDate, regularDate }) });
      const data = await res.json();
      if (res.ok && data.success) {
        setCompareResult({ matches: data.matches || [], message: data.message || '', sideFlippedCount: data.sideFlippedCount ?? 0, hintNoOverlap: data.hintNoOverlap });
      } else {
        setCompareResult({ error: data.error || JSON.stringify(data), availableFiles: data.availableFiles, hint: data.hint });
      }
    } catch (e: any) { setCompareResult({ error: e?.message || 'Request failed' }); }
    finally { setCompareLoading(false); }
  };

  // -- Render ------------------------------------------------------------------
  const filteredOdds = liveOdds
    .filter(g => !oddsFilter || g.home_team.toLowerCase().includes(oddsFilter.toLowerCase()) || g.away_team.toLowerCase().includes(oddsFilter.toLowerCase()))
    .sort((a, b) => {
      if (oddsSort === 'sport') return a.sport.localeCompare(b.sport);
      if (oddsSort === 'edge') {
        const ea = a.noVig?.home != null ? Math.abs(a.noVig.home - 50) : 0;
        const eb = b.noVig?.home != null ? Math.abs(b.noVig.home - 50) : 0;
        return eb - ea;
      }
      return new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime();
    });

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: C.sans }}>
      {/* ── Header ── */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 700, color: C.green, letterSpacing: '3px' }}>◆ PROGNO</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            type="password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            placeholder="ADMIN_SECRET"
            style={{ width: '100%', maxWidth: 260, padding: '5px 10px', background: '#050c16', border: `1px solid ${secret.trim() ? C.green + '50' : C.border}`, borderRadius: 4, color: C.text, fontFamily: C.mono, fontSize: 11 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Btn onClick={() => setGameDate(getYesterday())} color={C.textDim} style={{ padding: '5px 10px', fontSize: 11 }}>-1D</Btn>
          <input
            type="date"
            value={gameDate}
            onChange={e => setGameDate(e.target.value)}
            style={{ padding: '5px 10px', background: '#050c16', border: `1px solid ${C.borderBright}`, borderRadius: 4, color: C.textBright, fontFamily: C.mono, fontSize: 11 }}
          />
          <Btn onClick={() => setGameDate(getToday())} color={C.green} style={{ padding: '5px 10px', fontSize: 11 }}>TODAY</Btn>
          <Btn onClick={() => setGameDate(addDays(getToday(), 1))} color={C.textDim} style={{ padding: '5px 10px', fontSize: 11 }}>+1D</Btn>
        </div>
        <Link href="/progno" style={{ color: C.textDim, fontSize: 11, fontFamily: C.mono, textDecoration: 'none' }}>← DASHBOARD</Link>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ background: '#050c16', borderBottom: `1px solid ${C.border}`, padding: '0 20px', display: 'flex', gap: 0, overflowX: 'auto' }}>
        {TABS.map(tab => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '11px 18px', background: 'none', border: 'none',
                borderBottom: active ? `2px solid ${C.green}` : '2px solid transparent',
                color: active ? C.green : C.textDim,
                fontFamily: C.mono, fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>

        {/* ═══ LIVE ODDS ═══ */}
        {activeTab === 'odds' && (
          <div>
            <Card style={{ marginBottom: 16 }}>
              <SectionLabel>SELECT SPORTS & FETCH</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {SPORTS_LIST.map(s => {
                  const sel = selectedSports.includes(s.key);
                  return (
                    <button
                      key={s.key}
                      onClick={() => toggleSport(s.key)}
                      style={{
                        padding: '5px 12px', background: sel ? `${C.blue}20` : 'transparent',
                        border: `1px solid ${sel ? C.blue + '70' : C.border}`,
                        borderRadius: 4, color: sel ? C.blue : C.textDim,
                        fontFamily: C.mono, fontSize: 11, cursor: 'pointer',
                      }}
                    >
                      {s.icon} {s.label}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Btn onClick={fetchLiveOdds} disabled={oddsLoading || !secret.trim()} color={C.blue}>
                  {oddsLoading ? '⟳ FETCHING...' : '◈ FETCH LIVE ODDS'}
                </Btn>
                {liveOdds.length > 0 && (
                  <>
                    <input
                      placeholder="Filter teams..."
                      value={oddsFilter}
                      onChange={e => setOddsFilter(e.target.value)}
                      style={{ padding: '5px 10px', background: '#050c16', border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontFamily: C.mono, fontSize: 11, width: 180 }}
                    />
                    <select
                      value={oddsSort}
                      onChange={e => setOddsSort(e.target.value as any)}
                      style={{ padding: '5px 10px', background: '#050c16', border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontFamily: C.mono, fontSize: 11 }}
                    >
                      <option value="time">Sort: TIME</option>
                      <option value="sport">Sort: SPORT</option>
                      <option value="edge">Sort: EDGE</option>
                    </select>
                    <Badge color={C.green}>{filteredOdds.length} GAMES</Badge>
                  </>
                )}
                {oddsLastFetched && <span style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim }}>last: {oddsLastFetched}</span>}
              </div>
              {oddsError && <div style={{ marginTop: 10, fontFamily: C.mono, fontSize: 11, color: C.amber }}>⚠ {oddsError}</div>}
            </Card>

            {filteredOdds.length > 0 && (
              <div style={{ overflowX: 'auto', border: `1px solid ${C.border}`, borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: C.mono, fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.borderBright}`, background: '#060d18' }}>
                      {['SPORT', 'MATCHUP', 'TIME', 'HOME ML', 'AWAY ML', 'BEST HOME', 'BEST AWAY', 'SPREAD', 'TOTAL', 'NO-VIG H', 'NO-VIG A', 'EDGE', 'BKS'].map(h => (
                        <th key={h} style={{ padding: '9px 8px', textAlign: 'left', color: C.textDim, fontWeight: 700, letterSpacing: 1, fontSize: 9, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOdds.map((game, i) => {
                      const nvHome = game.noVig?.home;
                      const nvAway = game.noVig?.away;
                      const mktImplied = game.consensus?.homeML != null ? (game.consensus.homeML < 0 ? Math.abs(game.consensus.homeML) / (Math.abs(game.consensus.homeML) + 100) * 100 : 100 / (game.consensus.homeML + 100) * 100) : null;
                      const edge = nvHome != null && mktImplied != null ? (nvHome - mktImplied).toFixed(1) : null;
                      const edgeNum = edge != null ? parseFloat(edge) : 0;
                      return (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? 'transparent' : '#060d18' }}>
                          <td style={{ padding: '9px 8px' }}><Badge color={C.green}>{game.sport}</Badge></td>
                          <td style={{ padding: '9px 8px', color: C.textBright, whiteSpace: 'nowrap' }}>
                            <div>{game.away_team}</div>
                            <div style={{ color: C.textDim, fontSize: 10 }}>@ {game.home_team}</div>
                          </td>
                          <td style={{ padding: '9px 8px', color: C.textDim, fontSize: 10, whiteSpace: 'nowrap' }}>{fmtTime(game.commence_time)}</td>
                          <td style={{ padding: '9px 8px', color: (game.consensus?.homeML ?? 0) > 0 ? C.green : C.text }}>{fmt(game.consensus?.homeML)}</td>
                          <td style={{ padding: '9px 8px', color: (game.consensus?.awayML ?? 0) > 0 ? C.green : C.text }}>{fmt(game.consensus?.awayML)}</td>
                          <td style={{ padding: '9px 8px', color: C.blue }}>{fmt(game.best?.homeML)}</td>
                          <td style={{ padding: '9px 8px', color: C.blue }}>{fmt(game.best?.awayML)}</td>
                          <td style={{ padding: '9px 8px', color: C.amber }}>{game.consensus?.spread != null ? game.consensus.spread : '—'}</td>
                          <td style={{ padding: '9px 8px' }}>{game.consensus?.total != null ? game.consensus.total : '—'}</td>
                          <td style={{ padding: '9px 8px', color: C.blue }}>{nvHome != null ? nvHome.toFixed(1) + '%' : '—'}</td>
                          <td style={{ padding: '9px 8px', color: C.blue }}>{nvAway != null ? nvAway.toFixed(1) + '%' : '—'}</td>
                          <td style={{ padding: '9px 8px', color: edgeNum > 3 ? C.green : edgeNum < -3 ? C.red : C.textDim }}>{edge != null ? (edgeNum > 0 ? '+' : '') + edge + '%' : '—'}</td>
                          <td style={{ padding: '9px 8px', color: C.textDim }}>{game.bookmakerCount}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {liveOdds.length === 0 && !oddsLoading && (
              <Card style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontFamily: C.mono, fontSize: 12, color: C.textDim }}>
                  ◈ Select sports and click FETCH LIVE ODDS to load the latest lines
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ═══ PICKS ═══ */}
        {activeTab === 'picks' && (
          <div>
            <Card style={{ marginBottom: 16 }}>
              <SectionLabel>PREDICTION PIPELINE</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, letterSpacing: 1, marginBottom: 4 }}>REGULAR FILE</div>
                  <code style={{ color: C.green, fontSize: 11 }}>predictions-{cronFileDate}.json</code>
                </div>
                <div>
                  <div style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, letterSpacing: 1, marginBottom: 4 }}>EARLY FILE</div>
                  <code style={{ color: C.amber, fontSize: 11 }}>predictions-early-{cronFileDate}.json</code>
                </div>
                <div>
                  <div style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, letterSpacing: 1, marginBottom: 4 }}>EARLY RANGE (0-N days)</div>
                  <select
                    value={earlyOffset}
                    onChange={e => setEarlyOffset(Number(e.target.value))}
                    style={{ padding: '4px 8px', background: '#050c16', border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontFamily: C.mono, fontSize: 11 }}
                  >
                    {[2, 3, 4, 5].map(n => <option key={n} value={n}>0-{n} days</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Btn onClick={runBothPredictions} disabled={!!cronLoading} color={C.green}>
                  {cronLoading === 'daily-predictions' ? '⟳ RUNNING BOTH...' : '▶ RUN PREDICTIONS (BOTH)'}
                </Btn>
                <Btn onClick={runKalshiNow} disabled={!secret.trim()} color={C.blue}>
                  💰 SUBMIT TO KALSHI ($5 each)
                </Btn>
              </div>
              {cronLog && <StatusLine ok={cronLog.ok} msg={cronLog.msg} />}
              {tradeMsg && (() => {
                const isErr = tradeMsg.startsWith('Enter') || tradeMsg.toLowerCase().includes('fail') || tradeMsg.toLowerCase().includes('error');
                const col = isErr ? C.red : C.blue;
                return <div style={{ marginTop: 10, padding: '10px 14px', background: `${col}10`, border: `1px solid ${col}30`, borderRadius: 5, fontFamily: C.mono, fontSize: 12, color: col }}>{isErr ? '✗ ' : '⚡ '}{tradeMsg}</div>;
              })()}
            </Card>

            <div style={{ marginBottom: 16 }}>
              <Card>
                <SectionLabel>PRINT BETS TRACKER — {gameDate}</SectionLabel>
                <PrintBetsSection date={gameDate} />
              </Card>
            </div>

            <Card>
              <SectionLabel>STRATEGY SETTINGS (ACTIVE DEFAULTS — override via Vercel env vars)</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[
                  ['STRATEGY', 'best (FILTER_STRATEGY)'], ['ODDS RANGE', '-200 to +500'], ['MIN CONF', '57% (PROGNO_MIN_CONFIDENCE)'],
                  ['HOME BIAS', '+5% / Away -5%'], ['HOME ONLY', 'Off (HOME_ONLY_MODE=1 to enable)'],
                  ['SEASON CHECK', 'On'], ['STREAK WIN 3+', '1.1x'], ['STREAK LOSS 3+', '0.75x'],
                  ['EARLY WINDOW', '2–5 days ahead'], ['EARLY DECAY 2d', '97%'], ['EARLY DECAY 3d', '93%'], ['EARLY DECAY 5d+', '75%'],
                  ['NFL FLOOR', '62% (PROGNO_FLOOR_NFL)'], ['NCAAF FLOOR', '62%'], ['NBA FLOOR', '57%'], ['NHL FLOOR', '57%'],
                  ['TOP N PICKS', '25'],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: '#060d18', border: `1px solid ${C.border}`, borderRadius: 4, padding: '7px 10px', minWidth: 130 }}>
                    <div style={{ fontFamily: C.mono, fontSize: 8, color: C.textDim, letterSpacing: 1, marginBottom: 3 }}>{k}</div>
                    <div style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 700, color: C.textBright }}>{v}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ═══ RESULTS ═══ */}
        {activeTab === 'results' && (
          <div>
            <Card style={{ marginBottom: 16 }}>
              <SectionLabel>GRADE RESULTS</SectionLabel>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                <div>
                  <span style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, letterSpacing: 1 }}>RESULTS DATE: </span>
                  <code style={{ color: C.blue, fontSize: 12 }}>{resultsDate}</code>
                  <span style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, marginLeft: 8 }}>(yesterday)</span>
                </div>
                <Btn onClick={() => runCron('daily-results')} disabled={!!cronLoading} color={C.blue}>
                  {cronLoading === 'daily-results' ? '⟳ GRADING...' : '◈ GRADE YESTERDAY'}
                </Btn>
              </div>
              {cronLog && cronLog.job === 'daily-results' && <StatusLine ok={cronLog.ok} msg={cronLog.msg} />}
              {cronLog?.ok && cronLog.job === 'daily-results' && scoresByLeague && Object.keys(scoresByLeague).length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(scoresByLeague).map(([league, info]) => (
                    <Badge key={league} color={info.source === 'fallback' ? C.amber : C.green}>
                      {league}: {info.count} ({info.source === 'fallback' ? 'API-Sports' : 'Odds API'})
                    </Badge>
                  ))}
                </div>
              )}
            </Card>

            {resultsList.length > 0 && resultsListDate && (
              <Card>
                <SectionLabel>RESULTS — {resultsListDate} ({resultsList.length} picks)</SectionLabel>
                <DarkResultsTable rows={resultsList} />
              </Card>
            )}

            {resultsList.length === 0 && (
              <Card style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontFamily: C.mono, fontSize: 12, color: C.textDim }}>◇ Run grade to see results here</div>
              </Card>
            )}
          </div>
        )}

        {/* ═══ LINE MOVES ═══ */}
        {activeTab === 'lines' && (
          <div>
            <Card style={{ marginBottom: 16 }}>
              <SectionLabel>EARLY vs REGULAR — LINE MOVE DETECTION</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, letterSpacing: 1, marginBottom: 3 }}>EARLY FILE</div>
                  <code style={{ color: C.amber, fontSize: 11 }}>predictions-early-{earlyDate}.json</code>
                </div>
                <div>
                  <div style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, letterSpacing: 1, marginBottom: 3 }}>REGULAR FILE</div>
                  <code style={{ color: C.green, fontSize: 11 }}>predictions-{regularDate}.json</code>
                </div>
                <div>
                  <span style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, letterSpacing: 1 }}>RANGE: </span>
                  <select
                    value={earlyOffset}
                    onChange={e => setEarlyOffset(Number(e.target.value))}
                    style={{ padding: '4px 8px', background: '#050c16', border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontFamily: C.mono, fontSize: 11, marginLeft: 6 }}
                  >
                    {[2, 3, 4, 5].map(n => <option key={n} value={n}>0-{n} days</option>)}
                  </select>
                </div>
              </div>
              <Btn onClick={runEarlyVsRegular} disabled={compareLoading || !secret.trim()} color={C.amber}>
                {compareLoading ? '⟳ COMPARING...' : '⟺ COMPARE LINES'}
              </Btn>

              {compareResult && (
                <div style={{ marginTop: 14 }}>
                  {'error' in compareResult ? (
                    <StatusLine ok={false} msg={compareResult.error} />
                  ) : (
                    <>
                      <div style={{ fontFamily: C.mono, fontSize: 11, color: C.textBright, marginBottom: 10 }}>{compareResult.message}</div>
                      {compareResult.matches.length === 0 ? (
                        <div style={{ fontFamily: C.mono, fontSize: 11, color: C.textDim }}>No matching games found.</div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: C.mono, fontSize: 11 }}>
                            <thead>
                              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                                {['MATCHUP', 'EARLY PICK', 'REGULAR PICK', 'STATUS'].map(h => (
                                  <th key={h} style={{ padding: '7px 8px', textAlign: 'left', color: C.textDim, fontSize: 9, letterSpacing: 1 }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {compareResult.matches.map((m: any, i: number) => (
                                <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: m.side_flipped ? `${C.amber}10` : 'transparent' }}>
                                  <td style={{ padding: '7px 8px', color: C.textBright }}>{m.home_team} vs {m.away_team}<br /><span style={{ color: C.textDim, fontSize: 9 }}>{m.sport}</span></td>
                                  <td style={{ padding: '7px 8px' }}>{m.early_pick} <span style={{ color: C.textDim }}>({fmt(m.early_odds)})</span></td>
                                  <td style={{ padding: '7px 8px' }}>{m.regular_pick} <span style={{ color: C.textDim }}>({fmt(m.regular_odds)})</span></td>
                                  <td style={{ padding: '7px 8px' }}>
                                    {m.side_flipped ? <Badge color={C.amber}>⚡ SIDE FLIPPED — ARB?</Badge> : <span style={{ color: C.textDim }}>same</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </Card>

            <Card style={{ marginBottom: 16 }}>
              <SectionLabel>ENHANCED EARLY-LINE ANALYSIS</SectionLabel>
              <EnhancedEarlyLinesSection secret={secret} earlyDate={earlyDate} regularDate={regularDate} />
            </Card>

            <Card>
              <SectionLabel>PERFORMANCE REPORTS</SectionLabel>
              <ReportsSection secret={secret} date={gameDate} />
            </Card>
          </div>
        )}

        {/* ═══ EARLY LINES ═══ */}
        {activeTab === 'early' && (
          <div>
            <EarlyLinesSection />
          </div>
        )}

        {/* ═══ ANALYZER ═══ */}
        {activeTab === 'analyzer' && (
          <div>
            <Card style={{ marginBottom: 12 }}>
              <SectionLabel>CEVICT PROBABILITY ANALYZER — 16 ML MODELS</SectionLabel>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ fontFamily: C.mono, fontSize: 11, color: C.textDim }}>
                  Loaded date: <span style={{ color: C.green }}>{gameDate}</span>
                  <span style={{ marginLeft: 12 }}>Click "Load Picks" in the sidebar to auto-fetch from API, or paste JSON.</span>
                </div>
              </div>
            </Card>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', height: 'calc(100vh - 200px)', minHeight: 600 }}>
              <iframe
                src={`/api/serve/analyzer?date=${gameDate}`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Cevict Probability Analyzer"
              />
            </div>
          </div>
        )}

        {/* ═══ CONFIG ═══ */}
        {activeTab === 'config' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
            <Card>
              <SectionLabel>ODDS API KEYS</SectionLabel>
              <p style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim, marginBottom: 12 }}>
                Stored in <code style={{ color: C.green }}>.progno/keys.json</code>. First key is used if ODDS_API_KEY not in .env.local
              </p>
              <Btn onClick={loadKeys} disabled={!secret.trim() || keysLoading} color={C.textDim} style={{ marginBottom: 12 }}>
                {keysLoading ? '⟳ LOADING...' : '↺ LOAD KEYS'}
              </Btn>
              {keys.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  {keys.map(k => (
                    <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: `1px solid ${C.border}`, fontFamily: C.mono, fontSize: 11 }}>
                      <span style={{ color: C.textBright, flex: 1 }}>{k.label || '(no label)'}</span>
                      <span style={{ color: C.textDim, fontSize: 10 }}>{k.id}</span>
                      <button onClick={() => deleteKey(k.id)} style={{ padding: '3px 8px', background: `${C.red}18`, border: `1px solid ${C.red}40`, borderRadius: 3, color: C.red, cursor: 'pointer', fontSize: 10, fontFamily: C.mono }}>✗</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  type="text"
                  value={keyLabel}
                  onChange={e => setKeyLabel(e.target.value)}
                  placeholder="Label (e.g. Odds API v2)"
                  style={{ padding: '6px 10px', background: '#050c16', border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontFamily: C.mono, fontSize: 11 }}
                />
                <input
                  type="password"
                  value={keyValue}
                  onChange={e => setKeyValue(e.target.value)}
                  placeholder="API key value"
                  style={{ padding: '6px 10px', background: '#050c16', border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontFamily: C.mono, fontSize: 11 }}
                />
                <Btn onClick={addKey} disabled={!secret.trim() || !keyValue.trim()} color={C.green}>+ ADD KEY</Btn>
              </div>
              {keyLog && <div style={{ marginTop: 8, fontFamily: C.mono, fontSize: 11, color: C.textDim }}>{keyLog}</div>}
            </Card>

            <Card>
              <SectionLabel>ENVIRONMENT VARIABLES</SectionLabel>
              <p style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim, marginBottom: 12 }}>
                Edit <code style={{ color: C.green }}>apps/progno/.env.local</code> — restart dev server after changes
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ENV_VARS.map(v => <Badge key={v} color={C.textDim}>{v}</Badge>)}
              </div>
            </Card>

            <Card>
              <SectionLabel>TRADING — KALSHI AUTO-EXECUTE ($5/pick default)</SectionLabel>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <Btn onClick={loadTrading} disabled={!secret.trim()} color={C.textDim}>↺ LOAD</Btn>
                <Btn onClick={saveTrading} disabled={!secret.trim() || !tradeSettings} color={C.green}>💾 SAVE</Btn>
                <Btn onClick={runKalshiNow} disabled={!secret.trim()} color={C.blue}>▶ RUN NOW</Btn>
              </div>
              {tradeSettings && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim }}>ENABLED</span>
                    <input type="checkbox" checked={!!tradeSettings.enabled} onChange={e => setTradeSettings({ ...(tradeSettings as any), enabled: e.target.checked })} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim }}>STAKE (cents)</span>
                    <input type="number" value={tradeSettings.stakeCents} onChange={e => setTradeSettings({ ...(tradeSettings as any), stakeCents: Number(e.target.value) })} style={{ padding: '6px 8px', background: '#050c16', border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontFamily: C.mono }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim }}>MIN CONF (%)</span>
                    <input type="number" value={tradeSettings.minConfidence} onChange={e => setTradeSettings({ ...(tradeSettings as any), minConfidence: Number(e.target.value) })} style={{ padding: '6px 8px', background: '#050c16', border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontFamily: C.mono }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim }}>MAX PICKS/DAY</span>
                    <input type="number" value={tradeSettings.maxPicksPerDay} onChange={e => setTradeSettings({ ...(tradeSettings as any), maxPicksPerDay: Number(e.target.value) })} style={{ padding: '6px 8px', background: '#050c16', border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontFamily: C.mono }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim }}>DRY RUN</span>
                    <input type="checkbox" checked={!!tradeSettings.dryRun} onChange={e => setTradeSettings({ ...(tradeSettings as any), dryRun: e.target.checked })} />
                  </label>
                </div>
              )}
              {tradeMsg && <div style={{ marginTop: 8, fontFamily: C.mono, fontSize: 11, color: C.textDim }}>{tradeMsg}</div>}
              <div style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim, marginTop: 10 }}>Requires env: KALSHI_API_KEY_ID, KALSHI_PRIVATE_KEY. Uses limit buy at yes_ask for each qualifying market.</div>
            </Card>

            <Card style={{ gridColumn: '1 / -1' }}>
              <SectionLabel>CRON JOBS — MANAGE</SectionLabel>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <Btn onClick={loadCronJobs} disabled={!secret.trim()} color={C.textDim}>↺ LOAD JOBS</Btn>
                <Btn onClick={() => addCronJob('Daily Kalshi', '/api/cron/daily-kalshi', '0 9 * * *')} disabled={!secret.trim()} color={C.green}>+ ADD DAILY KALSHI (9:00)</Btn>
                <Btn onClick={() => runCron('daily-kalshi')} disabled={!secret.trim()} color={C.blue}>▶ RUN KALSHI NOW</Btn>
              </div>
              {cronMsg && <div style={{ fontFamily: C.mono, fontSize: 11, color: C.textDim, marginBottom: 8 }}>{cronMsg}</div>}
              {cronJobs.length > 0 ? (
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 6 }}>
                  {cronJobs.map(j => (
                    <div key={j.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, padding: '8px 10px', borderBottom: `1px solid ${C.border}` }}>
                      <div>
                        <div style={{ color: C.textBright, fontFamily: C.mono, fontSize: 12 }}>{j.name || j.id}</div>
                        <div style={{ color: C.textDim, fontFamily: C.mono, fontSize: 10 }}>{j.schedule} — {j.method || 'GET'} {j.url}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Btn onClick={() => deleteCronJob(j.id)} color={C.red}>✗ DELETE</Btn>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontFamily: C.mono, fontSize: 12, color: C.textDim }}>No cron jobs saved.</div>
              )}
              <div style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim, marginTop: 8 }}>Note: This stores jobs in .progno/cron-jobs.json for tracking. Use Vercel Cron or Windows Task Scheduler to hit the shown URLs on schedule.</div>
            </Card>

            <Card style={{ gridColumn: '1 / -1' }}>
              <SectionLabel>FILE PATHS</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: C.mono, fontSize: 11 }}>
                {[
                  ['Predictions (today)', `C:\\cevict-live\\apps\\progno\\predictions-${cronFileDate}.json`],
                  ['Early lines', `C:\\cevict-live\\apps\\progno\\predictions-early-${cronFileDate}.json`],
                  ['Results (yesterday)', `C:\\cevict-live\\apps\\progno\\results-${resultsDate}.json`],
                  ['Probability Analyzer', 'C:\\cevict-live\\apps\\progno\\cevict-probability-analyzer\\index.html'],
                ].map(([label, path]) => (
                  <div key={label} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 12px', background: '#060d18', borderRadius: 4 }}>
                    <span style={{ color: C.textDim, minWidth: 160 }}>{label}</span>
                    <code style={{ color: C.blue, flex: 1, wordBreak: 'break-all', fontSize: 10 }}>{path}</code>
                    <button
                      onClick={() => navigator.clipboard.writeText(path)}
                      style={{ padding: '3px 8px', background: `${C.blue}18`, border: `1px solid ${C.blue}40`, borderRadius: 3, color: C.blue, cursor: 'pointer', fontSize: 10, fontFamily: C.mono, whiteSpace: 'nowrap' }}
                    >
                      COPY
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
