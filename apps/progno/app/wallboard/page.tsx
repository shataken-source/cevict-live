'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface BroadcastInfo {
  gameId: string
  home: string
  away: string
  shortName: string
  startTime: string
  status: string
  channels: string[]
  nationalTV: string | null
}

interface Game {
  id: string
  home: string
  away: string
  homeScore: number
  awayScore: number
  status: 'live' | 'final' | 'upcoming'
  prognoPick?: string
  pickStatus?: 'winning' | 'losing' | 'pending'
  tvChannel?: string
  allChannels?: string[]
}

export default function SimpleWallboard() {
  const [games, setGames] = useState<Game[]>([])
  const [currentSport, setCurrentSport] = useState('ncaab')
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [showTVSchedule, setShowTVSchedule] = useState(false)
  const [tvSchedule, setTvSchedule] = useState<BroadcastInfo[]>([])
  const [tvLoading, setTvLoading] = useState(false)

  const SPORTS = ['ncaab', 'nba', 'nhl', 'nfl', 'mlb']

  // Fetch TV broadcast data from ESPN
  const fetchTVData = useCallback(async (sport: string): Promise<Map<string, BroadcastInfo>> => {
    const map = new Map<string, BroadcastInfo>()
    try {
      const res = await fetch(`/api/tv-schedule?sport=${sport}`, { cache: 'no-store' })
      if (!res.ok) return map
      const data = await res.json()
      for (const g of data.games || []) {
        // Index by normalized team names for fuzzy matching
        const key1 = g.home.toLowerCase()
        const key2 = g.away.toLowerCase()
        map.set(key1, g)
        map.set(key2, g)
        map.set(g.gameId, g)
      }
    } catch (e) {
      console.warn('TV schedule fetch failed:', e)
    }
    return map
  }, [])

  // Fetch live scores and today's picks
  const refreshData = async () => {
    try {
      // Fetch live scores + TV data in parallel
      const [scoresRes, picksRes, tvMap] = await Promise.all([
        fetch(`/api/progno/v2?action=live-scores&sport=${currentSport}`, { cache: 'no-store' }),
        fetch(`/api/picks/today?date=${new Date().toISOString().split('T')[0]}`, { cache: 'no-store' }),
        fetchTVData(currentSport),
      ])

      const scoresData = await scoresRes.json()
      const scores = scoresData.data || []

      const picksData = await picksRes.json()
      let picks: any[] = []
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
            const pickingHome = prognoPick?.toLowerCase().includes(score.home.toLowerCase())
            if (pickingHome) {
              pickStatus = score.homeScore > score.awayScore ? 'winning' : 'losing'
            } else {
              pickStatus = score.awayScore > score.homeScore ? 'winning' : 'losing'
            }
          }
        }

        // Match TV broadcast info
        const tvInfo = tvMap.get(score.home?.toLowerCase()) ||
          tvMap.get(score.away?.toLowerCase()) ||
          tvMap.get(score.id)
        const tvChannel = tvInfo?.nationalTV || tvInfo?.channels?.[0] || undefined
        const allChannels = tvInfo?.channels || []

        return {
          id: score.id,
          home: score.home,
          away: score.away,
          homeScore: score.homeScore || 0,
          awayScore: score.awayScore || 0,
          status: score.completed ? 'final' : 'live',
          prognoPick,
          pickStatus,
          tvChannel,
          allChannels,
        } as Game
      })

      // Sort: live games with picks first, then other live, then final
      const sorted = gamesWithPicks.sort((a: Game, b: Game) => {
        if (a.status === 'live' && a.prognoPick && (!b.prognoPick || b.status !== 'live')) return -1
        if (b.status === 'live' && b.prognoPick && (!a.prognoPick || a.status !== 'live')) return 1
        if (a.status === 'live' && b.status !== 'live') return -1
        if (b.status === 'live' && a.status !== 'live') return 1
        return 0
      }).slice(0, 6)

      setGames(sorted)
      setLastUpdate(new Date().toLocaleTimeString())
    } catch (e) {
      console.error('Failed to refresh data:', e)
    }
  }

  // Full TV schedule popup loader (all sports)
  const loadFullTVSchedule = async () => {
    setTvLoading(true)
    try {
      const res = await fetch('/api/tv-schedule?sport=all', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setTvSchedule(data.games || [])
      }
    } catch (e) {
      console.error('TV schedule load failed:', e)
    }
    setTvLoading(false)
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* TV SCHEDULE BUTTON */}
            <button
              onClick={() => { setShowTVSchedule(true); loadFullTVSchedule() }}
              style={{
                background: 'rgba(168, 85, 247, 0.2)',
                border: '2px solid #a855f7',
                borderRadius: '10px',
                padding: '8px 16px',
                color: '#d8b4fe',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              📺 TV Schedule
            </button>
            <div style={{ fontSize: '18px', opacity: 0.7 }} suppressHydrationWarning>
              {lastUpdate}
            </div>
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
                {/* STATUS + TV CHANNEL */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: g.status === 'live' ? '#00ff9c' : '#ffb300'
                    }}>
                      {g.status === 'live' ? '🔴 LIVE' : 'FINAL'}
                    </div>
                    {/* TV CHANNEL BADGE */}
                    {g.tvChannel && (
                      <div
                        title={g.allChannels?.join(', ')}
                        style={{
                          fontSize: '13px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: 'rgba(168, 85, 247, 0.2)',
                          border: '1px solid rgba(168, 85, 247, 0.4)',
                          color: '#d8b4fe',
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        📺 {g.tvChannel}
                      </div>
                    )}
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

      {/* ─── TV SCHEDULE POPUP ─────────────────────────────────────────────── */}
      {showTVSchedule && (
        <div
          onClick={() => setShowTVSchedule(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#1a1f2e',
              borderRadius: '20px',
              border: '2px solid #a855f7',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '85vh',
              overflow: 'auto',
              padding: '30px',
            }}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '20px',
            }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#d8b4fe' }}>
                📺 Today's TV Schedule
              </div>
              <button
                onClick={() => setShowTVSchedule(false)}
                style={{
                  background: 'rgba(255,255,255,0.1)', border: 'none',
                  borderRadius: '8px', padding: '8px 14px',
                  color: 'white', fontSize: '20px', cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {tvLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', fontSize: '20px', opacity: 0.6 }}>
                Loading TV schedule...
              </div>
            ) : tvSchedule.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', fontSize: '20px', opacity: 0.6 }}>
                No games with TV broadcasts found.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tvSchedule.map((g, i) => {
                  const time = new Date(g.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                  const isNational = !!g.nationalTV
                  return (
                    <div key={g.gameId || i} style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: isNational ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.03)',
                      border: isNational ? '1px solid rgba(168,85,247,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    }}>
                      {/* Time */}
                      <div style={{
                        fontSize: '14px', color: '#9ca3af', minWidth: '70px',
                        fontWeight: g.status === 'In Progress' ? 'bold' : 'normal',
                      }}>
                        {g.status === 'In Progress' ? '🔴 LIVE' : time}
                      </div>

                      {/* Matchup */}
                      <div style={{ flex: 1, fontSize: '16px', fontWeight: 'bold' }}>
                        {g.shortName}
                      </div>

                      {/* TV Channels */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {g.channels.slice(0, 3).map((ch, ci) => (
                          <span key={ci} style={{
                            fontSize: '12px',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            background: g.nationalTV === ch
                              ? 'rgba(168,85,247,0.3)'
                              : 'rgba(255,255,255,0.08)',
                            color: g.nationalTV === ch ? '#d8b4fe' : '#9ca3af',
                            fontWeight: g.nationalTV === ch ? 'bold' : 'normal',
                            border: g.nationalTV === ch
                              ? '1px solid rgba(168,85,247,0.5)'
                              : '1px solid transparent',
                          }}>
                            {ch}
                          </span>
                        ))}
                        {g.channels.length > 3 && (
                          <span style={{ fontSize: '11px', color: '#6b7280', alignSelf: 'center' }}>
                            +{g.channels.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
