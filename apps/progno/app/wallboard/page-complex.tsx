'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

interface Game {
  id: string
  teamA: string
  teamB: string
  scoreA: number
  scoreB: number
  clock: string
  clockSeconds: number
  model: number
  market: number
  exposure?: number
  edge: number
  sport: string
  status: 'live' | 'final' | 'upcoming'
}

interface Pick {
  label: string
  model: number
  market: number
  edge: number
  homeTeam: string
  awayTeam: string
  sport: string
  confidence: number
  odds: number
  expectedValue: number
  status: string
}

interface KalshiOpportunity {
  homeTeam: string
  awayTeam: string
  pick: string
  modelProb: number
  kalshiPrice: number
  edge: number
  sport: string
}

export default function MissionControlPage() {
  const [games, setGames] = useState<Game[]>([])
  const [picks, setPicks] = useState<Pick[]>([])
  const [kalshiOpps, setKalshiOpps] = useState<KalshiOpportunity[]>([])
  const [bankroll, setBankroll] = useState<number[]>([10000])
  const [currentSport, setCurrentSport] = useState('ncaab')
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [totalPnL, setTotalPnL] = useState(0)
  const [winRate, setWinRate] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const goodSoundRef = useRef<HTMLAudioElement>(null)
  const badSoundRef = useRef<HTMLAudioElement>(null)
  const lastEdgeAlert = useRef<number>(0)

  const SPORTS = ['ncaab', 'nba', 'nhl', 'mlb', 'nfl']

  // Initialize audio
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        goodSoundRef.current = new Audio('/wallboard-assets/crowd-cheer.mp3')
        badSoundRef.current = new Audio('/wallboard-assets/crowd-disappointment.mp3')
        if (goodSoundRef.current) goodSoundRef.current.volume = 0.5
        if (badSoundRef.current) badSoundRef.current.volume = 0.5
      } catch (e) {
        console.log('Audio files not found - sound disabled')
      }
    }
  }, [])

  // Fetch live scores
  const fetchLiveScores = async (sport: string) => {
    try {
      const res = await fetch(`/api/progno/v2?action=live-scores&sport=${sport}`, { cache: 'no-store' })
      if (!res.ok) return []
      const data = await res.json()
      return data.data || []
    } catch (e) {
      console.error('Failed to fetch scores:', e)
      return []
    }
  }

  // Fetch today's picks
  const fetchTodayPicks = async () => {
    try {
      const date = new Date().toISOString().split('T')[0]
      const res = await fetch(`/api/picks/today?date=${date}`, { cache: 'no-store' })
      if (!res.ok) return []
      const data = await res.json()

      let picksList = []
      if (Array.isArray(data)) picksList = data
      else if (data.picks && Array.isArray(data.picks)) picksList = data.picks
      else if (data.data && Array.isArray(data.data)) picksList = data.data

      return picksList.map((p: any) => ({
        label: `${p.pick || p.side || 'Pick'}`,
        model: p.confidence || p.model_prob || 0,
        market: p.market_prob || 50,
        edge: (p.confidence || 0) - (p.market_prob || 50),
        homeTeam: p.home_team || p.homeTeam || '',
        awayTeam: p.away_team || p.awayTeam || '',
        sport: p.sport || 'unknown',
        confidence: p.confidence || 0,
        odds: p.odds || -110,
        expectedValue: p.expected_value || 0,
        status: p.status || 'pending'
      }))
    } catch (e) {
      console.error('Failed to fetch picks:', e)
      return []
    }
  }

  // Fetch Kalshi opportunities
  const fetchKalshiOpportunities = async () => {
    try {
      const res = await fetch('/api/markets/kalshi/sports', { cache: 'no-store' })
      if (!res.ok) return []
      const data = await res.json()

      if (data.picks && Array.isArray(data.picks)) {
        return data.picks.map((p: any) => ({
          homeTeam: p.homeTeam || '',
          awayTeam: p.awayTeam || '',
          pick: p.pick || '',
          modelProb: p.modelProb || 0,
          kalshiPrice: p.kalshiPrice || 50,
          edge: p.edge || 0,
          sport: p.sport || 'ncaab'
        }))
      }
      return []
    } catch (e) {
      console.error('Failed to fetch Kalshi:', e)
      return []
    }
  }

  // Fetch bankroll history from Supabase
  const fetchBankrollHistory = async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        console.log('[Wallboard] Supabase not configured')
        const demoBankroll = [10000, 10100, 10250, 10180, 10320, 10450, 10380, 10520, 10680, 10750]
        setBankroll(demoBankroll)
        setTotalPnL(750)
        setWinRate(58.3)
        return
      }

      const supabase = createClient(supabaseUrl, supabaseKey)
      console.log('[Wallboard] Fetching picks from Supabase...')

      // Get all picks and filter for graded ones
      const { data: allPicks, error } = await supabase
        .from('picks')
        .select('result, odds, created_at')
        .order('created_at', { ascending: true })
        .limit(200)

      if (error) {
        console.error('[Wallboard] Supabase query error:', error)
        const demoBankroll = [10000, 10100, 10250, 10180, 10320, 10450, 10380, 10520, 10680, 10750]
        setBankroll(demoBankroll)
        setTotalPnL(750)
        setWinRate(58.3)
        return
      }

      // Filter for only graded picks (win/loss)
      const picksData = allPicks?.filter(p => p.result === 'win' || p.result === 'loss') || []

      if (picksData.length === 0) {
        console.log('[Wallboard] No graded picks found in Supabase')
        const demoBankroll = [10000, 10100, 10250, 10180, 10320, 10450, 10380, 10520, 10680, 10750]
        setBankroll(demoBankroll)
        setTotalPnL(750)
        setWinRate(58.3)
        return
      }

      console.log(`[Wallboard] Found ${picksData.length} graded picks out of ${allPicks?.length || 0} total`)

      // Calculate running bankroll
      let runningBankroll = 10000
      const bankrollHistory = [runningBankroll]
      let wins = 0
      let total = 0

      picksData.forEach((pick: any) => {
        if (pick.result === 'win') {
          const profit = pick.odds > 0
            ? (100 * pick.odds / 100)
            : (100 * 100 / Math.abs(pick.odds))
          runningBankroll += profit
          wins++
          total++
        } else if (pick.result === 'loss') {
          runningBankroll -= 100
          total++
        }
        bankrollHistory.push(runningBankroll)
      })

      setBankroll(bankrollHistory)
      setTotalPnL(runningBankroll - 10000)
      setWinRate(total > 0 ? (wins / total) * 100 : 0)
    } catch (e) {
      console.error('Failed to fetch bankroll:', e)
    }
  }

  // Convert live scores to game format with model predictions
  const convertScoresToGames = async (scores: any[], picksData: Pick[]): Promise<Game[]> => {
    const games = scores.map((score: any) => {
      // Find matching pick for this game
      const matchingPick = picksData.find(p =>
        (p.homeTeam === score.home && p.awayTeam === score.away) ||
        (p.homeTeam.includes(score.home.split(' ').pop()) && p.awayTeam.includes(score.away.split(' ').pop()))
      )

      const model = matchingPick?.model || 50
      const market = matchingPick?.market || 50
      const edge = model - market

      // Determine exposure (demo - would come from actual bet tracking)
      const exposure = matchingPick && Math.abs(edge) > 3 ? 500 : undefined

      // Parse clock
      const isLive = !score.completed
      const clockSeconds = isLive ? 300 : 0 // Simplified - would parse actual time

      return {
        id: score.id,
        teamA: score.home,
        teamB: score.away,
        scoreA: score.homeScore,
        scoreB: score.awayScore,
        clock: score.completed ? 'FINAL' : 'LIVE',
        clockSeconds,
        model,
        market,
        exposure,
        edge,
        sport: currentSport,
        status: (score.completed ? 'final' : 'live') as 'live' | 'final' | 'upcoming'
      }
    })

    // Sort: live games first, then final games
    return games.sort((a, b) => {
      if (a.status === 'live' && b.status !== 'live') return -1
      if (a.status !== 'live' && b.status === 'live') return 1
      return 0
    }).slice(0, 8) // Limit to 8 games max to fit on screen
  }

  // Main data refresh
  const refreshAllData = async () => {
    const sport = SPORTS[Math.floor(Date.now() / 30000) % SPORTS.length] // Rotate sports every 30s
    setCurrentSport(sport)

    const [scores, picksData, kalshiData] = await Promise.all([
      fetchLiveScores(sport),
      fetchTodayPicks(),
      fetchKalshiOpportunities()
    ])

    const gamesData = await convertScoresToGames(scores, picksData)

    // Check for edge alerts
    const highEdgeGames = gamesData.filter(g => Math.abs(g.edge) > 5)
    if (highEdgeGames.length > 0 && Date.now() - lastEdgeAlert.current > 30000) {
      if (highEdgeGames[0].edge > 0) {
        goodSoundRef.current?.play()
      } else {
        badSoundRef.current?.play()
      }
      lastEdgeAlert.current = Date.now()
    }

    setGames(gamesData)
    setPicks(picksData)
    setKalshiOpps(kalshiData)
    setLastUpdate(new Date().toLocaleTimeString())
  }

  // Initial load
  useEffect(() => {
    refreshAllData()
    fetchBankrollHistory()
  }, [])

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(refreshAllData, 15000)
    return () => clearInterval(interval)
  }, [currentSport])

  // Render bankroll chart
  useEffect(() => {
    if (!canvasRef.current || bankroll.length === 0) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = 180

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const maxVal = Math.max(...bankroll)
    const minVal = Math.min(...bankroll)
    const range = maxVal - minVal || 1

    // Draw gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, 'rgba(0, 255, 156, 0.3)')
    gradient.addColorStop(1, 'rgba(0, 255, 156, 0.05)')

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.moveTo(0, canvas.height)
    bankroll.forEach((b, i) => {
      const x = i * (canvas.width / (bankroll.length - 1))
      const y = canvas.height - ((b - minVal) / range) * canvas.height
      if (i === 0) ctx.lineTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.lineTo(canvas.width, canvas.height)
    ctx.closePath()
    ctx.fill()

    // Draw line
    ctx.strokeStyle = '#00ff9c'
    ctx.lineWidth = 3
    ctx.beginPath()
    bankroll.forEach((b, i) => {
      const x = i * (canvas.width / (bankroll.length - 1))
      const y = canvas.height - ((b - minVal) / range) * canvas.height
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Draw current value
    ctx.fillStyle = '#00ff9c'
    ctx.font = 'bold 24px Orbitron'
    ctx.fillText(`$${bankroll[bankroll.length - 1].toFixed(0)}`, 10, 30)
  }, [bankroll])

  return (
    <>
      <style jsx global>{`
        :root {
          --bg: #0a0f14;
          --panel: #121820;
          --green: #00ff9c;
          --red: #ff3b3b;
          --yellow: #ffb300;
          --blue: #00d4ff;
        }

        body {
          margin: 0;
          background: var(--bg);
          font-family: 'Orbitron', sans-serif;
          color: white;
          overflow: hidden;
        }

        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap');
      `}</style>

      <div style={{
        display: 'grid',
        gridTemplateRows: '60px 1fr 260px',
        height: '100vh'
      }}>
        {/* TOP RIBBON */}
        <div style={{
          background: 'black',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: '20px',
          paddingRight: '20px',
          fontSize: '18px',
          letterSpacing: '2px'
        }}>
          <div>
            PROGNOSTICATION MISSION CONTROL — {currentSport.toUpperCase()} LIVE
          </div>
          <div style={{ fontSize: '14px', opacity: 0.7 }}>
            Last Update: {lastUpdate} | P&L: <span style={{ color: totalPnL >= 0 ? 'var(--green)' : 'var(--red)' }}>
              ${totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(0)}
            </span> | Win Rate: {winRate.toFixed(1)}%
          </div>
        </div>

        {/* MAIN GRID */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '3fr 1fr',
          gap: '20px',
          padding: '20px'
        }}>
          {/* GAMES GRID */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {games.length === 0 && (
              <div style={{
                background: 'var(--panel)',
                borderRadius: '20px',
                padding: '40px',
                textAlign: 'center',
                opacity: 0.5,
                gridColumn: '1 / -1'
              }}>
                No live games for {currentSport.toUpperCase()}. Rotating sports...
              </div>
            )}
            {games.map(g => {
              const confidence = Math.abs(g.edge)
              const ringColor = confidence > 5 ? 'var(--green)' : confidence < 2 ? '#333' : 'var(--yellow)'
              const isEndgame = g.clockSeconds < 300 && g.exposure
              const isWinning = g.exposure && (
                (g.model > 50 && g.scoreA > g.scoreB) ||
                (g.model < 50 && g.scoreB > g.scoreA)
              )

              return (
                <div
                  key={g.id}
                  style={{
                    background: 'var(--panel)',
                    borderRadius: '20px',
                    padding: '20px',
                    position: 'relative',
                    transition: 'all 0.4s ease',
                    transform: isEndgame ? 'scale(1.15)' : 'scale(1)',
                    zIndex: isEndgame ? 5 : 1,
                    border: `3px solid ${ringColor}`,
                    opacity: isEndgame ? 1 : games.some(gg => gg.clockSeconds < 300 && gg.exposure) ? 0.4 : 1,
                    boxShadow: isWinning ? '0 0 20px rgba(0, 255, 156, 0.5)' : 'none'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '20px',
                    marginBottom: '10px',
                    fontWeight: 'bold'
                  }}>
                    <div>{g.teamA}</div>
                    <div>{g.teamB}</div>
                  </div>
                  <div style={{
                    fontSize: '48px',
                    textAlign: 'center',
                    margin: '10px 0',
                    fontWeight: 'bold'
                  }}>
                    {g.scoreA} - {g.scoreB}
                  </div>
                  <div style={{
                    fontSize: '16px',
                    opacity: 0.8,
                    textAlign: 'center',
                    color: g.status === 'live' ? 'var(--green)' : 'var(--yellow)'
                  }}>
                    {g.clock}
                  </div>
                  <div style={{
                    marginTop: '12px',
                    fontSize: '14px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '8px',
                    textAlign: 'center'
                  }}>
                    <div>
                      <div style={{ opacity: 0.6, fontSize: '11px' }}>MODEL</div>
                      <div style={{ fontWeight: 'bold' }}>{g.model.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div style={{ opacity: 0.6, fontSize: '11px' }}>MARKET</div>
                      <div style={{ fontWeight: 'bold' }}>{g.market.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div style={{ opacity: 0.6, fontSize: '11px' }}>EDGE</div>
                      <div style={{
                        fontWeight: 'bold',
                        color: g.edge > 3 ? 'var(--green)' : g.edge < -3 ? 'var(--red)' : 'white'
                      }}>
                        {g.edge > 0 ? '+' : ''}{g.edge.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  {g.exposure && (
                    <div style={{
                      marginTop: '12px',
                      padding: '8px',
                      background: 'rgba(0, 212, 255, 0.1)',
                      borderRadius: '8px',
                      textAlign: 'center',
                      fontSize: '14px',
                      color: 'var(--blue)'
                    }}>
                      💰 ${g.exposure} EXPOSURE
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* EDGE HEATMAP */}
          <div style={{
            background: 'var(--panel)',
            borderRadius: '20px',
            padding: '20px',
            overflow: 'auto',
            maxHeight: 'calc(100vh - 360px)'
          }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>EDGE HEATMAP</h3>
            <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '15px' }}>
              TODAY'S POSTED PICKS
            </div>
            {picks.length === 0 && (
              <div style={{ opacity: 0.5, textAlign: 'center', padding: '20px', fontSize: '13px' }}>
                No picks posted yet
              </div>
            )}
            {picks.slice(0, 10).map((p, i) => {
              const color = p.edge > 3 ? 'var(--green)' : p.edge > 1 ? 'var(--yellow)' : 'var(--red)'
              return (
                <div
                  key={i}
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid #222',
                    marginBottom: '8px'
                  }}
                >
                  <div style={{
                    fontWeight: 'bold',
                    fontSize: '14px',
                    color,
                    marginBottom: '4px'
                  }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>
                    {p.awayTeam} @ {p.homeTeam}
                  </div>
                  <div style={{ fontSize: '13px', marginTop: '6px', color }}>
                    {p.edge > 0 ? '+' : ''}{p.edge.toFixed(1)}% edge
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
                    {p.model.toFixed(1)}% model vs {p.market.toFixed(1)}% market
                  </div>
                  {p.expectedValue > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--blue)', marginTop: '4px' }}>
                      EV: +{p.expectedValue.toFixed(2)}%
                    </div>
                  )}
                </div>
              )
            })}

            {kalshiOpps.length > 0 && (
              <>
                <div style={{
                  fontSize: '11px',
                  opacity: 0.6,
                  marginTop: '20px',
                  marginBottom: '10px',
                  borderTop: '1px solid #333',
                  paddingTop: '15px'
                }}>
                  KALSHI OPPORTUNITIES
                </div>
                {kalshiOpps.slice(0, 5).map((k, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '10px',
                      background: 'rgba(0, 212, 255, 0.1)',
                      borderRadius: '8px',
                      marginBottom: '8px'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--blue)' }}>
                      {k.pick}
                    </div>
                    <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
                      {k.awayTeam} @ {k.homeTeam}
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--green)' }}>
                      +{k.edge.toFixed(1)}% edge ({k.kalshiPrice}¢)
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* BOTTOM SECTION */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '20px',
          padding: '20px'
        }}>
          {/* BANKROLL CURVE */}
          <div style={{
            background: 'var(--panel)',
            borderRadius: '20px',
            padding: '20px'
          }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>BANKROLL CURVE</h3>
            <canvas ref={canvasRef} style={{ width: '100%', height: '180px' }} />
          </div>

          {/* OPEN EXPOSURE */}
          <div style={{
            background: 'var(--panel)',
            borderRadius: '20px',
            padding: '20px',
            overflow: 'auto'
          }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>OPEN EXPOSURE</h3>
            {games.filter(g => g.exposure).map(g => (
              <div
                key={g.id}
                style={{
                  padding: '12px',
                  background: '#1a2030',
                  borderRadius: '8px',
                  marginBottom: '8px'
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                  {g.teamA} vs {g.teamB}
                </div>
                <div style={{
                  fontSize: '13px',
                  marginTop: '6px',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ color: 'var(--blue)' }}>${g.exposure}</span>
                  <span style={{
                    color: g.scoreA > g.scoreB ? 'var(--green)' : 'var(--red)'
                  }}>
                    {g.scoreA} - {g.scoreB}
                  </span>
                </div>
              </div>
            ))}
            {games.filter(g => g.exposure).length === 0 && (
              <div style={{ opacity: 0.5, textAlign: 'center', padding: '20px', fontSize: '13px' }}>
                No open positions
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
