"use strict";
/**
 * UNIFIED FUND MANAGER
 * Links Kalshi + Coinbase accounts into a single pool
 * Allocates capital intelligently across platforms
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fundManager = exports.UnifiedFundManager = void 0;
require("dotenv/config");
class UnifiedFundManager {
    constructor(config) {
        this.kalshiBalance = { available: 0, inPositions: 0, pending: 0, total: 0, lastUpdated: new Date() };
        this.cryptoBalance = { available: 0, inPositions: 0, pending: 0, total: 0, lastUpdated: new Date() };
        this.allocation = {
            kalshiPercent: 40,
            cryptoPercent: 50,
            reservePercent: 10
        };
        // Track manual adjustments (when user moves money between platforms)
        this.manualAdjustments = 0;
        // Cumulative P&L tracking
        this.kalshiCumulativePnL = 0;
        this.cryptoCumulativePnL = 0;
        this.kalshiTotalTrades = 0;
        this.cryptoTotalTrades = 0;
        this.kalshiWins = 0;
        this.kalshiLosses = 0;
        this.cryptoWins = 0;
        this.cryptoLosses = 0;
        if (config) {
            this.allocation = { ...this.allocation, ...config };
        }
    }
    /**
     * Update Kalshi balance (call after fetching from API)
     */
    updateKalshiBalance(available, inPositions = 0, pending = 0) {
        this.kalshiBalance = {
            available,
            inPositions,
            pending,
            total: available + inPositions + pending,
            lastUpdated: new Date()
        };
    }
    /**
     * Update Crypto balance (call after fetching from Coinbase)
     */
    updateCryptoBalance(available, inPositions = 0, pending = 0) {
        this.cryptoBalance = {
            available,
            inPositions,
            pending,
            total: available + inPositions + pending,
            lastUpdated: new Date()
        };
    }
    /**
     * Update Kalshi cumulative P&L and stats
     */
    updateKalshiStats(pnl, isWin) {
        this.kalshiCumulativePnL += pnl;
        this.kalshiTotalTrades++;
        if (isWin) {
            this.kalshiWins++;
        }
        else {
            this.kalshiLosses++;
        }
    }
    /**
     * Update Crypto cumulative P&L and stats
     */
    updateCryptoStats(pnl, isWin) {
        this.cryptoCumulativePnL += pnl;
        this.cryptoTotalTrades++;
        if (isWin) {
            this.cryptoWins++;
        }
        else {
            this.cryptoLosses++;
        }
    }
    /**
     * Get Kalshi cumulative stats
     */
    getKalshiStats() {
        const winRate = this.kalshiTotalTrades > 0
            ? (this.kalshiWins / this.kalshiTotalTrades * 100)
            : 0;
        return {
            pnl: this.kalshiCumulativePnL,
            trades: this.kalshiTotalTrades,
            wins: this.kalshiWins,
            losses: this.kalshiLosses,
            winRate
        };
    }
    /**
     * Get Crypto cumulative stats
     */
    getCryptoStats() {
        const winRate = this.cryptoTotalTrades > 0
            ? (this.cryptoWins / this.cryptoTotalTrades * 100)
            : 0;
        return {
            pnl: this.cryptoCumulativePnL,
            trades: this.cryptoTotalTrades,
            wins: this.cryptoWins,
            losses: this.cryptoLosses,
            winRate
        };
    }
    /**
     * Update Kalshi cumulative P&L and stats
     */
    updateKalshiStats(pnl, isWin) {
        this.kalshiCumulativePnL += pnl;
        this.kalshiTotalTrades++;
        if (isWin) {
            this.kalshiWins++;
        }
        else {
            this.kalshiLosses++;
        }
    }
    /**
     * Update Crypto cumulative P&L and stats
     */
    updateCryptoStats(pnl, isWin) {
        this.cryptoCumulativePnL += pnl;
        this.cryptoTotalTrades++;
        if (isWin) {
            this.cryptoWins++;
        }
        else {
            this.cryptoLosses++;
        }
    }
    /**
     * Get Kalshi cumulative stats
     */
    getKalshiStats() {
        const winRate = this.kalshiTotalTrades > 0
            ? (this.kalshiWins / this.kalshiTotalTrades * 100)
            : 0;
        return {
            pnl: this.kalshiCumulativePnL,
            trades: this.kalshiTotalTrades,
            wins: this.kalshiWins,
            losses: this.kalshiLosses,
            winRate
        };
    }
    /**
     * Get Crypto cumulative stats
     */
    getCryptoStats() {
        const winRate = this.cryptoTotalTrades > 0
            ? (this.cryptoWins / this.cryptoTotalTrades * 100)
            : 0;
        return {
            pnl: this.cryptoCumulativePnL,
            trades: this.cryptoTotalTrades,
            wins: this.cryptoWins,
            losses: this.cryptoLosses,
            winRate
        };
    }
    /**
     * Update Kalshi cumulative P&L and stats
     */
    updateKalshiStats(pnl, isWin) {
        this.kalshiCumulativePnL += pnl;
        this.kalshiTotalTrades++;
        if (isWin) {
            this.kalshiWins++;
        }
        else {
            this.kalshiLosses++;
        }
    }
    /**
     * Update Crypto cumulative P&L and stats
     */
    updateCryptoStats(pnl, isWin) {
        this.cryptoCumulativePnL += pnl;
        this.cryptoTotalTrades++;
        if (isWin) {
            this.cryptoWins++;
        }
        else {
            this.cryptoLosses++;
        }
    }
    /**
     * Get Kalshi cumulative stats
     */
    getKalshiStats() {
        const winRate = this.kalshiTotalTrades > 0
            ? (this.kalshiWins / this.kalshiTotalTrades * 100)
            : 0;
        return {
            pnl: this.kalshiCumulativePnL,
            trades: this.kalshiTotalTrades,
            wins: this.kalshiWins,
            losses: this.kalshiLosses,
            winRate
        };
    }
    /**
     * Get Crypto cumulative stats
     */
    getCryptoStats() {
        const winRate = this.cryptoTotalTrades > 0
            ? (this.cryptoWins / this.cryptoTotalTrades * 100)
            : 0;
        return {
            pnl: this.cryptoCumulativePnL,
            trades: this.cryptoTotalTrades,
            wins: this.cryptoWins,
            losses: this.cryptoLosses,
            winRate
        };
    }
    /**
     * Get TOTAL funds across all platforms
     */
    getTotalFunds() {
        return this.kalshiBalance.total + this.cryptoBalance.total;
    }
    /**
     * Get available funds across all platforms
     */
    getTotalAvailable() {
        return this.kalshiBalance.available + this.cryptoBalance.available;
    }
    /**
     * Calculate how much a platform SHOULD have based on allocation
     */
    getTargetAllocation(platform) {
        const total = this.getTotalFunds();
        const reserveAmount = total * (this.allocation.reservePercent / 100);
        const investable = total - reserveAmount;
        if (platform === 'kalshi') {
            return investable * (this.allocation.kalshiPercent / (this.allocation.kalshiPercent + this.allocation.cryptoPercent));
        }
        else {
            return investable * (this.allocation.cryptoPercent / (this.allocation.kalshiPercent + this.allocation.cryptoPercent));
        }
    }
    /**
     * Check if platform is over/under allocated
     * Returns: positive = over-allocated, negative = under-allocated
     */
    getAllocationDelta(platform) {
        const target = this.getTargetAllocation(platform);
        const current = platform === 'kalshi' ? this.kalshiBalance.total : this.cryptoBalance.total;
        return current - target;
    }
    /**
     * Get maximum amount available for a trade on a platform
     * Respects allocation limits and reserves
     */
    getMaxTradeAmount(platform, maxPerTrade = 25) {
        const balance = platform === 'kalshi' ? this.kalshiBalance : this.cryptoBalance;
        const delta = this.getAllocationDelta(platform);
        // If over-allocated, can only use what won't exceed allocation more
        // If under-allocated, can use available funds
        let maxFromAllocation = delta < 0 ? balance.available : Math.max(0, balance.available - delta);
        // Apply per-trade limit
        return Math.min(maxFromAllocation, maxPerTrade, balance.available);
    }
    /**
     * Should we trade on this platform right now?
     * Based on allocation balance and opportunity
     */
    shouldTradeOnPlatform(platform, opportunityScore) {
        const balance = platform === 'kalshi' ? this.kalshiBalance : this.cryptoBalance;
        const delta = this.getAllocationDelta(platform);
        // Always allow if under-allocated and good opportunity
        if (delta < 0 && opportunityScore >= 60)
            return true;
        // Allow if at target and excellent opportunity
        if (Math.abs(delta) < 20 && opportunityScore >= 70)
            return true;
        // Allow if over-allocated only for exceptional opportunities
        if (delta > 0 && opportunityScore >= 85)
            return true;
        // Block if no funds
        if (balance.available < 5)
            return false;
        return opportunityScore >= 75;
    }
    /**
     * Get rebalancing suggestion
     */
    getRebalanceSuggestion() {
        const kalshiDelta = this.getAllocationDelta('kalshi');
        const cryptoDelta = this.getAllocationDelta('crypto');
        // Only suggest if imbalance is significant (>$50)
        if (Math.abs(kalshiDelta) < 50 && Math.abs(cryptoDelta) < 50) {
            return null;
        }
        if (kalshiDelta > 50) {
            return {
                action: 'Consider moving funds',
                amount: Math.round(kalshiDelta),
                from: 'Kalshi',
                to: 'Coinbase (Crypto)'
            };
        }
        if (cryptoDelta > 50) {
            return {
                action: 'Consider moving funds',
                amount: Math.round(cryptoDelta),
                from: 'Coinbase (Crypto)',
                to: 'Kalshi'
            };
        }
        return null;
    }
    /**
     * Get complete status for display
     */
    getStatus() {
        const total = this.getTotalFunds();
        const available = this.getTotalAvailable();
        const kalshiTarget = this.getTargetAllocation('kalshi');
        const cryptoTarget = this.getTargetAllocation('crypto');
        const reserve = total * (this.allocation.reservePercent / 100);
        const kalshiStats = this.getKalshiStats();
        const cryptoStats = this.getCryptoStats();
        const totalPnL = kalshiStats.pnl + cryptoStats.pnl;
        const lines = [
            '╔══════════════════════════════════════════════════════════════╗',
            '║            💰 UNIFIED FUND MANAGER 💰                        ║',
            '╠══════════════════════════════════════════════════════════════╣',
            `║  TOTAL FUNDS:     $${total.toFixed(2).padStart(10)}                          ║`,
            `║  AVAILABLE:       ${available.toFixed(2).padStart(10)}                          ║`,
            `║  CUMULATIVE P&L: ${(totalPnL >= 0 ? '+' : '')}${totalPnL.toFixed(2).padStart(9)}                          ║`,
            '╠══════════════════════════════════════════════════════════════╣',
            '║  PLATFORM BREAKDOWN:                                         ║',
            `║  🎯 Kalshi:     $${this.kalshiBalance.total.toFixed(2).padStart(8)} (target: $${kalshiTarget.toFixed(0).padStart(6)})       ║`,
            `║     Available: $${this.kalshiBalance.available.toFixed(2).padStart(8)}                              ║`,
            `║     P&L:       ${(kalshiStats.pnl >= 0 ? '+' : '')}$${kalshiStats.pnl.toFixed(2).padStart(8)} (${kalshiStats.trades} trades, ${kalshiStats.winRate.toFixed(1)}% win) ║`,
            `║  🪙 Crypto:     $${this.cryptoBalance.total.toFixed(2).padStart(8)} (target: $${cryptoTarget.toFixed(0).padStart(6)})       ║`,
            `║     Available: $${this.cryptoBalance.available.toFixed(2).padStart(8)}                              ║`,
            `║     P&L:       ${(cryptoStats.pnl >= 0 ? '+' : '')}$${cryptoStats.pnl.toFixed(2).padStart(8)} (${cryptoStats.trades} trades, ${cryptoStats.winRate.toFixed(1)}% win) ║`,
            `║  🛡️  Reserve:    $${reserve.toFixed(2).padStart(8)} (${this.allocation.reservePercent}%)                         ║`,
            '╚══════════════════════════════════════════════════════════════╝',
        ];
        const rebalance = this.getRebalanceSuggestion();
        if (rebalance) {
            lines.push(`⚠️  REBALANCE: Move $${rebalance.amount} from ${rebalance.from} to ${rebalance.to}`);
        }
        return lines.join('\n');
    }
    /**
     * Set custom allocation percentages
     */
    setAllocation(kalshi, crypto, reserve) {
        if (kalshi + crypto + reserve !== 100) {
            console.warn('⚠️ Allocation percentages should sum to 100');
        }
        this.allocation = {
            kalshiPercent: kalshi,
            cryptoPercent: crypto,
            reservePercent: reserve
        };
    }
    /**
     * Get allocation config
     */
    getAllocation() {
        return { ...this.allocation };
    }
}
exports.UnifiedFundManager = UnifiedFundManager;
// Singleton instance for use across the app
exports.fundManager = new UnifiedFundManager();
//# sourceMappingURL=fund-manager.js.map