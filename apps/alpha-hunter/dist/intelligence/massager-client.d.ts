/**
 * PROGNO Massager Client
 * Integrates with the PROGNO Massager for advanced calculations
 */
import { DataPoint } from '../types';
interface ArbitrageResult {
    exists: boolean;
    profit: number;
    book1: string;
    book2: string;
    stake1: number;
    stake2: number;
    reasoning: string[];
}
interface HedgeResult {
    hedgeAmount: number;
    breakEvenReturn: number;
    guaranteedProfit: number;
    riskFreeReturn: number;
}
interface KellyResult {
    optimalFraction: number;
    recommendedStake: number;
    maxStake: number;
    edgePercent: number;
}
export declare class MassagerClient {
    private baseUrl;
    constructor();
    /**
     * Calculate arbitrage opportunity
     */
    calculateArbitrage(odds1: number, odds2: number, totalStake?: number): Promise<ArbitrageResult>;
    /**
     * Calculate hedge bet for guaranteed profit
     */
    calculateHedge(initialStake: number, initialOdds: number, currentOdds: number): Promise<HedgeResult>;
    /**
     * Calculate optimal Kelly Criterion stake
     */
    calculateKelly(winProbability: number, odds: number, bankroll: number): Promise<KellyResult>;
    /**
     * Run Monte Carlo simulation for outcome prediction
     */
    runMonteCarlo(winProbability: number, numSimulations?: number): Promise<{
        expectedWins: number;
        expectedLosses: number;
        confidenceInterval: {
            low: number;
            high: number;
        };
    }>;
    /**
     * Analyze value bet
     */
    analyzeValue(myProbability: number, marketOdds: number): Promise<{
        isValue: boolean;
        edge: number;
        expectedValue: number;
        rating: 'excellent' | 'good' | 'marginal' | 'no_value';
    }>;
    /**
     * Calculate implied probability from odds
     */
    getImpliedProbability(odds: number): Promise<{
        american: number;
        decimal: number;
        impliedProbability: number;
        vig: number;
    }>;
    /**
     * Generate daily $250 strategy
     */
    generate250Strategy(bankroll: number, riskTolerance: 'conservative' | 'moderate' | 'aggressive'): Promise<{
        targetDailyBets: number;
        avgBetSize: number;
        requiredWinRate: number;
        strategy: string[];
        warnings: string[];
    }>;
    /**
     * Convert American odds to decimal
     */
    private americanToDecimal;
    /**
     * Convert data to useful insights
     */
    generateInsights(dataPoints: DataPoint[]): Promise<string[]>;
}
export {};
//# sourceMappingURL=massager-client.d.ts.map