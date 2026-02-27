'use client'

import { useState } from 'react'

const C = {
  bg: '#04080f',
  card: '#080f1a',
  border: '#12233a',
  borderBright: '#1e3a5f',
  green: '#00e676',
  blue: '#29b6f6',
  amber: '#ffc107',
  red: '#ef5350',
  purple: '#ab47bc',
  text: '#9ab8d4',
  textBright: '#ddeeff',
  textDim: '#3a5570',
  mono: '"JetBrains Mono","Fira Code","Cascadia Code",Consolas,monospace',
}

interface Props {
  secret: string
}

export default function PerformanceSection({ secret }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [tab, setTab] = useState<'overview' | 'sport' | 'daily' | 'recent'>('overview')

  const loadPerformance = async () => {
    if (!secret.trim()) { setError('Enter admin secret first.'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/progno/admin/trading/performance', {
        headers: { Authorization: `Bearer ${secret.trim()}` },
        cache: 'no-store',
      })
      const j = await res.json()
      if (res.ok && j.success) {
        setData(j)
      } else {
        setError(j.error || 'Failed to load performance data')
      }
    } catch (e: any) {
      setError(e?.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ label, value, color = C.textBright, sub }: { label: string; value: string | number; color?: string; sub?: string }) => (
    <div style={{ background: '#060d18', border: `1px solid ${C.border}`, borderRadius: 6, padding: '12px 16px', minWidth: 120 }}>
      <div style={{ fontFamily: C.mono, fontSize: 8, color: C.textDim, letterSpacing: 1.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: C.mono, fontSize: 20, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim, marginTop: 2 }}>{sub}</div>}
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={loadPerformance}
          disabled={loading || !secret.trim()}
          style={{
            padding: '7px 15px', background: loading ? '#0a1422' : `${C.blue}18`,
            color: loading ? C.textDim : C.blue,
            border: `1px solid ${loading ? C.border : C.blue + '50'}`,
            borderRadius: 5, cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 12, fontFamily: C.mono, fontWeight: 600, letterSpacing: '0.5px',
          }}
        >
          {loading ? '⟳ LOADING...' : '📊 LOAD BET PERFORMANCE'}
        </button>

        {data && (
          <div style={{ display: 'flex', gap: 0 }}>
            {(['overview', 'sport', 'daily', 'recent'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '7px 14px', background: 'none', border: 'none',
                  borderBottom: tab === t ? `2px solid ${C.green}` : '2px solid transparent',
                  color: tab === t ? C.green : C.textDim,
                  fontFamily: C.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1,
                  cursor: 'pointer',
                }}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: `${C.red}10`, border: `1px solid ${C.red}30`, borderRadius: 5, fontFamily: C.mono, fontSize: 12, color: C.red }}>
          ✗ {error}
        </div>
      )}

      {data && tab === 'overview' && (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <StatCard label="TOTAL BETS" value={data.overall.totalBets} />
            <StatCard label="WINS" value={data.overall.wins} color={C.green} />
            <StatCard label="LOSSES" value={data.overall.losses} color={C.red} />
            <StatCard label="PENDING" value={data.overall.pending} color={C.amber} />
            <StatCard label="WIN RATE" value={`${data.overall.winRate}%`} color={data.overall.winRate >= 55 ? C.green : data.overall.winRate >= 50 ? C.amber : C.red} />
            <StatCard label="TOTAL STAKED" value={data.overall.totalStaked} color={C.blue} />
            <StatCard label="PROFIT" value={data.overall.totalProfit} color={data.overall.totalProfitCents >= 0 ? C.green : C.red} />
            <StatCard label="ROI" value={`${data.overall.roi}%`} color={data.overall.roi >= 0 ? C.green : C.red} />
          </div>
        </div>
      )}

      {data && tab === 'sport' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: C.mono, fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.borderBright}` }}>
                {['SPORT', 'BETS', 'W', 'L', 'WIN%', 'PROFIT', 'ROI'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: C.textDim, fontWeight: 700, letterSpacing: 1, fontSize: 9 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.bySport.map((s: any, i: number) => (
                <tr key={s.sport} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? 'transparent' : '#070e18' }}>
                  <td style={{ padding: '8px 10px', color: C.blue, fontWeight: 700 }}>{s.sport}</td>
                  <td style={{ padding: '8px 10px', color: C.textBright }}>{s.bets}</td>
                  <td style={{ padding: '8px 10px', color: C.green }}>{s.wins}</td>
                  <td style={{ padding: '8px 10px', color: C.red }}>{s.losses}</td>
                  <td style={{ padding: '8px 10px', color: s.winRate >= 55 ? C.green : s.winRate >= 50 ? C.amber : C.red }}>{s.winRate}%</td>
                  <td style={{ padding: '8px 10px', color: s.profit >= 0 ? C.green : C.red }}>{s.profitDisplay}</td>
                  <td style={{ padding: '8px 10px', color: s.roi >= 0 ? C.green : C.red }}>{s.roi}%</td>
                </tr>
              ))}
              {data.bySport.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: C.textDim }}>No data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {data && tab === 'daily' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: C.mono, fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.borderBright}` }}>
                {['DATE', 'BETS', 'W', 'L', 'WIN%', 'PROFIT'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: C.textDim, fontWeight: 700, letterSpacing: 1, fontSize: 9 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.byDate.map((d: any, i: number) => (
                <tr key={d.date} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? 'transparent' : '#070e18' }}>
                  <td style={{ padding: '8px 10px', color: C.textBright }}>{d.date}</td>
                  <td style={{ padding: '8px 10px', color: C.textBright }}>{d.bets}</td>
                  <td style={{ padding: '8px 10px', color: C.green }}>{d.wins}</td>
                  <td style={{ padding: '8px 10px', color: C.red }}>{d.losses}</td>
                  <td style={{ padding: '8px 10px', color: d.winRate >= 55 ? C.green : d.winRate >= 50 ? C.amber : C.red }}>{d.winRate}%</td>
                  <td style={{ padding: '8px 10px', color: d.profit >= 0 ? C.green : C.red }}>{d.profitDisplay}</td>
                </tr>
              ))}
              {data.byDate.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: C.textDim }}>No data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {data && tab === 'recent' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: C.mono, fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.borderBright}` }}>
                {['DATE', 'PICK', 'GAME', 'SPORT', 'CONF', 'SIDE', 'STAKE', 'STATUS', 'RESULT', 'P/L'].map(h => (
                  <th key={h} style={{ padding: '7px 8px', textAlign: 'left', color: C.textDim, fontWeight: 700, letterSpacing: 1, fontSize: 9 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recentBets.map((b: any, i: number) => {
                const resultColor = b.result === 'win' ? C.green : b.result === 'loss' ? C.red : C.textDim
                return (
                  <tr key={b.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? 'transparent' : '#070e18' }}>
                    <td style={{ padding: '7px 8px', color: C.textDim }}>{b.game_date}</td>
                    <td style={{ padding: '7px 8px', color: C.blue }}>{b.pick}</td>
                    <td style={{ padding: '7px 8px', color: C.textBright, fontSize: 10 }}>{b.away_team} @ {b.home_team}</td>
                    <td style={{ padding: '7px 8px', color: C.textDim }}>{b.sport}</td>
                    <td style={{ padding: '7px 8px', color: C.text }}>{b.confidence}%</td>
                    <td style={{ padding: '7px 8px' }}>
                      <span style={{
                        padding: '1px 5px', borderRadius: 2, fontSize: 9, fontWeight: 700,
                        background: b.side === 'yes' ? `${C.green}20` : `${C.red}20`,
                        color: b.side === 'yes' ? C.green : C.red,
                      }}>{b.side?.toUpperCase()}</span>
                    </td>
                    <td style={{ padding: '7px 8px', color: C.textBright }}>${((b.stake_cents || 0) / 100).toFixed(2)}</td>
                    <td style={{ padding: '7px 8px' }}>
                      <span style={{
                        padding: '1px 5px', borderRadius: 2, fontSize: 9, fontWeight: 700,
                        background: `${b.status === 'submitted' ? C.amber : b.status === 'filled' ? C.blue : C.textDim}20`,
                        color: b.status === 'submitted' ? C.amber : b.status === 'filled' ? C.blue : C.textDim,
                      }}>{(b.status || 'pending').toUpperCase()}</span>
                    </td>
                    <td style={{ padding: '7px 8px', color: resultColor, fontWeight: 700 }}>
                      {b.result ? b.result.toUpperCase() : '—'}
                    </td>
                    <td style={{ padding: '7px 8px', color: (b.profit_cents || 0) >= 0 ? C.green : C.red }}>
                      {b.profit_cents != null ? `$${(b.profit_cents / 100).toFixed(2)}` : '—'}
                    </td>
                  </tr>
                )
              })}
              {data.recentBets.length === 0 && (
                <tr><td colSpan={10} style={{ padding: 20, textAlign: 'center', color: C.textDim }}>No bets placed yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!data && !error && !loading && (
        <div style={{ fontFamily: C.mono, fontSize: 11, color: C.textDim, padding: '10px 0' }}>
          Click "Load Bet Performance" to view your actual bet results.
        </div>
      )}
    </div>
  )
}
