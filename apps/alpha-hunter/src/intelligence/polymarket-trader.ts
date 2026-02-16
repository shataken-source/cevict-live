/**
 * Polymarket Integration
 * Connects to Polymarket API for prediction market opportunities
 */

import { Opportunity, DataPoint } from '../types';

interface PolymarketMarket {
  id: string;
  title: string;
  slug: string;
  description?: string;
  category?: string;
  yesPrice: number; // 0-1 (converted to cents)
  noPrice: number;
  volume: number;
  liquidity: number;
  expiresAt: string;
  resolutionDate?: string;
  status: 'active' | 'resolved' | 'closed';
  outcomes: Array<{ name: string; price: number }>;
}

interface PolymarketPick {
  marketId: string;
  side: 'yes' | 'no';
  confidence: number;
  edge: number;
  recommendedStake: number;
  reasoning: string[];
}

export class PolymarketTrader {
  private baseUrl = 'https://clob.polymarket.com';
  private gammaUrl = 'https://gamma-api.polymarket.com';
  private apiKey?: string;
  
  constructor() {
    this.apiKey = process.env.POLYMARKET_API_KEY;
  }
  
  /**
   * Fetch active markets from Polymarket
   */
  async getMarkets(limit: number = 100): Promise<PolymarketMarket[]> {
    try {
      const response = await fetch(`${this.gammaUrl}/markets?limit=${limit}&active=true`, {
        headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}
      });
      
      if (!response.ok) {
        console.warn('Polymarket API error:', response.status);
        return [];
      }
      
      const data = await response.json();
      return this.transformMarkets(data.markets || []);
    } catch (error) {
      console.error('Error fetching Polymarket markets:', error);
      return [];
    }
  }
  
  /**
   * Get orderbook for a specific market
   */
  async getOrderBook(marketId: string): Promise<{ yes: { bid: number; ask: number }; no: { bid: number; ask: number } } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/markets/${marketId}/orderbook`, {
        headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      
      return {
        yes: {
          bid: (data.yes?.bids?.[0]?.price || 0) * 100, // Convert to cents
          ask: (data.yes?.asks?.[0]?.price || 1) * 100
        },
        no: {
          bid: (data.no?.bids?.[0]?.price || 0) * 100,
          ask: (data.no?.asks?.[0]?.price || 1) * 100
        }
      };
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Find opportunities by matching Progno picks to Polymarket markets
   */
  async findOpportunitiesFromPrognoPicks(prognoPicks: any[], minEdge: number = 2): Promise<Opportunity[]> {
    const markets = await this.getMarkets(200);
    const opportunities: Opportunity[] = [];
    
    for (const pick of prognoPicks) {
      const matchedMarket = this.matchPickToMarket(pick, markets);
      
      if (!matchedMarket) continue;
      
      const orderbook = await this.getOrderBook(matchedMarket.id);
      if (!orderbook) continue;
      
      // Calculate edge
      const modelProb = pick.confidence;
      const yesPrice = orderbook.yes.ask;
      const noPrice = orderbook.no.ask;
      
      const yesEdge = modelProb - yesPrice;
      const noEdge = (100 - modelProb) - noPrice;
      
      let side: 'yes' | 'no' | null = null;
      let edge = 0;
      let price = 0;
      
      if (yesEdge >= minEdge) {
        side = 'yes';
        edge = yesEdge;
        price = yesPrice;
      } else if (noEdge >= minEdge) {
        side = 'no';
        edge = noEdge;
        price = noPrice;
      }
      
      if (!side) continue;
      
      opportunities.push({
        id: `poly_${matchedMarket.id}_${side}_${Date.now()}`,
        type: 'prediction_market',
        source: 'Polymarket + Progno',
        title: `${side.toUpperCase()}: ${matchedMarket.title}`,
        description: `Polymarket edge ${edge.toFixed(1)}% | ${pick.league}: ${pick.pick}`,
        confidence: pick.confidence,
        expectedValue: edge,
        riskLevel: 'medium',
        timeframe: '48h',
        requiredCapital: this.calculateStake(pick.confidence, edge),
        potentialReturn: this.calculateStake(pick.confidence, edge) * (edge / 100),
        reasoning: [
          `Progno pick: ${pick.pick} (${pick.confidence}%)`,
          `Polymarket ${side} price: ${price}¢`,
          `Edge: ${edge.toFixed(1)}%`,
          ...pick.reasoning.slice(0, 2)
        ],
        dataPoints: [
          {
            source: 'Polymarket',
            metric: 'Volume',
            value: matchedMarket.volume,
            relevance: 80,
            timestamp: new Date().toISOString()
          },
          {
            source: 'Polymarket',
            metric: 'Liquidity',
            value: matchedMarket.liquidity,
            relevance: 70,
            timestamp: new Date().toISOString()
          }
        ],
        action: {
          platform: 'manual', // Polymarket requires manual trading for now
          actionType: 'bet',
          amount: this.calculateStake(pick.confidence, edge),
          target: `${matchedMarket.title} (${side})`,
          instructions: [
            `Go to polymarket.com/market/${matchedMarket.slug}`,
            `Buy ${side.toUpperCase()} at ≤${price}¢`,
            `Stake: $${this.calculateStake(pick.confidence, edge)}`
          ],
          autoExecute: false
        },
        expiresAt: matchedMarket.expiresAt,
        createdAt: new Date().toISOString()
      });
    }
    
    return opportunities.sort((a, b) => b.expectedValue - a.expectedValue);
  }
  
  /**
   * Find arbitrage opportunities between Polymarket and Kalshi
   */
  async findCrossPlatformArbitrage(kalshiMarkets: any[], minProfit: number = 2): Promise<Opportunity[]> {
    const polyMarkets = await this.getMarkets(100);
    const arbitrageOpps: Opportunity[] = [];
    
    for (const poly of polyMarkets) {
      // Find matching Kalshi market
      const kalshiMatch = kalshiMarkets.find(k => 
        this.titlesMatch(k.title, poly.title)
      );
      
      if (!kalshiMatch) continue;
      
      const polyBook = await this.getOrderBook(poly.id);
      if (!polyBook) continue;
      
      // Check for arbitrage: buy YES on one, buy NO on other
      const kalshiYes = kalshiMatch.yesPrice;
      const kalshiNo = kalshiMatch.noPrice;
      const polyYes = polyBook.yes.ask;
      const polyNo = polyBook.no.ask;
      
      // Buy YES on cheaper, Buy NO on cheaper
      const cheaperYes = Math.min(kalshiYes, polyYes);
      const cheaperNo = Math.min(kalshiNo, polyNo);
      const impliedProb = cheaperYes + cheaperNo;
      
      if (impliedProb < (100 - minProfit)) {
        const profit = 100 - impliedProb;
        const buyYesOn = kalshiYes < polyYes ? 'Kalshi' : 'Polymarket';
        const buyNoOn = kalshiNo < polyNo ? 'Kalshi' : 'Polymarket';
        
        if (buyYesOn !== buyNoOn) {
          arbitrageOpps.push({
            id: `arb_poly_${poly.id}_${Date.now()}`,
            type: 'arbitrage',
            source: 'Polymarket/Kalshi',
            title: `Arbitrage: ${poly.title}`,
            description: `Risk-free ${profit.toFixed(2)}% profit`,
            confidence: 95,
            expectedValue: profit,
            riskLevel: 'low',
            timeframe: '24h',
            requiredCapital: 100,
            potentialReturn: 100 + profit,
            reasoning: [
              `Buy YES on ${buyYesOn} at ${cheaperYes}¢`,
              `Buy NO on ${buyNoOn} at ${cheaperNo}¢`,
              `Guaranteed profit: ${profit.toFixed(2)}%`
            ],
            dataPoints: [
              {
                source: 'Arbitrage',
                metric: 'Combined Price',
                value: `${cheaperYes}¢ + ${cheaperNo}¢ = ${impliedProb}¢`,
                relevance: 100,
                timestamp: new Date().toISOString()
              }
            ],
            action: {
              platform: 'manual',
              actionType: 'bet',
              amount: 100,
              target: poly.title,
              instructions: [
                `On ${buyYesOn}: Buy YES at ${cheaperYes}¢`,
                `On ${buyNoOn}: Buy NO at ${cheaperNo}¢`,
                `Profit: $${profit.toFixed(2)} per $100 staked`
              ],
              autoExecute: false
            },
            expiresAt: poly.expiresAt,
            createdAt: new Date().toISOString()
          });
        }
      }
    }
    
    return arbitrageOpps;
  }
  
  private transformMarkets(apiMarkets: any[]): PolymarketMarket[] {
    return apiMarkets.map(m => ({
      id: m.id || m.conditionId,
      title: m.title || m.question,
      slug: m.slug || m.id,
      description: m.description,
      category: m.category,
      yesPrice: (m.outcomes?.find((o: any) => o.name === 'Yes')?.price || 0.5) * 100,
      noPrice: (m.outcomes?.find((o: any) => o.name === 'No')?.price || 0.5) * 100,
      volume: m.volume || 0,
      liquidity: m.liquidity || 0,
      expiresAt: m.endDate || m.resolutionDate,
      resolutionDate: m.resolutionDate,
      status: m.active ? 'active' : (m.resolved ? 'resolved' : 'closed'),
      outcomes: m.outcomes || []
    }));
  }
  
  private matchPickToMarket(pick: any, markets: PolymarketMarket[]): PolymarketMarket | null {
    const pickLower = `${pick.homeTeam} ${pick.awayTeam} ${pick.league}`.toLowerCase();
    
    // Find best matching market
    let bestMatch: PolymarketMarket | null = null;
    let bestScore = 0;
    
    for (const market of markets) {
      const marketLower = market.title.toLowerCase();
      let score = 0;
      
      // Check for team names
      if (marketLower.includes(pick.homeTeam?.toLowerCase())) score += 2;
      if (marketLower.includes(pick.awayTeam?.toLowerCase())) score += 2;
      
      // Check for league/sport
      if (marketLower.includes(pick.league?.toLowerCase())) score += 1;
      
      // Check for pick keywords
      if (marketLower.includes(pick.pick?.toLowerCase())) score += 2;
      
      // Must have at least one team name
      if (score >= 3 && score > bestScore) {
        bestScore = score;
        bestMatch = market;
      }
    }
    
    return bestMatch;
  }
  
  private titlesMatch(title1: string, title2: string): boolean {
    const t1 = title1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const t2 = title2.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Simple similarity - shared words
    const words1 = title1.toLowerCase().split(/\s+/);
    const words2 = title2.toLowerCase().split(/\s+/);
    const shared = words1.filter(w => words2.includes(w) && w.length > 3);
    
    return shared.length >= 2;
  }
  
  private calculateStake(confidence: number, edge: number): number {
    // Simplified Kelly: stake based on edge and confidence
    const kelly = edge / 100 * (confidence / 100);
    const quarterKelly = kelly * 0.25 * 100; // Base $100
    return Math.min(Math.max(quarterKelly, 5), 50); // Clamp $5-$50
  }
}

export const polymarketTrader = new PolymarketTrader();
