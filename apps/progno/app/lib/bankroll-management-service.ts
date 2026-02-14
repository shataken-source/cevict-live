/**
 * Bankroll Management Service
 * Tracks picks, stake sizes, and bankroll performance
 */

export interface BankrollState {
  initialBankroll: number;
  currentBankroll: number;
  peakBankroll: number;
  troughBankroll: number;
  totalStaked: number;
  totalProfit: number;
  roi: number;
  drawdown: number; // Percent from peak
  variance: number;
}

export interface StakeRecord {
  pickId: string;
  date: string;
  stake: number;
  bankrollPercent: number;
  kellyPercent: number;
  result: 'win' | 'loss' | 'push' | 'pending';
  profit: number;
  runningBankroll: number;
}

export class BankrollManagementService {
  private state: BankrollState;
  private history: StakeRecord[] = [];
  private readonly MAX_STAKE_PERCENT = 3;

  constructor(initialBankroll: number = 10000) {
    this.state = {
      initialBankroll,
      currentBankroll: initialBankroll,
      peakBankroll: initialBankroll,
      troughBankroll: initialBankroll,
      totalStaked: 0,
      totalProfit: 0,
      roi: 0,
      drawdown: 0,
      variance: 0,
    };
  }

  /**
   * Calculate optimal stake using Kelly Criterion with safety limits
   */
  calculateStake(
    pickId: string,
    modelProbability: number,
    decimalOdds: number,
    confidence: number
  ): { stake: number; bankrollPercent: number; kellyPercent: number } {
    // Kelly = (bp - q) / b
    const b = decimalOdds - 1;
    const p = modelProbability;
    const q = 1 - p;
    const kelly = ((b * p) - q) / b;

    // Half Kelly for safety
    const halfKelly = kelly / 2;

    // Convert to bankroll percentage
    const kellyPercent = Math.max(0, halfKelly * 100);

    // Cap at max stake percent
    const bankrollPercent = Math.min(kellyPercent, this.MAX_STAKE_PERCENT);

    // Calculate actual stake
    const stake = this.state.currentBankroll * (bankrollPercent / 100);

    return {
      stake: Math.round(stake * 100) / 100,
      bankrollPercent: Math.round(bankrollPercent * 100) / 100,
      kellyPercent: Math.round(kellyPercent * 100) / 100,
    };
  }

  /**
   * Record a placed bet
   */
  recordBet(
    pickId: string,
    date: string,
    stake: number,
    bankrollPercent: number,
    kellyPercent: number
  ): void {
    this.history.push({
      pickId,
      date,
      stake,
      bankrollPercent,
      kellyPercent,
      result: 'pending',
      profit: 0,
      runningBankroll: this.state.currentBankroll - stake,
    });

    this.state.currentBankroll -= stake;
    this.state.totalStaked += stake;
    this.updateMetrics();
  }

  /**
   * Grade a bet and update bankroll
   */
  gradeBet(pickId: string, result: 'win' | 'loss' | 'push', profit: number): void {
    const record = this.history.find(h => h.pickId === pickId);
    if (!record) return;

    record.result = result;
    record.profit = profit;

    if (result === 'win') {
      this.state.currentBankroll += record.stake + profit;
    } else if (result === 'push') {
      this.state.currentBankroll += record.stake;
    }
    // Loss: stake already deducted

    record.runningBankroll = this.state.currentBankroll;
    this.updateMetrics();
  }

  /**
   * Get current bankroll state
   */
  getState(): BankrollState {
    return { ...this.state };
  }

  /**
   * Get stake history
   */
  getHistory(): StakeRecord[] {
    return [...this.history];
  }

  /**
   * Calculate performance by tier
   */
  getPerformanceByTier(tierAssignments: Map<string, string>): Record<string, { picks: number; profit: number; roi: number }> {
    const byTier: Record<string, { picks: number; profit: number; staked: number }> = {
      elite: { picks: 0, profit: 0, staked: 0 },
      pro: { picks: 0, profit: 0, staked: 0 },
      free: { picks: 0, profit: 0, staked: 0 },
    };

    for (const record of this.history) {
      const tier = tierAssignments.get(record.pickId) || 'free';
      if (byTier[tier]) {
        byTier[tier].picks++;
        byTier[tier].profit += record.profit;
        byTier[tier].staked += record.stake;
      }
    }

    return {
      elite: {
        picks: byTier.elite.picks,
        profit: byTier.elite.profit,
        roi: byTier.elite.staked > 0 ? (byTier.elite.profit / byTier.elite.staked) * 100 : 0,
      },
      pro: {
        picks: byTier.pro.picks,
        profit: byTier.pro.profit,
        roi: byTier.pro.staked > 0 ? (byTier.pro.profit / byTier.pro.staked) * 100 : 0,
      },
      free: {
        picks: byTier.free.picks,
        profit: byTier.free.profit,
        roi: byTier.free.staked > 0 ? (byTier.free.profit / byTier.free.staked) * 100 : 0,
      },
    };
  }

  private updateMetrics(): void {
    // Update peak/trough
    if (this.state.currentBankroll > this.state.peakBankroll) {
      this.state.peakBankroll = this.state.currentBankroll;
    }
    if (this.state.currentBankroll < this.state.troughBankroll) {
      this.state.troughBankroll = this.state.currentBankroll;
    }

    // Calculate drawdown
    this.state.drawdown = this.state.peakBankroll > 0
      ? ((this.state.peakBankroll - this.state.currentBankroll) / this.state.peakBankroll) * 100
      : 0;

    // Calculate ROI
    this.state.roi = this.state.totalStaked > 0
      ? (this.state.totalProfit / this.state.totalStaked) * 100
      : 0;

    // Calculate variance from completed bets
    const completed = this.history.filter(h => h.result !== 'pending');
    if (completed.length > 1) {
      const profits = completed.map(h => h.profit);
      const mean = profits.reduce((a, b) => a + b, 0) / profits.length;
      const squaredDiffs = profits.map(p => Math.pow(p - mean, 2));
      this.state.variance = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / profits.length);
    }
  }

  /**
   * Get drawdown alert
   */
  getDrawdownAlert(): { alert: boolean; severity: 'low' | 'medium' | 'high'; message: string } | null {
    if (this.state.drawdown > 20) {
      return { alert: true, severity: 'high', message: `Drawdown: ${this.state.drawdown.toFixed(1)}% - Consider reducing stakes` };
    } else if (this.state.drawdown > 10) {
      return { alert: true, severity: 'medium', message: `Drawdown: ${this.state.drawdown.toFixed(1)}%` };
    } else if (this.state.drawdown > 5) {
      return { alert: true, severity: 'low', message: `Drawdown: ${this.state.drawdown.toFixed(1)}%` };
    }
    return null;
  }
}

export default BankrollManagementService;
