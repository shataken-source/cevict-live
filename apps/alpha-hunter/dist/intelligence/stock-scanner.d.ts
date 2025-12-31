/**
 * Stock Scanner
 * Scans stock markets for prediction market opportunities
 * Focuses on earnings, events, and sentiment-driven plays
 */
import { Opportunity } from '../types';
export declare class StockScanner {
    private yahooFinanceKey;
    constructor();
    scanForOpportunities(): Promise<Opportunity[]>;
    private scanEarnings;
    private scanUnusualVolume;
    private scanGaps;
    getMarketSummary(): Promise<string>;
}
//# sourceMappingURL=stock-scanner.d.ts.map