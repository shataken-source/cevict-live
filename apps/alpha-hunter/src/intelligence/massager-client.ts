/**
 * PROGNO Massager Client
 * Integrates with the PROGNO Massager for advanced calculations
 */

import { DataPoint } from '../types';

interface MassagerResult {
  command: string;
  success: boolean;
  data: any;
  insights: string[];
}

interface ArbitrageResult {
  exists: boolean;
  profit: number;
  book1: string;
  book2: string;
  stake1: number;
  stake2: number;
  reasoning: string[];
}

interface HedgeResult {
  hedgeAmount: number;
  breakEvenReturn: number;
  guaranteedProfit: number;
  riskFreeReturn: number;
}

interface KellyResult {
  optimalFraction: number;
  recommendedStake: number;
  maxStake: number;
  edgePercent: number;
}

export class MassagerClient {
  private baseUrl: string;

  constructor() {
    // Massager runs on localhost:8501 (Streamlit)
    this.baseUrl = process.env.MASSAGER_URL || 'http://localhost:8501';
  }

  /**
   * Calculate arbitrage opportunity
   */
  async calculateArbitrage(
    odds1: number,
    odds2: number,
    totalStake: number = 100
  ): Promise<ArbitrageResult> {
    // Convert American odds to decimal
    const decimal1 = this.americanToDecimal(odds1);
    const decimal2 = this.americanToDecimal(odds2);

    // Calculate implied probability
    const implied1 = 1 / decimal1;
    const implied2 = 1 / decimal2;
    const totalImplied = implied1 + implied2;

    // Check for arbitrage (total implied < 1)
    const exists = totalImplied < 1;
    const profit = exists ? ((1 / totalImplied) - 1) * 100 : 0;

    // Calculate optimal stakes
    const stake1 = totalStake * (implied1 / totalImplied);
    const stake2 = totalStake - stake1;

    return {
      exists,
      profit,
      book1: 'Book A',
      book2: 'Book B',
      stake1,
      stake2,
      reasoning: exists
        ? [
            `Total implied probability: ${(totalImplied * 100).toFixed(2)}%`,
            `Guaranteed profit: ${profit.toFixed(2)}%`,
            `Stake $${stake1.toFixed(2)} on outcome 1`,
            `Stake $${stake2.toFixed(2)} on outcome 2`,
          ]
        : ['No arbitrage opportunity exists'],
    };
  }

  /**
   * Calculate hedge bet for guaranteed profit
   */
  async calculateHedge(
    initialStake: number,
    initialOdds: number,
    currentOdds: number
  ): Promise<HedgeResult> {
    const initialDecimal = this.americanToDecimal(initialOdds);
    const currentDecimal = this.americanToDecimal(currentOdds);

    // Calculate potential return from initial bet
    const potentialReturn = initialStake * initialDecimal;

    // Calculate hedge amount to break even
    const hedgeAmount = potentialReturn / currentDecimal;

    // Calculate guaranteed profit
    const guaranteedProfit = potentialReturn - initialStake - hedgeAmount;

    // Calculate risk-free return %
    const riskFreeReturn = (guaranteedProfit / (initialStake + hedgeAmount)) * 100;

    return {
      hedgeAmount,
      breakEvenReturn: potentialReturn,
      guaranteedProfit,
      riskFreeReturn,
    };
  }

  /**
   * Calculate optimal Kelly Criterion stake
   */
  async calculateKelly(
    winProbability: number,
    odds: number,
    bankroll: number
  ): Promise<KellyResult> {
    const decimal = this.americanToDecimal(odds);
    const b = decimal - 1; // Net odds
    const p = winProbability / 100;
    const q = 1 - p;

    // Kelly formula: f* = (bp - q) / b
    const kelly = (b * p - q) / b;
    const optimalFraction = Math.max(0, kelly);

    // Use quarter Kelly for safety
    const safeKelly = optimalFraction * 0.25;
    const recommendedStake = bankroll * safeKelly;

    // Calculate edge
    const impliedProb = 1 / decimal;
    const edge = (p - impliedProb) * 100;

    return {
      optimalFraction: optimalFraction * 100,
      recommendedStake: Math.min(recommendedStake, bankroll * 0.1), // Max 10% of bankroll
      maxStake: bankroll * optimalFraction,
      edgePercent: edge,
    };
  }

  /**
   * Run Monte Carlo simulation for outcome prediction
   */
  async runMonteCarlo(
    winProbability: number,
    numSimulations: number = 10000
  ): Promise<{
    expectedWins: number;
    expectedLosses: number;
    confidenceInterval: { low: number; high: number };
  }> {
    const p = winProbability / 100;
    const wins = Math.round(numSimulations * p);
    const losses = numSimulations - wins;

    // 95% confidence interval using normal approximation
    const stdDev = Math.sqrt(numSimulations * p * (1 - p));
    const marginOfError = 1.96 * stdDev;

    return {
      expectedWins: wins,
      expectedLosses: losses,
      confidenceInterval: {
        low: Math.max(0, Math.round(wins - marginOfError)),
        high: Math.min(numSimulations, Math.round(wins + marginOfError)),
      },
    };
  }

  /**
   * Analyze value bet
   */
  async analyzeValue(
    myProbability: number,
    marketOdds: number
  ): Promise<{
    isValue: boolean;
    edge: number;
    expectedValue: number;
    rating: 'excellent' | 'good' | 'marginal' | 'no_value';
  }> {
    const decimal = this.americanToDecimal(marketOdds);
    const impliedProb = (1 / decimal) * 100;
    const edge = myProbability - impliedProb;

    // Calculate expected value per $100 bet
    const ev = (myProbability / 100) * (decimal - 1) * 100 - ((100 - myProbability) / 100) * 100;

    let rating: 'excellent' | 'good' | 'marginal' | 'no_value';
    if (edge >= 10) rating = 'excellent';
    else if (edge >= 5) rating = 'good';
    else if (edge > 0) rating = 'marginal';
    else rating = 'no_value';

    return {
      isValue: edge > 0,
      edge,
      expectedValue: ev,
      rating,
    };
  }

  /**
   * Calculate implied probability from odds
   */
  async getImpliedProbability(odds: number): Promise<{
    american: number;
    decimal: number;
    impliedProbability: number;
    vig: number;
  }> {
    const decimal = this.americanToDecimal(odds);
    const impliedProb = (1 / decimal) * 100;

    // Estimate vig (assuming fair odds + 4.55% juice)
    const fairProb = impliedProb / 1.0455;
    const vig = impliedProb - fairProb;

    return {
      american: odds,
      decimal,
      impliedProbability: impliedProb,
      vig,
    };
  }

  /**
   * Generate daily $250 strategy
   */
  async generate250Strategy(
    bankroll: number,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  ): Promise<{
    targetDailyBets: number;
    avgBetSize: number;
    requiredWinRate: number;
    strategy: string[];
    warnings: string[];
  }> {
    const riskMultiplier = {
      conservative: 0.02,
      moderate: 0.05,
      aggressive: 0.10,
    };

    const avgOdds = -110; // Standard juice
    const decimal = this.americanToDecimal(avgOdds);
    const maxBetSize = bankroll * riskMultiplier[riskTolerance];

    // Calculate required win rate to make $250/day
    // With -110 odds, need to win 52.4% to break even
    // To profit $250 with $50 bets at -110:
    // Win: $45.45 profit, Loss: -$50
    // Need X wins - (10-X) losses = $250
    // 45.45X - 50(10-X) = 250
    // 95.45X = 750
    // X ≈ 7.86 wins out of 10

    const betSize = Math.min(maxBetSize, 50);
    const profitPerWin = betSize * (decimal - 1);
    const lossPerLoss = betSize;

    // To make $250: profitPerWin * wins - lossPerLoss * losses = 250
    // If 10 bets: profitPerWin * w - lossPerLoss * (10-w) = 250
    const targetBets = 10;
    const requiredWins = (250 + lossPerLoss * targetBets) / (profitPerWin + lossPerLoss);
    const requiredWinRate = (requiredWins / targetBets) * 100;

    return {
      targetDailyBets: targetBets,
      avgBetSize: betSize,
      requiredWinRate: Math.round(requiredWinRate * 10) / 10,
      strategy: [
        `Place ${targetBets} bets per day at $${betSize} each`,
        `Target ${Math.ceil(requiredWins)} wins out of ${targetBets}`,
        `Focus on 65%+ confidence picks only`,
        `Use arbitrage for guaranteed profit when available`,
        `Hedge winning positions when odds shift`,
        `Track all bets for learning and optimization`,
      ],
      warnings:
        requiredWinRate > 70
          ? ['⚠️ Required win rate is very high - consider larger bankroll or lower target']
          : requiredWinRate > 60
          ? ['⚠️ Required win rate is challenging - focus on high-value picks only']
          : [],
    };
  }

  /**
   * Convert American odds to decimal
   */
  private americanToDecimal(american: number): number {
    if (american > 0) {
      return (american / 100) + 1;
    }
    return (100 / Math.abs(american)) + 1;
  }

  /**
   * Convert data to useful insights
   */
  async generateInsights(dataPoints: DataPoint[]): Promise<string[]> {
    const insights: string[] = [];

    // Analyze data points for patterns
    const highRelevance = dataPoints.filter(d => d.relevance >= 70);
    if (highRelevance.length > 0) {
      insights.push(`${highRelevance.length} high-relevance data points identified`);
    }

    // Check for conflicting signals
    const sentiments = dataPoints
      .filter(d => d.metric.toLowerCase().includes('sentiment'))
      .map(d => d.value);
    if (sentiments.includes('bullish') && sentiments.includes('bearish')) {
      insights.push('⚠️ Conflicting sentiment signals detected');
    }

    // Volume analysis
    const volumePoints = dataPoints.filter(d => d.metric.toLowerCase().includes('volume'));
    if (volumePoints.length > 0) {
      const avgVolume = volumePoints.reduce((sum, d) => sum + Number(d.value), 0) / volumePoints.length;
      if (avgVolume > 100000) {
        insights.push('High volume indicates strong market interest');
      }
    }

    return insights;
  }
}

