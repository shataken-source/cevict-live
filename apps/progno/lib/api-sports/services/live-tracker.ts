/**
 * Live Game Tracker
 * Tracks live games and provides real-time updates
 */

import { getClientForSport, Game } from '../client'

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  
  const { createClient } = require('@supabase/supabase-js')
  return createClient(url, key)
}

export interface LiveGameState {
  gameId: string
  apiSportsGameId: number
  sport: string
  homeTeamId: number | null
  awayTeamId: number | null
  status: 'scheduled' | 'live' | 'finished' | 'postponed'
  period: string
  clock: string
  homeScore: number
  awayScore: number
  momentumScore: number
  liveWinProbability: number
  lastPlay?: string
  updatedAt: string
}

export interface LiveAlert {
  type: 'momentum_shift' | 'lead_change' | 'blowout_risk' | 'value_opportunity'
  gameId: string
  message: string
  severity: 'low' | 'medium' | 'high'
  data: any
}

export class LiveGameTracker {
  private activeGames: Map<string, LiveGameState> = new Map()
  private alertCallbacks: ((alert: LiveAlert) => void)[] = []

  /**
   * Update all live games for a sport
   */
  async updateLiveGames(sport: string): Promise<LiveGameState[]> {
    const client = getClientForSport(sport)
    if (!client) return []

    try {
      const liveGames = await client.getLiveGames()
      const states: LiveGameState[] = []

      for (const game of liveGames) {
        const state = await this.updateGameState(game, sport)
        if (state) {
          states.push(state)
          await this.checkForAlerts(state)
        }
      }

      return states
    } catch (error) {
      console.error(`[LIVE] Error updating ${sport} games:`, error)
      return []
    }
  }

  /**
   * Update state for a single game
   */
  private async updateGameState(game: Game, sport: string): Promise<LiveGameState | null> {
    const supabase = getSupabase()
    
    const previousState = this.activeGames.get(game.id.toString())
    
    const homeScore = game.scores?.home?.total || 0
    const awayScore = game.scores?.away?.total || 0
    
    const state: LiveGameState = {
      gameId: game.id.toString(),
      apiSportsGameId: game.id,
      sport,
      homeTeamId: null, // Would need DB lookup
      awayTeamId: null,
      status: this.mapGameStatus(game.status?.long || ''),
      period: game.periods?.current?.toString() || game.status?.long || '',
      clock: game.status?.timer || '',
      homeScore,
      awayScore,
      momentumScore: this.calculateMomentum(game, previousState),
      liveWinProbability: this.calculateLiveWinProb(game),
      updatedAt: new Date().toISOString()
    }

    // Update local cache
    this.activeGames.set(game.id.toString(), state)

    // Update database
    if (supabase) {
      await supabase.from('live_games').upsert({
        game_id: state.gameId,
        api_sports_game_id: state.apiSportsGameId,
        sport: state.sport,
        status: state.status,
        period: state.period,
        clock: state.clock,
        home_score: state.homeScore,
        away_score: state.awayScore,
        momentum_score: state.momentumScore,
        live_win_probability: state.liveWinProbability,
        updated_at: state.updatedAt
      }, {
        onConflict: 'game_id'
      }).catch(err => console.error('[LIVE] DB update error:', err))
    }

    return state
  }

  /**
   * Calculate momentum score (-1 to 1)
   * Positive = home team momentum, Negative = away team momentum
   */
  private calculateMomentum(game: Game, previousState?: LiveGameState): number {
    const homeScore = game.scores?.home?.total || 0
    const awayScore = game.scores?.away?.total || 0
    const scoreDiff = homeScore - awayScore
    const period = game.periods?.current || 1

    // Base momentum from score differential
    let momentum = scoreDiff / (period * 30) // Normalize by expected scoring

    // If we have previous state, factor in recent scoring run
    if (previousState) {
      const homeScored = homeScore - previousState.homeScore
      const awayScored = awayScore - previousState.awayScore
      const runDiff = homeScored - awayScored
      
      // Recent run has higher weight
      momentum = (momentum * 0.6) + (runDiff / 10 * 0.4)
    }

    return Math.max(-1, Math.min(1, momentum))
  }

  /**
   * Calculate live win probability for home team (0-1)
   */
  private calculateLiveWinProb(game: Game): number {
    const homeScore = game.scores?.home?.total || 0
    const awayScore = game.scores?.away?.total || 0
    const homeLead = homeScore - awayScore
    const timeRemaining = this.estimateTimeRemaining(game)
    
    // Simple model: lead + time factor
    // 20 point lead = strong advantage
    const leadFactor = homeLead / 20
    
    // Less time remaining = lead matters more
    const timeFactor = 1 - (timeRemaining / 48)
    
    // Combine factors with sigmoid-like function
    const rawProb = 0.5 + (leadFactor * (0.3 + 0.2 * timeFactor))
    
    return Math.max(0.05, Math.min(0.95, rawProb))
  }

  /**
   * Estimate time remaining in game (in minutes)
   */
  private estimateTimeRemaining(game: Game): number {
    const status = (game.status?.long || '').toLowerCase()
    const period = game.periods?.current || 1
    const clock = game.status?.timer || ''
    
    // Total game length varies by sport
    const totalMinutes = 48 // NBA default

    if (status.includes('final') || status.includes('finished')) {
      return 0
    }

    if (status.includes('half')) {
      return totalMinutes / 2
    }

    // Parse clock if available
    let clockMinutes = 12 // Default quarter length
    if (clock) {
      const parts = clock.split(':')
      if (parts.length === 2) {
        clockMinutes = parseInt(parts[0]) + parseInt(parts[1]) / 60
      }
    }

    // Calculate remaining
    const periodsRemaining = 4 - period
    return (periodsRemaining * 12) + clockMinutes
  }

  /**
   * Check for alert conditions
   */
  private async checkForAlerts(state: LiveGameState): Promise<void> {
    const previousState = this.activeGames.get(state.gameId)
    if (!previousState) return

    // Momentum shift alert
    const momentumShift = Math.abs(state.momentumScore - previousState.momentumScore)
    if (momentumShift > 0.3) {
      this.emitAlert({
        type: 'momentum_shift',
        gameId: state.gameId,
        message: `Significant momentum shift detected (${(momentumShift * 100).toFixed(0)}%)`,
        severity: momentumShift > 0.5 ? 'high' : 'medium',
        data: {
          previousMomentum: previousState.momentumScore,
          currentMomentum: state.momentumScore,
          direction: state.momentumScore > previousState.momentumScore ? 'home' : 'away'
        }
      })
    }

    // Lead change alert
    const prevLeader = previousState.homeScore > previousState.awayScore ? 'home' : 
                       previousState.homeScore < previousState.awayScore ? 'away' : 'tie'
    const currLeader = state.homeScore > state.awayScore ? 'home' : 
                       state.homeScore < state.awayScore ? 'away' : 'tie'
    
    if (prevLeader !== currLeader && prevLeader !== 'tie' && currLeader !== 'tie') {
      this.emitAlert({
        type: 'lead_change',
        gameId: state.gameId,
        message: `Lead change: ${currLeader} team now leads`,
        severity: 'medium',
        data: {
          newLeader: currLeader,
          homeScore: state.homeScore,
          awayScore: state.awayScore
        }
      })
    }

    // Blowout risk alert
    const scoreDiff = Math.abs(state.homeScore - state.awayScore)
    if (scoreDiff >= 20 && state.status === 'live') {
      this.emitAlert({
        type: 'blowout_risk',
        gameId: state.gameId,
        message: `Potential blowout: ${scoreDiff} point lead`,
        severity: scoreDiff >= 30 ? 'high' : 'medium',
        data: {
          scoreDiff,
          leader: state.homeScore > state.awayScore ? 'home' : 'away'
        }
      })
    }
  }

  /**
   * Emit an alert to registered callbacks
   */
  private emitAlert(alert: LiveAlert): void {
    console.log(`[LIVE ALERT] ${alert.type}: ${alert.message}`)
    
    for (const callback of this.alertCallbacks) {
      try {
        callback(alert)
      } catch (error) {
        console.error('[LIVE] Alert callback error:', error)
      }
    }

    // Store alert in database
    this.storeAlert(alert)
  }

  /**
   * Store alert in database
   */
  private async storeAlert(alert: LiveAlert): Promise<void> {
    const supabase = getSupabase()
    if (!supabase) return

    // Could store in a live_alerts table if needed
    console.log('[LIVE] Alert stored:', alert.type)
  }

  /**
   * Register a callback for alerts
   */
  onAlert(callback: (alert: LiveAlert) => void): void {
    this.alertCallbacks.push(callback)
  }

  /**
   * Get current state for a game
   */
  getGameState(gameId: string): LiveGameState | undefined {
    return this.activeGames.get(gameId)
  }

  /**
   * Get all active games
   */
  getActiveGames(): LiveGameState[] {
    return Array.from(this.activeGames.values())
  }

  /**
   * Map game status string to our enum
   */
  private mapGameStatus(status: string): 'scheduled' | 'live' | 'finished' | 'postponed' {
    const lower = status.toLowerCase()
    
    if (lower.includes('final') || lower.includes('finished') || lower.includes('ended')) {
      return 'finished'
    }
    if (lower.includes('postponed') || lower.includes('cancelled')) {
      return 'postponed'
    }
    if (lower.includes('scheduled') || lower.includes('not started')) {
      return 'scheduled'
    }
    
    return 'live'
  }
}

// Singleton instance
let trackerInstance: LiveGameTracker | null = null

export function getLiveTracker(): LiveGameTracker {
  if (!trackerInstance) {
    trackerInstance = new LiveGameTracker()
  }
  return trackerInstance
}

