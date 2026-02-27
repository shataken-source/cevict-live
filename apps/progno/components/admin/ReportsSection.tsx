'use client';

import { useState } from 'react';

const T = {
  bg: '#080f1a',
  card: '#0c1526',
  border: '#12233a',
  borderBright: '#1e3a5f',
  green: '#00e676',
  blue: '#29b6f6',
  amber: '#ffc107',
  red: '#ef5350',
  purple: '#ab47bc',
  cyan: '#00e5ff',
  text: '#c8ddf0',
  textBright: '#eef4fb',
  textDim: '#4a6a8a',
  mono: '"JetBrains Mono","Fira Code","Cascadia Code",Consolas,monospace',
};

const btnColors: Record<string, string> = {
  'performance-by-sport': '#6f42c1',
  'value-bets-analysis': '#28a745',
  'confidence-vs-results': '#17a2b8',
  'monthly-summary': '#fd7e14',
  'streak-analysis': '#dc3545',
  'roi-by-odds-range': '#20c997',
  'pick-details': '#6495ed',
};

interface ReportResult { type: string; data: any; generatedAt: string; }
interface ReportsSectionProps { secret: string; date: string; }

function profitColor(v: number): string { return v > 0 ? T.green : v < 0 ? T.red : T.text; }
function wrColor(wr: string): string { const n = parseFloat(wr); return n >= 55 ? T.green : n >= 45 ? T.amber : T.red; }

function fmtProfit(v: any): string {
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (isNaN(n)) return '$0.00';
  return `${n >= 0 ? '+' : ''}$${n.toFixed(2)}`;
}

function oddsColor(odds: string): string {
  if (odds === '\u2014') return T.textDim;
  const n = parseInt(odds);
  if (isNaN(n)) return T.textDim;
  return n < 0 ? T.cyan : T.amber;
}

export default function ReportsSection({ secret, date }: ReportsSectionProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [report, setReport] = useState<ReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runReport = async (reportType: string) => {
    setLoading(reportType);
    setError(null);
    setReport(null);
    try {
      const response = await fetch('/api/progno/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: secret.trim(), reportType })
      });
      if (!response.ok) throw new Error(`Report failed: ${response.statusText}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setReport({ type: reportType, data, generatedAt: new Date().toISOString() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(null);
    }
  };

  const exportToCSV = () => {
    if (!report) return;
    let csv = '';
    if (report.type === 'performance-by-sport') {
      csv = 'Sport,Wins,Losses,Win Rate,Bets,Avg Odds,Avg Conf,Profit\n';
      (report.data.sports || []).forEach((s: any) => { csv += `${s.sport},${s.wins},${s.losses},${s.winRate}%,${s.total},${s.avgOdds},${s.avgConf}%,$${s.profit}\n`; });
    } else if (report.type === 'value-bets-analysis') {
      csv = 'Range,Wins,Losses,Win Rate,Bets,Profit\n';
      (report.data.ranges || []).forEach((r: any) => { csv += `${r.range},${r.wins},${r.losses},${r.winRate}%,${r.total},$${r.profit}\n`; });
    } else if (report.type === 'roi-by-odds-range') {
      csv = 'Odds Band,Wins,Losses,Win Rate,Bets,Profit,ROI\n';
      (report.data.ranges || []).forEach((r: any) => { csv += `${r.range},${r.wins},${r.losses},${r.winRate}%,${r.total},$${r.profit},${r.roi}%\n`; });
    } else if (report.type === 'confidence-vs-results') {
      csv = 'Range,Wins,Losses,Win Rate,Bets,Avg Odds,Profit\n';
      (report.data.ranges || []).forEach((r: any) => { csv += `${r.range},${r.wins},${r.losses},${r.winRate}%,${r.total},${r.avgOdds},$${r.profit}\n`; });
    } else if (report.type === 'monthly-summary') {
      csv = 'Month,Bets,Wins,Losses,Win Rate,Avg Odds,Profit,ROI,Avg/Bet\n';
      (report.data.months || []).forEach((m: any) => { csv += `${m.month},${m.bets},${m.wins},${m.losses},${m.winRate}%,${m.avgOdds},$${m.profit},${m.roi}%,$${m.avgProfitPerBet}\n`; });
    } else if (report.type === 'pick-details') {
      csv = 'Date,Matchup,Pick,Sport,Confidence,Odds,Result,Profit,Edge,EV\n';
      (report.data.picks || []).forEach((p: any) => { csv += `${p.date},"${p.matchup}",${p.pick},${p.sport},${p.confidence}%,${p.odds},${p.result},$${p.profit},${p.edge},${p.ev}\n`; });
    }
    if (!csv) return;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cevict-report-${report.type}-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const thStyle: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', color: T.textDim, fontWeight: 700, letterSpacing: 1, fontSize: 10, fontFamily: T.mono, textTransform: 'uppercase', borderBottom: `1px solid ${T.borderBright}`, whiteSpace: 'nowrap' };
  const thR: React.CSSProperties = { ...thStyle, textAlign: 'right' };
  const tdStyle: React.CSSProperties = { padding: '9px 12px', color: T.textBright, fontSize: 13, fontFamily: T.mono, borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' };
  const tdR: React.CSSProperties = { ...tdStyle, textAlign: 'right' };
  const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
  const summaryRow: React.CSSProperties = { borderTop: `2px solid ${T.borderBright}` };

  const buttons = [
    { id: 'pick-details', label: '\ud83d\udcdd Pick Details' },
    { id: 'performance-by-sport', label: '\ud83c\udfc6 Performance by Sport' },
    { id: 'roi-by-odds-range', label: '\ud83d\udcc8 ROI by Odds Range' },
    { id: 'value-bets-analysis', label: '\ud83d\udcb0 Value Bets Analysis' },
    { id: 'confidence-vs-results', label: '\ud83d\udcca Confidence vs Results' },
    { id: 'monthly-summary', label: '\ud83d\udcc5 Monthly Summary' },
    { id: 'streak-analysis', label: '\ud83d\udd25 Streak Analysis' },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        {buttons.map(b => {
          const isActive = loading === b.id;
          const color = btnColors[b.id] || T.blue;
          return (
            <button key={b.id} onClick={() => runReport(b.id)} disabled={isActive || !secret.trim()}
              style={{ padding: '10px 14px', background: isActive ? `${color}40` : `${color}25`, color: isActive ? T.textDim : color, border: `1px solid ${color}50`, borderRadius: 6, cursor: isActive ? 'wait' : 'pointer', fontSize: 13, fontFamily: T.mono, fontWeight: 600, letterSpacing: '0.3px', transition: 'all 0.15s' }}>
              {isActive ? 'Running\u2026' : b.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: `${T.red}15`, border: `1px solid ${T.red}40`, borderRadius: 6, color: T.red, fontFamily: T.mono, fontSize: 12, marginBottom: 16 }}>
          \u2717 {error}
        </div>
      )}

      {report && (
        <div style={{ padding: '20px', background: T.card, borderRadius: 8, border: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, color: T.textBright, fontSize: 16, fontWeight: 600, textTransform: 'capitalize' }}>
                {report.type.replace(/-/g, ' ')}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: 11, color: T.textDim, fontFamily: T.mono }}>
                Generated {new Date(report.generatedAt).toLocaleString()}
                {report.data.totalRows != null && ` \u00b7 ${report.data.totalRows} graded picks`}
              </p>
            </div>
            <button onClick={exportToCSV}
              style={{ padding: '7px 14px', background: `${T.blue}18`, color: T.blue, border: `1px solid ${T.blue}40`, borderRadius: 5, cursor: 'pointer', fontSize: 12, fontFamily: T.mono, fontWeight: 600 }}>
              Export CSV
            </button>
          </div>

          {report.data.totalRows === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: T.textDim, fontFamily: T.mono, fontSize: 13 }}>
              No graded results found. Run the daily-results cron to grade predictions first.
            </div>
          )}

          {/* ── PICK DETAILS ───────────────────────────────────── */}
          {report.type === 'pick-details' && report.data.picks?.length > 0 && (
            <div>
              {report.data.summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Total Picks', value: report.data.summary.total, color: T.textBright },
                    { label: 'With Odds', value: report.data.summary.withOdds, color: T.blue },
                    { label: 'Favorites', value: `${report.data.summary.favorites} (${report.data.summary.favWinRate}%)`, color: T.cyan },
                    { label: 'Underdogs', value: `${report.data.summary.underdogs} (${report.data.summary.dogWinRate}%)`, color: T.amber },
                  ].map((item, i) => (
                    <div key={i} style={{ background: '#0a1422', padding: 12, borderRadius: 6, border: `1px solid ${T.border}` }}>
                      <div style={{ fontSize: 9, color: T.textDim, textTransform: 'uppercase', marginBottom: 4, fontFamily: T.mono, letterSpacing: 1 }}>{item.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: item.color, fontFamily: T.mono }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                  <thead><tr>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Matchup</th>
                    <th style={thStyle}>Pick</th>
                    <th style={thStyle}>Sport</th>
                    <th style={thR}>Conf</th>
                    <th style={thR}>Odds</th>
                    <th style={thR}>Result</th>
                    <th style={thR}>Profit</th>
                    <th style={thR}>Edge</th>
                  </tr></thead>
                  <tbody>
                    {report.data.picks.map((p: any, i: number) => (
                      <tr key={i} style={{ background: i % 2 ? '#070e18' : 'transparent' }}>
                        <td style={{ ...tdStyle, color: T.textDim, fontSize: 11 }}>{p.date}</td>
                        <td style={{ ...tdStyle, fontSize: 12, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.matchup}</td>
                        <td style={{ ...tdStyle, color: T.blue, fontWeight: 600, fontSize: 12 }}>{p.pick}</td>
                        <td style={{ ...tdStyle, color: T.textDim, fontSize: 11 }}>{p.sport}</td>
                        <td style={{ ...tdR, color: T.purple }}>{p.confidence}%</td>
                        <td style={{ ...tdR, color: oddsColor(p.odds), fontWeight: 600 }}>{p.odds}</td>
                        <td style={{ ...tdR, color: p.result === 'win' ? T.green : T.red, fontWeight: 700 }}>{p.result === 'win' ? 'W' : 'L'}</td>
                        <td style={{ ...tdR, color: profitColor(p.profit) }}>{fmtProfit(p.profit)}</td>
                        <td style={{ ...tdR, color: T.textDim }}>{p.edge}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── PERFORMANCE BY SPORT ────────────────────────────── */}
          {report.type === 'performance-by-sport' && report.data.sports?.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead><tr>
                  <th style={thStyle}>Sport</th><th style={thR}>W</th><th style={thR}>L</th>
                  <th style={thR}>Win %</th><th style={thR}>Bets</th>
                  <th style={thR}>Avg Odds</th><th style={thR}>Avg Conf</th><th style={thR}>Profit</th>
                </tr></thead>
                <tbody>
                  {report.data.sports.map((s: any, i: number) => (
                    <tr key={s.sport} style={{ background: i % 2 ? '#070e18' : 'transparent' }}>
                      <td style={{ ...tdStyle, color: T.blue, fontWeight: 600 }}>{s.sport}</td>
                      <td style={{ ...tdR, color: T.green }}>{s.wins}</td>
                      <td style={{ ...tdR, color: T.red }}>{s.losses}</td>
                      <td style={{ ...tdR, color: wrColor(s.winRate) }}>{s.winRate}%</td>
                      <td style={tdR}>{s.total}</td>
                      <td style={{ ...tdR, color: oddsColor(s.avgOdds) }}>{s.avgOdds}</td>
                      <td style={{ ...tdR, color: T.purple }}>{s.avgConf}%</td>
                      <td style={{ ...tdR, color: profitColor(s.profit) }}>{fmtProfit(s.profit)}</td>
                    </tr>
                  ))}
                  {report.data.summary && (
                    <tr style={summaryRow}>
                      <td style={{ ...tdStyle, fontWeight: 700, color: T.textBright }}>TOTAL</td>
                      <td style={{ ...tdR, fontWeight: 700, color: T.green }}>{report.data.summary.totalWins}</td>
                      <td style={{ ...tdR, fontWeight: 700, color: T.red }}>{report.data.summary.totalLosses}</td>
                      <td style={{ ...tdR, fontWeight: 700, color: wrColor(report.data.summary.overallWinRate) }}>{report.data.summary.overallWinRate}%</td>
                      <td style={{ ...tdR, fontWeight: 700 }}>{report.data.summary.totalBets}</td>
                      <td style={tdR}></td><td style={tdR}></td>
                      <td style={{ ...tdR, fontWeight: 700, color: profitColor(report.data.summary.totalProfit) }}>{fmtProfit(report.data.summary.totalProfit)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── VALUE BETS ANALYSIS ─────────────────────────────── */}
          {report.type === 'value-bets-analysis' && report.data.ranges?.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead><tr>
                  <th style={thStyle}>Edge Band</th><th style={thR}>W</th><th style={thR}>L</th>
                  <th style={thR}>Win %</th><th style={thR}>Bets</th><th style={thR}>Profit</th>
                </tr></thead>
                <tbody>
                  {report.data.ranges.map((r: any, i: number) => (
                    <tr key={r.range} style={{ background: i % 2 ? '#070e18' : 'transparent' }}>
                      <td style={{ ...tdStyle, color: T.amber }}>{r.range}</td>
                      <td style={{ ...tdR, color: T.green }}>{r.wins}</td>
                      <td style={{ ...tdR, color: T.red }}>{r.losses}</td>
                      <td style={{ ...tdR, color: wrColor(r.winRate) }}>{r.winRate}%</td>
                      <td style={tdR}>{r.total}</td>
                      <td style={{ ...tdR, color: profitColor(r.profit) }}>{fmtProfit(r.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── CONFIDENCE VS RESULTS ───────────────────────────── */}
          {report.type === 'confidence-vs-results' && report.data.ranges?.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead><tr>
                  <th style={thStyle}>Confidence</th><th style={thR}>W</th><th style={thR}>L</th>
                  <th style={thR}>Win %</th><th style={thR}>Bets</th>
                  <th style={thR}>Avg Odds</th><th style={thR}>Profit</th>
                </tr></thead>
                <tbody>
                  {report.data.ranges.map((r: any, i: number) => (
                    <tr key={r.range} style={{ background: i % 2 ? '#070e18' : 'transparent' }}>
                      <td style={{ ...tdStyle, color: T.purple }}>{r.range}</td>
                      <td style={{ ...tdR, color: T.green }}>{r.wins}</td>
                      <td style={{ ...tdR, color: T.red }}>{r.losses}</td>
                      <td style={{ ...tdR, color: wrColor(r.winRate) }}>{r.winRate}%</td>
                      <td style={tdR}>{r.total}</td>
                      <td style={{ ...tdR, color: oddsColor(r.avgOdds) }}>{r.avgOdds}</td>
                      <td style={{ ...tdR, color: profitColor(r.profit) }}>{fmtProfit(r.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── MONTHLY SUMMARY ─────────────────────────────────── */}
          {report.type === 'monthly-summary' && report.data.months?.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead><tr>
                  <th style={thStyle}>Month</th><th style={thR}>Bets</th><th style={thR}>W</th>
                  <th style={thR}>L</th><th style={thR}>Win %</th>
                  <th style={thR}>Avg Odds</th><th style={thR}>Profit</th><th style={thR}>ROI</th><th style={thR}>Avg/Bet</th>
                </tr></thead>
                <tbody>
                  {report.data.months.map((m: any, i: number) => (
                    <tr key={m.month} style={{ background: i % 2 ? '#070e18' : 'transparent' }}>
                      <td style={{ ...tdStyle, color: T.blue, fontWeight: 600 }}>{m.month}</td>
                      <td style={tdR}>{m.bets}</td>
                      <td style={{ ...tdR, color: T.green }}>{m.wins}</td>
                      <td style={{ ...tdR, color: T.red }}>{m.losses}</td>
                      <td style={{ ...tdR, color: wrColor(m.winRate) }}>{m.winRate}%</td>
                      <td style={{ ...tdR, color: oddsColor(m.avgOdds) }}>{m.avgOdds}</td>
                      <td style={{ ...tdR, color: profitColor(m.profit) }}>{fmtProfit(m.profit)}</td>
                      <td style={{ ...tdR, color: parseFloat(m.roi) > 0 ? T.green : parseFloat(m.roi) < 0 ? T.red : T.text }}>{m.roi}%</td>
                      <td style={{ ...tdR, color: T.textDim }}>${m.avgProfitPerBet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── STREAK ANALYSIS ─────────────────────────────────── */}
          {report.type === 'streak-analysis' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, fontSize: 13 }}>
              {[
                { label: 'Current streak', value: `${report.data.currentStreak} ${report.data.currentStreakType || ''}`, color: report.data.currentStreakType === 'win' ? T.green : report.data.currentStreakType === 'loss' ? T.red : T.text },
                { label: 'Max win streak', value: report.data.maxWinStreak, color: T.green },
                { label: 'Max loss streak', value: report.data.maxLossStreak, color: T.red },
                { label: 'Last 5', value: `W${report.data.last5?.wins} / L${report.data.last5?.losses}`, sub: fmtProfit(report.data.last5?.profit || 0), color: T.blue },
                { label: 'Last 10', value: `W${report.data.last10?.wins} / L${report.data.last10?.losses}`, sub: fmtProfit(report.data.last10?.profit || 0), color: T.blue },
              ].map((item, i) => (
                <div key={i} style={{ background: '#0a1422', padding: 14, borderRadius: 6, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 10, color: T.textDim, textTransform: 'uppercase', marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>{item.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: item.color, fontFamily: T.mono }}>{item.value}</div>
                  {item.sub && <div style={{ fontSize: 12, color: T.textDim, marginTop: 4, fontFamily: T.mono }}>{item.sub}</div>}
                </div>
              ))}
            </div>
          )}

          {/* ── ROI BY ODDS RANGE ───────────────────────────────── */}
          {report.type === 'roi-by-odds-range' && report.data.ranges?.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead><tr>
                  <th style={thStyle}>Odds Band</th><th style={thR}>W</th><th style={thR}>L</th>
                  <th style={thR}>Win %</th><th style={thR}>Bets</th><th style={thR}>Profit</th><th style={thR}>ROI</th>
                </tr></thead>
                <tbody>
                  {report.data.ranges.map((r: any, i: number) => (
                    <tr key={r.range} style={{ background: i % 2 ? '#070e18' : 'transparent' }}>
                      <td style={{ ...tdStyle, color: T.amber }}>{r.range}</td>
                      <td style={{ ...tdR, color: T.green }}>{r.wins}</td>
                      <td style={{ ...tdR, color: T.red }}>{r.losses}</td>
                      <td style={{ ...tdR, color: wrColor(r.winRate) }}>{r.winRate}%</td>
                      <td style={tdR}>{r.total}</td>
                      <td style={{ ...tdR, color: profitColor(r.profit) }}>{fmtProfit(r.profit)}</td>
                      <td style={{ ...tdR, color: parseFloat(r.roi) > 0 ? T.green : parseFloat(r.roi) < 0 ? T.red : T.text }}>{r.roi}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
