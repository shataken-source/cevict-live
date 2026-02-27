/**
 * Polymarket Integration
 * Connects to Polymarket API for prediction market opportunities
 *
 * Note: Market discovery and price fetching use PUBLIC APIs (no auth required)
 * Trading requires wallet private key for signing transactions
 */

import { Opportunity, DataPoint } from '../types';
import { ethers } from 'ethers';

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
  clobTokenIds?: { yes: string; no: string }; // For orderbook lookups
  eventTitle?: string;
  tags?: Array<{ id: string; label: string; slug: string }>;
}

interface ClobOrder {
  salt: string;
  maker: string;
  signer: string;
  taker: string;
  tokenId: string;
  makerAmount: string;
  takerAmount: string;
  expiration: string;
  nonce: string;
  feeRateBps: string;
  side: 'BUY' | 'SELL';
  signatureType: number;
}

interface ClobSignedOrder extends ClobOrder {
  signature: string;
}

interface OrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
  filled?: boolean;
  remainingSize?: number;
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
  private walletAddress?: string;
  private privateKey?: string;
  private wallet?: ethers.Wallet;
  private nonceCounter = new Map<string, number>();

  constructor() {
    this.apiKey = process.env.POLYMARKET_API_KEY;
    this.walletAddress = process.env.POLYMARKET_WALLET;
    this.privateKey = process.env.POLYMARKET_PRIVATE_KEY;

    if (this.privateKey && this.walletAddress) {
      try {
        this.wallet = new ethers.Wallet(this.privateKey);
        console.log('✅ Polymarket trading enabled:', this.walletAddress);
      } catch (e) {
        console.error('❌ Invalid POLYMARKET_PRIVATE_KEY');
      }
    } else {
      console.log('ℹ️ Polymarket: Market discovery only (add POLYMARKET_PRIVATE_KEY for trading)');
    }
  }

  /**
   * Check if trading is enabled (private key configured)
   */
  isTradingEnabled(): boolean {
    return !!this.wallet && !!this.walletAddress;
  }

  /**
   * Get trading wallet address
   */
  getWalletAddress(): string | undefined {
    return this.walletAddress;
  }

  /**
   * Fetch active markets from Polymarket (PUBLIC API - no auth required)
   */
  async getMarkets(limit: number = 100, sportFilter?: string): Promise<PolymarketMarket[]> {
    try {
      // Use events endpoint for better categorization
      let url = `${this.gammaUrl}/events?active=true&closed=false&limit=${limit}`;

      if (sportFilter) {
        url += `&tag=${encodeURIComponent(sportFilter)}`;
      }

      const response = await fetch(url, {
        headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}
      });

      if (!response.ok) {
        console.warn('Polymarket Gamma API error:', response.status);
        return [];
      }

      const data: any = await response.json();
      // Flatten events into markets
      const markets: any[] = [];
      for (const event of (data || [])) {
        for (const market of (event.markets || [])) {
          markets.push({
            ...market,
            eventTitle: event.title,
            eventSlug: event.slug,
            tags: event.tags
          });
        }
      }

      return this.transformMarkets(markets);
    } catch (error) {
      console.error('Error fetching Polymarket markets:', error);
      return [];
    }
  }

  /**
   * Get orderbook for a specific market (PUBLIC API - no auth required)
   */
  async getOrderBook(tokenId: string): Promise<{ yes: { bid: number; ask: number }; no: { bid: number; ask: number } } | null> {
    try {
      // Use the public book endpoint
      const response = await fetch(`${this.baseUrl}/book?token_id=${tokenId}`);

      if (!response.ok) {
        console.warn('Polymarket CLOB API error:', response.status);
        return null;
      }

      const data: any = await response.json();

      // Get best bid/ask
      const bestBid = data.bids?.[0];
      const bestAsk = data.asks?.[0];

      return {
        yes: {
          bid: bestBid ? parseFloat(bestBid.price) * 100 : 0,
          ask: bestAsk ? parseFloat(bestAsk.price) * 100 : 100
        },
        no: {
          bid: 0, // Would need NO token ID
          ask: 100
        }
      };
    } catch (error) {
      console.error('Error fetching orderbook:', error);
      return null;
    }
  }

  /**
   * Get current price for a token (PUBLIC API - no auth required)
   */
  async getPrice(tokenId: string, side: 'buy' | 'sell' = 'buy'): Promise<number | null> {
    try {
      const response = await fetch(`${this.baseUrl}/price?token_id=${tokenId}&side=${side}`);

      if (!response.ok) return null;

      const data: any = await response.json();
      return parseFloat(data.price) * 100; // Convert to cents
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

      // Check if we have token IDs for this market
      if (!matchedMarket.clobTokenIds) {
        console.warn(`⚠️ No CLOB token IDs for market: ${matchedMarket.title}`);
        continue;
      }

      // Get orderbook using the YES token ID
      const orderbook = await this.getOrderBook(matchedMarket.clobTokenIds.yes);
      if (!orderbook) continue;

      // Get NO side price if available
      let noOrderbook = null;
      if (matchedMarket.clobTokenIds.no) {
        noOrderbook = await this.getOrderBook(matchedMarket.clobTokenIds.no);
      }

      // Calculate edge
      const modelProb = pick.confidence;
      const yesPrice = orderbook.yes.ask;
      const noPrice = noOrderbook?.yes?.ask || (100 - yesPrice); // Fallback: assume NO = 100 - YES

      const yesEdge = modelProb - yesPrice;
      const noEdge = (100 - modelProb) - noPrice;

      let side: 'yes' | 'no' | null = null;
      let edge = 0;
      let price = 0;
      let tokenId: string | undefined;

      if (yesEdge >= minEdge) {
        side = 'yes';
        edge = yesEdge;
        price = yesPrice;
        tokenId = matchedMarket.clobTokenIds.yes;
      } else if (noEdge >= minEdge) {
        side = 'no';
        edge = noEdge;
        price = noPrice;
        tokenId = matchedMarket.clobTokenIds.no;
      }

      if (!side || !tokenId) continue;

      const stake = this.calculateStake(pick.confidence, edge);

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
        requiredCapital: stake,
        potentialReturn: stake * (edge / 100),
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
          },
          {
            source: 'Progno',
            metric: 'Model Confidence',
            value: `${pick.confidence}%`,
            relevance: 90,
            timestamp: new Date().toISOString()
          }
        ],
        action: {
          platform: 'polymarket',
          actionType: 'bet',
          amount: stake,
          target: `${matchedMarket.title} (${side})`,
          instructions: [
            `Go to polymarket.com/market/${matchedMarket.slug}`,
            `Buy ${side.toUpperCase()} at ≤${price}¢`,
            `Stake: $${stake}`
          ],
          // Enable auto-execution if wallet is configured and edge is good
          autoExecute: this.isTradingEnabled() && edge >= 5 && pick.confidence >= 70,
          // Store token ID and trade details for execution
          metadata: {
            tokenId,
            side: side.toUpperCase(),
            price,
            size: stake
          }
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
      // Skip markets without token IDs
      if (!poly.clobTokenIds?.yes) continue;

      // Find matching Kalshi market
      const kalshiMatch = kalshiMarkets.find(k =>
        this.titlesMatch(k.title, poly.title)
      );

      if (!kalshiMatch) continue;

      // Get Polymarket orderbook using token ID
      const polyBook = await this.getOrderBook(poly.clobTokenIds.yes);
      if (!polyBook) continue;

      // Check for arbitrage: buy YES on one, buy NO on other
      const kalshiYes = kalshiMatch.yesPrice;
      const kalshiNo = kalshiMatch.noPrice;
      const polyYes = polyBook.yes.ask;
      const polyNo = polyBook.no.ask || (100 - polyYes);

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
              platform: 'polymarket', // Primary platform
              actionType: 'bet',
              amount: 100,
              target: poly.title,
              instructions: [
                `On ${buyYesOn}: Buy YES at ${cheaperYes}¢`,
                `On ${buyNoOn}: Buy NO at ${cheaperNo}¢`,
                `Profit: $${profit.toFixed(2)} per $100 staked`
              ],
              autoExecute: false, // Arbitrage requires manual execution on both platforms
              metadata: buyYesOn === 'Polymarket' && poly.clobTokenIds ? {
                tokenId: poly.clobTokenIds.yes,
                side: 'BUY',
                price: cheaperYes
              } : undefined
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
    return apiMarkets.map(m => {
      // Extract clobTokenIds from the market data
      // Gamma API returns clobTokenIds as array [yesTokenId, noTokenId]
      let yesTokenId: string | undefined;
      let noTokenId: string | undefined;

      if (m.clobTokenIds && Array.isArray(m.clobTokenIds) && m.clobTokenIds.length >= 2) {
        yesTokenId = m.clobTokenIds[0];
        noTokenId = m.clobTokenIds[1];
      } else if (m.clobTokenId) {
        // Single token ID format
        yesTokenId = m.clobTokenId;
      }

      // Parse outcomes - could be string JSON or array
      let outcomes: any[] = [];
      if (m.outcomes) {
        if (Array.isArray(m.outcomes)) {
          outcomes = m.outcomes;
        } else if (typeof m.outcomes === 'string') {
          try {
            outcomes = JSON.parse(m.outcomes);
          } catch {
            outcomes = [];
          }
        }
      }

      // Parse outcomePrices similarly
      let outcomePrices: number[] = [];
      if (m.outcomePrices) {
        if (Array.isArray(m.outcomePrices)) {
          outcomePrices = m.outcomePrices;
        } else if (typeof m.outcomePrices === 'string') {
          try {
            outcomePrices = JSON.parse(m.outcomePrices);
          } catch {
            outcomePrices = [];
          }
        }
      }

      // Get yes/no prices from outcomes or fallback to outcomePrices
      let yesPrice = 50;
      let noPrice = 50;

      if (outcomes.length > 0) {
        const yesOutcome = outcomes.find((o: any) =>
          (typeof o === 'string' && o.toLowerCase() === 'yes') ||
          (typeof o === 'object' && o.name?.toLowerCase() === 'yes')
        );
        if (yesOutcome && typeof yesOutcome === 'object' && yesOutcome.price != null) {
          yesPrice = yesOutcome.price * 100;
        } else if (outcomePrices.length >= 2) {
          yesPrice = outcomePrices[0] * 100;
          noPrice = outcomePrices[1] * 100;
        }
      } else if (outcomePrices.length >= 2) {
        yesPrice = outcomePrices[0] * 100;
        noPrice = outcomePrices[1] * 100;
      }

      return {
        id: m.id || m.conditionId,
        title: m.title || m.question || m.eventTitle,
        slug: m.slug || m.id,
        description: m.description,
        category: m.category,
        yesPrice,
        noPrice,
        volume: m.volume || 0,
        liquidity: m.liquidity || 0,
        expiresAt: m.endDate || m.resolutionDate || m.expirationDate,
        resolutionDate: m.resolutionDate,
        status: m.active ? 'active' : (m.resolved ? 'resolved' : 'closed'),
        outcomes,
        clobTokenIds: yesTokenId && noTokenId ? { yes: yesTokenId, no: noTokenId } : undefined,
        eventTitle: m.eventTitle,
        tags: m.tags
      };
    });
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

  /**
   * Create and sign a CLOB order
   */
  async createSignedOrder(
    tokenId: string,
    side: 'BUY' | 'SELL',
    size: number, // In USDC (e.g., 10 for $10)
    price: number // In cents (0-100)
  ): Promise<ClobSignedOrder | null> {
    if (!this.wallet || !this.walletAddress) {
      console.error('❌ Cannot create order: wallet not configured');
      return null;
    }

    try {
      // Get nonce for this maker
      const nonce = await this.getNonce(this.walletAddress);

      // Calculate amounts
      // Price is in cents (0-100), size is in USDC
      // For BUY: makerAmount = size * (price/100), takerAmount = size
      // For SELL: makerAmount = size, takerAmount = size * (price/100)
      const priceDecimal = price / 100;
      const sizeWei = ethers.parseUnits(size.toString(), 6); // USDC has 6 decimals
      const makerAmount = side === 'BUY'
        ? ethers.parseUnits((size * priceDecimal).toString(), 6)
        : sizeWei;
      const takerAmount = side === 'BUY'
        ? sizeWei
        : ethers.parseUnits((size * priceDecimal).toString(), 6);

      // Build order
      const expiration = Math.floor(Date.now() / 1000) + 86400; // 24 hours
      const salt = ethers.hexlify(ethers.randomBytes(32));

      const order: ClobOrder = {
        salt,
        maker: this.walletAddress,
        signer: this.walletAddress,
        taker: '0x0000000000000000000000000000000000000000', // Open order (any taker)
        tokenId,
        makerAmount: makerAmount.toString(),
        takerAmount: takerAmount.toString(),
        expiration: expiration.toString(),
        nonce: nonce.toString(),
        feeRateBps: '0', // No fee for now
        side,
        signatureType: 0 // EOA signature
      };

      // Create EIP-712 signature
      const signature = await this.signOrder(order);

      return { ...order, signature };
    } catch (error) {
      console.error('Error creating signed order:', error);
      return null;
    }
  }

  /**
   * Sign a CLOB order using EIP-712
   */
  private async signOrder(order: ClobOrder): Promise<string> {
    if (!this.wallet) throw new Error('Wallet not initialized');

    // Polymarket CLOB EIP-712 domain
    const domain = {
      name: 'Polymarket CLOB',
      version: '1',
      chainId: 137, // Polygon mainnet
      verifyingContract: '0x4bFb41d5B3570DeFd03C39a9A4D8dE7Bd7bCC3E0' // CLOB contract
    };

    // EIP-712 types for CLOB order
    const types = {
      Order: [
        { name: 'salt', type: 'uint256' },
        { name: 'maker', type: 'address' },
        { name: 'signer', type: 'address' },
        { name: 'taker', type: 'address' },
        { name: 'tokenId', type: 'uint256' },
        { name: 'makerAmount', type: 'uint256' },
        { name: 'takerAmount', type: 'uint256' },
        { name: 'expiration', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'feeRateBps', type: 'uint256' },
        { name: 'side', type: 'string' },
        { name: 'signatureType', type: 'uint256' }
      ]
    };

    // Sign the order
    const signature = await this.wallet.signTypedData(domain, types, order);
    return signature;
  }

  /**
   * Get nonce from CLOB API
   */
  private async getNonce(maker: string): Promise<number> {
    // Check cache first
    const cached = this.nonceCounter.get(maker);
    if (cached !== undefined) {
      this.nonceCounter.set(maker, cached + 1);
      return cached + 1;
    }

    try {
      // Fetch current nonce from API
      const response = await fetch(`${this.baseUrl}/nonce?address=${maker}`, {
        headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}
      });

      if (!response.ok) {
        console.warn('Failed to fetch nonce, using 0');
        this.nonceCounter.set(maker, 0);
        return 0;
      }

      const data: any = await response.json();
      const nonce = data.nonce || 0;
      this.nonceCounter.set(maker, nonce);
      return nonce;
    } catch (error) {
      console.warn('Error fetching nonce, using 0:', error);
      this.nonceCounter.set(maker, 0);
      return 0;
    }
  }

  /**
   * Submit a signed order to the CLOB
   */
  async submitOrder(signedOrder: ClobSignedOrder): Promise<OrderResult> {
    try {
      const response = await fetch(`${this.baseUrl}/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
        },
        body: JSON.stringify(signedOrder)
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `CLOB API error ${response.status}: ${error}`
        };
      }

      const result: any = await response.json();

      return {
        success: true,
        orderId: result.orderId,
        filled: result.filled,
        remainingSize: result.remainingSize
      };
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error}`
      };
    }
  }

  /**
   * Execute a complete trade (create, sign, and submit order)
   */
  async executeTrade(
    tokenId: string,
    side: 'BUY' | 'SELL',
    size: number,
    price: number
  ): Promise<OrderResult> {
    if (!this.isTradingEnabled()) {
      return {
        success: false,
        error: 'Trading not enabled - configure POLYMARKET_PRIVATE_KEY and POLYMARKET_WALLET'
      };
    }

    console.log(`📝 Creating ${side} order: ${size} USDC @ ${price}¢`);

    const signedOrder = await this.createSignedOrder(tokenId, side, size, price);
    if (!signedOrder) {
      return { success: false, error: 'Failed to create order' };
    }

    console.log(`✍️ Order signed, submitting to CLOB...`);

    const result = await this.submitOrder(signedOrder);

    if (result.success) {
      console.log(`✅ Order submitted: ${result.orderId}`);
      if (result.filled) {
        console.log(`🎉 Order filled completely!`);
      } else if (result.remainingSize && result.remainingSize > 0) {
        console.log(`⏳ Order partially filled, ${result.remainingSize} remaining`);
      }
    } else {
      console.error(`❌ Order failed: ${result.error}`);
    }

    return result;
  }

  /**
   * Cancel an existing order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    if (!this.isTradingEnabled()) {
      console.error('❌ Cannot cancel: wallet not configured');
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/order/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
        },
        body: JSON.stringify({
          maker: this.walletAddress,
          orderId
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error cancelling order:', error);
      return false;
    }
  }
}

export const polymarketTrader = new PolymarketTrader();
