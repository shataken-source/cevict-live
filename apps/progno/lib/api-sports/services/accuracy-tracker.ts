/**
 * Accuracy Tracker Service
 * Tracks prediction accuracy and calculates performance metrics
 */

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  
  const { createClient } = require('@supabase/supabase-js')
  return createClient(url, key)
}

export interface PickResult {
  pickId: number
  predictedWinner: string
  actualWinner: string
  result: 'win' | 'loss' | 'push'
  predictedConfidence: number
  profitLoss: number
  sport: string
  betType: string
}

export interface PerformanceMetrics {
  totalPicks: number
  wins: number
  losses: number
  pushes: number
  winRate: number
  roi: number
  avgConfidence: number
  confidenceAccuracy: number // How well confidence predicts outcomes
  bySport: Record<string, {
    total: number
    wins: number
    winRate: number
    roi: number
  }>
  byBetType: Record<string, {
    total: number
    wins: number
    winRate: number
    roi: number
  }>
  streak: {
    current: number
    type: 'win' | 'loss'
    best: number
    worst: number
  }
  last7Days: {
    total: number
    wins: number
    winRate: number
    roi: number
  }
  last30Days: {
    total: number
    wins: number
    winRate: number
    roi: number
  }
}

export class AccuracyTracker {
  /**
   * Record the result of a pick
   */
  async recordResult(result: PickResult): Promise<void> {
    const supabase = getSupabase()
    if (!supabase) return

    try {
      await supabase.from('pick_results').insert({
        pick_id: result.pickId,
        predicted_winner: result.predictedWinner,
        actual_winner: result.actualWinner,
        actual_result: result.result,
        predicted_confidence: result.predictedConfidence,
        profit_loss: result.profitLoss,
        sport: result.sport,
        bet_type: result.betType
      })

      console.log(`[ACCURACY] Recorded result for pick ${result.pickId}: ${result.result}`)
    } catch (error) {
      console.error('[ACCURACY] Failed to record result:', error)
    }
  }

  /**
   * Get comprehensive performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const supabase = getSupabase()
    if (!supabase) {
      return this.getEmptyMetrics()
    }

    try {
      // Get all results
      const { data: results } = await supabase
        .from('pick_results')
        .select('*')
        .order('recorded_at', { ascending: false })

      if (!results || results.length === 0) {
        return this.getEmptyMetrics()
      }

      // Calculate metrics
      const totalPicks = results.length
      const wins = results.filter(r => r.actual_result === 'win').length
      const losses = results.filter(r => r.actual_result === 'loss').length
      const pushes = results.filter(r => r.actual_result === 'push').length
      
      const winRate = totalPicks > 0 ? wins / (wins + losses) * 100 : 0
      const totalProfitLoss = results.reduce((sum, r) => sum + (r.profit_loss || 0), 0)
      const roi = totalPicks > 0 ? (totalProfitLoss / totalPicks) * 100 : 0
      const avgConfidence = results.reduce((sum, r) => sum + (r.predicted_confidence || 0), 0) / totalPicks

      // By sport
      const bySport: Record<string, any> = {}
      for (const result of results) {
        const sport = result.sport || 'unknown'
        if (!bySport[sport]) {
          bySport[sport] = { total: 0, wins: 0, profitLoss: 0 }
        }
        bySport[sport].total++
        if (result.actual_result === 'win') bySport[sport].wins++
        bySport[sport].profitLoss += result.profit_loss || 0
      }
      
      for (const sport in bySport) {
        const s = bySport[sport]
        s.winRate = s.total > 0 ? (s.wins / s.total) * 100 : 0
        s.roi = s.total > 0 ? (s.profitLoss / s.total) * 100 : 0
      }

      // By bet type
      const byBetType: Record<string, any> = {}
      for (const result of results) {
        const type = result.bet_type || 'unknown'
        if (!byBetType[type]) {
          byBetType[type] = { total: 0, wins: 0, profitLoss: 0 }
        }
        byBetType[type].total++
        if (result.actual_result === 'win') byBetType[type].wins++
        byBetType[type].profitLoss += result.profit_loss || 0
      }
      
      for (const type in byBetType) {
        const t = byBetType[type]
        t.winRate = t.total > 0 ? (t.wins / t.total) * 100 : 0
        t.roi = t.total > 0 ? (t.profitLoss / t.total) * 100 : 0
      }

      // Calculate streak
      const streak = this.calculateStreak(results)

      // Last 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const last7 = results.filter(r => new Date(r.recorded_at) >= sevenDaysAgo)
      const last7Wins = last7.filter(r => r.actual_result === 'win').length
      const last7Losses = last7.filter(r => r.actual_result === 'loss').length
      const last7PL = last7.reduce((sum, r) => sum + (r.profit_loss || 0), 0)

      // Last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const last30 = results.filter(r => new Date(r.recorded_at) >= thirtyDaysAgo)
      const last30Wins = last30.filter(r => r.actual_result === 'win').length
      const last30Losses = last30.filter(r => r.actual_result === 'loss').length
      const last30PL = last30.reduce((sum, r) => sum + (r.profit_loss || 0), 0)

      // Confidence accuracy (do high confidence picks win more?)
      const confidenceAccuracy = this.calculateConfidenceAccuracy(results)

      return {
        totalPicks,
        wins,
        losses,
        pushes,
        winRate,
        roi,
        avgConfidence,
        confidenceAccuracy,
        bySport,
        byBetType,
        streak,
        last7Days: {
          total: last7.length,
          wins: last7Wins,
          winRate: (last7Wins + last7Losses) > 0 ? (last7Wins / (last7Wins + last7Losses)) * 100 : 0,
          roi: last7.length > 0 ? (last7PL / last7.length) * 100 : 0
        },
        last30Days: {
          total: last30.length,
          wins: last30Wins,
          winRate: (last30Wins + last30Losses) > 0 ? (last30Wins / (last30Wins + last30Losses)) * 100 : 0,
          roi: last30.length > 0 ? (last30PL / last30.length) * 100 : 0
        }
      }
    } catch (error) {
      console.error('[ACCURACY] Failed to get metrics:', error)
      return this.getEmptyMetrics()
    }
  }

  /**
   * Calculate win/loss streak
   */
  private calculateStreak(results: any[]): { current: number; type: 'win' | 'loss'; best: number; worst: number } {
    if (results.length === 0) {
      return { current: 0, type: 'win', best: 0, worst: 0 }
    }

    // Current streak
    let currentStreak = 0
    let currentType: 'win' | 'loss' = results[0].actual_result === 'win' ? 'win' : 'loss'
    
    for (const result of results) {
      if (result.actual_result === 'push') continue
      
      if ((result.actual_result === 'win' && currentType === 'win') ||
          (result.actual_result === 'loss' && currentType === 'loss')) {
        currentStreak++
      } else {
        break
      }
    }

    // Best/worst streaks
    let bestStreak = 0
    let worstStreak = 0
    let tempStreak = 0
    let tempType: 'win' | 'loss' | null = null

    for (const result of results) {
      if (result.actual_result === 'push') continue
      
      const type = result.actual_result === 'win' ? 'win' : 'loss'
      
      if (type === tempType) {
        tempStreak++
      } else {
        // Save previous streak
        if (tempType === 'win' && tempStreak > bestStreak) bestStreak = tempStreak
        if (tempType === 'loss' && tempStreak > worstStreak) worstStreak = tempStreak
        
        tempStreak = 1
        tempType = type
      }
    }
    
    // Check final streak
    if (tempType === 'win' && tempStreak > bestStreak) bestStreak = tempStreak
    if (tempType === 'loss' && tempStreak > worstStreak) worstStreak = tempStreak

    return {
      current: currentStreak,
      type: currentType,
      best: bestStreak,
      worst: worstStreak
    }
  }

  /**
   * Calculate how well confidence predicts outcomes
   * Returns a score 0-100 where 100 = perfect correlation
   */
  private calculateConfidenceAccuracy(results: any[]): number {
    if (results.length < 10) return 50 // Not enough data

    // Group by confidence buckets
    const buckets: Record<string, { total: number; wins: number }> = {
      '60-70': { total: 0, wins: 0 },
      '70-80': { total: 0, wins: 0 },
      '80-90': { total: 0, wins: 0 },
      '90-100': { total: 0, wins: 0 }
    }

    for (const result of results) {
      if (result.actual_result === 'push') continue
      
      const conf = result.predicted_confidence || 0
      let bucket = '60-70'
      if (conf >= 90) bucket = '90-100'
      else if (conf >= 80) bucket = '80-90'
      else if (conf >= 70) bucket = '70-80'
      
      buckets[bucket].total++
      if (result.actual_result === 'win') buckets[bucket].wins++
    }

    // Calculate expected vs actual for each bucket
    const expectedRanges: Record<string, number> = {
      '60-70': 0.65,
      '70-80': 0.75,
      '80-90': 0.85,
      '90-100': 0.95
    }

    let totalError = 0
    let validBuckets = 0

    for (const [bucket, data] of Object.entries(buckets)) {
      if (data.total >= 5) { // Need at least 5 samples
        const actualRate = data.wins / data.total
        const expectedRate = expectedRanges[bucket]
        totalError += Math.abs(actualRate - expectedRate)
        validBuckets++
      }
    }

    if (validBuckets === 0) return 50

    // Convert error to accuracy score
    const avgError = totalError / validBuckets
    return Math.max(0, Math.min(100, (1 - avgError * 2) * 100))
  }

  /**
   * Get empty metrics structure
   */
  private getEmptyMetrics(): PerformanceMetrics {
    return {
      totalPicks: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      winRate: 0,
      roi: 0,
      avgConfidence: 0,
      confidenceAccuracy: 50,
      bySport: {},
      byBetType: {},
      streak: { current: 0, type: 'win', best: 0, worst: 0 },
      last7Days: { total: 0, wins: 0, winRate: 0, roi: 0 },
      last30Days: { total: 0, wins: 0, winRate: 0, roi: 0 }
    }
  }

  /**
   * Verify results for completed games
   */
  async verifyCompletedGames(): Promise<number> {
    const supabase = getSupabase()
    if (!supabase) return 0

    try {
      // Get picks that don't have results yet
      const { data: pendingPicks } = await supabase
        .from('picks')
        .select('*')
        .is('result', null)
        .lt('game_time', new Date().toISOString())

      if (!pendingPicks || pendingPicks.length === 0) return 0

      let verifiedCount = 0

      for (const pick of pendingPicks) {
        // TODO: Fetch actual game result from API-Sports
        // and record the result
        
        // Placeholder - would need actual implementation
        console.log(`[ACCURACY] Would verify pick ${pick.id}`)
      }

      return verifiedCount
    } catch (error) {
      console.error('[ACCURACY] Failed to verify games:', error)
      return 0
    }
  }
}

// Singleton instance
let trackerInstance: AccuracyTracker | null = null

export function getAccuracyTracker(): AccuracyTracker {
  if (!trackerInstance) {
    trackerInstance = new AccuracyTracker()
  }
  return trackerInstance
}

