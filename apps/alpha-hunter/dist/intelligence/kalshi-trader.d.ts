/**
 * Kalshi Trader
 * Automated prediction market trading via Kalshi API
 * Note: Kalshi is legal in most US states for prediction markets
 */
import { PredictionMarket, Opportunity, Trade } from '../types';
interface KalshiPosition {
    marketId: string;
    contracts: number;
    avgPrice: number;
    currentPrice: number;
    pnl: number;
}
export declare class KalshiTrader {
    private apiKeyId;
    private privateKey;
    private baseUrl;
    private isProduction;
    constructor();
    private signRequest;
    getBalance(): Promise<number>;
    getMarkets(category?: string): Promise<PredictionMarket[]>;
    findOpportunities(minEdge?: number): Promise<Opportunity[]>;
    private predictOutcome;
    private createOpportunity;
    private calculateOptimalStake;
    placeBet(marketId: string, side: 'yes' | 'no', amount: number, maxPrice: number): Promise<Trade | null>;
    getPositions(): Promise<KalshiPosition[]>;
    private transformMarkets;
    private getSampleMarkets;
}
export {};
//# sourceMappingURL=kalshi-trader.d.ts.map