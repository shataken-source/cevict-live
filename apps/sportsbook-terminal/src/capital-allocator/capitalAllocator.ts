/**
 * Capital Allocator Module - Institutional Grade Position Sizing
 * Prognostication Capital - Hedge Fund Risk Management System
 * 
 * Implements:
 * - Fractional Kelly Criterion
 * - Portfolio exposure caps
 * - Venue concentration limits
 * - Drawdown regime adjustments
 * - Liquidity-adjusted sizing
 * - Correlation penalties
 */

export type Venue = 'sportsbook' | 'kalshi' | 'polymarket';
export type PickType = 'single' | 'parlay' | 'teaser' | 'kalshi' | 'polymarket';

export interface SignalInput {
  id: string;
  eventId: string;
  league: string;
  venue: Venue;
  modelProbability: number;     // 0-1
  marketProbability: number;    // 0-1
  decimalOdds: number;
  confidence: number;           // 0-100
  liquidity?: number;
  correlationGroup?: string;
  type?: PickType;
  isPremium?: boolean;
}

export interface PortfolioState {
  bankroll: number;
  currentDrawdown: number;      // 0-1
  peakBankroll: number;
  exposureByEvent: Record<string, number>;
  exposureByLeague: Record<string, number>;
  exposureByVenue: Record<Venue, number>;
  totalExposure: number;
  openPositions: number;
}

export interface AllocationResult {
  signalId: string;
  eventId: string;
  stake: number;
  kellyFraction: number;
  adjustedKelly: number;
  edge: number;
  ev: number;
  capped: boolean;
  capReason?: string;
  riskPercent: number;
  liquidityAdjusted: boolean;
  correlationPenalty: boolean;
}

export interface AllocationReport {
  allocations: AllocationResult[];
  totalAllocated: number;
  remainingBankroll: number;
  portfolioExposure: number;
  riskMetrics: RiskMetrics;
}

export interface RiskMetrics {
  sharpeRatio: number;
  maxDrawdown: number;
  valueAtRisk: number;
  expectedShortfall: number;
  diversificationScore: number;
}

// Risk Constants
const MAX_EVENT_EXPOSURE = 0.05;        // 5% per event
const MAX_LEAGUE_EXPOSURE = 0.15;       // 15% per league
const MAX_VENUE_EXPOSURE = 0.40;        // 40% per venue
const MAX_TOTAL_EXPOSURE = 0.60;        // 60% total
const MAX_PARLAY_EXPOSURE = 0.01;       // 1% per parlay
const MAX_TEASER_EXPOSURE = 0.01;       // 1% per teaser

// Kelly Multipliers by Drawdown Regime
const KELLY_MULTIPLIERS = {
  normal: 0.33,           // < 5% drawdown
  cautious: 0.25,         // 5-10% drawdown
  defensive: 0.20,        // 10-15% drawdown
  survival: 0.10,         // > 15% drawdown
};

// Liquidity Thresholds
const LIQUIDITY_THRESHOLDS = {
  high: 100000,           // $100k+
  medium: 50000,          // $50-100k
  low: 25000,             // $25-50k
  micro: 0,               // <$25k
};

/**
 * Calculate Full Kelly Criterion
 * f* = (bp - q) / b
 */
export function fullKelly(probability: number, odds: number): number {
  const b = odds - 1;
  const q = 1 - probability;
  
  if (b <= 0 || probability <= 0 || probability >= 1) {
    return 0;
  }
  
  const kelly = (b * probability - q) / b;
  return Math.max(0, kelly);
}

/**
 * Get Kelly multiplier based on drawdown regime
 */
export function getKellyMultiplier(drawdown: number): number {
  if (drawdown > 0.15) return KELLY_MULTIPLIERS.survival;
  if (drawdown > 0.10) return KELLY_MULTIPLIERS.defensive;
  if (drawdown > 0.05) return KELLY_MULTIPLIERS.cautious;
  return KELLY_MULTIPLIERS.normal;
}

/**
 * Apply liquidity adjustment
 */
export function liquidityAdjustment(liquidity?: number): number {
  if (!liquidity || liquidity === 0) return 1;
  
  if (liquidity >= LIQUIDITY_THRESHOLDS.high) return 1;
  if (liquidity >= LIQUIDITY_THRESHOLDS.medium) return 0.8;
  if (liquidity >= LIQUIDITY_THRESHOLDS.low) return 0.5;
  return 0.25; // Micro liquidity
}

/**
 * Parlay/Teaser specific adjustments
 */
export function exoticBetAdjustment(type?: PickType): number {
  switch (type) {
    case 'parlay':
      return 0.25;          // 25% of normal Kelly
    case 'teaser':
      return 0.30;          // 30% of normal Kelly
    case 'kalshi':
    case 'polymarket':
      return 0.85;          // Slight reduction for venue risk
    default:
      return 1;
  }
}

/**
 * Calculate correlation penalty
 */
export function correlationPenalty(
  signal: SignalInput,
  portfolio: PortfolioState
): number {
  if (!signal.correlationGroup) return 1;
  
  // Check for existing exposure in same correlation group
  const existingExposure = portfolio.exposureByEvent[signal.correlationGroup] || 0;
  
  if (existingExposure > 0) {
    // Reduce size if correlated exposure exists
    return 0.7;
  }
  
  return 1;
}

/**
 * Main Capital Allocation Function
 */
export function allocateCapital(
  signals: SignalInput[],
  portfolio: PortfolioState
): AllocationReport {
  const results: AllocationResult[] = [];
  const kellyMultiplier = getKellyMultiplier(portfolio.currentDrawdown);
  
  // Sort by edge descending for priority
  const sortedSignals = [...signals].sort((a, b) => {
    const edgeA = a.modelProbability - a.marketProbability;
    const edgeB = b.modelProbability - b.marketProbability;
    return edgeB - edgeA;
  });
  
  for (const signal of sortedSignals) {
    // Skip negative edge
    const edge = signal.modelProbability - signal.marketProbability;
    if (edge <= 0) continue;
    
    // Calculate EV
    const ev = (signal.modelProbability * (signal.decimalOdds - 1)) - 
               (1 - signal.modelProbability);
    
    // Calculate raw Kelly
    const rawKelly = fullKelly(signal.modelProbability, signal.decimalOdds);
    if (rawKelly <= 0) continue;
    
    // Apply all adjustments
    let adjustedKelly = rawKelly * kellyMultiplier;
    adjustedKelly *= liquidityAdjustment(signal.liquidity);
    adjustedKelly *= exoticBetAdjustment(signal.type);
    adjustedKelly *= correlationPenalty(signal, portfolio);
    
    // Floor at 0
    adjustedKelly = Math.max(0, adjustedKelly);
    
    // Calculate initial stake
    let stake = adjustedKelly * portfolio.bankroll;
    let capped = false;
    let capReason = '';
    
    // Apply exposure caps
    const eventCap = MAX_EVENT_EXPOSURE * portfolio.bankroll;
    const leagueCap = MAX_LEAGUE_EXPOSURE * portfolio.bankroll;
    const venueCap = MAX_VENUE_EXPOSURE * portfolio.bankroll;
    const totalCap = MAX_TOTAL_EXPOSURE * portfolio.bankroll;
    
    const currentEventExp = portfolio.exposureByEvent[signal.eventId] || 0;
    const currentLeagueExp = portfolio.exposureByLeague[signal.league] || 0;
    const currentVenueExp = portfolio.exposureByVenue[signal.venue] || 0;
    const currentTotalExp = portfolio.totalExposure;
    
    // Event cap check
    if (currentEventExp + stake > eventCap) {
      stake = Math.max(0, eventCap - currentEventExp);
      capped = true;
      capReason = 'Event exposure cap';
    }
    
    // League cap check
    if (currentLeagueExp + stake > leagueCap) {
      stake = Math.max(0, Math.min(stake, leagueCap - currentLeagueExp));
      capped = true;
      capReason = capReason || 'League exposure cap';
    }
    
    // Venue cap check
    if (currentVenueExp + stake > venueCap) {
      stake = Math.max(0, Math.min(stake, venueCap - currentVenueExp));
      capped = true;
      capReason = capReason || 'Venue exposure cap';
    }
    
    // Total exposure cap
    if (currentTotalExp + stake > totalCap) {
      stake = Math.max(0, Math.min(stake, totalCap - currentTotalExp));
      capped = true;
      capReason = capReason || 'Total portfolio cap';
    }
    
    // Type-specific caps
    if (signal.type === 'parlay' && stake > MAX_PARLAY_EXPOSURE * portfolio.bankroll) {
      stake = MAX_PARLAY_EXPOSURE * portfolio.bankroll;
      capped = true;
      capReason = capReason || 'Parlay max exposure';
    }
    
    if (signal.type === 'teaser' && stake > MAX_TEASER_EXPOSURE * portfolio.bankroll) {
      stake = MAX_TEASER_EXPOSURE * portfolio.bankroll;
      capped = true;
      capReason = capReason || 'Teaser max exposure';
    }
    
    // Skip if stake is too small
    if (stake < 1) continue;
    
    // Create allocation result
    const allocation: AllocationResult = {
      signalId: signal.id,
      eventId: signal.eventId,
      stake,
      kellyFraction: rawKelly,
      adjustedKelly,
      edge,
      ev,
      capped,
      capReason,
      riskPercent: (stake / portfolio.bankroll) * 100,
      liquidityAdjusted: (signal.liquidity || 0) < LIQUIDITY_THRESHOLDS.high,
      correlationPenalty: correlationPenalty(signal, portfolio) < 1,
    };
    
    results.push(allocation);
    
    // Update portfolio state
    portfolio.exposureByEvent[signal.eventId] = currentEventExp + stake;
    portfolio.exposureByLeague[signal.league] = currentLeagueExp + stake;
    portfolio.exposureByVenue[signal.venue] = currentVenueExp + stake;
    portfolio.totalExposure += stake;
    portfolio.openPositions++;
  }
  
  // Calculate risk metrics
  const riskMetrics = calculateRiskMetrics(results, portfolio);
  
  // Sort by EV descending
  results.sort((a, b) => b.ev - a.ev);
  
  const totalAllocated = results.reduce((sum, r) => sum + r.stake, 0);
  
  return {
    allocations: results,
    totalAllocated,
    remainingBankroll: portfolio.bankroll - totalAllocated,
    portfolioExposure: (totalAllocated / portfolio.bankroll) * 100,
    riskMetrics,
  };
}

/**
 * Calculate portfolio risk metrics
 */
function calculateRiskMetrics(
  allocations: AllocationResult[],
  portfolio: PortfolioState
): RiskMetrics {
  if (allocations.length === 0) {
    return {
      sharpeRatio: 0,
      maxDrawdown: 0,
      valueAtRisk: 0,
      expectedShortfall: 0,
      diversificationScore: 0,
    };
  }
  
  // Calculate expected return and variance
  const expectedReturns = allocations.map(a => a.ev * a.stake);
  const totalExpectedReturn = expectedReturns.reduce((sum, r) => sum + r, 0);
  
  // Approximate variance (simplified)
  const variances = allocations.map(a => {
    const winProb = a.edge + 0.5; // Approximate
    const variance = a.stake * a.stake * winProb * (1 - winProb);
    return variance;
  });
  const totalVariance = variances.reduce((sum, v) => sum + v, 0);
  
  const stdDev = Math.sqrt(totalVariance);
  const sharpeRatio = stdDev > 0 ? totalExpectedReturn / stdDev : 0;
  
  // Diversification score
  const uniqueEvents = new Set(allocations.map(a => a.eventId)).size;
  const uniqueLeagues = new Set(allocations.map(a => {
    // Extract league from eventId or use correlation group
    return a.eventId.split('-')[0];
  })).size;
  
  const diversificationScore = Math.min(
    (uniqueEvents / allocations.length) * 0.5 + 
    (uniqueLeagues / allocations.length) * 0.5,
    1
  ) * 100;
  
  // VaR (simplified 95%)
  const valueAtRisk = portfolio.bankroll * 0.05 * Math.sqrt(allocations.length);
  
  return {
    sharpeRatio,
    maxDrawdown: portfolio.currentDrawdown * 100,
    valueAtRisk,
    expectedShortfall: valueAtRisk * 1.5,
    diversificationScore,
  };
}

/**
 * Monte Carlo Simulation for Bankroll Projection
 */
export interface MonteCarloResult {
  medianFinalBankroll: number;
  meanFinalBankroll: number;
  worst5Percent: number;
  best5Percent: number;
  probabilityOfRuin: number;
  probabilityOfProfit: number;
  maxDrawdown95: number;
  sharpeDistribution: number[];
}

export function monteCarloSimulation(
  allocations: AllocationResult[],
  startingBankroll: number,
  runs: number = 10000
): MonteCarloResult {
  const finalBankrolls: number[] = [];
  const maxDrawdowns: number[] = [];
  let ruinCount = 0;
  let profitCount = 0;
  
  for (let i = 0; i < runs; i++) {
    let bankroll = startingBankroll;
    let peak = startingBankroll;
    let maxDD = 0;
    
    // Shuffle allocation order for each run
    const shuffled = [...allocations].sort(() => Math.random() - 0.5);
    
    for (const alloc of shuffled) {
      // Simulate outcome based on model probability
      const winProb = alloc.edge + 0.5; // Approximate from edge
      const isWin = Math.random() < winProb;
      
      if (isWin) {
        bankroll += alloc.stake * (alloc.ev + 1);
      } else {
        bankroll -= alloc.stake;
      }
      
      // Track drawdown
      if (bankroll > peak) {
        peak = bankroll;
      }
      const dd = (peak - bankroll) / peak;
      if (dd > maxDD) maxDD = dd;
    }
    
    finalBankrolls.push(bankroll);
    maxDrawdowns.push(maxDD);
    
    if (bankroll < startingBankroll * 0.5) ruinCount++;
    if (bankroll > startingBankroll) profitCount++;
  }
  
  // Sort for percentiles
  finalBankrolls.sort((a, b) => a - b);
  maxDrawdowns.sort((a, b) => b - a); // Descending for drawdown
  
  const medianIdx = Math.floor(runs * 0.5);
  const worst5Idx = Math.floor(runs * 0.05);
  const best5Idx = Math.floor(runs * 0.95);
  
  return {
    medianFinalBankroll: finalBankrolls[medianIdx],
    meanFinalBankroll: finalBankrolls.reduce((a, b) => a + b, 0) / runs,
    worst5Percent: finalBankrolls[worst5Idx],
    best5Percent: finalBankrolls[best5Idx],
    probabilityOfRuin: ruinCount / runs,
    probabilityOfProfit: profitCount / runs,
    maxDrawdown95: maxDrawdowns[Math.floor(runs * 0.05)],
    sharpeDistribution: finalBankrolls.slice(worst5Idx, best5Idx),
  };
}

/**
 * Create initial portfolio state
 */
export function createPortfolio(bankroll: number): PortfolioState {
  return {
    bankroll,
    currentDrawdown: 0,
    peakBankroll: bankroll,
    exposureByEvent: {},
    exposureByLeague: {},
    exposureByVenue: {
      sportsbook: 0,
      kalshi: 0,
      polymarket: 0,
    },
    totalExposure: 0,
    openPositions: 0,
  };
}

/**
 * Update portfolio with new bankroll (track drawdown)
 */
export function updatePortfolioBankroll(
  portfolio: PortfolioState,
  newBankroll: number
): PortfolioState {
  const updated = { ...portfolio };
  updated.bankroll = newBankroll;
  
  if (newBankroll > updated.peakBankroll) {
    updated.peakBankroll = newBankroll;
    updated.currentDrawdown = 0;
  } else {
    updated.currentDrawdown = (updated.peakBankroll - newBankroll) / updated.peakBankroll;
  }
  
  return updated;
}

/**
 * Export allocation to CSV format
 */
export function exportAllocationsCSV(allocations: AllocationResult[]): string {
  const headers = [
    'Signal ID',
    'Stake',
    'Risk %',
    'Edge %',
    'EV',
    'Kelly %',
    'Capped',
    'Cap Reason',
  ].join(',');
  
  const rows = allocations.map(a => [
    a.signalId,
    a.stake.toFixed(2),
    a.riskPercent.toFixed(2),
    (a.edge * 100).toFixed(2),
    a.ev.toFixed(3),
    (a.kellyFraction * 100).toFixed(2),
    a.capped ? 'Yes' : 'No',
    a.capReason || '',
  ].join(','));
  
  return [headers, ...rows].join('\n');
}
