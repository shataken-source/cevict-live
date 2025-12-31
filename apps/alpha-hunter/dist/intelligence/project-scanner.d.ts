/**
 * Project Scanner
 * Scans your existing projects and finds ways to monetize/improve them
 * Based on breaking news and trends
 */
import { Opportunity } from '../types';
export declare class ProjectScanner {
    private projects;
    scanForOpportunities(news: any[]): Promise<Opportunity[]>;
    private analyzeProjectOpportunities;
    private createProjectOpportunity;
    private analyzeMonetizationPotential;
    private estimateValue;
    getDailyProjectSuggestion(): Promise<string>;
    getProjectStats(): {
        name: string;
        type: string;
        monetization: string[];
        dailyPotential: number;
    }[];
}
//# sourceMappingURL=project-scanner.d.ts.map