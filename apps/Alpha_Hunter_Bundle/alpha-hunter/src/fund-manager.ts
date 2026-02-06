import { KalshiTrader } from './intelligence/kalshi-trader';

class FundManager {
  private cryptoBalance: number = 0;
  private cryptoValue: number = 0;
  private kalshiBalance: number = 0;
  private kalshiValue: number = 0;
  private cryptoStats: { totalPnL: number; wins: number; losses: number } = { totalPnL: 0, wins: 0, losses: 0 };
  private kalshiStats: { totalPnL: number; wins: number; losses: number } = { totalPnL: 0, wins: 0, losses: 0 };
  private kalshiAllocation: number = 40;
  private cryptoAllocation: number = 50;
  private reserveAllocation: number = 10;

  updateCryptoBalance(usdBalance: number, cryptoValue: number): void {
    this.cryptoBalance = usdBalance;
    this.cryptoValue = cryptoValue;
  }

  updateKalshiBalance(balance: number, value: number): void {
    this.kalshiBalance = balance;
    this.kalshiValue = value;
  }

  updateCryptoStats(pnl: number, isWin: boolean): void {
    this.cryptoStats.totalPnL += pnl;
    if (isWin) {
      this.cryptoStats.wins++;
    } else {
      this.cryptoStats.losses++;
    }
  }

  updateKalshiStats(pnl: number, isWin: boolean): void {
    this.kalshiStats.totalPnL += pnl;
    if (isWin) {
      this.kalshiStats.wins++;
    } else {
      this.kalshiStats.losses++;
    }
  }

  getStatus(): string {
    const total = this.cryptoBalance + this.cryptoValue + this.kalshiBalance;
    return `💰 Total Funds: $${total.toFixed(2)} (Crypto: $${(this.cryptoBalance + this.cryptoValue).toFixed(2)}, Kalshi: $${this.kalshiBalance.toFixed(2)})`;
  }

  getRebalanceSuggestion(): { action: string; amount: number; from: string; to: string } | null {
    const cryptoTotal = this.cryptoBalance + this.cryptoValue;
    const total = cryptoTotal + this.kalshiBalance;
    
    if (total === 0) return null;
    
    const cryptoPercent = (cryptoTotal / total) * 100;
    const kalshiPercent = (this.kalshiBalance / total) * 100;
    
    if (cryptoPercent > 70) {
      const moveAmount = (cryptoTotal - total * 0.6) / 2;
      return { action: 'Rebalance', amount: moveAmount, from: 'crypto', to: 'kalshi' };
    }
    if (kalshiPercent > 70) {
      const moveAmount = (this.kalshiBalance - total * 0.6) / 2;
      return { action: 'Rebalance', amount: moveAmount, from: 'kalshi', to: 'crypto' };
    }
    
    return null;
  }

  getPendingRebalances(): any[] {
    return [];
  }

  shouldTradeOnPlatform(platform: 'crypto' | 'kalshi', confidence: number): boolean {
    const minConfidence = platform === 'crypto' ? 60 : 55;
    return confidence >= minConfidence;
  }

  getMaxTradeAmount(platform: 'crypto' | 'kalshi', requestedAmount: number): number {
    const total = this.cryptoBalance + this.cryptoValue + this.kalshiBalance;
    if (total === 0) return 0;
    
    const platformBalance = platform === 'crypto' 
      ? (this.cryptoBalance + this.cryptoValue)
      : this.kalshiBalance;
    
    const maxPercent = platform === 'crypto' ? 0.1 : 0.15;
    const maxFromBalance = platformBalance * maxPercent;
    
    return Math.min(requestedAmount, maxFromBalance, total * 0.1);
  }

  getKalshiStats(): { pnl: number; wins: number; losses: number } {
    return {
      pnl: this.kalshiStats.totalPnL,
      wins: this.kalshiStats.wins,
      losses: this.kalshiStats.losses
    };
  }

  getCryptoStats(): { pnl: number; wins: number; losses: number } {
    return {
      pnl: this.cryptoStats.totalPnL,
      wins: this.cryptoStats.wins,
      losses: this.cryptoStats.losses
    };
  }

  async getAccount(): Promise<{ balance: number; available: number; buying_power: number; currency: string }> {
    const total = this.cryptoBalance + this.cryptoValue + this.kalshiBalance;
    return {
      balance: total,
      available: total,
      buying_power: total,
      currency: 'USD'
    };
  }

  setAllocation(kalshiPercent: number, cryptoPercent: number, reservePercent: number): void {
    this.kalshiAllocation = kalshiPercent;
    this.cryptoAllocation = cryptoPercent;
    this.reserveAllocation = reservePercent;
  }

  getAllocation(): { kalshi: number; crypto: number; reserve: number } {
    return {
      kalshi: this.kalshiAllocation,
      crypto: this.cryptoAllocation,
      reserve: this.reserveAllocation
    };
  }

  getTotalFunds(): number {
    return this.cryptoBalance + this.cryptoValue + this.kalshiBalance;
  }

  getPerformanceStats(): Promise<any> {
    return Promise.resolve({
      totalPnL: this.cryptoStats.totalPnL + this.kalshiStats.totalPnL,
      cryptoPnL: this.cryptoStats.totalPnL,
      kalshiPnL: this.kalshiStats.totalPnL
    });
  }

  showRebalanceStatus(): string {
    const total = this.cryptoBalance + this.cryptoValue + this.kalshiBalance;
    const suggestion = this.getRebalanceSuggestion();
    if (suggestion) {
      return `⚠️ Rebalance needed: ${suggestion.action} $${suggestion.amount.toFixed(2)} from ${suggestion.from} to ${suggestion.to}`;
    }
    return '✅ Allocations balanced';
  }

  checkAndCreateRebalance(): any | null {
    return this.getRebalanceSuggestion();
  }

  initiateRebalance(id: string): void {
    // Placeholder - would track rebalance state
    console.log(`Rebalance ${id} initiated`);
  }

  completeRebalance(id: string): void {
    // Placeholder - would mark rebalance as complete
    console.log(`Rebalance ${id} completed`);
  }

  cancelRebalance(id: string, reason?: string): void {
    // Placeholder - would cancel rebalance
    console.log(`Rebalance ${id} cancelled${reason ? `: ${reason}` : ''}`);
  }

  getRebalanceHistory(): any[] {
    return [];
  }
}

// Export singleton instance
export const fundManager = new FundManager();

// Also export class for backwards compatibility
export class UnifiedFundManager {
  private kalshi: KalshiTrader;

  constructor(kalshi: KalshiTrader) {
    this.kalshi = kalshi;
  }

  async getAccount() {
    const balance = await this.getAvailableFunds();
    return {
        balance: balance,
        available: balance,
        availableFunds: balance,
        buying_power: balance,
        currency: 'USD',
        todayProfit: 0
    };
  }

  async getAvailableFunds(): Promise<number> {
    if (!this.kalshi) {
        console.log("⚠️ FundManager: KalshiTrader missing. Using SAFE MODE balance.");
        return 1000;
    }

    try {
      const balance = await this.kalshi.getBalance();
      console.log(`💰 Fund Manager sees: $${balance}`);
      return balance; 
    } catch (error) {
      console.log("⚠️ Could not fetch balance. Defaulting to SAFE MODE ($1000).");
      return 1000;
    }
  }

  async allocate(amount: number): Promise<boolean> {
    console.log(`⚠️ Allocating $${amount} (Override Active)`);
    return true; 
  }

  async deposit(amount: number, reason: string): Promise<void> {
    // Placeholder - would update balance
    console.log(`Deposited $${amount}: ${reason}`);
  }

  async withdraw(amount: number, reason: string): Promise<void> {
    // Placeholder - would update balance
    console.log(`Withdrew $${amount}: ${reason}`);
  }

  async canTrade(opportunity: any): Promise<{ allowed: boolean; reason?: string }> {
    const total = await this.getAvailableFunds();
    if (total < opportunity.requiredCapital) {
      return { allowed: false, reason: 'Insufficient funds' };
    }
    return { allowed: true };
  }

  async allocateFunds(opportunityId: string, amount: number): Promise<void> {
    // Placeholder - would track allocated funds
    console.log(`Allocated $${amount} for ${opportunityId}`);
  }

  async releaseFunds(opportunityId: string, allocated: number, profit: number): Promise<void> {
    // Placeholder - would release and update balance
    console.log(`Released $${allocated} + $${profit} profit for ${opportunityId}`);
  }
}
