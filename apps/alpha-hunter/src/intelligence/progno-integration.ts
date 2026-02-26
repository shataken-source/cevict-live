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

  // Smart cache for picks (5 minute TTL)
  private picksCache: { data: PrognoPick[]; timestamp: number; expiresAt: number } | null = null;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  // Tomorrow's picks cache (longer TTL since they don't change)
  private tomorrowCache: { data: PrognoPick[]; timestamp: number; expiresAt: number } | null = null;
  private readonly TOMORROW_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.baseUrl = process.env.PROGNO_BASE_URL || 'https://prognoultimatev2-cevict-projects.vercel.app';
    this.apiKey = process.env.BOT_API_KEY;
  }

  /**
   * Clear cache - useful after placing bets to get fresh data
   */
  clearCache(): void {
    this.picksCache = null;
    this.tomorrowCache = null;
    console.log('   🗑️ Progno cache cleared');
  }

  /**
   * Get cached picks if valid, otherwise null
   */
  private getCachedPicks(useCache: boolean): PrognoPick[] | null {
    if (!useCache || !this.picksCache) return null;
    if (Date.now() > this.picksCache.expiresAt) {
      this.picksCache = null;
      return null;
    }
    const age = Math.round((Date.now() - this.picksCache.timestamp) / 1000);
    console.log(`   📦 Using cached picks (${age}s old, expires in ${Math.round((this.picksCache.expiresAt - Date.now()) / 1000)}s)`);
    return this.picksCache.data;
  }

  async getTodaysPicks(useCache = true): Promise<PrognoPick[]> {
    // Check cache first
    const cached = this.getCachedPicks(useCache);
    if (cached) return cached;

    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/api/picks/today`, {
          headers: this.apiKey ? { 'x-api-key': this.apiKey } : {},
        });

        if (!response.ok) {
          // Only retry on 5xx errors or network issues, not 4xx
          if (response.status >= 500 && attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.warn(`   ⚠️ Progno API error ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})...`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          console.error('PROGNO API error:', response.status);
          return [];
        }

        const data = await response.json();
        const raw = data.picks || [];

        if (raw.length === 0) {
          console.log('   ℹ️ Progno returned 0 picks - no games today or data unavailable');
        } else {
          console.log(`   ✅ Loaded ${raw.length} picks from Progno`);
        }

        const picks = raw.map((p: any) => mapPrognoPickToShape(p));

        // Cache the results
        this.picksCache = {
          data: picks,
          timestamp: Date.now(),
          expiresAt: Date.now() + this.CACHE_TTL_MS
        };

        return picks;
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Check for network errors that are worth retrying
        const isNetworkError =
          errorMessage.includes('fetch') ||
          errorMessage.includes('ENOTFOUND') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('ETIMEDOUT');

        if (isNetworkError && !isLastAttempt) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.warn(`   ⚠️ Progno network error, retrying in ${delay}ms (attempt ${attempt}/${maxRetries}): ${errorMessage}`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        console.error('Error fetching PROGNO picks:', errorMessage);
        return [];
      }
    }

    return []; // Should never reach here
  }

  /**
   * Get tomorrow's picks for pre-market opportunities
   */
  async getTomorrowsPicks(useCache = true): Promise<PrognoPick[]> {
    // Check cache first
    if (useCache && this.tomorrowCache && Date.now() < this.tomorrowCache.expiresAt) {
      const age = Math.round((Date.now() - this.tomorrowCache.timestamp) / 1000);
      console.log(`   📦 Using cached tomorrow picks (${age}s old)`);
      return this.tomorrowCache.data;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/picks/tomorrow`, {
        headers: this.apiKey ? { 'x-api-key': this.apiKey } : {},
      });

      if (!response.ok) {
        console.warn('PROGNO tomorrow API error:', response.status);
        return [];
      }

      const data = await response.json();
      const raw = data.picks || [];
      const picks = raw.map((p: any) => mapPrognoPickToShape(p));

      // Cache with longer TTL
      this.tomorrowCache = {
        data: picks,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.TOMORROW_CACHE_TTL_MS
      };

      console.log(`   🔮 Loaded ${picks.length} tomorrow picks`);
      return picks;
    } catch (error) {
      console.error('Error fetching PROGNO tomorrow picks:', error);
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
    // getLiveOdds returns single-source data from the Progno API, which does not
    // include multi-book odds. Real arbitrage requires comparing odds across
    // different bookmakers. Return empty until a proper multi-book odds source
    // is wired up (e.g. The Odds API directly from Alpha Hunter).
    return [];
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

    // Find best odds for each side across all books
    let bestHome = { odds: -Infinity, book: '' };
    let bestAway = { odds: -Infinity, book: '' };

    for (const book of books) {
      const homeOdds = book.homeML ?? book.home_moneyline ?? book.moneyline;
      const awayOdds = book.awayML ?? book.away_moneyline ?? (book.moneyline ? -book.moneyline : undefined);
      if (typeof homeOdds === 'number' && homeOdds > bestHome.odds) {
        bestHome = { odds: homeOdds, book: book.bookmaker || book.key || '' };
      }
      if (typeof awayOdds === 'number' && awayOdds > bestAway.odds) {
        bestAway = { odds: awayOdds, book: book.bookmaker || book.key || '' };
      }
    }

    // Need valid odds from different books for real arbitrage
    if (bestHome.odds === -Infinity || bestAway.odds === -Infinity) return null;

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
    // Convert American odds to implied probability (decimal 0-1)
    let impliedProb: number;
    if (pick.odds > 0) {
      // Positive odds: +1600 → 100/(1600+100) = 0.0588 (5.88%)
      impliedProb = 100 / (pick.odds + 100);
    } else {
      // Negative odds: -196 → 196/(196+100) = 0.662 (66.2%)
      impliedProb = Math.abs(pick.odds) / (Math.abs(pick.odds) + 100);
    }

    // Edge calculation: model probability (0-1) vs implied probability (0-1)
    const modelProb = pick.confidence / 100;
    const edge = modelProb - impliedProb;

    // No edge = no bet
    if (edge <= 0) return 0;

    // Kelly Criterion: edge / (1 - impliedProb)
    // For +1600 with 90% model prob: edge = 0.90 - 0.0588 = 0.8412
    // Kelly = 0.8412 / (1 - 0.0588) = 0.8937
    const kelly = edge / (1 - impliedProb);

    // Quarter Kelly for safety, max $50, min $10 if edge exists
    return Math.min(Math.max(kelly * 0.25 * 100, 10), 50);
  }

  private calculateReturn(pick: PrognoPick): number {
    const stake = this.calculateStake(pick);
    if (stake <= 0) return 0;

    if (pick.odds > 0) {
      // Positive odds: stake + (stake * odds/100)
      return stake + (stake * pick.odds / 100);
    }
    // Negative odds: stake + (stake * 100/|odds|)
    return stake + (stake * 100 / Math.abs(pick.odds));
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

export const progno = new PrognoIntegration();

