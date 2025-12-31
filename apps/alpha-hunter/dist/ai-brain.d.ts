/**
 * AI Brain
 * The core intelligence that analyzes all data sources and makes decisions
 * Uses Claude for reasoning, integrates PROGNO Massager for calculations
 */
import { Opportunity, DailyReport, LearningData } from './types';
interface AnalysisResult {
    topOpportunity: Opportunity | null;
    allOpportunities: Opportunity[];
    marketAnalysis: string;
    riskAssessment: string;
    recommendedAction: string;
    confidenceLevel: number;
}
export declare class AIBrain {
    private anthropic;
    private newsScanner;
    private progno;
    private kalshi;
    private cryptoTrader;
    private config;
    private learningHistory;
    constructor();
    analyzeAllSources(): Promise<AnalysisResult>;
    private rankOpportunities;
    private getClaudeAnalysis;
    private algorithmicRanking;
    private generateMarketAnalysis;
    private generateAction;
    generateDailyReport(analysis: AnalysisResult, tradesExecuted: number, profit: number): Promise<DailyReport>;
    private generateLearnings;
    generateDailySuggestion(balance: number): Promise<string>;
    getHistoricalPerformance(): Promise<{
        totalTrades: number;
        winRate: number;
        totalProfit: number;
        bestTrade: number;
    }>;
    recordOutcome(learning: LearningData): void;
}
export {};
//# sourceMappingURL=ai-brain.d.ts.map