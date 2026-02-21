/**
 * Line-Move Arb Detector
 * 
 * Compares early picks (2-5 days out) to regular picks (0-2 days out)
 * to identify "line-move arb" opportunities where:
 * 
 * 1. Early pick: Bet Team A at +300 (early value)
 * 2. News hits: QB out, line moves to Team A +500 / Team B -400
 * 3. Regular pick: Now says bet Team B at -400 (new value)
 * 4. Result: You have both sides at +EV prices = hedge/arb opportunity
 * 
 * This is NOT guaranteed profit (not true arb), but it's two +EV bets
 * on the same game at different prices due to line movement.
 */

import { EarlyOdds, LineMovement } from './early-odds-aggregator'

export interface Pick {
  gameId: string
  sport: string
  homeTeam: string
  awayTeam: string
  gameDate: string
  pick: string // Team name
  confidence: number
  expectedValue: number
  odds: number
  reasoning?: string
}

export interface LineMoveArbOpportunity {
  gameId: string
  sport: string
  homeTeam: string
  awayTeam: string
  gameDate: string
  
  // Early position
  earlyPick: Pick
  earlyOdds: number
  earlyEV: number
  
  // Current position (after line move)
  regularPick: Pick
  currentOdds: number
  currentEV: number
  
  // Line movement details
  lineMovement: LineMovement
  
  // Arb analysis
  pickFlipped: boolean // True if early picked A, regular picks B
  combinedEV: number // Sum of both EVs
  hedgeOpportunity: boolean // True if both sides have +EV
  
  // News/injury context (if available)
  triggerNews?: string[]
  injuryReports?: string[]
}

export class LineMoveArbDetector {
  /**
   * Compare early picks to regular picks and find line-move arb opportunities
   */
  detectLineMoveArbs(
    earlyPicks: Pick[],
    regularPicks: Pick[],
    lineMovements: LineMovement[]
  ): LineMoveArbOpportunity[] {
    const opportunities: LineMoveArbOpportunity[] = []

    // Create lookup maps
    const regularPicksByGame = new Map<string, Pick>()
    for (const pick of regularPicks) {
      regularPicksByGame.set(pick.gameId, pick)
    }

    const movementsByGame = new Map<string, LineMovement>()
    for (const movement of lineMovements) {
      movementsByGame.set(movement.gameId, movement)
    }

    // Compare each early pick to its regular pick
    for (const earlyPick of earlyPicks) {
      const regularPick = regularPicksByGame.get(earlyPick.gameId)
      if (!regularPick) continue // Game not in regular picks

      const movement = movementsByGame.get(earlyPick.gameId)
      if (!movement || !movement.significantMove) continue // No significant line movement

      // Check if pick flipped sides
      const pickFlipped = this.didPickFlip(earlyPick, regularPick)
      
      // Check if both picks have positive EV
      const hedgeOpportunity = earlyPick.expectedValue > 0 && regularPick.expectedValue > 0
      
      // Only flag as arb opportunity if:
      // 1. Pick flipped sides, OR
      // 2. Both picks are +EV with significant line movement
      if (pickFlipped || (hedgeOpportunity && movement.significantMove)) {
        opportunities.push({
          gameId: earlyPick.gameId,
          sport: earlyPick.sport,
          homeTeam: earlyPick.homeTeam,
          awayTeam: earlyPick.awayTeam,
          gameDate: earlyPick.gameDate,
          
          earlyPick,
          earlyOdds: earlyPick.odds,
          earlyEV: earlyPick.expectedValue,
          
          regularPick,
          currentOdds: regularPick.odds,
          currentEV: regularPick.expectedValue,
          
          lineMovement: movement,
          
          pickFlipped,
          combinedEV: earlyPick.expectedValue + regularPick.expectedValue,
          hedgeOpportunity
        })
      }
    }

    // Sort by combined EV (best opportunities first)
    opportunities.sort((a, b) => b.combinedEV - a.combinedEV)

    return opportunities
  }

  /**
   * Check if the pick flipped from one side to the other
   */
  private didPickFlip(earlyPick: Pick, regularPick: Pick): boolean {
    // Normalize team names for comparison
    const earlyTeam = this.normalizeTeamName(earlyPick.pick)
    const regularTeam = this.normalizeTeamName(regularPick.pick)
    
    // If picks are for different teams, it flipped
    return earlyTeam !== regularTeam
  }

  /**
   * Normalize team name for comparison
   */
  private normalizeTeamName(team: string): string {
    return team.toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '')
  }

  /**
   * Generate human-readable summary of arb opportunity
   */
  generateArbSummary(arb: LineMoveArbOpportunity): string {
    const lines: string[] = []
    
    lines.push(`🎯 LINE-MOVE ARB: ${arb.awayTeam} @ ${arb.homeTeam}`)
    lines.push(``)
    
    if (arb.pickFlipped) {
      lines.push(`✅ PICK FLIPPED - You have both sides at value!`)
    } else {
      lines.push(`✅ HEDGE OPPORTUNITY - Both picks show +EV`)
    }
    
    lines.push(``)
    lines.push(`📊 EARLY POSITION (2-5 days ago):`)
    lines.push(`   Pick: ${arb.earlyPick.pick}`)
    lines.push(`   Odds: ${this.formatOdds(arb.earlyOdds)}`)
    lines.push(`   EV: ${arb.earlyEV.toFixed(1)}%`)
    lines.push(`   Confidence: ${arb.earlyPick.confidence.toFixed(1)}%`)
    
    lines.push(``)
    lines.push(`📊 CURRENT POSITION (now):`)
    lines.push(`   Pick: ${arb.regularPick.pick}`)
    lines.push(`   Odds: ${this.formatOdds(arb.currentOdds)}`)
    lines.push(`   EV: ${arb.currentEV.toFixed(1)}%`)
    lines.push(`   Confidence: ${arb.regularPick.confidence.toFixed(1)}%`)
    
    lines.push(``)
    lines.push(`📈 LINE MOVEMENT:`)
    lines.push(`   ML Shift: ${arb.lineMovement.movement.mlShift > 0 ? '+' : ''}${arb.lineMovement.movement.mlShift}`)
    lines.push(`   Spread Shift: ${arb.lineMovement.movement.spreadShift > 0 ? '+' : ''}${arb.lineMovement.movement.spreadShift}`)
    
    lines.push(``)
    lines.push(`💰 COMBINED EV: ${arb.combinedEV.toFixed(1)}%`)
    
    if (arb.triggerNews && arb.triggerNews.length > 0) {
      lines.push(``)
      lines.push(`📰 TRIGGER NEWS:`)
      arb.triggerNews.forEach(news => lines.push(`   • ${news}`))
    }
    
    return lines.join('\n')
  }

  /**
   * Format odds for display
   */
  private formatOdds(odds: number): string {
    if (odds > 0) return `+${odds}`
    return odds.toString()
  }

  /**
   * Calculate optimal bet sizing for hedge
   * Returns suggested stake for the second bet to minimize risk
   */
  calculateHedgeStake(
    earlyStake: number,
    earlyOdds: number,
    currentOdds: number
  ): {
    hedgeStake: number
    guaranteedProfit: number
    profitIfEarlyWins: number
    profitIfCurrentWins: number
  } {
    // Convert American odds to decimal
    const earlyDecimal = earlyOdds > 0 ? (earlyOdds / 100) + 1 : (100 / Math.abs(earlyOdds)) + 1
    const currentDecimal = currentOdds > 0 ? (currentOdds / 100) + 1 : (100 / Math.abs(currentOdds)) + 1
    
    // Calculate hedge stake to guarantee profit
    const earlyPayout = earlyStake * earlyDecimal
    const hedgeStake = earlyPayout / currentDecimal
    
    // Calculate profits
    const profitIfEarlyWins = earlyPayout - earlyStake - hedgeStake
    const profitIfCurrentWins = (hedgeStake * currentDecimal) - earlyStake - hedgeStake
    
    // Guaranteed profit (minimum of both outcomes)
    const guaranteedProfit = Math.min(profitIfEarlyWins, profitIfCurrentWins)
    
    return {
      hedgeStake: Math.round(hedgeStake * 100) / 100,
      guaranteedProfit: Math.round(guaranteedProfit * 100) / 100,
      profitIfEarlyWins: Math.round(profitIfEarlyWins * 100) / 100,
      profitIfCurrentWins: Math.round(profitIfCurrentWins * 100) / 100
    }
  }

  /**
   * Filter arb opportunities by minimum combined EV threshold
   */
  filterByMinimumEV(
    opportunities: LineMoveArbOpportunity[],
    minCombinedEV: number = 10
  ): LineMoveArbOpportunity[] {
    return opportunities.filter(arb => arb.combinedEV >= minCombinedEV)
  }

  /**
   * Group arb opportunities by sport
   */
  groupBySport(opportunities: LineMoveArbOpportunity[]): Map<string, LineMoveArbOpportunity[]> {
    const grouped = new Map<string, LineMoveArbOpportunity[]>()
    
    for (const arb of opportunities) {
      const existing = grouped.get(arb.sport) || []
      existing.push(arb)
      grouped.set(arb.sport, existing)
    }
    
    return grouped
  }
}
