/**
 * PROGNO Integration
 * Connects to PROGNO prediction engine for sports betting intelligence
 */

import { Opportunity, DataPoint, RecommendedAction } from '../types';

interface PrognoPick {
  gameId: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  pick: string;
  pickType: 'spread' | 'moneyline' | 'total';
  odds: number;
  confidence: number;
  expectedValue: number;
  reasoning: string[];
  sharpMoney?: {
    side: string;
    confidence: number;
  };
  publicBetting?: {
    homePercent: number;
    awayPercent: number;
  };
}

/** Map progno API pick shape to PrognoPick (game_id, expected_value, reasoning, etc.) */
function mapPrognoPickToShape(p: any): PrognoPick {
  const pickType = (p.pick_type || 'MONEYLINE').toLowerCase();
  const normalizedType: 'spread' | 'moneyline' | 'total' =
    pickType === 'spread' || pickType === 'total' ? pickType : 'moneyline';
  const odds = typeof p.odds === 'number' ? p.odds : (p.odds?.price ?? 0);
  return {
    gameId: p.game_id || `${p.home_team}-${p.away_team}-${p.game_time || ''}`,
    league: p.sport || 'NBA',
    homeTeam: p.home_team || '',
    awayTeam: p.away_team || '',
    pick: p.pick || '',
    pickType: normalizedType,
    odds,
    confidence: typeof p.confidence === 'number' ? p.confidence : 0,
    expectedValue: typeof p.expected_value === 'number' ? p.expected_value : (p.value_bet_ev ?? 0),
    reasoning: Array.isArray(p.reasoning) ? p.reasoning : (p.analysis ? [p.analysis] : []),
    sharpMoney: p.sharp_money,
    publicBetting: p.public_betting,
  };
}

export class PrognoIntegration {
  private baseUrl: string;
  private apiKey?: string;

  constructor() {
    this.baseUrl = process.env.PROGNO_BASE_URL || 'https://prognoultimatev2-cevict-projects.vercel.app';
    this.apiKey = process.env.BOT_API_KEY;
  }

  async getTodaysPicks(): Promise<PrognoPick[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/picks/today`, {
        headers: this.apiKey ? { 'x-api-key': this.apiKey } : {},
      });

      if (!response.ok) {
        console.error('PROGNO API error:', response.status);
        return [];
      }

      const data = await response.json();
      const raw = data.picks || [];
      return raw.map((p: any) => mapPrognoPickToShape(p));
    } catch (error) {
      console.error('Error fetching PROGNO picks:', error);
      return [];
    }
  }

  async getLiveOdds(league: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/odds/live?league=${league}&analysis=true`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.games || [];
    } catch (error) {
      console.error('Error fetching live odds:', error);
      return [];
    }
  }

  async getArbitrageOpportunities(): Promise<Opportunity[]> {
    try {
      // Fetch odds from multiple books and find arbitrage
      const leagues = ['NFL', 'NBA', 'NCAAF', 'NCAAB'];
      const opportunities: Opportunity[] = [];

      for (const league of leagues) {
        const odds = await this.getLiveOdds(league);
        const arbOpps = this.findArbitrage(odds, league);
        opportunities.push(...arbOpps);
      }

      return opportunities;
    } catch (error) {
      console.error('Error finding arbitrage:', error);
      return [];
    }
  }

  private findArbitrage(games: any[], league: string): Opportunity[] {
    const opportunities: Opportunity[] = [];

    for (const game of games) {
      if (!game.books || game.books.length < 2) continue;

      // Check for moneyline arbitrage
      const mlArb = this.checkMoneylineArbitrage(game);
      if (mlArb) {
        opportunities.push({
          id: `arb_${game.gameId}_${Date.now()}`,
          type: 'arbitrage',
          source: 'PROGNO',
          title: `Arbitrage: ${game.awayTeam} @ ${game.homeTeam}`,
          description: `Guaranteed ${mlArb.profit.toFixed(2)}% profit on ${league} game`,
          confidence: 95,
          expectedValue: mlArb.profit,
          riskLevel: 'low',
          timeframe: 'Before game starts',
          requiredCapital: 100,
          potentialReturn: 100 + mlArb.profit,
          reasoning: [
            `Book A: ${mlArb.book1} offers ${mlArb.odds1} on ${mlArb.side1}`,
            `Book B: ${mlArb.book2} offers ${mlArb.odds2} on ${mlArb.side2}`,
            `Combined implied probability: ${mlArb.impliedProb.toFixed(1)}%`,
          ],
          dataPoints: [],
          action: {
            platform: 'manual',
            actionType: 'bet',
            amount: 100,
            target: `${game.homeTeam} vs ${game.awayTeam}`,
            instructions: [
              `Bet $${mlArb.stake1.toFixed(2)} on ${mlArb.side1} at ${mlArb.book1}`,
              `Bet $${mlArb.stake2.toFixed(2)} on ${mlArb.side2} at ${mlArb.book2}`,
            ],
            autoExecute: false,
          },
          expiresAt: game.startTime,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return opportunities;
  }

  private checkMoneylineArbitrage(game: any): any | null {
    const books = game.books;
    if (!books || books.length < 2) return null;

    // Find best odds for each side
    let bestHome = { odds: -Infinity, book: '' };
    let bestAway = { odds: -Infinity, book: '' };

    for (const book of books) {
      if (book.moneyline > bestHome.odds) {
        bestAway = bestHome; // Second best becomes away
        bestHome = { odds: book.moneyline, book: book.bookmaker };
      }
    }

    // Convert American odds to decimal
    const decimalHome = bestHome.odds > 0 ? (bestHome.odds / 100) + 1 : (100 / Math.abs(bestHome.odds)) + 1;
    const decimalAway = bestAway.odds > 0 ? (bestAway.odds / 100) + 1 : (100 / Math.abs(bestAway.odds)) + 1;

    // Calculate implied probability
    const impliedProb = (1 / decimalHome + 1 / decimalAway) * 100;

    // If implied probability < 100%, there's arbitrage
    if (impliedProb < 100) {
      const totalStake = 100;
      const stake1 = totalStake / decimalHome / (1 / decimalHome + 1 / decimalAway);
      const stake2 = totalStake - stake1;
      const profit = ((1 / (impliedProb / 100)) - 1) * 100;

      return {
        book1: bestHome.book,
        book2: bestAway.book,
        odds1: bestHome.odds,
        odds2: bestAway.odds,
        side1: game.homeTeam,
        side2: game.awayTeam,
        stake1,
        stake2,
        profit,
        impliedProb,
      };
    }

    return null;
  }

  async convertToOpportunities(picks: PrognoPick[]): Promise<Opportunity[]> {
    return picks
      .filter(pick => pick.confidence >= 65 && pick.expectedValue > 0)
      .map(pick => ({
        id: `progno_${pick.gameId}_${Date.now()}`,
        type: 'sports_bet' as const,
        source: 'PROGNO Claude Effect',
        title: `${pick.league}: ${pick.pick}`,
        description: `${pick.homeTeam} vs ${pick.awayTeam} - ${pick.pickType}`,
        confidence: pick.confidence,
        expectedValue: pick.expectedValue,
        riskLevel: pick.confidence >= 75 ? 'low' : pick.confidence >= 65 ? 'medium' : 'high' as const,
        timeframe: 'Today',
        requiredCapital: this.calculateStake(pick),
        potentialReturn: this.calculateReturn(pick),
        reasoning: pick.reasoning,
        dataPoints: this.buildDataPoints(pick),
        action: {
          platform: 'kalshi' as const,
          actionType: 'bet' as const,
          amount: this.calculateStake(pick),
          target: pick.pick,
          instructions: [
            `Place bet on: ${pick.pick}`,
            `Odds: ${pick.odds > 0 ? '+' : ''}${pick.odds}`,
            `Recommended stake: $${this.calculateStake(pick)}`,
          ],
          autoExecute: pick.confidence >= 75,
        },
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        createdAt: new Date().toISOString(),
      }));
  }

  private calculateStake(pick: PrognoPick): number {
    // Kelly Criterion simplified
    const impliedProb = pick.odds > 0
      ? 100 / (pick.odds + 100)
      : Math.abs(pick.odds) / (Math.abs(pick.odds) + 100);
    const edge = (pick.confidence / 100) - impliedProb;
    const kelly = edge / (1 - impliedProb);

    // Use quarter Kelly for safety, max $50
    return Math.min(Math.max(kelly * 0.25 * 100, 10), 50);
  }

  private calculateReturn(pick: PrognoPick): number {
    const stake = this.calculateStake(pick);
    if (pick.odds > 0) {
      return stake * (1 + pick.odds / 100);
    }
    return stake * (1 + 100 / Math.abs(pick.odds));
  }

  private buildDataPoints(pick: PrognoPick): DataPoint[] {
    const points: DataPoint[] = [
      {
        source: 'PROGNO',
        metric: 'AI Confidence',
        value: pick.confidence,
        relevance: 100,
        timestamp: new Date().toISOString(),
      },
      {
        source: 'PROGNO',
        metric: 'Expected Value',
        value: `+${pick.expectedValue.toFixed(1)}%`,
        relevance: 90,
        timestamp: new Date().toISOString(),
      },
    ];

    if (pick.sharpMoney) {
      points.push({
        source: 'Sharp Money',
        metric: pick.sharpMoney.side,
        value: `${pick.sharpMoney.confidence}% confidence`,
        relevance: 85,
        timestamp: new Date().toISOString(),
      });
    }

    if (pick.publicBetting) {
      points.push({
        source: 'Public Betting',
        metric: 'Ticket Split',
        value: `${pick.publicBetting.homePercent}% / ${pick.publicBetting.awayPercent}%`,
        relevance: 70,
        timestamp: new Date().toISOString(),
      });
    }

    return points;
  }
}

