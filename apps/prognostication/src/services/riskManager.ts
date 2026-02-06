/**
 * Risk Manager Service
 * Stub implementation - to be expanded
 */

export const riskManager = {
  getDailyStats(): any {
    return {
      trades: 0,
      pnl: 0,
      winRate: 0,
    };
  },
  
  checkRiskLimits(): { allowed: boolean; reason?: string } {
    return { allowed: true };
  },
};
