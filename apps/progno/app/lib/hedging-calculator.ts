/**
 * Hedging Calculator Service
 * Live hedging tool for in-game and futures hedging
 */

export interface HedgePosition {
  id: string;
  originalStake: number;
  originalOdds: number;
  currentValue: number;
  potentialWin: number;
  potentialLoss: number;
}

export interface HedgeOpportunity {
  originalPosition: HedgePosition;
  hedgeStake: number;
  hedgeOdds: number;
  guaranteedProfit: number;
  profitIfOriginalWins: number;
  profitIfHedgeWins: number;
  riskReduction: number;
  recommendation: 'full_hedge' | 'partial_hedge' | 'no_hedge';
}

export interface FuturesHedge {
  ticketValue: number;
  futuresOdds: number;
  currentProbability: number;
  fieldOdds: number;
  hedgeAmount: number;
  guaranteedReturn: number;
  roi: number;
}

export class HedgingCalculator {
  /**
   * Calculate optimal hedge for a straight bet
   */
  calculateHedge(
    originalPosition: HedgePosition,
    hedgeOdds: number,
    targetProfit?: number
  ): HedgeOpportunity {
    const { originalStake, originalOdds } = originalPosition;
    
    // Calculate implied probability from original odds
    const originalImpliedProb = this.oddsToImpliedProbability(originalOdds);
    const hedgeImpliedProb = this.oddsToImpliedProbability(hedgeOdds);
    
    // Calculate optimal hedge stake for guaranteed profit
    const potentialOriginalWin = this.calculateWinAmount(originalStake, originalOdds);
    const totalExposure = originalStake + potentialOriginalWin;
    
    // Hedge stake that guarantees profit
    const hedgeStake = totalExposure / (1 + this.americanToDecimal(hedgeOdds));
    
    // Calculate outcomes
    const profitIfOriginalWins = potentialOriginalWin - hedgeStake;
    const profitIfHedgeWins = this.calculateWinAmount(hedgeStake, hedgeOdds) - originalStake;
    const guaranteedProfit = Math.min(profitIfOriginalWins, profitIfHedgeWins);
    
    // Risk reduction percentage
    const originalRisk = originalStake;
    const maxLossWithHedge = Math.abs(Math.min(profitIfOriginalWins, profitIfHedgeWins));
    const riskReduction = maxLossWithHedge < originalRisk ? 
      ((originalRisk - maxLossWithHedge) / originalRisk) * 100 : 0;
    
    // Determine recommendation
    let recommendation: HedgeOpportunity['recommendation'] = 'no_hedge';
    
    if (guaranteedProfit > 0 && guaranteedProfit >= originalStake * 0.1) {
      recommendation = 'full_hedge';
    } else if (riskReduction > 50 && profitIfOriginalWins > 0) {
      recommendation = 'partial_hedge';
    }

    return {
      originalPosition,
      hedgeStake: Math.round(hedgeStake * 100) / 100,
      hedgeOdds,
      guaranteedProfit: Math.round(guaranteedProfit * 100) / 100,
      profitIfOriginalWins: Math.round(profitIfOriginalWins * 100) / 100,
      profitIfHedgeWins: Math.round(profitIfHedgeWins * 100) / 100,
      riskReduction: Math.round(riskReduction * 10) / 10,
      recommendation,
    };
  }

  /**
   * Calculate futures hedge (e.g., championship bet)
   */
  calculateFuturesHedge(
    ticketValue: number,
    futuresOdds: number,
    currentProbability: number,
    fieldOdds: number
  ): FuturesHedge {
    // Convert odds to implied probability
    const futuresImpliedProb = this.oddsToImpliedProbability(futuresOdds);
    const fieldImpliedProb = this.oddsToImpliedProbability(fieldOdds);
    
    // Current expected value
    const potentialPayout = this.calculateWinAmount(ticketValue, futuresOdds);
    const currentEV = (currentProbability * potentialPayout) - ((1 - currentProbability) * ticketValue);
    
    // Calculate hedge on "the field" (everyone else)
    const hedgeAmount = (potentialPayout * currentProbability) / fieldImpliedProb;
    const hedgeWinAmount = this.calculateWinAmount(hedgeAmount, fieldOdds);
    
    // Guaranteed return scenarios
    const ifFuturesWins = potentialPayout - hedgeAmount;
    const ifFieldWins = hedgeWinAmount - ticketValue;
    const guaranteedReturn = Math.min(ifFuturesWins, ifFieldWins);
    
    // ROI calculation
    const totalInvestment = ticketValue + hedgeAmount;
    const roi = (guaranteedReturn / totalInvestment) * 100;

    return {
      ticketValue,
      futuresOdds,
      currentProbability,
      fieldOdds,
      hedgeAmount: Math.round(hedgeAmount * 100) / 100,
      guaranteedReturn: Math.round(guaranteedReturn * 100) / 100,
      roi: Math.round(roi * 10) / 10,
    };
  }

  /**
   * Calculate parlay hedge (when most legs have won)
   */
  calculateParlayHedge(
    parlayStake: number,
    parlayOdds: number,
    remainingLegs: number,
    currentLegOdds: number
  ): {
    hedgeStake: number;
    guaranteedProfit: number;
    profitIfParlayWins: number;
    profitIfHedgeWins: number;
  } {
    const potentialParlayWin = this.calculateWinAmount(parlayStake, parlayOdds);
    
    // Hedge the current leg
    const hedgeStake = potentialParlayWin / (1 + this.americanToDecimal(currentLegOdds));
    const hedgeWin = this.calculateWinAmount(hedgeStake, currentLegOdds);
    
    return {
      hedgeStake: Math.round(hedgeStake * 100) / 100,
      guaranteedProfit: Math.round(Math.min(
        potentialParlayWin - hedgeStake,
        hedgeWin - parlayStake
      ) * 100) / 100,
      profitIfParlayWins: Math.round((potentialParlayWin - hedgeStake) * 100) / 100,
      profitIfHedgeWins: Math.round((hedgeWin - parlayStake) * 100) / 100,
    };
  }

  /**
   * Calculate middle opportunity (bet both sides for potential win both ways)
   */
  calculateMiddle(
    sideALine: number,
    sideBOdds: number,
    stakeA: number
  ): {
    sideBStake: number;
    middleRange: { low: number; high: number };
    winBothScenarios: string[];
    maxLoss: number;
    maxWin: number;
  } | null {
    // Only works with spreads
    if (sideALine === 0) return null;
    
    // Calculate stake for side B to balance
    const winA = this.calculateWinAmount(stakeA, -110); // Assuming -110
    const stakeB = winA / this.americanToDecimal(sideBOdds);
    
    // Calculate middle range
    const low = Math.min(-sideALine, sideALine);
    const high = Math.max(-sideALine, sideALine);
    
    return {
      sideBStake: Math.round(stakeB * 100) / 100,
      middleRange: { low, high },
      winBothScenarios: [`Final margin between ${low} and ${high}`],
      maxLoss: Math.max(stakeA, stakeB) * 0.1, // 10% juice
      maxWin: Math.min(winA, this.calculateWinAmount(stakeB, sideBOdds)),
    };
  }

  /**
   * In-game hedging based on live score
   */
  calculateLiveHedge(
    originalStake: number,
    originalOdds: number,
    currentWinProbability: number,
    liveOdds: number
  ): HedgeOpportunity {
    const position: HedgePosition = {
      id: 'live',
      originalStake,
      originalOdds,
      currentValue: originalStake * (currentWinProbability / 0.5),
      potentialWin: this.calculateWinAmount(originalStake, originalOdds),
      potentialLoss: -originalStake,
    };

    return this.calculateHedge(position, liveOdds);
  }

  /**
   * Determine when to hedge based on bankroll management
   */
  shouldHedge(
    currentPosition: HedgePosition,
    bankroll: number,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  ): { shouldHedge: boolean; urgency: 'high' | 'medium' | 'low'; reason: string } {
    const exposure = currentPosition.originalStake;
    const exposurePercent = (exposure / bankroll) * 100;
    const potentialWin = currentPosition.potentialWin;
    const winPercent = (potentialWin / bankroll) * 100;

    // High exposure scenarios
    if (exposurePercent > 10) {
      return {
        shouldHedge: true,
        urgency: 'high',
        reason: `High exposure: ${exposurePercent.toFixed(1)}% of bankroll at risk`,
      };
    }

    // Large win opportunity - lock in profit
    if (winPercent > 20 && riskTolerance !== 'aggressive') {
      return {
        shouldHedge: true,
        urgency: 'medium',
        reason: `Large potential win (${winPercent.toFixed(1)}% of bankroll) - consider locking in`,
      };
    }

    // Conservative approach
    if (riskTolerance === 'conservative' && winPercent > 10) {
      return {
        shouldHedge: true,
        urgency: 'low',
        reason: 'Conservative approach: securing profit on meaningful win opportunity',
      };
    }

    return {
      shouldHedge: false,
      urgency: 'low',
      reason: 'Exposure within acceptable limits',
    };
  }

  private oddsToImpliedProbability(odds: number): number {
    if (odds > 0) {
      return 100 / (odds + 100);
    }
    return Math.abs(odds) / (Math.abs(odds) + 100);
  }

  private americanToDecimal(odds: number): number {
    if (odds > 0) {
      return odds / 100 + 1;
    }
    return 100 / Math.abs(odds) + 1;
  }

  private calculateWinAmount(stake: number, odds: number): number {
    if (odds > 0) {
      return stake * (odds / 100);
    }
    return stake * (100 / Math.abs(odds));
  }
}

export default HedgingCalculator;
