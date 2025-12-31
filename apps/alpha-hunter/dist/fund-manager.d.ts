/**
 * UNIFIED FUND MANAGER
 * Links Kalshi + Coinbase accounts into a single pool
 * Allocates capital intelligently across platforms
 */
import 'dotenv/config';
interface AllocationConfig {
    kalshiPercent: number;
    cryptoPercent: number;
    reservePercent: number;
}
export declare class UnifiedFundManager {
    private kalshiBalance;
    private cryptoBalance;
    private allocation;
    private manualAdjustments;
    private kalshiCumulativePnL;
    private cryptoCumulativePnL;
    private kalshiTotalTrades;
    private cryptoTotalTrades;
    private kalshiWins;
    private kalshiLosses;
    private cryptoWins;
    private cryptoLosses;
    constructor(config?: Partial<AllocationConfig>);
    /**
     * Update Kalshi balance (call after fetching from API)
     */
    updateKalshiBalance(available: number, inPositions?: number, pending?: number): void;
    /**
     * Update Crypto balance (call after fetching from Coinbase)
     */
    updateCryptoBalance(available: number, inPositions?: number, pending?: number): void;
    /**
     * Get TOTAL funds across all platforms
     */
    getTotalFunds(): number;
    /**
     * Get available funds across all platforms
     */
    getTotalAvailable(): number;
    /**
     * Calculate how much a platform SHOULD have based on allocation
     */
    getTargetAllocation(platform: 'kalshi' | 'crypto'): number;
    /**
     * Check if platform is over/under allocated
     * Returns: positive = over-allocated, negative = under-allocated
     */
    getAllocationDelta(platform: 'kalshi' | 'crypto'): number;
    /**
     * Get maximum amount available for a trade on a platform
     * Respects allocation limits and reserves
     */
    getMaxTradeAmount(platform: 'kalshi' | 'crypto', maxPerTrade?: number): number;
    /**
     * Should we trade on this platform right now?
     * Based on allocation balance and opportunity
     */
    shouldTradeOnPlatform(platform: 'kalshi' | 'crypto', opportunityScore: number): boolean;
    /**
     * Get rebalancing suggestion
     */
    getRebalanceSuggestion(): {
        action: string;
        amount: number;
        from: string;
        to: string;
    } | null;
    /**
     * Get complete status for display
     */
    getStatus(): string;
    /**
     * Set custom allocation percentages
     */
    setAllocation(kalshi: number, crypto: number, reserve: number): void;
    /**
     * Get allocation config
     */
    getAllocation(): AllocationConfig;
}
export declare const fundManager: UnifiedFundManager;
export {};
//# sourceMappingURL=fund-manager.d.ts.map