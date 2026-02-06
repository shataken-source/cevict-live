// app/progno/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

const VIEWERS = [
  { name: 'Cevict Arb Tool', path: 'C:\\Users\\cevict\\Desktop\\CevictArbTool\\index.html', url: 'file:///C:/Users/cevict/Desktop/CevictArbTool/index.html' },
  { name: 'Cevict Picks Viewer', path: 'C:\\Users\\cevict\\Desktop\\CevictPicksViewer\\index.html', url: 'file:///C:/Users/cevict/Desktop/CevictPicksViewer/index.html' },
];

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
  const [cronLog, setCronLog] = useState<{ job: string; ok: boolean; msg: string } | null>(null);
  const [cronLoading, setCronLoading] = useState<string | null>(null);
  const [resultsDate, setResultsDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });

  const [keys, setKeys] = useState<{ id: string; label: string; createdAt: string }[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [keyLabel, setKeyLabel] = useState('');
  const [keyValue, setKeyValue] = useState('');
  const [keyLog, setKeyLog] = useState<string | null>(null);
  const [resultsList, setResultsList] = useState<any[]>([]);
  const [resultsListDate, setResultsListDate] = useState<string | null>(null);
  const [fallbackSummary, setFallbackSummary] = useState<Record<string, string | number> | null>(null);
  const [scoresByLeague, setScoresByLeague] = useState<Record<string, { count: number; source: 'odds' | 'fallback' }> | null>(null);
  const [earlyCompareDate, setEarlyCompareDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [regularCompareDate, setRegularCompareDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareResult, setCompareResult] = useState<{ matches: any[]; message: string; sideFlippedCount: number; hintNoOverlap?: string } | { error: string; availableFiles?: string[]; hint?: string } | null>(null);

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
        body: JSON.stringify({ secret: secret.trim(), earlyDate: earlyCompareDate, regularDate: regularCompareDate }),
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

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: '8px' }}>Progno Admin</h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        Run crons, manage odds keys, open viewers. Use your <strong>CRON_SECRET</strong> or <strong>ADMIN_PASSWORD</strong> from .env.local.
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

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Cron jobs</h2>
        <p style={{ color: '#555', marginBottom: '12px', fontSize: '14px' }}>
          <strong>Get predictions</strong> runs both at once: regular (today + tomorrow) → <code>predictions-YYYY-MM-DD.json</code>, early (3–5 days out) → <code>predictions-early-YYYY-MM-DD.json</code>. Files use today’s date. Viewer opens with <code>#date</code>; have it fetch <code>/api/progno/predictions-file?date=YYYY-MM-DD&type=regular</code> and <code>&type=early</code> to show both. <strong>Get results</strong> grades and writes <code>results-YYYY-MM-DD.json</code>.
        </p>
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
            Results for date:
            <input
              type="date"
              value={resultsDate}
              onChange={e => setResultsDate(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
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
        <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Early vs Regular (line-move arb)</h2>
        <p style={{ color: '#555', marginBottom: '12px', fontSize: '14px' }}>
          Compare early-line picks vs regular picks for the same games. When the pick <strong>flips to the other side</strong>, you have early position and the regular run likes the new line on the other team — possible hedge/arb. See <code>EARLY_LINES_STRATEGY.md</code>.
        </p>
        <p style={{ color: '#666', marginBottom: '10px', fontSize: '13px' }}>
          Date = filename date: <code>predictions-early-YYYY-MM-DD.json</code> and <code>predictions-YYYY-MM-DD.json</code>. Use the date you ran each run (e.g. if you ran Regular on Feb 5, use 2026-02-05).
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            Early file date:
            <input
              type="date"
              value={earlyCompareDate}
              onChange={e => setEarlyCompareDate(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            Regular file date:
            <input
              type="date"
              value={regularCompareDate}
              onChange={e => setRegularCompareDate(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </label>
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
        <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Odds provider keys</h2>
        <p style={{ color: '#555', marginBottom: '12px', fontSize: '14px' }}>
          Stored in <code>.progno/keys.json</code>. The first key is used as the Odds API key if <code>ODDS_API_KEY</code> is not set in .env.local.
        </p>
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
          Edit <code>apps/progno/.env.local</code> in Cursor to add or change these (and any others):
        </p>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#555', fontSize: '14px' }}>
          {ENV_VARS.map(v => (
            <li key={v}><code>{v}</code></li>
          ))}
        </ul>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Viewers</h2>
        <p style={{ color: '#555', marginBottom: '12px', fontSize: '14px' }}>
          Open in browser or copy path. If file:// is blocked, open the path in Explorer and double‑click index.html.
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
    </div>
  );
}
