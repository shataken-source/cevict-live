'use client'

import { useState, useEffect, useRef } from 'react'

interface Game {
  id: string
  home: string
  away: string
  homeScore: number
  awayScore: number
  status: 'live' | 'final' | 'upcoming'
  prognoPick?: string
  pickStatus?: 'winning' | 'losing' | 'pending'
}

export default function SimpleWallboard() {
  const [games, setGames] = useState<Game[]>([])
  const [currentSport, setCurrentSport] = useState('ncaab')
  const [lastUpdate, setLastUpdate] = useState<string>('')

  const SPORTS = ['ncaab', 'nba', 'nhl', 'nfl', 'mlb']

  // Fetch live scores and today's picks
  const refreshData = async () => {
    try {
      // Fetch live scores
      const scoresRes = await fetch(`/api/progno/v2?action=live-scores&sport=${currentSport}`, { cache: 'no-store' })
      const scoresData = await scoresRes.json()
      const scores = scoresData.data || []

      // Fetch today's picks
      const date = new Date().toISOString().split('T')[0]
      const picksRes = await fetch(`/api/picks/today?date=${date}`, { cache: 'no-store' })
      const picksData = await picksRes.json()
      let picks = []
      if (Array.isArray(picksData)) picks = picksData
      else if (picksData.picks) picks = picksData.picks
      else if (picksData.data) picks = picksData.data

      // Match picks to games
      const gamesWithPicks = scores.map((score: any) => {
        const matchingPick = picks.find((p: any) =>
          (p.home_team === score.home || p.homeTeam === score.home) &&
          (p.away_team === score.away || p.awayTeam === score.away)
        )

        let prognoPick = undefined
        let pickStatus: 'winning' | 'losing' | 'pending' = 'pending'

        if (matchingPick) {
          prognoPick = matchingPick.pick || matchingPick.side

          if (!score.completed) {
            // Determine if pick is currently winning
            const pickingHome = prognoPick?.toLowerCase().includes(score.home.toLowerCase())
            if (pickingHome) {
              pickStatus = score.homeScore > score.awayScore ? 'winning' : 'losing'
            } else {
              pickStatus = score.awayScore > score.homeScore ? 'winning' : 'losing'
            }
          }
        }

        return {
          id: score.id,
          home: score.home,
          away: score.away,
          homeScore: score.homeScore || 0,
          awayScore: score.awayScore || 0,
          status: score.completed ? 'final' : 'live',
          prognoPick,
          pickStatus
        }
      })

      // Sort: live games with picks first, then other live, then final
      const sorted = gamesWithPicks.sort((a: Game, b: Game) => {
        if (a.status === 'live' && a.prognoPick && (!b.prognoPick || b.status !== 'live')) return -1
        if (b.status === 'live' && b.prognoPick && (!a.prognoPick || a.status !== 'live')) return 1
        if (a.status === 'live' && b.status !== 'live') return -1
        if (b.status === 'live' && a.status !== 'live') return 1
        return 0
      }).slice(0, 6) // Max 6 games

      setGames(sorted)
      setLastUpdate(new Date().toLocaleTimeString())
    } catch (e) {
      console.error('Failed to refresh data:', e)
    }
  }

  // Initial load
  useEffect(() => {
    refreshData()
  }, [])

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(refreshData, 15000)
    return () => clearInterval(interval)
  }, [currentSport])

  // Rotate sports every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSport(prev => {
        const idx = SPORTS.indexOf(prev)
        return SPORTS[(idx + 1) % SPORTS.length]
      })
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: #0a0f14;
          font-family: 'Arial', sans-serif;
          color: white;
          overflow: hidden;
        }
      `}</style>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        padding: '20px',
        gap: '20px'
      }}>
        {/* HEADER */}
        <div style={{
          background: '#1a1f2e',
          padding: '20px 30px',
          borderRadius: '15px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', letterSpacing: '2px' }}>
            PROGNO LIVE — {currentSport.toUpperCase()}
          </div>
          <div style={{ fontSize: '18px', opacity: 0.7 }} suppressHydrationWarning>
            {lastUpdate}
          </div>
        </div>

        {/* GAMES GRID */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '20px',
          flex: 1
        }}>
          {games.length === 0 && (
            <div style={{
              gridColumn: '1 / -1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              opacity: 0.5
            }}>
              No games for {currentSport.toUpperCase()}. Rotating sports...
            </div>
          )}

          {games.map(g => {
            const hasPick = !!g.prognoPick
            const borderColor = !hasPick ? '#333' :
              g.pickStatus === 'winning' ? '#00ff9c' :
                g.pickStatus === 'losing' ? '#ff3b3b' : '#666'

            return (
              <div
                key={g.id}
                style={{
                  background: '#1a1f2e',
                  borderRadius: '20px',
                  padding: '30px',
                  border: `4px solid ${borderColor}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px'
                }}
              >
                {/* STATUS */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: g.status === 'live' ? '#00ff9c' : '#ffb300'
                  }}>
                    {g.status === 'live' ? '🔴 LIVE' : 'FINAL'}
                  </div>
                  {hasPick && (
                    <div style={{
                      fontSize: '16px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      background: g.pickStatus === 'winning' ? 'rgba(0, 255, 156, 0.2)' :
                        g.pickStatus === 'losing' ? 'rgba(255, 59, 59, 0.2)' : 'rgba(255, 179, 0, 0.2)',
                      color: g.pickStatus === 'winning' ? '#00ff9c' :
                        g.pickStatus === 'losing' ? '#ff3b3b' : '#ffb300',
                      fontWeight: 'bold'
                    }}>
                      {g.pickStatus === 'winning' ? '✓ WINNING' :
                        g.pickStatus === 'losing' ? '✗ LOSING' : 'PENDING'}
                    </div>
                  )}
                </div>

                {/* TEAMS & SCORES */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {/* AWAY TEAM */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '15px',
                    borderRadius: '10px',
                    background: g.prognoPick?.toLowerCase().includes(g.away.toLowerCase())
                      ? 'rgba(0, 212, 255, 0.15)'
                      : 'transparent',
                    border: g.prognoPick?.toLowerCase().includes(g.away.toLowerCase())
                      ? '2px solid #00d4ff'
                      : '2px solid transparent'
                  }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                      {g.away}
                      {g.prognoPick?.toLowerCase().includes(g.away.toLowerCase()) && (
                        <span style={{ marginLeft: '10px', color: '#00d4ff' }}>← PROGNO</span>
                      )}
                    </div>
                    <div style={{ fontSize: '48px', fontWeight: 'bold' }}>
                      {g.awayScore}
                    </div>
                  </div>

                  {/* HOME TEAM */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '15px',
                    borderRadius: '10px',
                    background: g.prognoPick?.toLowerCase().includes(g.home.toLowerCase())
                      ? 'rgba(0, 212, 255, 0.15)'
                      : 'transparent',
                    border: g.prognoPick?.toLowerCase().includes(g.home.toLowerCase())
                      ? '2px solid #00d4ff'
                      : '2px solid transparent'
                  }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                      {g.home}
                      {g.prognoPick?.toLowerCase().includes(g.home.toLowerCase()) && (
                        <span style={{ marginLeft: '10px', color: '#00d4ff' }}>← PROGNO</span>
                      )}
                    </div>
                    <div style={{ fontSize: '48px', fontWeight: 'bold' }}>
                      {g.homeScore}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
