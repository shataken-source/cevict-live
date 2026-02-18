// app/progno/admin/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import EnhancedEarlyLinesSection from '../../../components/admin/EnhancedEarlyLinesSection';
import PrintBetsSection from '../../../components/admin/PrintBetsSection';
import ReportsSection from '../../../components/admin/ReportsSection';

const ENV_VARS = [
  'CRON_SECRET',
  'ODDS_API_KEY',
  'NEXT_PUBLIC_ODDS_API_KEY',
  'ADMIN_PASSWORD',
  'PROGNO_ADMIN_PASSWORD',
  'ANTHROPIC_API_KEY',
  'API_SPORTS_KEY',
  'SPORTS_BLAZE_API_KEY',
  'SPORTSDATA_IO_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CRON_APP_URL',
  'NEXT_PUBLIC_PROGNO_URL',
];

const VIEWER_CONFIGS = [
  {
    name: 'Cevict Arb Tool',
    envPath: process.env.ARBITRAGE_TOOL_PATH,
    defaultPath: 'C:\\cevict-live\\apps\\progno\\cevict-arb-tool\\index.html',
  },
  {
    name: 'Cevict Picks Viewer',
    envPath: process.env.PICKS_VIEWER_PATH,
    defaultPath: 'C:\\cevict-live\\apps\\progno\\cevict-picks-viewer\\index.html',
  },
] as const;

const VIEWERS = VIEWER_CONFIGS.map((v) => {
  const path = (v.envPath || v.defaultPath).replace(/\\/g, '/');
  return {
    name: v.name,
    path,
    url: `file:///${path}`,
  };
});

// Date utility functions
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function subtractDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function ResultsTable({ rows }: { rows: any[] }) {
  const cell = { padding: '6px 10px', borderBottom: '1px solid #eee', fontSize: '13px' } as const;
  const th = { ...cell, fontWeight: 600, background: '#f5f5f5', position: 'sticky' as const, top: 0 };
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
      <thead>
        <tr>
          <th style={{ ...th, width: '28px' }}>#</th>
          <th style={th}>Match</th>
          <th style={th}>Pick</th>
          <th style={{ ...th, width: '64px' }}>Conf%</th>
          <th style={{ ...th, width: '72px' }}>Status</th>
          <th style={{ ...th, width: '80px' }}>Score</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td style={cell}>{i + 1}</td>
            <td style={cell}>{r.home_team} vs {r.away_team}</td>
            <td style={cell}>{r.pick}</td>
            <td style={cell}>{r.confidence != null ? (Number(r.confidence) > 1 ? Math.round(Number(r.confidence)) : Math.round(Number(r.confidence) * 100)) : '—'}</td>
            <td style={{ ...cell, color: r.status === 'win' ? '#0a0' : r.status === 'lose' ? '#c00' : '#666' }}>{r.status}</td>
            <td style={cell}>{r.actualScore ? `${r.actualScore.home}-${r.actualScore.away}` : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function PrognoAdminPage() {
  const [secret, setSecret] = useState('');
  const [activeTab, setActiveTab] = useState<'run' | 'analyze' | 'keys' | 'docs'>('run');

  // Unified date system - single source of truth
  // When you pick a "Game Date", we auto-calculate:
  // - Early date = game date minus 4 days (typical early run)
  // - Regular date = game date (when regular predictions run)
  // - Results date = yesterday (for grading)
  const [gameDate, setGameDate] = useState(() => getToday());
  const [earlyOffset, setEarlyOffset] = useState(4);

  // Derived dates (auto-calculated from gameDate)
  const earlyDate = subtractDays(gameDate, earlyOffset);
  const regularDate = gameDate;
  const resultsDate = getYesterday();
  // Date used by cron jobs when naming predictions files (always “today”)
  const cronFileDate = getToday();

  const [cronLog, setCronLog] = useState<{ job: string; ok: boolean; msg: string } | null>(null);
  const [cronLoading, setCronLoading] = useState<string | null>(null);

  const [keys, setKeys] = useState<{ id: string; label: string; createdAt: string }[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [keyLabel, setKeyLabel] = useState('');
  const [keyValue, setKeyValue] = useState('');
  const [keyLog, setKeyLog] = useState<string | null>(null);

  const [resultsList, setResultsList] = useState<any[]>([]);
  const [resultsListDate, setResultsListDate] = useState<string | null>(null);
  const [fallbackSummary, setFallbackSummary] = useState<Record<string, string | number> | null>(null);
  const [scoresByLeague, setScoresByLeague] = useState<Record<string, { count: number; source: 'odds' | 'fallback' }> | null>(null);

  const [compareLoading, setCompareLoading] = useState(false);
  const [compareResult, setCompareResult] = useState<{ matches: any[]; message: string; sideFlippedCount: number; hintNoOverlap?: string } | { error: string; availableFiles?: string[]; hint?: string } | null>(null);

  const [lastMainTab, setLastMainTab] = useState<string>('run');

  // Force reset to today's date on mount to prevent cached dates
  useEffect(() => {
    const today = getToday();
    if (gameDate !== today) {
      setGameDate(today);
    }
  }, []);

  // Sync lastMainTab whenever activeTab changes
  useEffect(() => {
    if (['run', 'analyze', 'keys', 'docs'].includes(activeTab)) {
      setLastMainTab(activeTab);
    }
  }, [activeTab]);

  const runEarlyVsRegular = async () => {
    if (!secret.trim()) {
      setCompareResult({ error: 'Enter admin secret first.' });
      return;
    }
    setCompareLoading(true);
    setCompareResult(null);
    try {
      const res = await fetch('/api/progno/admin/early-vs-regular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: secret.trim(), earlyDate, regularDate }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCompareResult({
          matches: data.matches || [],
          message: data.message || '',
          sideFlippedCount: data.sideFlippedCount ?? 0,
          hintNoOverlap: data.hintNoOverlap,
        });
      } else {
        setCompareResult({
          error: data.error || JSON.stringify(data),
          availableFiles: data.availableFiles,
          hint: data.hint,
        });
      }
    } catch (e: any) {
      setCompareResult({ error: e?.message || 'Request failed' });
    } finally {
      setCompareLoading(false);
    }
  };

  const runCron = async (job: 'daily-predictions' | 'daily-results') => {
    if (!secret.trim()) {
      setCronLog({ job, ok: false, msg: 'Enter admin secret first.' });
      return;
    }
    setCronLoading(job);
    setCronLog(null);
    setFallbackSummary(null);
    setScoresByLeague(null);
    try {
      const body: { secret: string; job: string; date?: string; earlyLines?: boolean } = { secret: secret.trim(), job };
      if (job === 'daily-results') body.date = resultsDate;
      const res = await fetch('/api/progno/admin/run-cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        let msg: string;
        const summary = data.data?.summary;
        if (job === 'daily-results' && summary && typeof summary === 'object') {
          const { total, correct, pending, graded, winRate } = summary as { total?: number; correct?: number; pending?: number; graded?: number; winRate?: number };
          const wrong = (graded ?? 0) - (correct ?? 0);
          msg = `${total ?? 0} picks: ${correct ?? 0} correct, ${wrong} wrong, ${pending ?? 0} pending. Win rate ${winRate ?? 0}% (of ${graded ?? 0} graded).`;
          setResultsList(Array.isArray(data.data?.results) ? data.data.results : []);
          setResultsListDate(resultsDate);
          setFallbackSummary(data.data?.fallbackSummary ?? null);
          setScoresByLeague(data.data?.scoresByLeague ?? null);
        } else {
          msg = data.data?.message ?? (summary ? JSON.stringify(summary) : 'Done');
          if (job !== 'daily-results') setResultsList([]);
          setFallbackSummary(null);
          setScoresByLeague(null);
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
    if (!secret.trim()) {
      setCronLog({ job: 'daily-predictions', ok: false, msg: 'Enter admin secret first.' });
      return;
    }
    setCronLoading('daily-predictions');
    setCronLog(null);
    const today = new Date().toISOString().split('T')[0];
    try {
      const baseBody = { secret: secret.trim(), job: 'daily-predictions' };
      const res1 = await fetch('/api/progno/admin/run-cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...baseBody, earlyLines: false }),
      });
      const data1 = await res1.json();
      if (!res1.ok || !data1.success) {
        setCronLog({ job: 'daily-predictions', ok: false, msg: data1.error || data1.detail?.error || 'Regular run failed.' });
        return;
      }
      const msg1 = data1.data?.message ?? '';
      const res2 = await fetch('/api/progno/admin/run-cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...baseBody, earlyLines: true }),
      });
      const data2 = await res2.json();
      if (!res2.ok || !data2.success) {
        setCronLog({ job: 'daily-predictions', ok: false, msg: (data2.error || 'Early run failed') + '. Regular already saved.' });
        return;
      }
      const msg2 = data2.data?.message ?? '';
      setCronLog({ job: 'daily-predictions', ok: true, msg: `${msg1} ${msg2} → Opening viewer.` });
      const viewerUrl = VIEWERS[1]?.url || 'file:///C:/Users/cevict/Desktop/CevictPicksViewer/index.html';
      try {
        window.open(viewerUrl + '#' + today, '_blank');
      } catch {
        setCronLog({ job: 'daily-predictions', ok: true, msg: `${msg1} ${msg2} — Open viewer: ${viewerUrl}#${today}` });
      }
    } catch (e: any) {
      setCronLog({ job: 'daily-predictions', ok: false, msg: e?.message || 'Request failed' });
    } finally {
      setCronLoading(null);
    }
  };

  const loadKeys = async () => {
    if (!secret.trim()) return;
    setKeysLoading(true);
    try {
      const res = await fetch('/api/progno/admin/keys', {
        headers: { Authorization: `Bearer ${secret.trim()}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.keys)) setKeys(data.keys);
      else setKeys([]);
    } catch {
      setKeys([]);
    } finally {
      setKeysLoading(false);
    }
  };

  const addKey = async () => {
    if (!secret.trim() || !keyValue.trim()) {
      setKeyLog('Secret and value are required.');
      return;
    }
    setKeyLog(null);
    try {
      const res = await fetch('/api/progno/admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret.trim()}` },
        body: JSON.stringify({ label: keyLabel.trim() || 'Odds API', value: keyValue.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setKeyValue('');
        setKeyLabel('');
        setKeyLog('Key added. First key in .progno/keys.json is used as Odds API key if ODDS_API_KEY is not set.');
        loadKeys();
      } else {
        setKeyLog(data.error || 'Failed');
      }
    } catch (e: any) {
      setKeyLog(e?.message || 'Failed');
    }
  };

  const deleteKey = async (id: string) => {
    if (!secret.trim()) return;
    try {
      const res = await fetch('/api/progno/admin/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret.trim()}` },
        body: JSON.stringify({ id }),
      });
      if (res.ok) loadKeys();
    } catch { }
  };

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(path);
  };

  const TABS: { id: 'run' | 'analyze' | 'keys' | 'docs'; label: string; description: string }[] = [
    {
      id: 'run',
      label: 'Run predictions & results',
      description: 'Pick a game date, run today’s prediction files and grade yesterday’s results. Use this tab for daily operations.',
    },
    {
      id: 'analyze',
      label: 'Line moves & reports',
      description: 'Compare early vs regular lines, run enhanced early-line analysis, and generate deeper performance reports.',
    },
    {
      id: 'keys',
      label: 'Keys & environment',
      description: 'Manage Odds API keys and check required environment variables for Progno to run correctly.',
    },
    {
      id: 'docs',
      label: 'Viewers & docs',
      description: 'Open local viewer tools and read reference docs about cron schedules and debug flows.',
    },
  ];

  const activeTabMeta = TABS.find(t => t.id === activeTab) || TABS[0];

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: '8px' }}>Progno Admin</h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        Control the daily Progno pipeline from one place: run prediction/result crons, inspect early-line moves, and review performance.
        Use your <strong>CRON_SECRET</strong> or <strong>ADMIN_PASSWORD</strong> from <code>.env.local</code>.
      </p>

      <div style={{ marginBottom: '24px', padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Admin secret</label>
        <input
          type="password"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          placeholder="CRON_SECRET or ADMIN_PASSWORD"
          style={{ width: '100%', maxWidth: '400px', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      {/* Primary navigation */}
      <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {TABS.map(tab => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 14px',
                borderRadius: '999px',
                border: isActive ? 'none' : '1px solid #ccc',
                background: isActive ? '#0070f3' : '#f5f5f5',
                color: isActive ? 'white' : '#333',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <p style={{ color: '#555', marginBottom: '20px', fontSize: '13px' }}>
        {activeTabMeta.description}
      </p>

      {activeTab === 'run' && (
        <>
          {/* Smart Date Selector */}
          <div style={{
            marginBottom: '24px',
            padding: '20px',
            background: '#f8f9fa',
            borderRadius: '12px',
            border: '1px solid #dee2e6'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📅 Smart Date Selector
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => { setGameDate(getYesterday()); }}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ccc', background: 'white', cursor: 'pointer', fontSize: '13px' }}
                >
                  Yesterday
                </button>
                <button
                  onClick={() => { setGameDate(getToday()); }}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#0070f3', color: 'white', cursor: 'pointer', fontSize: '13px' }}
                >
                  Today
                </button>
                <button
                  onClick={() => { setGameDate(addDays(getToday(), 1)); }}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ccc', background: 'white', cursor: 'pointer', fontSize: '13px' }}
                >
                  Tomorrow
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {/* Main Game Date Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Game Date (Regular Run)
                </label>
                <input
                  type="date"
                  value={gameDate}
                  onChange={e => setGameDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '2px solid #0070f3',
                    fontSize: '15px',
                    fontWeight: 500
                  }}
                />
              </div>

              {/* Early Offset */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Early Lines Offset
                </label>
                <select
                  value={earlyOffset}
                  onChange={e => setEarlyOffset(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #ccc',
                    fontSize: '15px'
                  }}
                >
                  <option value={2}>2 days in future</option>
                  <option value={3}>3 days in future</option>
                  <option value={4}>4 days in future</option>
                  <option value={5}>5 days in future</option>
                  <option value={6}>6 days in future</option>
                  <option value={7}>7 days in future</option>
                </select>
              </div>
            </div>

            {/* Derived Dates Display (on-disk cron files) */}
            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: 'white',
              borderRadius: '8px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '20px',
              fontSize: '13px'
            }}>
              <div>
                <span style={{ color: '#666' }}>Early file: </span>
                <code style={{ background: '#e9ecef', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  predictions-early-{cronFileDate}.json
                </code>
              </div>
              <div>
                <span style={{ color: '#666' }}>Regular file: </span>
                <code style={{ background: '#e9ecef', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  predictions-{cronFileDate}.json
                </code>
              </div>
              <div>
                <span style={{ color: '#666' }}>Results file: </span>
                <code style={{ background: '#e9ecef', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  results-{resultsDate}.json
                </code>
              </div>
            </div>
          </div>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Cron jobs</h2>
            <p style={{ color: '#555', marginBottom: '12px', fontSize: '14px' }}>
              <strong>Get predictions</strong> runs both at once: regular (today + tomorrow) → <code>predictions-YYYY-MM-DD.json</code>, early (3–5 days out) →
              {' '}<code>predictions-early-YYYY-MM-DD.json</code>. Files use today’s date. After it completes, open the Picks Viewer and load the date shown in the message.
              {' '}<strong>Get results</strong> grades yesterday’s card using <code>results-YYYY-MM-DD.json</code>.
            </p>
            <ol style={{ color: '#555', marginBottom: '12px', fontSize: '13px', paddingLeft: '20px' }}>
              <li>Pick the game date above.</li>
              <li>Click <strong>Get predictions</strong> to write today’s prediction files.</li>
              <li>After games finish, click <strong>Get results</strong> to grade and view the summary.</li>
            </ol>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={runBothPredictions}
                disabled={!!cronLoading}
                style={{ padding: '10px 18px', background: cronLoading === 'daily-predictions' ? '#ccc' : '#0070f3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                {cronLoading === 'daily-predictions' ? 'Running both…' : 'Get predictions'}
              </button>
              <button
                onClick={() => runCron('daily-results')}
                disabled={!!cronLoading}
                style={{ padding: '10px 18px', background: cronLoading === 'daily-results' ? '#ccc' : '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                {cronLoading === 'daily-results' ? 'Running…' : 'Get results'}
              </button>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Results use: <code>{resultsDate}</code>
              </label>
            </div>
            {cronLog && (
              <>
                <pre style={{ marginTop: '12px', padding: '12px', background: cronLog.ok ? '#e6f3ff' : '#ffe6e6', borderRadius: '6px', fontSize: '13px', overflow: 'auto' }}>
                  {cronLog.msg}
                </pre>
                {cronLog.ok && cronLog.job === 'daily-results' && (
                  <div style={{ marginTop: '12px', padding: '10px 12px', background: '#f0f4f8', borderRadius: '6px', fontSize: '13px', border: '1px solid #dde' }}>
                    <strong>Scores by league</strong> (source = Odds API or API-Sports fallback):{' '}
                    {scoresByLeague && Object.keys(scoresByLeague).length > 0
                      ? Object.entries(scoresByLeague).map(([league, { count, source }]) => `${league}: ${count} (${source === 'fallback' ? 'API-Sports' : 'Odds API'})`).join(' · ')
                      : fallbackSummary && Object.keys(fallbackSummary).length > 0
                        ? Object.entries(fallbackSummary).map(([k, v]) => `${k}: ${v}`).join(' · ')
                        : 'No data (run Get results again).'}
                  </div>
                )}
              </>
            )}
            {resultsList.length > 0 && resultsListDate && (
              <>
                <h3 style={{ fontSize: '1.1rem', marginTop: '24px', marginBottom: '8px' }}>Top 10 by confidence ({resultsListDate})</h3>
                <ResultsTable rows={[...resultsList].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0)).slice(0, 10)} />
                <h3 style={{ fontSize: '1.1rem', marginTop: '24px', marginBottom: '8px' }}>All results ({resultsList.length})</h3>
                <div style={{ maxHeight: '400px', overflow: 'auto', border: '1px solid #ddd', borderRadius: '6px' }}>
                  <ResultsTable rows={resultsList} />
                </div>
              </>
            )}
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>🖨️ Print Bets Tracker</h2>
            <p style={{ color: '#555', marginBottom: '12px', fontSize: '14px' }}>
              Generate a printable sheet for today’s card. Use this after running predictions so you can track wins and losses by hand.
            </p>
            <PrintBetsSection date={gameDate} />
          </section>
        </>
      )}

      {activeTab === 'analyze' && (
        <>
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Early vs Regular (line-move arb)</h2>
            <p style={{ color: '#555', marginBottom: '12px', fontSize: '14px' }}>
              Compare early-line picks vs regular picks for the same games. When the pick <strong>flips to the other side</strong>, you have early position and the regular run likes the new line on the other team — possible hedge/arb. See <code>EARLY_LINES_STRATEGY.md</code>.
            </p>
            <p style={{ color: '#666', marginBottom: '10px', fontSize: '13px' }}>
              Dates are pulled from the Smart Date Selector on the Run tab: early lines use the offset above, regular lines use the game date itself.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ padding: '8px 12px', background: '#f0f4f8', borderRadius: '6px' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>Early file: </span>
                <code>predictions-early-{earlyDate}.json</code>
              </div>
              <div style={{ padding: '8px 12px', background: '#f0f4f8', borderRadius: '6px' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>Regular file: </span>
                <code>predictions-{regularDate}.json</code>
              </div>
              <button
                onClick={runEarlyVsRegular}
                disabled={compareLoading || !secret.trim()}
                style={{ padding: '8px 14px', background: compareLoading ? '#ccc' : '#6f42c1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                {compareLoading ? 'Comparing…' : 'Compare'}
              </button>
            </div>
            {compareResult && (
              <div style={{ marginTop: '12px', padding: '12px', background: 'error' in compareResult ? '#ffe6e6' : '#f0f4f8', borderRadius: '6px', fontSize: '13px', border: '1px solid #dde' }}>
                {'error' in compareResult ? (
                  <>
                    <p style={{ margin: 0, color: '#c00' }}>{compareResult.error}</p>
                    {compareResult.hint && <p style={{ margin: '8px 0 0 0', color: '#555' }}>{compareResult.hint}</p>}
                    {compareResult.availableFiles && compareResult.availableFiles.length > 0 && (
                      <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#666' }}>
                        Available: {compareResult.availableFiles.join(', ')}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p style={{ margin: '0 0 10px 0', fontWeight: 600 }}>{compareResult.message}</p>
                    {compareResult.matches.length === 0 ? (
                      <>
                        <p style={{ margin: 0, color: '#666' }}>No games in both files.</p>
                        {compareResult.hintNoOverlap && (
                          <p style={{ margin: '10px 0 0 0', padding: '8px 10px', background: '#fff8e6', borderRadius: '4px', fontSize: '12px', color: '#555' }}>
                            {compareResult.hintNoOverlap}
                          </p>
                        )}
                      </>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #ccc' }}>
                            <th style={{ textAlign: 'left', padding: '6px 8px' }}>Match</th>
                            <th style={{ textAlign: 'left', padding: '6px 8px' }}>Early pick (odds)</th>
                            <th style={{ textAlign: 'left', padding: '6px 8px' }}>Regular pick (odds)</th>
                            <th style={{ textAlign: 'left', padding: '6px 8px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {compareResult.matches.map((m: any, i: number) => (
                            <tr key={i} style={{ borderBottom: '1px solid #eee', background: m.side_flipped ? '#fff8e6' : undefined }}>
                              <td style={{ padding: '6px 8px' }}>{m.home_team} vs {m.away_team} ({m.sport})</td>
                              <td style={{ padding: '6px 8px' }}>{m.early_pick} ({m.early_odds > 0 ? '+' : ''}{m.early_odds})</td>
                              <td style={{ padding: '6px 8px' }}>{m.regular_pick} ({m.regular_odds > 0 ? '+' : ''}{m.regular_odds})</td>
                              <td style={{ padding: '6px 8px' }}>{m.side_flipped ? <span style={{ background: '#6f42c1', color: 'white', padding: '2px 8px', borderRadius: '4px' }}>Side flipped — arb?</span> : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </div>
            )}
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>🎯 Enhanced Early Lines Analysis</h2>
            <p style={{ color: '#555', marginBottom: '12px', fontSize: '14px' }}>
              Run a richer early-lines analysis with value scoring, odds movement, and recommendations (hedge, double-down, or close).
            </p>
            <ol style={{ color: '#555', marginBottom: '12px', fontSize: '13px', paddingLeft: '20px' }}>
              <li>Run both regular and early prediction crons for the target date.</li>
              <li>Make sure the early file shown above exists.</li>
              <li>Click <strong>Analyze Early Lines</strong> to generate opportunities.</li>
            </ol>
            <EnhancedEarlyLinesSection secret={secret} earlyDate={earlyDate} regularDate={regularDate} />
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>📊 Reports & Analytics</h2>
            <p style={{ color: '#555', marginBottom: '12px', fontSize: '14px' }}>
              Generate human-readable summaries of how the system performs by sport, edge band, confidence band, month, and odds range. Use CSV export to pull data into a spreadsheet.
            </p>
            <ReportsSection secret={secret} date={gameDate} />
          </section>
        </>
      )}

      {activeTab === 'keys' && (
        <>
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Odds provider keys</h2>
            <p style={{ color: '#555', marginBottom: '12px', fontSize: '14px' }}>
              Store Odds API and related keys in <code>.progno/keys.json</code>. The first key is used as the Odds API key if <code>ODDS_API_KEY</code> is not set in <code>.env.local</code>.
            </p>
            <ol style={{ color: '#555', marginBottom: '12px', fontSize: '13px', paddingLeft: '20px' }}>
              <li>Click <strong>Load keys</strong> to see what is currently configured.</li>
              <li>Add a new key with a human-readable label such as “Odds API”.</li>
              <li>Remove old keys that you no longer want the system to use.</li>
            </ol>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={loadKeys}
                disabled={!secret.trim() || keysLoading}
                style={{ padding: '8px 14px', background: '#555', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                {keysLoading ? 'Loading…' : 'Load keys'}
              </button>
            </div>
            {keys.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '16px' }}>
                {keys.map(k => (
                  <li key={k.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                    <span style={{ fontWeight: 500 }}>{k.label || '(no label)'}</span>
                    <span style={{ color: '#888', fontSize: '13px' }}>{k.id}</span>
                    <button
                      type="button"
                      onClick={() => deleteKey(k.id)}
                      style={{ marginLeft: 'auto', padding: '4px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={keyLabel}
                onChange={e => setKeyLabel(e.target.value)}
                placeholder="Label (e.g. Odds API)"
                style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc', width: '160px' }}
              />
              <input
                type="password"
                value={keyValue}
                onChange={e => setKeyValue(e.target.value)}
                placeholder="API key value"
                style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc', width: '220px' }}
              />
              <button
                onClick={addKey}
                disabled={!secret.trim() || !keyValue.trim()}
                style={{ padding: '8px 14px', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                Add key
              </button>
            </div>
            {keyLog && <p style={{ marginTop: '8px', color: '#555', fontSize: '14px' }}>{keyLog}</p>}
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>.env.local</h2>
            <p style={{ color: '#555', marginBottom: '8px', fontSize: '14px' }}>
              Edit <code>apps/progno/.env.local</code> to configure these environment variables. Restart the dev server after changes.
            </p>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#555', fontSize: '14px' }}>
              {ENV_VARS.map(v => (
                <li key={v}><code>{v}</code></li>
              ))}
            </ul>
          </section>
        </>
      )}

      {activeTab === 'docs' && (
        <>
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Viewers</h2>
            <p style={{ color: '#555', marginBottom: '12px', fontSize: '14px' }}>
              These local tools live under <code>C:\cevict-live\apps\progno</code>. If <code>file://</code> links are blocked, open the folder in Explorer and double‑click <code>index.html</code>.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {VIEWERS.map(v => (
                <div key={v.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <a href={v.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0070f3', fontWeight: 500 }}>
                    {v.name}
                  </a>
                  <button
                    type="button"
                    onClick={() => copyPath(v.path)}
                    style={{ padding: '4px 10px', background: '#eee', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    Copy path
                  </button>
                  <code style={{ fontSize: '12px', color: '#666', wordBreak: 'break-all' }}>{v.path}</code>
                </div>
              ))}
            </div>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Docs</h2>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li><strong>PROGNO-DEBUG-CHEATSHEET.md</strong> — key files, flow, how to run</li>
              <li><strong>CRON-SCHEDULE.md</strong> — cron times, Task Scheduler, paths</li>
              <li>Predictions file: <code>C:\cevict-live\apps\progno\predictions-YYYY-MM-DD.json</code></li>
              <li>Results file: <code>C:\cevict-live\apps\progno\results-YYYY-MM-DD.json</code></li>
            </ul>
          </section>

          <p style={{ marginTop: '24px' }}>
            <Link href="/progno" style={{ color: '#0070f3' }}>← Back to dashboard</Link>
          </p>
        </>
      )}
    </div>
  );
}
