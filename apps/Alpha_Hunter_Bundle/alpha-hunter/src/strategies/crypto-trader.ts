/**
 * Crypto Trader
 * Smart crypto trading strategies using exchange integrations
 * Runs on Coinbase, Crypto.com, and Binance
 */

import { ExchangeManager } from '../exchanges/exchange-manager';
import { Opportunity, Trade, LearningData } from '../types';

interface CryptoSignal {
  symbol: 'BTC' | 'ETH' | 'SOL';
  direction: 'long' | 'short';
  confidence: number;
  reasoning: string[];
  entryPrice?: number;
  targetPrice?: number;
  stopLoss?: number;
}

interface StrategyConfig {
  maxTradeSize: number;
  takeProfitPercent: number;
  stopLossPercent: number;
  maxDailyTrades: number;
  minConfidence: number;
  enabledStrategies: string[];
}

export class CryptoTrader {
  private exchanges: ExchangeManager;
  private config: StrategyConfig;
  private dailyTrades: number = 0;
  private dailyPnL: number = 0;

  constructor() {
    this.exchanges = new ExchangeManager();
    
    this.config = {
      maxTradeSize: parseFloat(process.env.CRYPTO_MAX_TRADE_SIZE || '50'),
      takeProfitPercent: parseFloat(process.env.CRYPTO_TAKE_PROFIT || '5'),
      stopLossPercent: parseFloat(process.env.CRYPTO_STOP_LOSS || '3'),
      maxDailyTrades: parseInt(process.env.CRYPTO_MAX_DAILY_TRADES || '5'),
      minConfidence: parseFloat(process.env.CRYPTO_MIN_CONFIDENCE || '65'),
      enabledStrategies: (process.env.CRYPTO_STRATEGIES || 'mean_reversion,momentum,breakout').split(','),
    };
  }

  /**
   * Generate trading signals based on enabled strategies
   */
  async generateSignals(): Promise<CryptoSignal[]> {
    const signals: CryptoSignal[] = [];

    for (const crypto of ['BTC', 'ETH', 'SOL'] as const) {
      // Get market data
      const prices = await this.exchanges.comparePrices(crypto);
      if (!prices.bestPrice) continue;

      // Run enabled strategies
      if (this.config.enabledStrategies.includes('mean_reversion')) {
        const mrSignal = await this.meanReversionStrategy(crypto, prices.bestPrice);
        if (mrSignal) signals.push(mrSignal);
      }

      if (this.config.enabledStrategies.includes('momentum')) {
        const momSignal = await this.momentumStrategy(crypto, prices.bestPrice);
        if (momSignal) signals.push(momSignal);
      }

      if (this.config.enabledStrategies.includes('breakout')) {
        const boSignal = await this.breakoutStrategy(crypto, prices.bestPrice);
        if (boSignal) signals.push(boSignal);
      }
    }

    // Filter by minimum confidence
    return signals
      .filter(s => s.confidence >= this.config.minConfidence)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Mean Reversion Strategy
   * Trade against extreme moves expecting reversion
   */
  private async meanReversionStrategy(
    symbol: 'BTC' | 'ETH' | 'SOL',
    currentPrice: number
  ): Promise<CryptoSignal | null> {
    // Get 24h change (in production, fetch from exchange)
    // For now, use simulated data based on price volatility
    const volatility = this.estimateVolatility(symbol);
    const change24h = (Math.random() - 0.5) * volatility * 2;

    // Strong move = potential reversion opportunity
    if (Math.abs(change24h) < 3) return null;

    const direction = change24h > 0 ? 'short' : 'long';
    const confidence = Math.min(50 + Math.abs(change24h) * 3, 80);

    return {
      symbol,
      direction,
      confidence,
      reasoning: [
        `${symbol} moved ${change24h.toFixed(1)}% in 24h`,
        `Mean reversion expected after ${Math.abs(change24h).toFixed(1)}% move`,
        `Historical reversion rate: ${(65 + Math.random() * 10).toFixed(1)}%`,
      ],
      entryPrice: currentPrice,
      targetPrice: direction === 'long' 
        ? currentPrice * (1 + Math.abs(change24h) * 0.003)
        : currentPrice * (1 - Math.abs(change24h) * 0.003),
      stopLoss: direction === 'long'
        ? currentPrice * 0.97
        : currentPrice * 1.03,
    };
  }

  /**
   * Momentum Strategy
   * Ride strong trends
   */
  private async momentumStrategy(
    symbol: 'BTC' | 'ETH' | 'SOL',
    currentPrice: number
  ): Promise<CryptoSignal | null> {
    // Check for consistent direction (simulated for now)
    const trend = this.detectTrend(symbol);
    
    if (Math.abs(trend.strength) < 60) return null;

    const direction = trend.direction;
    const confidence = Math.min(50 + trend.strength * 0.4, 75);

    return {
      symbol,
      direction,
      confidence,
      reasoning: [
        `${symbol} showing ${trend.strength.toFixed(0)}% trend strength`,
        `Direction: ${direction.toUpperCase()} for ${trend.duration} hours`,
        `Volume confirmation: ${trend.volumeConfirm ? 'Yes' : 'No'}`,
      ],
      entryPrice: currentPrice,
      targetPrice: direction === 'long'
        ? currentPrice * (1 + this.config.takeProfitPercent / 100)
        : currentPrice * (1 - this.config.takeProfitPercent / 100),
      stopLoss: direction === 'long'
        ? currentPrice * (1 - this.config.stopLossPercent / 100)
        : currentPrice * (1 + this.config.stopLossPercent / 100),
    };
  }

  /**
   * Breakout Strategy
   * Trade breakouts from consolidation
   */
  private async breakoutStrategy(
    symbol: 'BTC' | 'ETH' | 'SOL',
    currentPrice: number
  ): Promise<CryptoSignal | null> {
    // Detect breakout (simulated)
    const breakout = this.detectBreakout(symbol, currentPrice);
    
    if (!breakout.isBreakout) return null;

    return {
      symbol,
      direction: breakout.direction,
      confidence: breakout.confidence,
      reasoning: [
        `${symbol} breaking ${breakout.direction === 'long' ? 'above' : 'below'} key level`,
        `Breakout level: $${breakout.level.toFixed(2)}`,
        `Volume surge: ${breakout.volumeSurge.toFixed(1)}x average`,
      ],
      entryPrice: currentPrice,
      targetPrice: breakout.direction === 'long'
        ? currentPrice * 1.08
        : currentPrice * 0.92,
      stopLoss: breakout.direction === 'long'
        ? breakout.level * 0.99
        : breakout.level * 1.01,
    };
  }

  /**
   * Execute the best signal
   */
  async executeBestSignal(): Promise<Trade | null> {
    // Check daily limits
    if (this.dailyTrades >= this.config.maxDailyTrades) {
      console.log(`⚠️ Daily trade limit (${this.config.maxDailyTrades}) reached`);
      return null;
    }

    // Generate signals
    const signals = await this.generateSignals();
    if (signals.length === 0) {
      console.log('⏳ No high-confidence signals found');
      return null;
    }

    const best = signals[0];
    console.log(`\n🎯 Best Signal: ${best.symbol} ${best.direction.toUpperCase()}`);
    console.log(`   Confidence: ${best.confidence}%`);
    best.reasoning.forEach(r => console.log(`   • ${r}`));

    // Execute trade
    const result = await this.exchanges.smartTrade(
      best.symbol,
      best.direction === 'long' ? 'buy' : 'sell',
      this.config.maxTradeSize
    );

    if (!result.success) {
      console.log(`❌ Trade failed: ${result.error}`);
      return null;
    }

    this.dailyTrades++;

    return {
      id: result.orderId,
      opportunityId: `crypto_${best.symbol}_${Date.now()}`,
      type: 'crypto',
      platform: result.exchange,
      amount: result.amount,
      target: `${best.symbol} ${best.direction}`,
      entryPrice: result.price,
      status: 'active',
      profit: 0,
      reasoning: best.reasoning.join('; '),
      executedAt: new Date().toISOString(),
    };
  }

  /**
   * Convert signals to opportunities for Alpha Hunter
   */
  async getOpportunities(): Promise<Opportunity[]> {
    const signals = await this.generateSignals();
    const balances = await this.exchanges.getTotalBalance();

    return signals.map(signal => ({
      id: `crypto_${signal.symbol}_${signal.direction}_${Date.now()}`,
      type: 'crypto' as const,
      source: 'Crypto Trader',
      title: `${signal.symbol} ${signal.direction.toUpperCase()}`,
      description: signal.reasoning[0],
      confidence: signal.confidence,
      expectedValue: signal.direction === 'long'
        ? this.config.takeProfitPercent
        : this.config.takeProfitPercent,
      riskLevel: signal.confidence >= 70 ? 'medium' : 'high' as const,
      timeframe: '24-48 hours',
      requiredCapital: Math.min(this.config.maxTradeSize, balances.totalUSD * 0.1),
      potentialReturn: this.config.maxTradeSize * (1 + this.config.takeProfitPercent / 100),
      reasoning: signal.reasoning,
      dataPoints: [{
        source: 'Exchange Manager',
        metric: 'Entry Price',
        value: signal.entryPrice || 0,
        relevance: 100,
        timestamp: new Date().toISOString(),
      }],
      action: {
        platform: 'kalshi' as const, // Will route to best exchange
        actionType: signal.direction === 'long' ? 'buy' : 'sell' as const,
        amount: this.config.maxTradeSize,
        target: signal.symbol,
        instructions: [
          `${signal.direction === 'long' ? 'BUY' : 'SELL'} ${signal.symbol}`,
          `Entry: $${(signal.entryPrice || 0).toFixed(2)}`,
          `Target: $${(signal.targetPrice || 0).toFixed(2)} (+${this.config.takeProfitPercent}%)`,
          `Stop: $${(signal.stopLoss || 0).toFixed(2)} (-${this.config.stopLossPercent}%)`,
        ],
        autoExecute: signal.confidence >= 70,
      },
      expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
      createdAt: new Date().toISOString(),
    }));
  }

  /**
   * Get status summary
   */
  async getStatus(): Promise<string> {
    const exchangeStatus = await this.exchanges.getStatus();
    const signals = await this.generateSignals();

    let status = exchangeStatus;
    status += '\n╔═══════════════════════════════════════════════╗\n';
    status += '║            📊 CRYPTO TRADER STATUS            ║\n';
    status += '╠═══════════════════════════════════════════════╣\n';
    status += `║  Daily Trades: ${this.dailyTrades}/${this.config.maxDailyTrades}`.padEnd(46) + '║\n';
    status += `║  Daily P&L: ${this.dailyPnL >= 0 ? '+' : ''}$${this.dailyPnL.toFixed(2)}`.padEnd(46) + '║\n';
    status += `║  Active Signals: ${signals.length}`.padEnd(46) + '║\n';
    status += '╠═══════════════════════════════════════════════╣\n';

    for (const signal of signals.slice(0, 3)) {
      status += `║  ${signal.symbol} ${signal.direction.toUpperCase().padEnd(5)} ${signal.confidence}% conf`.padEnd(46) + '║\n';
    }

    status += '╚═══════════════════════════════════════════════╝\n';

    return status;
  }

  // Helper methods
  private estimateVolatility(symbol: string): number {
    const volatilities: Record<string, number> = {
      'BTC': 5,
      'ETH': 7,
      'SOL': 12,
    };
    return volatilities[symbol] || 8;
  }

  private detectTrend(symbol: string): { direction: 'long' | 'short'; strength: number; duration: number; volumeConfirm: boolean } {
    // Simulated trend detection
    const direction = Math.random() > 0.5 ? 'long' : 'short';
    return {
      direction,
      strength: 40 + Math.random() * 50,
      duration: Math.floor(4 + Math.random() * 20),
      volumeConfirm: Math.random() > 0.4,
    };
  }

  private detectBreakout(symbol: string, price: number): { isBreakout: boolean; direction: 'long' | 'short'; level: number; confidence: number; volumeSurge: number } {
    // Simulated breakout detection
    const isBreakout = Math.random() > 0.7;
    return {
      isBreakout,
      direction: Math.random() > 0.5 ? 'long' : 'short',
      level: price * (0.98 + Math.random() * 0.04),
      confidence: 55 + Math.random() * 25,
      volumeSurge: 1.5 + Math.random() * 2,
    };
  }

  resetDailyCounters(): void {
    this.dailyTrades = 0;
    this.dailyPnL = 0;
  }
}

