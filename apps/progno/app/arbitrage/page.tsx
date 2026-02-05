'use client'
import { useState, useEffect } from 'react'

interface ArbBet {
  bookmaker: string
  selection: string
  odds: number
  stake: number
  payout: number
}

interface ArbitrageOpportunity {
  game: string
  sport: string
  type: string
  profit: number
  stake: number
  bets: ArbBet[]
}

export default function ArbitragePage() {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState('')

  useEffect(() => {
    fetchOpportunities()
    const interval = setInterval(fetchOpportunities, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  const fetchOpportunities = async () => {
    try {
      const res = await fetch('/api/arbitrage')
      const data = await res.json()
      setOpportunities(data.opportunities || [])
      setLastUpdated(new Date(data.lastUpdated).toLocaleTimeString())
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch arbitrage opportunities:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{minHeight: '100vh', background: 'linear-gradient(to bottom right, #0f172a, #1e293b)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{textAlign: 'center'}}>
          <div style={{fontSize: '48px', marginBottom: '20px'}}>💰</div>
          <div style={{fontSize: '24px', fontWeight: 'bold'}}>Scanning for arbitrage...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{minHeight: '100vh', background: 'linear-gradient(to bottom right, #0f172a, #1e293b)', color: 'white', padding: '40px'}}>
      <div style={{maxWidth: '1400px', margin: '0 auto'}}>
        <div style={{marginBottom: '40px'}}>
          <h1 style={{fontSize: '48px', fontWeight: 'bold', marginBottom: '8px'}}>💰 Arbitrage Opportunities</h1>
          <p style={{fontSize: '18px', color: '#94a3b8'}}>
            Guaranteed profit bets • Last updated: {lastUpdated}
          </p>
        </div>

        {opportunities.length === 0 ? (
          <div style={{
            background: 'rgba(148, 163, 184, 0.1)',
            border: '2px dashed rgba(148, 163, 184, 0.3)',
            borderRadius: '16px',
            padding: '60px',
            textAlign: 'center'
          }}>
            <div style={{fontSize: '64px', marginBottom: '20px'}}>🔍</div>
            <h2 style={{fontSize: '28px', fontWeight: 'bold', marginBottom: '12px'}}>No Arbitrage Found</h2>
            <p style={{fontSize: '16px', color: '#94a3b8'}}>
              Checking across multiple sportsbooks... Opportunities appear rarely!
            </p>
          </div>
        ) : (
          <div style={{display: 'grid', gap: '24px'}}>
            {opportunities.map((opp, i) => (
              <div key={i} style={{
                background: 'linear-gradient(to bottom right, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.1))',
                border: '2px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '16px',
                padding: '32px'
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px'}}>
                  <div>
                    <div style={{fontSize: '14px', color: '#10b981', fontWeight: 'bold', marginBottom: '8px'}}>
                      {opp.sport} • {opp.type.toUpperCase()}
                    </div>
                    <h2 style={{fontSize: '32px', fontWeight: 'bold', marginBottom: '8px'}}>{opp.game}</h2>
                    <div style={{fontSize: '16px', color: '#94a3b8'}}>
                      Risk-free profit opportunity
                    </div>
                  </div>
                  <div style={{textAlign: 'right'}}>
                    <div style={{fontSize: '14px', color: '#94a3b8', marginBottom: '4px'}}>Guaranteed Profit</div>
                    <div style={{fontSize: '48px', fontWeight: 'bold', color: '#10b981'}}>
                      +{opp.profit.toFixed(2)}%
                    </div>
                    <div style={{fontSize: '14px', color: '#94a3b8'}}>
                      ${((opp.stake * opp.profit) / 100).toFixed(2)} on ${opp.stake}
                    </div>
                  </div>
                </div>

                <div style={{background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '24px'}}>
                  <h3 style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '16px'}}>📋 Betting Instructions</h3>
                  
                  <div style={{display: 'grid', gap: '16px'}}>
                    {opp.bets.map((bet, idx) => (
                      <div key={idx} style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '4px'}}>
                            {idx + 1}. {bet.bookmaker}
                          </div>
                          <div style={{fontSize: '16px', color: '#10b981'}}>
                            Bet {bet.selection}
                          </div>
                        </div>
                        <div style={{textAlign: 'right'}}>
                          <div style={{fontSize: '14px', color: '#94a3b8'}}>Stake</div>
                          <div style={{fontSize: '24px', fontWeight: 'bold'}}>${bet.stake.toFixed(2)}</div>
                          <div style={{fontSize: '12px', color: '#94a3b8'}}>
                            Odds: {bet.odds > 0 ? '+' : ''}{bet.odds}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{
                    marginTop: '20px',
                    padding: '16px',
                    background: 'rgba(34, 197, 94, 0.2)',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    borderRadius: '8px'
                  }}>
                    <div style={{fontSize: '14px', fontWeight: 'bold', marginBottom: '8px'}}>⚡ Result</div>
                    <div style={{fontSize: '16px'}}>
                      No matter who wins, you profit ${((opp.stake * opp.profit) / 100).toFixed(2)} 
                      ({opp.profit.toFixed(2)}% return on ${opp.stake} total investment)
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{
          marginTop: '40px',
          padding: '24px',
          background: 'rgba(148, 163, 184, 0.1)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <h3 style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '12px'}}>⚠️ Important Notes</h3>
          <ul style={{textAlign: 'left', maxWidth: '800px', margin: '0 auto', fontSize: '14px', color: '#94a3b8', lineHeight: '1.8'}}>
            <li>Arbitrage opportunities are rare and disappear quickly</li>
            <li>You need accounts at multiple sportsbooks</li>
            <li>Place bets simultaneously to lock in odds</li>
            <li>Sportsbooks may limit accounts that consistently arbitrage</li>
            <li>Always verify odds before placing bets</li>
          </ul>
        </div>

        <div style={{textAlign: 'center', marginTop: '40px'}}>
          <a href="/" style={{color: '#10b981', textDecoration: 'none', fontSize: '18px'}}>← Back to Home</a>
        </div>
      </div>
    </div>
  )
}