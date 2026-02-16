/**
 * Arbitrage Detector: Progno vs Kalshi
 * Finds edge between Progno predictions and Kalshi market prices
 */

import { Opportunity } from '../types';

interface ArbitrageOpportunity {
  pick: string;
  sport: string;
  confidence: number;
  kalshiMarket: string;
  kalshiYesPrice: number;
  kalshiNoPrice: number;
  modelProbability: number;
  yesEdge: number;
  noEdge: number;
  recommendedSide: 'yes' | 'no';
  recommendedStake: number;
  expectedProfit: number;
}

export class ArbitrageDetector {
  private readonly MIN_EDGE = 3; // Minimum 3% edge to consider

  /**
   * Find all arbitrage opportunities between Progno picks and Kalshi markets
   */
  findArbitrage(
    prognoPicks: Array<{
      gameId: string;
      league: string;
      homeTeam: string;
      awayTeam: string;
      pick: string;
      confidence: number;
      expectedValue: number;
      odds: number;
    }>,
    kalshiMarkets: Array<{
      id: string;
      title: string;
      yesPrice: number;
      noPrice: number;
      category?: string;
      volume?: number;
    }>
  ): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];

    for (const pick of prognoPicks) {
      // Find matching Kalshi markets
      const matches = this.findMatchingMarkets(pick, kalshiMarkets);

      for (const match of matches) {
        // Calculate edges
        const modelProb = pick.confidence;
        const yesEdge = modelProb - match.yesPrice;
        const noEdge = (100 - modelProb) - match.noPrice;

        // Check if either side has sufficient edge
        if (yesEdge >= this.MIN_EDGE || noEdge >= this.MIN_EDGE) {
          const recommendedSide = yesEdge > noEdge ? 'yes' : 'no';
          const edge = Math.max(yesEdge, noEdge);

          opportunities.push({
            pick: pick.pick,
            sport: pick.league,
            confidence: pick.confidence,
            kalshiMarket: match.title,
            kalshiYesPrice: match.yesPrice,
            kalshiNoPrice: match.noPrice,
            modelProbability: modelProb,
            yesEdge,
            noEdge,
            recommendedSide,
            recommendedStake: this.calculateStake(edge, pick.confidence),
            expectedProfit: edge
          });
        }
      }
    }

    return opportunities.sort((a, b) => b.expectedProfit - a.expectedProfit);
  }

  /**
   * Convert arbitrage opportunities to standard Opportunity format
   */
  convertToOpportunities(arbitrage: ArbitrageOpportunity[]): Opportunity[] {
    return arbitrage.map(arb => ({
      id: `arb_progno_${arb.sport}_${Date.now()}`,
      type: 'sports_bet',
      source: 'PROGNO-Kalshi Arbitrage',
      title: `${arb.sport}: ${arb.recommendedSide.toUpperCase()} - ${arb.kalshiMarket.slice(0, 50)}`,
      description: `Model: ${arb.modelProbability}% vs Market: ${arb.recommendedSide === 'yes' ? arb.kalshiYesPrice : arb.kalshiNoPrice}¢`,
      confidence: arb.confidence,
      expectedValue: arb.expectedProfit,
      riskLevel: 'low',
      timeframe: 'Today',
      requiredCapital: arb.recommendedStake,
      potentialReturn: arb.recommendedStake * (1 + arb.expectedProfit / 100),
      reasoning: [
        `Progno model: ${arb.modelProbability}% confidence`,
        `Kalshi YES: ${arb.kalshiYesPrice}¢ | NO: ${arb.kalshiNoPrice}¢`,
        `Edge: ${arb.expectedProfit.toFixed(1)}% on ${arb.recommendedSide.toUpperCase()}`,
        `Pick: ${arb.pick}`
      ],
      dataPoints: [
        {
          source: 'Arbitrage',
          metric: 'Model Edge',
          value: `${arb.expectedProfit.toFixed(1)}%`,
          relevance: 95,
          timestamp: new Date().toISOString()
        },
        {
          source: 'Kalshi',
          metric: 'YES Price',
          value: arb.kalshiYesPrice,
          relevance: 80,
          timestamp: new Date().toISOString()
        },
        {
          source: 'Kalshi',
          metric: 'NO Price',
          value: arb.kalshiNoPrice,
          relevance: 80,
          timestamp: new Date().toISOString()
        }
      ],
      action: {
        platform: 'kalshi',
        actionType: 'bet',
        amount: arb.recommendedStake,
        target: arb.kalshiMarket,
        instructions: [
          `Place ${arb.recommendedSide.toUpperCase()} order on market matching "${arb.kalshiMarket.slice(0, 40)}"`,
          `Limit price: ${arb.recommendedSide === 'yes' ? arb.kalshiYesPrice : arb.kalshiNoPrice}¢ or better`,
          `Expected edge: ${arb.expectedProfit.toFixed(1)}%`
        ],
        autoExecute: arb.expectedProfit >= 5 && arb.confidence >= 70
      },
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt: new Date().toISOString()
    }));
  }

  /**
   * Find markets that match a Progno pick
   */
  private findMatchingMarkets(
    pick: { league: string; homeTeam: string; awayTeam: string; pick: string },
    markets: Array<{ id: string; title: string; yesPrice: number; noPrice: number; category?: string; volume?: number }>
  ): Array<{ id: string; title: string; yesPrice: number; noPrice: number; category?: string; volume?: number }> {
    const matches: Array<{ id: string; title: string; yesPrice: number; noPrice: number; category?: string; volume?: number }> = [];
    const pickLower = `${pick.homeTeam} ${pick.awayTeam} ${pick.league} ${pick.pick}`.toLowerCase();

    for (const market of markets) {
      const titleLower = market.title.toLowerCase();
      let score = 0;

      // Check for team names
      if (pick.homeTeam && titleLower.includes(pick.homeTeam.toLowerCase())) score += 3;
      if (pick.awayTeam && titleLower.includes(pick.awayTeam.toLowerCase())) score += 3;

      // Check for sport/league keywords
      const leagueKeywords: Record<string, string[]> = {
        'NBA': ['nba', 'basketball'],
        'NFL': ['nfl', 'football'],
        'NHL': ['nhl', 'hockey'],
        'MLB': ['mlb', 'baseball'],
        'NCAA': ['ncaa', 'college'],
        'SOCCER': ['soccer', 'premier', 'uefa']
      };

      const keywords = leagueKeywords[pick.league] || [pick.league.toLowerCase()];
      for (const kw of keywords) {
        if (titleLower.includes(kw)) score += 2;
      }

      // Check category match
      if (market.category?.toLowerCase().includes(pick.league.toLowerCase())) score += 1;

      // Check for pick keywords
      if (pick.pick && titleLower.includes(pick.pick.toLowerCase())) score += 2;

      // Require at least 4 points (team name + something else)
      if (score >= 4) {
        matches.push(market);
      }
    }

    return matches;
  }

  /**
   * Calculate recommended stake using Kelly Criterion
   */
  private calculateStake(edge: number, confidence: number): number {
    // Kelly formula: (edge / odds) * bankroll
    // Simplified for binary markets
    const impliedProb = 50; // Market implied 50%
    const modelProb = confidence;
    const b = (100 - impliedProb) / impliedProb; // Decimal odds
    const p = modelProb / 100; // Probability of win
    const q = 1 - p;

    const kellyFraction = (b * p - q) / b;

    // Quarter Kelly for safety, clamp to reasonable range
    const stake = kellyFraction * 0.25 * 100; // Assuming $100 bankroll per bet

    return Math.min(Math.max(stake, 5), 50); // $5-$50 range
  }

  /**
   * Generate arbitrage report
   */
  generateReport(opportunities: ArbitrageOpportunity[]): string {
    if (opportunities.length === 0) {
      return '📊 No arbitrage opportunities found. Edge threshold: ' + this.MIN_EDGE + '%';
    }

    const lines = [
      '🎯 PROGNO-KALSHI ARBITRAGE OPPORTUNITIES',
      '═'.repeat(70),
      `Found ${opportunities.length} opportunities (min edge: ${this.MIN_EDGE}%)`,
      ''
    ];

    const top10 = opportunities.slice(0, 10);

    for (let i = 0; i < top10.length; i++) {
      const opp = top10[i];
      lines.push(`${i + 1}. ${opp.sport}: ${opp.kalshiMarket.slice(0, 40)}`);
      lines.push(`   📊 Model: ${opp.modelProbability}% | Market: ${opp.recommendedSide === 'yes' ? opp.kalshiYesPrice : opp.kalshiNoPrice}¢`);
      lines.push(`   💰 Edge: ${opp.expectedProfit.toFixed(1)}% | Stake: $${opp.recommendedStake.toFixed(2)}`);
      lines.push(`   🎯 Pick: ${opp.pick}`);
      lines.push('');
    }

    return lines.join('\n');
  }
}

export const arbitrageDetector = new ArbitrageDetector();
