/**
 * MASSAGER EXPERT BOT
 * ═══════════════════════════════════════════════════════════════
 * An AI that masters the PROGNO Massager tools and discovers
 * new correlations and predictions we haven't thought of yet.
 *
 * Features:
 * - Self-trains daily on random data patterns
 * - Creates abstract data combinations
 * - Discovers hidden correlations
 * - Generates novel prediction hypotheses
 * - Learns from Bot Academy database
 */
interface Discovery {
    id: string;
    timestamp: Date;
    type: 'correlation' | 'pattern' | 'anomaly' | 'prediction';
    title: string;
    description: string;
    confidence: number;
    dataPoints: string[];
    hypothesis: string;
    testable: boolean;
    potentialValue: 'low' | 'medium' | 'high';
}
interface TrainingSession {
    date: Date;
    dataSourcesUsed: string[];
    discoveries: Discovery[];
    hypothesesGenerated: number;
    correlationsFound: number;
    lessonsLearned: string[];
}
declare class MassagerExpertBot {
    private claude;
    private massager;
    private discoveries;
    private trainingSessions;
    private knowledgeBase;
    private learnedPatterns;
    private failedHypotheses;
    private successfulPredictions;
    constructor();
    initialize(): Promise<void>;
    /**
     * Generate random abstract data for training
     */
    generateAbstractData(): any[];
    /**
     * Combine real data with abstract patterns
     */
    createHybridDataset(): Promise<any>;
    /**
     * Generate cross-correlations between different data types
     */
    private generateCrossCorrelations;
    /**
     * Simple correlation calculation
     */
    private calculateCorrelation;
    /**
     * Use AI to discover patterns in data
     */
    discoverPatterns(dataset: any): Promise<Discovery[]>;
    /**
     * Fallback heuristic pattern discovery
     */
    private heuristicDiscovery;
    /**
     * Generate novel prediction hypotheses
     */
    generateHypotheses(discoveries: Discovery[]): Promise<string[]>;
    /**
     * Run a full training session
     */
    /**
     * Run training session with 3-minute timeout and visible timer
     */
    runTrainingSessionWithTimeout(): Promise<TrainingSession | null>;
    runTrainingSession(): Promise<TrainingSession>;
    /**
     * Display training session results
     */
    private displaySessionResults;
    /**
     * Get all high-value discoveries
     */
    getHighValueDiscoveries(): Discovery[];
    /**
     * Get trading signals based on discoveries
     */
    getTradingSignals(): {
        action: string;
        reason: string;
        confidence: number;
    }[];
    /**
     * Start continuous learning loop
     */
    startLearning(intervalMinutes?: number): Promise<void>;
}
export { MassagerExpertBot };
//# sourceMappingURL=massager-expert.d.ts.map