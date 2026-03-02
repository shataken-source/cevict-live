'use client'

import { useState } from 'react'

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

export default function TrailerVegasPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cancelled, setCancelled] = useState(
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('cancelled') === '1'
  )

  const handleSubmit = async () => {
    if (!file) { setError('Choose a CSV or JSON file with your picks.'); return }
    setError(null)
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/trailervegas/checkout', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create checkout session'); return }
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        setError('No checkout URL returned')
      }
    } catch (e: any) {
      setError(e?.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: C.mono }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '60px 24px 40px' }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: C.textBright, marginBottom: 8, letterSpacing: '-0.5px' }}>
          TrailerVegas
        </h1>
        <p style={{ fontSize: 16, color: C.text, maxWidth: 520, margin: '0 auto 8px' }}>
          Grade your sports picks against real outcomes.
        </p>
        <p style={{ fontSize: 13, color: C.textDim }}>
          Upload your picks &bull; Pay $10 &bull; Get your report instantly
        </p>
      </div>

      {/* Main card */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 24px 60px' }}>
        {cancelled && (
          <div style={{ background: `${C.amber}15`, border: `1px solid ${C.amber}40`, borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 12, color: C.amber }}>
            Payment was cancelled. You can try again below.
          </div>
        )}

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '28px 28px 24px' }}>
          <div style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: C.textDim, marginBottom: 20, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
            UPLOAD YOUR PICKS
          </div>

          <p style={{ fontSize: 12, color: C.text, marginBottom: 16, lineHeight: 1.6 }}>
            <strong style={{ color: C.textBright }}>CSV format</strong> (recommended headers):<br />
            <code style={{ color: C.blue, fontSize: 11 }}>date,home_team,away_team,pick,odds,stake,league</code>
          </p>
          <p style={{ fontSize: 11, color: C.textDim, marginBottom: 16 }}>
            <code>pick</code> = team name or <code>home</code>/<code>away</code>. Odds in American format (e.g. -110, +150). Stake defaults to 1 unit. Max 500 picks per report.
          </p>

          <div style={{ marginBottom: 20 }}>
            <input
              type="file"
              accept=".csv,application/json,text/csv"
              onChange={(e) => { setFile(e.target.files?.[0] || null); setError(null); setCancelled(false) }}
              style={{ color: C.text, fontSize: 12 }}
            />
          </div>

          {file && (
            <p style={{ fontSize: 11, color: C.green, marginBottom: 16 }}>
              ✓ {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}

          {error && (
            <p style={{ fontSize: 12, color: C.red, marginBottom: 16 }}>{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !file}
            style={{
              width: '100%',
              padding: '14px 0',
              background: loading || !file ? '#0a1422' : C.green,
              color: loading || !file ? C.textDim : '#000',
              border: 'none',
              borderRadius: 8,
              cursor: loading || !file ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontFamily: C.mono,
              fontWeight: 700,
              letterSpacing: '0.5px',
            }}
          >
            {loading ? 'Creating checkout...' : 'Grade My Picks — $10'}
          </button>
        </div>

        {/* How it works */}
        <div style={{ marginTop: 32 }}>
          <div style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: C.textDim, marginBottom: 16 }}>
            HOW IT WORKS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { num: '1', title: 'Upload', desc: 'CSV or JSON of your picks with dates, teams, and sides.' },
              { num: '2', title: 'Pay', desc: 'One-time $10 payment via Stripe. No subscriptions.' },
              { num: '3', title: 'Report', desc: 'Win rate, ROI, by-league breakdown, all graded picks.' },
            ].map((s) => (
              <div key={s.num} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px 14px' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.blue, marginBottom: 6 }}>{s.num}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.textBright, marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 40, fontSize: 10, color: C.textDim }}>
          Powered by Cevict &bull; Data from public game outcomes &bull; No gambling advice
        </div>
      </div>
    </div>
  )
}
