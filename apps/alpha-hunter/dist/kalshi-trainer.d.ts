/**
 * Kalshi Autonomous Trader
 * AI-powered prediction market trading using PROGNO + Massager data
 */
interface KalshiBet {
    id: string;
    marketId: string;
    marketTitle: string;
    side: 'yes' | 'no';
    contracts: number;
    entryPrice: number;
    currentPrice?: number;
    amount: number;
    aiConfidence: number;
    aiReasoning: string;
    timestamp: Date;
    status: 'open' | 'won' | 'lost' | 'pending';
    pnl?: number;
}
declare class KalshiAutonomousTrader {
    private kalshi;
    private progno;
    private claude;
    private bets;
    private learning;
    private isRunning;
    private maxBetSize;
    private minConfidence;
    private maxOpenBets;
    private minEdge;
    constructor();
    initialize(): Promise<void>;
    getPrognoIntelligence(): Promise<string>;
    getMarketIntelligence(): Promise<string>;
    analyzeMarket(market: any): Promise<{
        shouldBet: boolean;
        side: 'yes' | 'no';
        confidence: number;
        reasoning: string;
        suggestedAmount: number;
    }>;
    placeBet(market: any, side: 'yes' | 'no', amount: number, confidence: number, reasoning: string): Promise<KalshiBet | null>;
    checkOpenBets(): Promise<void>;
    runCycle(): Promise<void>;
    showStats(): Promise<void>;
    startTrading(intervalMinutes?: number): Promise<void>;
}
export { KalshiAutonomousTrader };
//# sourceMappingURL=kalshi-trainer.d.ts.map