'use client';

import { useState } from 'react';

interface PerformanceResult {
  success: boolean;
  error?: string;
  dateRange?: { start: string; end: string; days: number };
  verdict?: string;
  summary?: {
    early: { picks: number; graded: number; wins: number; losses: number; winRate: number; roi: number; profit: number };
    regular: { picks: number; graded: number; wins: number; losses: number; winRate: number; roi: number; profit: number };
    winRateDelta: number;
    roiDelta: number;
  };
  divergences?: {
    total: number;
    earlyRight: number;
    regularRight: number;
    bothRight: number;
    bothWrong: number;
  };
  sportBreakdown?: {
    sport: string;
    early: { wins: number; losses: number; winRate: number; profit: number };
    regular: { wins: number; losses: number; winRate: number; profit: number };
    delta_winRate: number;
    better: string;
  }[];
  confBreakdown?: {
    bucket: string;
    early: { w: number; l: number; winRate: number };
    regular: { w: number; l: number; winRate: number };
  }[];
  daily?: {
    date: string;
    early: { picks: number; wins: number; losses: number; profit: number; winRate: number };
    regular: { picks: number; wins: number; losses: number; profit: number; winRate: number };
    divergences: any[];
  }[];
}

const C = {
  bg: '#050c16',
  panel: '#0a1525',
  border: '#1a2a40',
  text: '#e0e6ed',
  textBright: '#fff',
  textDim: '#5a6a80',
  green: '#00e676',
  red: '#ff5252',
  amber: '#ffab00',
  blue: '#448aff',
  cyan: '#00e5ff',
  purple: '#b388ff',
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};

export default function EarlyLinesPerformance({ secret }: { secret: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PerformanceResult | null>(null);
  const [days, setDays] = useState(14);
  const [showDaily, setShowDaily] = useState(false);
  const [showDivergences, setShowDivergences] = useState(false);

  const run = async () => {
    if (!secret.trim()) { setResult({ success: false, error: 'Enter admin secret first.' }); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/progno/admin/early-lines-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: secret.trim(), days }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setResult({ success: false, error: e?.message || 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  const pct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
  const money = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(0)}u`;

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          style={{ padding: '6px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontFamily: C.mono, fontSize: 11 }}
        >
          {[7, 14, 30, 60, 90].map(n => <option key={n} value={n}>Last {n} days</option>)}
        </select>
        <button
          onClick={run}
          disabled={loading || !secret.trim()}
          style={{
            padding: '6px 14px', border: 'none', borderRadius: 6, cursor: 'pointer',
            background: loading ? C.textDim : C.green, color: '#000',
            fontFamily: C.mono, fontSize: 11, fontWeight: 700,
          }}
        >
          {loading ? '⟳ ANALYZING...' : '▶ RUN PERFORMANCE CHECK'}
        </button>
      </div>

      {result && !result.success && (
        <div style={{ padding: 12, background: `${C.red}15`, border: `1px solid ${C.red}40`, borderRadius: 6, fontFamily: C.mono, fontSize: 11, color: C.red }}>
          {result.error}
        </div>
      )}

      {result?.success && result.summary && (
        <div>
          {/* Verdict Banner */}
          <div style={{
            padding: '14px 16px', borderRadius: 8, marginBottom: 14,
            background: result.verdict?.includes('HELPING') ? `${C.green}12` :
              result.verdict?.includes('HURTING') ? `${C.red}12` : `${C.blue}12`,
            border: `1px solid ${result.verdict?.includes('HELPING') ? C.green :
              result.verdict?.includes('HURTING') ? C.red : C.blue}30`,
          }}>
            <div style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 700, color: C.textBright, marginBottom: 4 }}>
              {result.verdict?.includes('HELPING') ? '✅' : result.verdict?.includes('HURTING') ? '❌' : '⚖️'} VERDICT
            </div>
            <div style={{ fontFamily: C.mono, fontSize: 11, color: C.text, lineHeight: 1.5 }}>
              {result.verdict}
            </div>
            {result.dateRange && (
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, marginTop: 6 }}>
                {result.dateRange.start} → {result.dateRange.end} ({result.dateRange.days} days)
              </div>
            )}
          </div>

          {/* Head-to-Head Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 0, marginBottom: 14 }}>
            {/* Early */}
            <div style={{ padding: 14, background: C.panel, border: `1px solid ${C.border}`, borderRadius: '8px 0 0 8px' }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.amber, letterSpacing: 1, marginBottom: 8 }}>EARLY LINES</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.textBright }}>{result.summary.early.winRate}%</div>
              <div style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim }}>win rate</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
                <div><div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>{result.summary.early.wins}</div><div style={{ fontSize: 9, color: C.textDim }}>W</div></div>
                <div><div style={{ fontSize: 14, fontWeight: 700, color: C.red }}>{result.summary.early.losses}</div><div style={{ fontSize: 9, color: C.textDim }}>L</div></div>
                <div><div style={{ fontSize: 14, fontWeight: 700, color: result.summary.early.roi >= 0 ? C.green : C.red }}>{result.summary.early.roi}%</div><div style={{ fontSize: 9, color: C.textDim }}>ROI</div></div>
                <div><div style={{ fontSize: 14, fontWeight: 700, color: result.summary.early.profit >= 0 ? C.green : C.red }}>{money(result.summary.early.profit)}</div><div style={{ fontSize: 9, color: C.textDim }}>P/L</div></div>
              </div>
            </div>

            {/* VS */}
            <div style={{ padding: '14px 12px', background: C.bg, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.textDim }}>VS</div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontFamily: C.mono, fontSize: 10, color: result.summary.winRateDelta > 0 ? C.green : result.summary.winRateDelta < 0 ? C.red : C.textDim }}>
                  {pct(result.summary.winRateDelta)}
                </div>
                <div style={{ fontFamily: C.mono, fontSize: 8, color: C.textDim }}>WR Δ</div>
              </div>
              <div style={{ marginTop: 4 }}>
                <div style={{ fontFamily: C.mono, fontSize: 10, color: result.summary.roiDelta > 0 ? C.green : result.summary.roiDelta < 0 ? C.red : C.textDim }}>
                  {pct(result.summary.roiDelta)}
                </div>
                <div style={{ fontFamily: C.mono, fontSize: 8, color: C.textDim }}>ROI Δ</div>
              </div>
            </div>

            {/* Regular */}
            <div style={{ padding: 14, background: C.panel, border: `1px solid ${C.border}`, borderRadius: '0 8px 8px 0' }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.green, letterSpacing: 1, marginBottom: 8 }}>REGULAR LINES</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.textBright }}>{result.summary.regular.winRate}%</div>
              <div style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim }}>win rate</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
                <div><div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>{result.summary.regular.wins}</div><div style={{ fontSize: 9, color: C.textDim }}>W</div></div>
                <div><div style={{ fontSize: 14, fontWeight: 700, color: C.red }}>{result.summary.regular.losses}</div><div style={{ fontSize: 9, color: C.textDim }}>L</div></div>
                <div><div style={{ fontSize: 14, fontWeight: 700, color: result.summary.regular.roi >= 0 ? C.green : C.red }}>{result.summary.regular.roi}%</div><div style={{ fontSize: 9, color: C.textDim }}>ROI</div></div>
                <div><div style={{ fontSize: 14, fontWeight: 700, color: result.summary.regular.profit >= 0 ? C.green : C.red }}>{money(result.summary.regular.profit)}</div><div style={{ fontSize: 9, color: C.textDim }}>P/L</div></div>
              </div>
            </div>
          </div>

          {/* Divergence Stats */}
          {result.divergences && result.divergences.total > 0 && (
            <div style={{ padding: 14, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 14 }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.purple, letterSpacing: 1, marginBottom: 10 }}>
                WHEN EARLY &amp; REGULAR DISAGREED ({result.divergences.total} games)
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ padding: '8px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.amber }}>{result.divergences.earlyRight}</div>
                  <div style={{ fontSize: 9, color: C.textDim }}>Early Right</div>
                </div>
                <div style={{ padding: '8px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.green }}>{result.divergences.regularRight}</div>
                  <div style={{ fontSize: 9, color: C.textDim }}>Regular Right</div>
                </div>
                <div style={{ padding: '8px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.textDim }}>{result.divergences.bothWrong}</div>
                  <div style={{ fontSize: 9, color: C.textDim }}>Both Wrong</div>
                </div>
                <div style={{ padding: '8px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.blue }}>{result.divergences.bothRight}</div>
                  <div style={{ fontSize: 9, color: C.textDim }}>Both Right</div>
                </div>
              </div>
            </div>
          )}

          {/* Sport Breakdown */}
          {result.sportBreakdown && result.sportBreakdown.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, letterSpacing: 1, marginBottom: 6 }}>BY SPORT</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: C.mono, fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['SPORT', 'EARLY WR', 'REG WR', 'Δ WR', 'EARLY P/L', 'REG P/L', 'EDGE'].map(h => (
                      <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: C.textDim, fontSize: 9, fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.sportBreakdown.map(s => (
                    <tr key={s.sport} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '6px 8px', color: C.textBright, fontWeight: 600 }}>{s.sport}</td>
                      <td style={{ padding: '6px 8px', color: C.amber }}>{s.early.winRate}% <span style={{ color: C.textDim, fontSize: 9 }}>({s.early.wins}-{s.early.losses})</span></td>
                      <td style={{ padding: '6px 8px', color: C.green }}>{s.regular.winRate}% <span style={{ color: C.textDim, fontSize: 9 }}>({s.regular.wins}-{s.regular.losses})</span></td>
                      <td style={{ padding: '6px 8px', color: s.delta_winRate > 0 ? C.green : s.delta_winRate < 0 ? C.red : C.textDim, fontWeight: 700 }}>{pct(s.delta_winRate)}</td>
                      <td style={{ padding: '6px 8px', color: s.early.profit >= 0 ? C.green : C.red }}>{money(s.early.profit)}</td>
                      <td style={{ padding: '6px 8px', color: s.regular.profit >= 0 ? C.green : C.red }}>{money(s.regular.profit)}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <span style={{
                          padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                          background: s.better === 'early' ? `${C.amber}20` : s.better === 'regular' ? `${C.green}20` : `${C.textDim}20`,
                          color: s.better === 'early' ? C.amber : s.better === 'regular' ? C.green : C.textDim,
                        }}>
                          {s.better === 'early' ? 'EARLY' : s.better === 'regular' ? 'REGULAR' : 'TIE'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Confidence Buckets */}
          {result.confBreakdown && result.confBreakdown.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, letterSpacing: 1, marginBottom: 6 }}>BY CONFIDENCE TIER</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {result.confBreakdown.map(b => (
                  <div key={b.bucket} style={{ padding: '8px 12px', background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, minWidth: 120 }}>
                    <div style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 700, color: C.textBright, marginBottom: 4 }}>{b.bucket}% conf</div>
                    <div style={{ fontSize: 9, color: C.amber }}>Early: {b.early.winRate}% ({b.early.w}-{b.early.l})</div>
                    <div style={{ fontSize: 9, color: C.green }}>Reg: {b.regular.winRate}% ({b.regular.w}-{b.regular.l})</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Toggle buttons */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {result.daily && result.daily.length > 0 && (
              <button onClick={() => setShowDaily(!showDaily)} style={{
                padding: '4px 10px', border: `1px solid ${C.border}`, borderRadius: 4,
                background: showDaily ? C.blue : 'transparent', color: showDaily ? '#000' : C.textDim,
                fontFamily: C.mono, fontSize: 10, cursor: 'pointer',
              }}>
                {showDaily ? '▼' : '▶'} DAILY BREAKDOWN ({result.daily.length} days)
              </button>
            )}
            <button onClick={() => setShowDivergences(!showDivergences)} style={{
              padding: '4px 10px', border: `1px solid ${C.border}`, borderRadius: 4,
              background: showDivergences ? C.purple : 'transparent', color: showDivergences ? '#000' : C.textDim,
              fontFamily: C.mono, fontSize: 10, cursor: 'pointer',
            }}>
              {showDivergences ? '▼' : '▶'} DIVERGENCE DETAILS
            </button>
          </div>

          {/* Daily Breakdown */}
          {showDaily && result.daily && (
            <div style={{ overflowX: 'auto', marginBottom: 14 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: C.mono, fontSize: 10 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['DATE', 'EARLY W-L', 'EARLY WR', 'EARLY P/L', 'REG W-L', 'REG WR', 'REG P/L', 'DIV'].map(h => (
                      <th key={h} style={{ padding: '5px 6px', textAlign: 'left', color: C.textDim, fontSize: 8, fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.daily.map(d => (
                    <tr key={d.date} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '5px 6px', color: C.text }}>{d.date}</td>
                      <td style={{ padding: '5px 6px', color: C.amber }}>{d.early.wins}-{d.early.losses}</td>
                      <td style={{ padding: '5px 6px', color: C.amber }}>{d.early.winRate}%</td>
                      <td style={{ padding: '5px 6px', color: d.early.profit >= 0 ? C.green : C.red }}>{money(d.early.profit)}</td>
                      <td style={{ padding: '5px 6px', color: C.green }}>{d.regular.wins}-{d.regular.losses}</td>
                      <td style={{ padding: '5px 6px', color: C.green }}>{d.regular.winRate}%</td>
                      <td style={{ padding: '5px 6px', color: d.regular.profit >= 0 ? C.green : C.red }}>{money(d.regular.profit)}</td>
                      <td style={{ padding: '5px 6px', color: d.divergences.length > 0 ? C.purple : C.textDim }}>{d.divergences.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Divergence Details */}
          {showDivergences && result.daily && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: C.mono, fontSize: 10 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['DATE', 'MATCHUP', 'EARLY PICK', 'REG PICK', 'WINNER', 'RESULT'].map(h => (
                      <th key={h} style={{ padding: '5px 6px', textAlign: 'left', color: C.textDim, fontSize: 8, fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.daily.flatMap(d => d.divergences.map((dv: any, i: number) => (
                    <tr key={`${d.date}-${i}`} style={{ borderBottom: `1px solid ${C.border}`, background: dv.early_correct && !dv.regular_correct ? `${C.amber}08` : !dv.early_correct && dv.regular_correct ? `${C.green}08` : 'transparent' }}>
                      <td style={{ padding: '5px 6px', color: C.textDim }}>{d.date}</td>
                      <td style={{ padding: '5px 6px', color: C.text }}>{dv.home_team} vs {dv.away_team}<br /><span style={{ color: C.textDim, fontSize: 8 }}>{dv.sport}</span></td>
                      <td style={{ padding: '5px 6px', color: dv.early_correct ? C.green : C.red }}>{dv.early_pick} {dv.early_correct ? '✓' : '✗'}</td>
                      <td style={{ padding: '5px 6px', color: dv.regular_correct ? C.green : C.red }}>{dv.regular_pick} {dv.regular_correct ? '✓' : '✗'}</td>
                      <td style={{ padding: '5px 6px', color: C.textBright, fontWeight: 600 }}>{dv.actual_winner}</td>
                      <td style={{ padding: '5px 6px' }}>
                        <span style={{
                          padding: '2px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700,
                          background: dv.early_correct && !dv.regular_correct ? `${C.amber}25` :
                            !dv.early_correct && dv.regular_correct ? `${C.green}25` :
                              !dv.early_correct && !dv.regular_correct ? `${C.red}25` : `${C.blue}25`,
                          color: dv.early_correct && !dv.regular_correct ? C.amber :
                            !dv.early_correct && dv.regular_correct ? C.green :
                              !dv.early_correct && !dv.regular_correct ? C.red : C.blue,
                        }}>
                          {dv.early_correct && !dv.regular_correct ? 'EARLY ✓' :
                            !dv.early_correct && dv.regular_correct ? 'REG ✓' :
                              !dv.early_correct && !dv.regular_correct ? 'BOTH ✗' : 'BOTH ✓'}
                        </span>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
