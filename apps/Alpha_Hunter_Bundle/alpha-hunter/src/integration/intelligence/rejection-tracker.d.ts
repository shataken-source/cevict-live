/**
 * REJECTION TRACKER
 * Tracks predictions we rejected and checks if they would have won
 */
export declare class RejectionTracker {
    private supabase;
    constructor();
    /**
     * Record a rejected prediction for later analysis
     */
    recordRejection(prediction: {
        market_id: string;
        market_title: string;
        category: string;
        predicted_side: 'yes' | 'no';
        confidence: number;
        edge: number;
        market_price: number;
        rejection_reason: 'low_confidence' | 'low_edge' | 'duplicate' | 'daily_limit' | 'position_limit' | 'other';
        thresholds: {
            confidence_required: number;
            edge_required: number;
        };
        reasoning?: string[];
        factors?: string[];
    }): Promise<void>;
    /**
     * Check resolved markets and update rejection outcomes
     */
    updateRejectionOutcomes(): Promise<{
        updated: number;
        wouldHaveWon: number;
        missedProfit: number;
    }>;
    /**
     * Check if a market has resolved (placeholder - needs real implementation)
     */
    private checkMarketResolution;
    /**
     * Get rejection statistics by category
     */
    getRejectionStats(category?: string): Promise<{
        category: string;
        totalRejections: number;
        resolvedRejections: number;
        wouldHaveWon: number;
        winRate: number;
        missedProfit: number;
        avgRejectedConfidence: number;
        avgRejectedEdge: number;
        topRejectionReasons: {
            reason: string;
            count: number;
        }[];
    }[]>;
}
export declare const rejectionTracker: RejectionTracker;
//# sourceMappingURL=rejection-tracker.d.ts.map