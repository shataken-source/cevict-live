'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import styles from './wallboard.module.css'

const SPORTS = ['nba', 'ncaab', 'nhl', 'mlb', 'nfl']

interface Bet {
  home_team: string
  away_team: string
  side: string
  stake: number
  price: number
  book?: string
  result?: 'win' | 'loss' | 'push' | 'pending'
}

interface Alert {
  severity: 'green' | 'yellow' | 'red'
  title: string
  desc: string
  time: string
}

export default function WallboardPage() {
  const [currentTime, setCurrentTime] = useState('')
  const [sportIdx, setSportIdx] = useState(0)
  const [myBets, setMyBets] = useState<Bet[]>([])
  const [kalshiPositions, setKalshiPositions] = useState<Bet[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [beepsMuted, setBeepsMuted] = useState(false)
  const [crowdMuted, setCrowdMuted] = useState(false)
  const [modalType, setModalType] = useState<string | null>(null)
  const [scores, setScores] = useState<any[]>([])

  const audioContextRef = useRef<AudioContext | null>(null)
  const crowdAudioRef = useRef<HTMLAudioElement | null>(null)
  const booAudioRef = useRef<HTMLAudioElement | null>(null)

  // Load saved bets from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cevict_wallboard_bets')
      if (saved) {
        setMyBets(JSON.parse(saved))
        addAlert('green', 'Bets restored', `${JSON.parse(saved).length} bets from storage`)
      }
    } catch (e) {
      console.warn('Failed to load saved bets:', e)
    }
  }, [])

  // Save bets to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('cevict_wallboard_bets', JSON.stringify(myBets))
    } catch (e) {
      console.warn('Failed to save bets:', e)
    }
  }, [myBets])

  // Initialize audio
  useEffect(() => {
    try {
      crowdAudioRef.current = new Audio('/wallboard-assets/crowd-cheer.mp3')
      crowdAudioRef.current.preload = 'auto'
      crowdAudioRef.current.volume = 0.4

      booAudioRef.current = new Audio('/wallboard-assets/croed-disappointment.mp3')
      booAudioRef.current.preload = 'auto'
      booAudioRef.current.volume = 0.45
    } catch (e) {
      console.warn('Failed to load audio files:', e)
    }
  }, [])

  // Clock update
  useEffect(() => {
    const updateClock = () => {
      const d = new Date()
      const h = d.getHours().toString().padStart(2, '0')
      const m = d.getMinutes().toString().padStart(2, '0')
      const s = d.getSeconds().toString().padStart(2, '0')
      setCurrentTime(`${h}:${m}:${s}`)
    }
    updateClock()
    const interval = setInterval(updateClock, 1000)
    return () => clearInterval(interval)
  }, [])

  // Auto-load predictions on startup
  useEffect(() => {
    loadTodayPredictions()
  }, [])

  // Auto-refresh scores every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchScores()
    }, 15000)
    return () => clearInterval(interval)
  }, [sportIdx])

  // Auto-refresh predictions every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      loadTodayPredictions()
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const addAlert = useCallback((severity: 'green' | 'yellow' | 'red', title: string, desc: string) => {
    const d = new Date()
    const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
    setAlerts(prev => [{ severity, title, desc, time }, ...prev].slice(0, 50))

    // Play beep based on severity
    if (!beepsMuted) {
      const freq = severity === 'red' ? 880 : severity === 'yellow' ? 660 : 440
      playTone(freq, 0.15)
    }
  }, [beepsMuted])

  const playTone = (freq: number, seconds: number) => {
    if (beepsMuted) return
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const AC = audioContextRef.current
      AC.resume()

      const o = AC.createOscillator()
      const g = AC.createGain()
      o.type = 'sine'
      o.frequency.value = freq
      g.gain.value = 0.0001
      o.connect(g)
      g.connect(AC.destination)
      const now = AC.currentTime
      g.gain.exponentialRampToValueAtTime(0.08, now + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.05, seconds))
      o.start()
      o.stop(now + Math.max(0.1, seconds + 0.05))
    } catch (e) {
      console.warn('Audio playback failed:', e)
    }
  }

  const playCrowd = () => {
    if (crowdMuted) return
    try {
      if (crowdAudioRef.current) {
        crowdAudioRef.current.currentTime = 0
        crowdAudioRef.current.play().catch(() => { })
      }
    } catch (e) {
      console.warn('Crowd audio failed:', e)
    }
  }

  const playBoo = () => {
    if (crowdMuted) return
    try {
      if (booAudioRef.current) {
        booAudioRef.current.currentTime = 0
        booAudioRef.current.play().catch(() => { })
      }
    } catch (e) {
      console.warn('Boo audio failed:', e)
    }
  }

  const loadTodayPredictions = async () => {
    try {
      const date = new Date().toISOString().split('T')[0]
      const res = await fetch(`/api/progno/picks?date=${date}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      let picks = []
      if (Array.isArray(data)) picks = data
      else if (data.picks && Array.isArray(data.picks)) picks = data.picks
      else if (data.data && Array.isArray(data.data)) picks = data.data

      if (picks.length > 0) {
        addAlert('green', 'Predictions loaded', `${picks.length} picks for ${date}`)
      } else {
        addAlert('yellow', 'No predictions today', 'Run predictions from admin panel')
      }
    } catch (e: any) {
      addAlert('yellow', 'No predictions found', String(e.message || e).slice(0, 60))
    }
  }

  const fetchScores = async () => {
    const sport = SPORTS[sportIdx % SPORTS.length]
    try {
      const res = await fetch(`/api/progno/v2?action=live-scores&sport=${sport}`, { cache: 'no-store' })
      if (!res.ok) {
        setSportIdx(prev => prev + 1)
        return
      }
      const data = await res.json()
      const list = data?.data || []

      if (list.length === 0) {
        // Skip to next sport immediately
        setSportIdx(prev => prev + 1)
        setTimeout(fetchScores, 1000)
        return
      }

      // Sort: live games first, completed games last
      const sorted = list.sort((a: any, b: any) => {
        if (a.completed === b.completed) return 0
        return a.completed ? 1 : -1
      })
      setScores(sorted)
      // Rotate to next sport after displaying current one
      setSportIdx(prev => prev + 1)
    } catch (e) {
      console.warn('Failed to fetch scores:', e)
      setSportIdx(prev => prev + 1)
    }
  }

  const tryLoadKalshi = async () => {
    try {
      const res = await fetch('/api/markets/kalshi/sports', { cache: 'no-store' })
      if (!res.ok) {
        addAlert('yellow', 'Kalshi', `API returned ${res.status} - check API setup`)
        return
      }
      const j = await res.json()
      if (j && Array.isArray(j.picks)) {
        const positions = j.picks.map((p: any) => ({
          home_team: p.homeTeam || p.home_team || '',
          away_team: p.awayTeam || p.away_team || '',
          side: p.pick || p.side || '',
          stake: 0,
          price: p.kalshiPrice || p.price || 50,
          book: 'Kalshi',
          result: 'pending' as const,
        }))
        setKalshiPositions(positions)
        addAlert('green', 'Kalshi loaded', `${positions.length} positions`)
      } else {
        addAlert('yellow', 'Kalshi', 'No picks found')
      }
    } catch (e: any) {
      addAlert('yellow', 'Kalshi', `Connection failed - ${e.message || 'check API setup'}`)
    }
  }

  const refreshAllData = async () => {
    await loadTodayPredictions()
    await fetchScores()
    addAlert('green', 'Data refreshed', 'Predictions and scores updated')
  }

  const addBetManually = () => {
    const away = prompt('Away Team:')
    const home = prompt('Home Team:')
    const side = prompt('Pick (e.g., "Home ML", "Away +3.5"):')
    const stake = parseFloat(prompt('Stake ($):') || '0')
    const price = parseFloat(prompt('Odds (e.g., -110, +150):') || '-110')

    if (away && home && side && stake > 0) {
      const newBet: Bet = { away_team: away, home_team: home, side, stake, price, result: 'pending' }
      setMyBets(prev => [...prev, newBet])
      addAlert('green', 'Bet added', `${away} @ ${home} • ${side}`)
    }
  }

  const updateBetResult = (index: number) => {
    setMyBets(prev => {
      const updated = [...prev]
      const current = updated[index].result || 'pending'
      const next = current === 'pending' ? 'win' : current === 'win' ? 'loss' : current === 'loss' ? 'push' : 'pending'
      updated[index] = { ...updated[index], result: next }
      return updated
    })
  }

  // Calculate stats
  const settledBets = myBets.filter(b => b.result === 'win' || b.result === 'loss')
  const wins = myBets.filter(b => b.result === 'win')
  const losses = myBets.filter(b => b.result === 'loss')
  const pushes = myBets.filter(b => b.result === 'push')

  let pnl = 0
  wins.forEach(b => {
    const profit = b.price > 0 ? (b.stake * b.price / 100) : (b.stake * 100 / Math.abs(b.price))
    pnl += profit
  })
  losses.forEach(b => pnl -= b.stake)

  const winRate = settledBets.length > 0 ? (wins.length / settledBets.length * 100).toFixed(0) : 0
  const liveBets = myBets.filter(b => !b.result || b.result === 'pending').length
  const kalshiValue = kalshiPositions.reduce((sum, p) => sum + (p.stake || 0), 0)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key === 'b') setBeepsMuted(prev => !prev)
      if (key === 'c') setCrowdMuted(prev => !prev)
      if (key === 'r') refreshAllData()
      if (key === 'k') tryLoadKalshi()
      if (key === 't') { playCrowd(); setTimeout(playBoo, 900) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <div className={styles.wallboard}>
      <div className={styles.layout}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.brand}>
            <h1>CEVICT</h1>
            <div className={styles.sub}>COMMAND CENTER</div>
          </div>
          <div className={styles.controls}>
            <span className={styles.pill} onClick={() => setBeepsMuted(!beepsMuted)}>
              {beepsMuted ? '🔕 Beeps: Off' : '🔔 Beeps: On'}
            </span>
            <span className={styles.pill} onClick={() => setCrowdMuted(!crowdMuted)}>
              {crowdMuted ? '🤫 Crowd: Off' : '🎉 Crowd: On'}
            </span>
            <span className={styles.pill} onClick={refreshAllData}>🔄 Refresh</span>
            <span className={styles.pill} onClick={addBetManually}>💼 Add Bet</span>
            <span className={styles.pill} onClick={tryLoadKalshi}>📈 Kalshi</span>
            <span className={styles.pill} onClick={() => { playCrowd(); setTimeout(playBoo, 900) }}>🔊 Test Audio</span>
            <span className={styles.pill}>⌨️ Help</span>
          </div>
          <div className={styles.clock}>{currentTime}</div>
        </div>

        {/* Stats Row */}
        <div className={styles.statsRow}>
          <div className={styles.statCard} onClick={() => setModalType('pnl')}>
            <div className={styles.statLabel}>Today P&L</div>
            <div className={styles.statValue} style={{ color: pnl > 0 ? 'var(--green)' : pnl < 0 ? 'var(--red)' : 'var(--text)' }}>
              ${pnl >= 0 ? '+' : ''}{pnl.toFixed(0)}
            </div>
            <div className={styles.statChange}>
              <span>—</span>
              <span>{settledBets.length} settled</span>
            </div>
          </div>

          <div className={styles.statCard} onClick={() => setModalType('winrate')}>
            <div className={styles.statLabel}>Win Rate</div>
            <div className={styles.statValue}>{winRate}%</div>
            <div className={styles.statChange}>
              <span>{Number(winRate) >= 50 ? '↑' : '↓'}</span>
              <span>{wins.length}-{losses.length}-{pushes.length}</span>
            </div>
          </div>

          <div className={styles.statCard} onClick={() => setModalType('livebets')}>
            <div className={styles.statLabel}>Live Bets</div>
            <div className={styles.statValue}>{liveBets}</div>
            <div className={styles.statChange}>
              <span>{SPORTS.map(s => s.toUpperCase()).join(' • ')}</span>
            </div>
          </div>

          <div className={styles.statCard} onClick={() => setModalType('kalshi')}>
            <div className={styles.statLabel}>Kalshi</div>
            <div className={styles.statValue}>${kalshiValue.toFixed(0)}</div>
            <div className={styles.statChange}>
              <span>—</span>
              <span>{kalshiPositions.length} positions</span>
            </div>
          </div>

          <div className={styles.statCard} onClick={() => setModalType('polymarket')}>
            <div className={styles.statLabel}>Polymarket</div>
            <div className={styles.statValue}>$0</div>
            <div className={styles.statChange}>
              <span>—</span>
              <span>Coming soon</span>
            </div>
          </div>

          <div className={styles.statCard} onClick={() => setModalType('alerts')}>
            <div className={styles.statLabel}>Alerts</div>
            <div className={styles.statValue}>{alerts.length}</div>
            <div className={styles.statChange}>
              <span>Monitoring...</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
          <div className={styles.panel}>
            <h2>Live Scores</h2>
            <div className={styles.scores}>
              {scores.length === 0 && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px' }}>Loading scores...</div>}
              {scores.map((game, i) => (
                <div key={i} className={styles.scoreCard}>
                  <div>
                    <div style={{ fontWeight: '600' }}>{game.away} @ {game.home}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                      {game.completed ? '✓ Final' : '🔴 Live'}
                    </div>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--textBright)' }}>
                    {game.awayScore} - {game.homeScore}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className={styles.panel} style={{ marginBottom: '16px' }}>
              <h2>My Bets <span className={styles.pill} onClick={addBetManually} style={{ fontSize: '11px', marginLeft: '8px' }}>➕ Add</span></h2>
              <div className={styles.alerts}>
                {myBets.length === 0 && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px' }}>No bets tracked</div>}
                {myBets.map((bet, i) => (
                  <div key={i} className={styles.alert}>
                    <div className={styles.alertContent}>
                      <div className={styles.alertTitle}>{bet.away_team} @ {bet.home_team}</div>
                      <div className={styles.alertDesc}>{bet.side} • ${bet.stake} @ {bet.price > 0 ? '+' : ''}{bet.price}</div>
                    </div>
                    <span
                      onClick={() => updateBetResult(i)}
                      style={{
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: bet.result === 'win' ? 'var(--green)' : bet.result === 'loss' ? 'var(--red)' : bet.result === 'push' ? 'var(--yellow)' : 'var(--muted)',
                        fontSize: '11px'
                      }}
                    >
                      {bet.result || 'pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.legend}>
            <span><span className={`${styles.swatch} ${styles.red}`} /> Critical</span>
            <span><span className={`${styles.swatch} ${styles.yellow}`} /> Medium</span>
            <span><span className={`${styles.swatch} ${styles.green}`} /> Informational</span>
          </div>
          <div>Data refresh: {SPORTS[sportIdx % SPORTS.length].toUpperCase()} • {currentTime}</div>
        </div>
      </div>

      {/* Modal */}
      {modalType && (
        <div className={styles.modal} onClick={() => setModalType(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {modalType === 'pnl' && 'P&L Breakdown'}
                {modalType === 'winrate' && 'Win Rate Details'}
                {modalType === 'livebets' && 'Live Bets'}
                {modalType === 'kalshi' && 'Kalshi Positions'}
                {modalType === 'polymarket' && 'Polymarket Positions'}
                {modalType === 'alerts' && 'Alert History'}
              </h2>
              <button className={styles.modalClose} onClick={() => setModalType(null)}>&times;</button>
            </div>
            <div>
              {modalType === 'pnl' && (
                <div>
                  <h3 style={{ color: 'var(--green)', marginTop: 0 }}>Wins ({wins.length})</h3>
                  {wins.map((b, i) => {
                    const profit = b.price > 0 ? (b.stake * b.price / 100) : (b.stake * 100 / Math.abs(b.price))
                    return (
                      <div key={i} style={{ padding: '8px', background: 'var(--surface)', marginBottom: '4px', borderRadius: '4px' }}>
                        {b.away_team} @ {b.home_team} • {b.side} • +${profit.toFixed(0)}
                      </div>
                    )
                  })}
                  <h3 style={{ color: 'var(--red)' }}>Losses ({losses.length})</h3>
                  {losses.map((b, i) => (
                    <div key={i} style={{ padding: '8px', background: 'var(--surface)', marginBottom: '4px', borderRadius: '4px' }}>
                      {b.away_team} @ {b.home_team} • {b.side} • -${b.stake}
                    </div>
                  ))}
                </div>
              )}
              {modalType === 'winrate' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', margin: '24px 0', color: 'var(--textBright)' }}>{winRate}%</div>
                  <div style={{ color: 'var(--muted)' }}>{wins.length} wins out of {settledBets.length} settled bets</div>
                </div>
              )}
              {modalType === 'livebets' && (
                <div>
                  {myBets.filter(b => !b.result || b.result === 'pending').map((b, i) => (
                    <div key={i} style={{ padding: '12px', background: 'var(--surface)', marginBottom: '8px', borderRadius: '4px' }}>
                      <div style={{ fontWeight: 600 }}>{b.away_team} @ {b.home_team}</div>
                      <div style={{ color: 'var(--muted)', marginTop: '4px' }}>{b.side} • ${b.stake} @ {b.price > 0 ? '+' : ''}{b.price}</div>
                    </div>
                  ))}
                  {myBets.filter(b => !b.result || b.result === 'pending').length === 0 && (
                    <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px' }}>No live bets</div>
                  )}
                </div>
              )}
              {modalType === 'kalshi' && (
                <div>
                  {kalshiPositions.map((p, i) => (
                    <div key={i} style={{ padding: '12px', background: 'var(--surface)', marginBottom: '8px', borderRadius: '4px' }}>
                      <div style={{ fontWeight: 600 }}>{p.away_team} @ {p.home_team}</div>
                      <div style={{ color: 'var(--muted)', marginTop: '4px' }}>{p.side} • {p.price}¢ probability</div>
                    </div>
                  ))}
                  {kalshiPositions.length === 0 && (
                    <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px' }}>No Kalshi positions loaded</div>
                  )}
                </div>
              )}
              {modalType === 'polymarket' && (
                <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px' }}>
                  Coming soon - Polymarket integration pending US legalization
                </div>
              )}
              {modalType === 'alerts' && (
                <div>
                  {alerts.map((alert, i) => (
                    <div key={i} className={`${styles.alert} ${styles[alert.severity]}`}>
                      <div className={`${styles.dot} ${styles[alert.severity]}`} />
                      <div className={styles.alertContent}>
                        <div className={styles.alertTitle}>{alert.title}</div>
                        <div className={styles.alertDesc}>{alert.desc}</div>
                      </div>
                      <div className={styles.alertTime}>{alert.time}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
