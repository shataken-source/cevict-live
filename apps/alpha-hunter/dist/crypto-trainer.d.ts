/**
 * Crypto Training Bot
 * Learns to trade by making small real trades
 * Tracks wins/losses and adapts strategy
 */
interface TradeRecord {
    id: string;
    pair: string;
    side: 'buy' | 'sell';
    entryPrice: number;
    exitPrice?: number;
    size: number;
    usdValue: number;
    profit?: number;
    profitPercent?: number;
    reason: string;
    timestamp: Date;
    closed: boolean;
    takeProfitPrice: number;
    stopLossPrice: number;
}
declare class CryptoTrainer {
    private coinbase;
    private claude;
    private trades;
    private learning;
    private maxTradeUSD;
    private minProfitPercent;
    private maxLossPercent;
    private tradingPairs;
    private isRunning;
    private conversionAttempted;
    private totalConvertedThisSession;
    private maxConversionPerSession;
    private estimatedUSD;
    private tradesThisSession;
    private lastBalanceRefresh;
    private balanceRefreshInterval;
    constructor();
    initialize(): Promise<void>;
    showPortfolio(): Promise<void>;
    getUSDBalance(): Promise<number>;
    /**
     * Refresh balances from Coinbase and sync estimatedUSD
     * Call this after trades complete or periodically
     */
    refreshBalances(force?: boolean): Promise<void>;
    convertToUSD(currency: string, amount: number): Promise<boolean>;
    analyzeMarket(pair: string): Promise<{
        signal: 'buy' | 'sell' | 'hold';
        confidence: number;
        reason: string;
        price: number;
    }>;
    private getClaudeAnalysis;
    executeTrade(pair: string, side: 'buy' | 'sell', usdAmount: number, reason: string): Promise<TradeRecord | null>;
    checkOpenTrades(): Promise<void>;
    autoSellPosition(trade: TradeRecord, currentPrice: number, reason: string): Promise<void>;
    showLearningStats(): void;
    runTrainingCycle(): Promise<void>;
    startTraining(intervalSeconds?: number): Promise<void>;
}
export { CryptoTrainer };
//# sourceMappingURL=crypto-trainer.d.ts.map