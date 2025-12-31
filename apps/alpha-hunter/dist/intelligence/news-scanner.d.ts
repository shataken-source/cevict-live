/**
 * News Scanner
 * Scans breaking news and events for profit opportunities
 */
import { NewsItem, DataPoint } from '../types';
export declare class NewsScanner {
    private apiKey?;
    constructor();
    scanAllSources(): Promise<NewsItem[]>;
    private scanRSSFeed;
    private scanTwitter;
    private scanReddit;
    private filterProfitOpportunities;
    analyzeNewsForOpportunities(news: NewsItem[]): Promise<DataPoint[]>;
    private analyzeSentiment;
    private calculateRelevance;
    private getSampleNews;
}
//# sourceMappingURL=news-scanner.d.ts.map