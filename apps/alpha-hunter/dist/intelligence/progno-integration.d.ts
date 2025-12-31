/**
 * PROGNO Integration
 * Connects to PROGNO prediction engine for sports betting intelligence
 */
import { Opportunity } from '../types';
interface PrognoPick {
    gameId: string;
    league: string;
    homeTeam: string;
    awayTeam: string;
    pick: string;
    pickType: 'spread' | 'moneyline' | 'total';
    odds: number;
    confidence: number;
    expectedValue: number;
    reasoning: string[];
    sharpMoney?: {
        side: string;
        confidence: number;
    };
    publicBetting?: {
        homePercent: number;
        awayPercent: number;
    };
}
export declare class PrognoIntegration {
    private baseUrl;
    private apiKey?;
    constructor();
    getTodaysPicks(): Promise<PrognoPick[]>;
    getLiveOdds(league: string): Promise<any[]>;
    getArbitrageOpportunities(): Promise<Opportunity[]>;
    private findArbitrage;
    private checkMoneylineArbitrage;
    convertToOpportunities(picks: PrognoPick[]): Promise<Opportunity[]>;
    private calculateStake;
    private calculateReturn;
    private buildDataPoints;
    private getSamplePicks;
}
export {};
//# sourceMappingURL=progno-integration.d.ts.map