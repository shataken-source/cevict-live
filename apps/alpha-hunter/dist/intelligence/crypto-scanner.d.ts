/**
 * Crypto Scanner
 * Scans crypto markets for trading opportunities
 * Focuses on Kalshi crypto prediction markets + spot opportunities
 */
import { Opportunity } from '../types';
export declare class CryptoScanner {
    private coingeckoApiKey;
    constructor();
    scanMarkets(): Promise<Opportunity[]>;
    private getPrices;
    private analyzeCrypto;
    private analyzeFearGreed;
    private analyzeKalshiCrypto;
    private getSamplePrices;
    getMarketSummary(): Promise<string>;
}
//# sourceMappingURL=crypto-scanner.d.ts.map