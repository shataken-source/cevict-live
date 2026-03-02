'use client'

import { useEffect, useState } from 'react'

const C = {
  bg: '#04080f',
  card: '#080f1a',
  border: '#12233a',
  green: '#00e676',
  blue: '#29b6f6',
  amber: '#ffc107',
  red: '#ef5350',
  text: '#9ab8d4',
  textBright: '#ddeeff',
  textDim: '#3a5570',
  mono: '"JetBrains Mono","Fira Code",Consolas,monospace',
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || C.textBright }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: 'uppercase', letterSpacing: '1px', marginTop: 4 }}>{label}</div>
    </div>
  )
}

export default function TrailerVegasReportPage() {
  const [status, setStatus] = useState<'loading' | 'complete' | 'pending' | 'processing' | 'error'>('loading')
  const [report, setReport] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [pollCount, setPollCount] = useState(0)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')
    if (!sessionId) { setStatus('error'); setError('No session ID'); return }

    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/trailervegas/report?session_id=${sessionId}`)
        const data = await res.json()
        if (data.status === 'complete') {
          setReport(data.report)
          setStatus('complete')
        } else if (data.status === 'pending' || data.status === 'processing') {
          setStatus(data.status)
          // Poll again in 3s (max 20 attempts = 60s)
          if (pollCount < 20) {
            setTimeout(() => setPollCount(c => c + 1), 3000)
          } else {
            setStatus('error')
            setError('Report is taking longer than expected. Please refresh in a minute.')
          }
        } else {
          setStatus('error')
          setError(data.error || 'Report not found')
        }
      } catch (e: any) {
        setStatus('error')
        setError(e?.message || 'Failed to fetch report')
      }
    }

    fetchReport()
  }, [pollCount])

  if (status === 'loading' || status === 'pending' || status === 'processing') {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: C.mono, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.textBright, marginBottom: 12 }}>
          {status === 'loading' ? 'Loading report...' : 'Generating your report...'}
        </div>
        <div style={{ fontSize: 12, color: C.textDim }}>
          {status === 'pending' ? 'Waiting for payment confirmation...' : 'Grading your picks against outcomes. This takes a few seconds.'}
        </div>
        <div style={{ marginTop: 20, width: 40, height: 40, border: `3px solid ${C.border}`, borderTopColor: C.blue, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: C.mono, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.red, marginBottom: 12 }}>Error</div>
        <div style={{ fontSize: 13, color: C.text }}>{error}</div>
        <a href="/trailervegas" style={{ marginTop: 20, color: C.blue, fontSize: 12 }}>← Back to TrailerVegas</a>
      </div>
    )
  }

  const perf = report?.performance || {}
  const counts = report?.counts || {}
  const byLeague = report?.byLeague || {}
  const sample = report?.sample || []

  const roiColor = perf.roi > 0 ? C.green : perf.roi < 0 ? C.red : C.textBright
  const wrColor = perf.winRate > 52 ? C.green : perf.winRate < 48 ? C.red : C.amber

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: C.mono }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px 60px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <a href="/trailervegas" style={{ color: C.blue, textDecoration: 'none', fontSize: 12 }}>← Back</a>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.textBright }}>Your Grading Report</h1>
        </div>

        {/* Top-level stats */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '28px 20px', marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <Stat label="Win Rate" value={`${perf.winRate ?? 0}%`} color={wrColor} />
            <Stat label="ROI" value={`${perf.roi > 0 ? '+' : ''}${perf.roi ?? 0}%`} color={roiColor} />
            <Stat label="Record" value={`${counts.wins ?? 0}W–${counts.losses ?? 0}L`} />
            <Stat label="Total Picks" value={counts.total ?? 0} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 16 }}>
            <Stat label="Graded" value={counts.graded ?? 0} />
            <Stat label="Pending" value={counts.pending ?? 0} color={C.amber} />
            <Stat label="Unmatched" value={counts.unmatched ?? 0} color={C.textDim} />
            <Stat label="Profit (units)" value={perf.totalProfit > 0 ? `+${perf.totalProfit}` : perf.totalProfit ?? 0} color={roiColor} />
          </div>
        </div>

        {/* By League */}
        {Object.keys(byLeague).length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px', marginBottom: 20 }}>
            <div style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: C.textDim, marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
              BY LEAGUE
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {Object.entries(byLeague).map(([league, stats]: [string, any]) => (
                <div key={league} style={{ background: '#050c16', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.blue, marginBottom: 6 }}>{league}</div>
                  <div style={{ fontSize: 11, color: C.text }}>
                    {stats.wins}W–{stats.losses}L ({stats.winRate}% WR)
                  </div>
                  <div style={{ fontSize: 11, color: stats.roi > 0 ? C.green : stats.roi < 0 ? C.red : C.textDim }}>
                    ROI: {stats.roi > 0 ? '+' : ''}{stats.roi}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Graded picks table */}
        {sample.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px', overflow: 'auto' }}>
            <div style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: C.textDim, marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
              GRADED PICKS ({sample.length}{sample.length >= 200 ? '+' : ''})
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['Date', 'Matchup', 'Pick', 'Odds', 'Result', 'Profit'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: C.textDim, fontWeight: 600, fontSize: 10 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sample.filter((r: any) => r.status === 'win' || r.status === 'lose').slice(0, 100).map((r: any, i: number) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}20` }}>
                    <td style={{ padding: '5px 8px', color: C.textDim }}>{r.date}</td>
                    <td style={{ padding: '5px 8px', color: C.text }}>{r.away_team} @ {r.home_team}</td>
                    <td style={{ padding: '5px 8px', color: C.textBright }}>{r.pick}</td>
                    <td style={{ padding: '5px 8px', color: C.textDim }}>{r.odds ?? '—'}</td>
                    <td style={{ padding: '5px 8px', color: r.status === 'win' ? C.green : C.red, fontWeight: 700 }}>
                      {r.status.toUpperCase()}
                      {r.home_score != null && r.away_score != null ? ` (${r.home_score}–${r.away_score})` : ''}
                    </td>
                    <td style={{ padding: '5px 8px', color: (r.profit ?? 0) > 0 ? C.green : C.red }}>
                      {(r.profit ?? 0) > 0 ? '+' : ''}{(r.profit ?? 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 32, fontSize: 10, color: C.textDim }}>
          Powered by Cevict &bull; Data from public game outcomes &bull; No gambling advice
        </div>
      </div>
    </div>
  )
}
