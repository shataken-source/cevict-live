/**
 * Crypto Trader
 * Smart crypto trading strategies using exchange integrations
 * Runs on Coinbase, Crypto.com, and Binance
 */
import { Opportunity, Trade } from '../types';
interface CryptoSignal {
    symbol: 'BTC' | 'ETH' | 'SOL';
    direction: 'long' | 'short';
    confidence: number;
    reasoning: string[];
    entryPrice?: number;
    targetPrice?: number;
    stopLoss?: number;
}
export declare class CryptoTrader {
    private exchanges;
    private config;
    private dailyTrades;
    private dailyPnL;
    constructor();
    /**
     * Generate trading signals based on enabled strategies
     */
    generateSignals(): Promise<CryptoSignal[]>;
    /**
     * Mean Reversion Strategy
     * Trade against extreme moves expecting reversion
     */
    private meanReversionStrategy;
    /**
     * Momentum Strategy
     * Ride strong trends
     */
    private momentumStrategy;
    /**
     * Breakout Strategy
     * Trade breakouts from consolidation
     */
    private breakoutStrategy;
    /**
     * Execute the best signal
     */
    executeBestSignal(): Promise<Trade | null>;
    /**
     * Convert signals to opportunities for Alpha Hunter
     */
    getOpportunities(): Promise<Opportunity[]>;
    /**
     * Get status summary
     */
    getStatus(): Promise<string>;
    private estimateVolatility;
    private detectTrend;
    private detectBreakout;
    resetDailyCounters(): void;
}
export {};
//# sourceMappingURL=crypto-trader.d.ts.map