/**
 * Cross-Platform Arbitrage Detector
 * Finds arbitrage opportunities between Kalshi and Polymarket
 * Accounts for fees, regulatory differences, and market maker spreads
 */

import { KalshiClient, KalshiMarket } from './kalshi-client';
import { PolymarketClient, PolymarketMarket } from './polymarket-client';

export interface ArbitrageOpportunity {
  marketId: string;
  question: string;
  kalshiMarket: {
    ticker: string;
    yesPrice: number; // 0-1 probability
    noPrice: number;
    spread: number;
    liquidity: 'high' | 'medium' | 'low';
  };
  polymarketMarket: {
    conditionId: string;
    yesPrice: number; // 0-1 probability
    noPrice: number;
    spread: number;
    liquidity: 'high' | 'medium' | 'low';
  };
  arbitrageType: 'yes_arbitrage' | 'no_arbitrage' | 'both_arbitrage';
  profit: number; // Expected profit percentage (0-1)
  risk: 'low' | 'medium' | 'high';
  fees: {
    kalshi: number; // Fee percentage
    polymarket: number; // Fee percentage
    total: number;
  };
  minStake: number; // Minimum stake to execute (USD)
  maxStake: number; // Maximum stake before moving market
  executionComplexity: 'simple' | 'moderate' | 'complex';
  regulatoryNote?: string;
}

export class ArbitrageDetector {
  private kalshiClient: KalshiClient;
  private polymarketClient: PolymarketClient;

  // Fee structures
  private readonly KALSHI_FEE = 0.10; // 10 cents per contract (varies by volume)
  private readonly POLYMARKET_FEE = 0.02; // 2% trading fee

  constructor() {
    this.kalshiClient = new KalshiClient();
    this.polymarketClient = new PolymarketClient();
  }

  /**
   * Find arbitrage opportunities between Kalshi and Polymarket
   */
  async findArbitrageOpportunities(
    limit: number = 50
  ): Promise<ArbitrageOpportunity[]> {
    // Fetch markets from both platforms
    const [kalshiMarkets, polymarketMarkets] = await Promise.all([
      this.kalshiClient.getSportsMarkets(limit, 'open'),
      this.polymarketClient.getSportsMarkets(limit, true),
    ]);

    const opportunities: ArbitrageOpportunity[] = [];

    // Match markets by question similarity
    for (const kalshiMarket of kalshiMarkets) {
      const matchingPoly = this.findMatchingMarket(
        kalshiMarket,
        polymarketMarkets
      );

      if (!matchingPoly) continue;

      const opportunity = this.analyzeArbitrage(kalshiMarket, matchingPoly);
      if (opportunity && opportunity.profit > 0.01) { // Min 1% profit
        opportunities.push(opportunity);
      }
    }

    // Sort by profit (highest first)
    return opportunities.sort((a, b) => b.profit - a.profit);
  }

  /**
   * Find matching market on Polymarket
   */
  private findMatchingMarket(
    kalshiMarket: KalshiMarket,
    polymarketMarkets: PolymarketMarket[]
  ): PolymarketMarket | null {
    // Simple matching by question similarity
    const kalshiQuestion = kalshiMarket.title.toLowerCase();
    
    for (const polyMarket of polymarketMarkets) {
      const polyQuestion = polyMarket.question.toLowerCase();
      
      // Check for high similarity
      if (this.calculateSimilarity(kalshiQuestion, polyQuestion) > 0.7) {
        return polyMarket;
      }
    }

    return null;
  }

  /**
   * Calculate string similarity (simple Jaccard)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Analyze arbitrage opportunity between two markets
   */
  private analyzeArbitrage(
    kalshiMarket: KalshiMarket,
    polymarketMarket: PolymarketMarket
  ): ArbitrageOpportunity | null {
    // Get implied probabilities
    const kalshiProb = this.kalshiClient.calculateImpliedProbability(kalshiMarket);
    const polyProb = this.polymarketClient.calculateImpliedProbability(polymarketMarket);

    // Check for arbitrage
    // Arbitrage exists if: YES on one platform + NO on other < 1 (after fees)
    
    // Strategy 1: Buy YES on Kalshi, Buy NO on Polymarket
    const strategy1Cost = kalshiProb.yesProb + polyProb.noProb;
    const strategy1Profit = 1 - strategy1Cost - this.calculateTotalFees(strategy1Cost);
    
    // Strategy 2: Buy NO on Kalshi, Buy YES on Polymarket
    const strategy2Cost = kalshiProb.noProb + polyProb.yesProb;
    const strategy2Profit = 1 - strategy2Cost - this.calculateTotalFees(strategy2Cost);

    // Determine best strategy
    let arbitrageType: 'yes_arbitrage' | 'no_arbitrage' | 'both_arbitrage';
    let profit = 0;

    if (strategy1Profit > 0 && strategy1Profit > strategy2Profit) {
      arbitrageType = 'yes_arbitrage';
      profit = strategy1Profit;
    } else if (strategy2Profit > 0 && strategy2Profit > strategy1Profit) {
      arbitrageType = 'no_arbitrage';
      profit = strategy2Profit;
    } else if (strategy1Profit > 0 && strategy2Profit > 0) {
      arbitrageType = 'both_arbitrage';
      profit = Math.max(strategy1Profit, strategy2Profit);
    } else {
      return null; // No arbitrage
    }

    // Assess risk
    const risk = this.assessArbitrageRisk(kalshiProb, polyProb);

    // Calculate optimal stake sizes
    const { minStake, maxStake } = this.calculateStakeSizes(
      kalshiMarket,
      polymarketMarket,
      kalshiProb,
      polyProb
    );

    // Determine execution complexity
    const executionComplexity = this.determineExecutionComplexity(
      kalshiProb.liquidity,
      polyProb.liquidity
    );

    // Regulatory note for U.S. users
    const regulatoryNote = this.getRegulatoryNote();

    return {
      marketId: `${kalshiMarket.ticker}-${polymarketMarket.conditionId}`,
      question: kalshiMarket.title,
      kalshiMarket: {
        ticker: kalshiMarket.ticker,
        yesPrice: kalshiProb.yesProb,
        noPrice: kalshiProb.noProb,
        spread: kalshiProb.spread,
        liquidity: kalshiProb.liquidity,
      },
      polymarketMarket: {
        conditionId: polymarketMarket.conditionId,
        yesPrice: polyProb.yesProb,
        noPrice: polyProb.noProb,
        spread: polyProb.spread,
        liquidity: polyProb.liquidity,
      },
      arbitrageType,
      profit,
      risk,
      fees: {
        kalshi: this.KALSHI_FEE,
        polymarket: this.POLYMARKET_FEE,
        total: this.calculateTotalFees(1),
      },
      minStake,
      maxStake,
      executionComplexity,
      regulatoryNote,
    };
  }

  /**
   * Calculate total fees for a trade
   */
  private calculateTotalFees(stake: number): number {
    // Kalshi: fixed fee per contract
    // Polymarket: percentage fee
    // Simplified: assume $1 contracts
    const kalshiFee = this.KALSHI_FEE * stake; // Per contract
    const polyFee = stake * this.POLYMARKET_FEE; // Percentage
    
    return kalshiFee + polyFee;
  }

  /**
   * Assess risk of arbitrage opportunity
   */
  private assessArbitrageRisk(
    kalshiProb: any,
    polyProb: any
  ): 'low' | 'medium' | 'high' {
    // Low risk: High liquidity on both, tight spreads
    if (
      kalshiProb.liquidity === 'high' &&
      polyProb.liquidity === 'high' &&
      kalshiProb.spread < 2 &&
      polyProb.spread < 0.02
    ) {
      return 'low';
    }
    
    // Medium risk: One platform has good liquidity
    if (
      (kalshiProb.liquidity === 'high' || polyProb.liquidity === 'high') &&
      (kalshiProb.spread < 5 || polyProb.spread < 0.05)
    ) {
      return 'medium';
    }
    
    return 'high';
  }

  /**
   * Calculate optimal stake sizes
   */
  private calculateStakeSizes(
    kalshiMarket: KalshiMarket,
    polymarketMarket: PolymarketMarket,
    kalshiProb: any,
    polyProb: any
  ): { minStake: number; maxStake: number } {
    // Minimum: Cover fees + small profit
    const minStake = 100; // $100 minimum
    
    // Maximum: Limited by liquidity and market depth
    const kalshiMax = kalshiMarket.volume * 0.1; // 10% of volume
    const polyMax = polymarketMarket.volume * 0.1; // 10% of volume
    const maxStake = Math.min(kalshiMax, polyMax, 10000); // Cap at $10k
    
    return { minStake, maxStake };
  }

  /**
   * Determine execution complexity
   */
  private determineExecutionComplexity(
    kalshiLiquidity: string,
    polyLiquidity: string
  ): 'simple' | 'moderate' | 'complex' {
    if (kalshiLiquidity === 'high' && polyLiquidity === 'high') {
      return 'simple';
    } else if (kalshiLiquidity === 'medium' || polyLiquidity === 'medium') {
      return 'moderate';
    } else {
      return 'complex';
    }
  }

  /**
   * Get regulatory note for U.S. users
   */
  private getRegulatoryNote(): string {
    return 'Note: Polymarket access is limited for U.S. users. Kalshi is fully regulated and available to U.S. residents. Arbitrage may require access to both platforms.';
  }
}
