'use client'

import { useState } from 'react'

// Theme (matches admin page)
const C = {
  bg: '#04080f',
  card: '#080f1a',
  border: '#12233a',
  borderBright: '#1e3a5f',
  green: '#00e676',
  blue: '#29b6f6',
  amber: '#ffc107',
  red: '#ef5350',
  text: '#9ab8d4',
  textBright: '#ddeeff',
  textDim: '#3a5570',
  mono: '"JetBrains Mono","Fira Code","Cascadia Code",Consolas,monospace',
}

export interface PreviewPick {
  pick: string
  home_team: string
  away_team: string
  sport: string
  league: string
  confidence: number
  odds: number | null
  expected_value: number | null
  is_home_pick: boolean
  source: string
  matched: boolean
  ticker: string | null
  market_title: string | null
  side: 'yes' | 'no' | null
  price: number | null
  contracts: number | null
  estimated_cost_cents: number | null
  default_stake_cents: number
}

interface Props {
  picks: PreviewPick[]
  date: string
  onClose: () => void
  onSubmit: (bets: SelectedBet[]) => Promise<void>
}

export interface SelectedBet {
  pick: string
  home_team: string
  away_team: string
  sport: string
  league: string
  confidence: number
  ticker: string
  market_title: string
  side: string
  price: number
  contracts: number
  stake_cents: number
}

export default function BetSelectionModal({ picks, date, onClose, onSubmit }: Props) {
  const matchedPicks = picks.filter(p => p.matched && p.ticker && p.side && p.price)
  const unmatchedPicks = picks.filter(p => !p.matched)

  const [selected, setSelected] = useState<Set<number>>(() => {
    // Pre-select all matched picks with confidence >= 65
    const initial = new Set<number>()
    matchedPicks.forEach((p, i) => {
      if (p.confidence >= 65) initial.add(i)
    })
    return initial
  })

  const [stakes, setStakes] = useState<Map<number, number>>(() => {
    const m = new Map<number, number>()
    matchedPicks.forEach((p, i) => m.set(i, p.default_stake_cents))
    return m
  })

  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ submitted: number; errors: number; results: any[] } | null>(null)

  const toggleAll = () => {
    if (selected.size === matchedPicks.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(matchedPicks.map((_, i) => i)))
    }
  }

  const toggle = (idx: number) => {
    const next = new Set(selected)
    if (next.has(idx)) next.delete(idx)
    else next.add(idx)
    setSelected(next)
  }

  const setStake = (idx: number, cents: number) => {
    const next = new Map(stakes)
    next.set(idx, Math.max(100, cents)) // minimum $1
    setStakes(next)
  }

  const totalCost = Array.from(selected).reduce((sum, idx) => {
    const p = matchedPicks[idx]
    const stake = stakes.get(idx) || p.default_stake_cents
    return sum + stake
  }, 0)

  const handleSubmit = async () => {
    if (selected.size === 0) return
    setSubmitting(true)
    try {
      const bets: SelectedBet[] = Array.from(selected).map(idx => {
        const p = matchedPicks[idx]
        const stakeCents = stakes.get(idx) || p.default_stake_cents
        const contracts = Math.max(1, Math.floor(stakeCents / Math.max(1, p.price!)))
        return {
          pick: p.pick,
          home_team: p.home_team,
          away_team: p.away_team,
          sport: p.sport,
          league: p.league,
          confidence: p.confidence,
          ticker: p.ticker!,
          market_title: p.market_title || '',
          side: p.side!,
          price: p.price!,
          contracts,
          stake_cents: stakeCents,
        }
      })
      await onSubmit(bets)
    } catch (e: any) {
      setResult({ submitted: 0, errors: 1, results: [{ status: 'error', error: e?.message }] })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: C.card, border: `1px solid ${C.borderBright}`,
        borderRadius: 12, width: '100%', maxWidth: 1000, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontFamily: C.mono, fontSize: 14, fontWeight: 700, color: C.green, letterSpacing: 2 }}>
              💰 SELECT BETS — {date}
            </div>
            <div style={{ fontFamily: C.mono, fontSize: 11, color: C.textDim, marginTop: 4 }}>
              {matchedPicks.length} matched · {unmatchedPicks.length} unmatched · {selected.size} selected
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: `1px solid ${C.border}`, borderRadius: 4,
            color: C.textDim, padding: '6px 12px', cursor: 'pointer',
            fontFamily: C.mono, fontSize: 12,
          }}>✕ CLOSE</button>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: C.mono, fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.borderBright}`, position: 'sticky', top: 0, background: C.card, zIndex: 1 }}>
                <th style={{ padding: '10px 12px', textAlign: 'center', width: 40 }}>
                  <input type="checkbox" checked={selected.size === matchedPicks.length} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                </th>
                {['GAME', 'PICK', 'SPORT', 'CONF', 'TICKER', 'SIDE', 'PRICE', 'STAKE ($)', 'EST. COST'].map(h => (
                  <th key={h} style={{ padding: '10px 8px', textAlign: 'left', color: C.textDim, fontWeight: 700, letterSpacing: 1, fontSize: 9 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matchedPicks.map((p, i) => {
                const isSelected = selected.has(i)
                const stake = stakes.get(i) || p.default_stake_cents
                const contracts = Math.max(1, Math.floor(stake / Math.max(1, p.price!)))
                const cost = contracts * (p.price || 0)
                return (
                  <tr
                    key={i}
                    onClick={() => toggle(i)}
                    style={{
                      borderBottom: `1px solid ${C.border}`,
                      background: isSelected ? `${C.green}08` : i % 2 === 0 ? 'transparent' : '#070e18',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                  >
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggle(i)} style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={{ padding: '8px', color: C.textBright }}>
                      {p.away_team} @ {p.home_team}
                    </td>
                    <td style={{ padding: '8px', color: C.blue, fontWeight: 700 }}>
                      {p.pick}
                      {p.is_home_pick
                        ? <span style={{ marginLeft: 6, padding: '1px 5px', fontSize: 9, background: `${C.green}20`, color: C.green, borderRadius: 2 }}>H</span>
                        : <span style={{ marginLeft: 6, padding: '1px 5px', fontSize: 9, background: `${C.amber}20`, color: C.amber, borderRadius: 2 }}>A</span>
                      }
                    </td>
                    <td style={{ padding: '8px', color: C.textDim }}>{p.sport}</td>
                    <td style={{ padding: '8px', color: p.confidence >= 70 ? C.green : p.confidence >= 60 ? C.amber : C.text }}>
                      {p.confidence}%
                    </td>
                    <td style={{ padding: '8px', color: C.textDim, fontSize: 10 }}>{p.ticker?.slice(0, 25)}</td>
                    <td style={{ padding: '8px' }}>
                      <span style={{
                        padding: '2px 6px', borderRadius: 3, fontSize: 10, fontWeight: 700,
                        background: p.side === 'yes' ? `${C.green}20` : `${C.red}20`,
                        color: p.side === 'yes' ? C.green : C.red,
                      }}>
                        {p.side?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '8px', color: C.textBright }}>{p.price}¢</td>
                    <td style={{ padding: '8px' }} onClick={e => e.stopPropagation()}>
                      <input
                        type="number"
                        value={stake / 100}
                        onChange={e => setStake(i, Math.round(Number(e.target.value) * 100))}
                        min={1}
                        step={1}
                        style={{
                          width: 60, padding: '3px 6px',
                          background: '#050c16', border: `1px solid ${isSelected ? C.green + '40' : C.border}`,
                          borderRadius: 3, color: C.textBright, fontFamily: C.mono, fontSize: 11,
                          textAlign: 'right',
                        }}
                      />
                    </td>
                    <td style={{ padding: '8px', color: C.textDim }}>
                      ${(cost / 100).toFixed(2)}
                    </td>
                  </tr>
                )
              })}

              {/* Unmatched picks (greyed out) */}
              {unmatchedPicks.length > 0 && (
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td colSpan={10} style={{ padding: '12px', color: C.textDim, fontSize: 10, letterSpacing: 1, textAlign: 'center' }}>
                    ── {unmatchedPicks.length} UNMATCHED (no Kalshi market found) ──
                  </td>
                </tr>
              )}
              {unmatchedPicks.map((p, i) => (
                <tr key={`um-${i}`} style={{ borderBottom: `1px solid ${C.border}`, opacity: 0.4 }}>
                  <td style={{ padding: '8px 12px' }}></td>
                  <td style={{ padding: '8px', color: C.textDim }}>{p.away_team} @ {p.home_team}</td>
                  <td style={{ padding: '8px', color: C.textDim }}>{p.pick}</td>
                  <td style={{ padding: '8px', color: C.textDim }}>{p.sport}</td>
                  <td style={{ padding: '8px', color: C.textDim }}>{p.confidence}%</td>
                  <td colSpan={4} style={{ padding: '8px', color: C.red, fontSize: 10 }}>No market</td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ fontFamily: C.mono, fontSize: 12, color: C.textBright }}>
            {selected.size} bets · Total: <span style={{ color: C.green, fontWeight: 700 }}>${(totalCost / 100).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{
              padding: '8px 20px', background: 'none', border: `1px solid ${C.border}`,
              borderRadius: 5, color: C.textDim, cursor: 'pointer',
              fontFamily: C.mono, fontSize: 12, fontWeight: 600,
            }}>CANCEL</button>
            <button
              onClick={handleSubmit}
              disabled={selected.size === 0 || submitting}
              style={{
                padding: '8px 24px',
                background: selected.size === 0 || submitting ? '#0a1422' : `${C.green}18`,
                border: `1px solid ${selected.size === 0 || submitting ? C.border : C.green + '50'}`,
                borderRadius: 5, cursor: selected.size === 0 || submitting ? 'not-allowed' : 'pointer',
                color: selected.size === 0 || submitting ? C.textDim : C.green,
                fontFamily: C.mono, fontSize: 12, fontWeight: 700, letterSpacing: 1,
              }}
            >
              {submitting ? '⟳ PLACING BETS...' : `💰 PLACE ${selected.size} BETS — $${(totalCost / 100).toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
