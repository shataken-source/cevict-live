/**
 * Kalshi Trader (Smart Filter Edition - 45 Day Limit)
 */
import { PredictionMarket, Opportunity, Trade } from '../types';
import crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// --- ROOT PATH FINDER ---
const detectRootPath = (): string => {
  const explicitRoot = 'C:/cevict-live/.env.local';
  if (fs.existsSync(explicitRoot)) return explicitRoot;
  let currentPath = process.cwd();
  for (let i = 0; i < 5; i++) {
    const envPath = path.join(currentPath, '.env.local');
    if (fs.existsSync(envPath) && !envPath.includes(path.join('apps', path.sep))) return envPath;
    const parentPath = path.resolve(currentPath, '..');
    if (parentPath === currentPath) break;
    currentPath = parentPath;
  }
  return path.resolve(process.cwd(), '..', '..', '.env.local');
};
const envPath = detectRootPath();
if (fs.existsSync(envPath)) dotenv.config({ path: envPath, override: true });

export class KalshiTrader {
  private apiKeyId: string;
  private privateKey: string = '';
  private baseUrl: string;
  private isProduction: boolean;
  private keyConfigured: boolean = false;

  // Rate limiting state (Kalshi Basic tier: 10 req/sec)
  private rateLimitState: {
    requests: number[];
    maxPerSecond: number;
    lastRequestTime: number;
  } = {
    requests: [],
    maxPerSecond: 8, // Conservative: 8 req/sec to stay under 10 limit
    lastRequestTime: 0,
  };

  // Orderbook cache (5 second TTL to reduce API calls)
  private orderbookCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly ORDERBOOK_CACHE_TTL = 5000; // 5 seconds

  constructor() {
    this.apiKeyId = process.env.KALSHI_API_KEY_ID || '';
    const rawKey = process.env.KALSHI_PRIVATE_KEY || '';
    if (rawKey) {
        this.privateKey = rawKey.replace(/\\n/g, '\n').replace(/\"/g, '');
        this.keyConfigured = true;
    }
    const kalshiEnv = process.env.KALSHI_ENV;
    this.baseUrl = kalshiEnv === 'production' 
      ? 'https://api.elections.kalshi.com/trade-api/v2' 
      : 'https://demo-api.kalshi.co/trade-api/v2';
    this.isProduction = kalshiEnv === 'production';
  }

  /**
   * Enforce rate limiting: 8 requests/second max (stays under 10/sec limit)
   * Adds 500ms delay between requests if approaching limit
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const oneSecondAgo = now - 1000;

    // Clean up old request timestamps
    this.rateLimitState.requests = this.rateLimitState.requests.filter(
      ts => ts > oneSecondAgo
    );

    // If at limit, wait before proceeding
    if (this.rateLimitState.requests.length >= this.rateLimitState.maxPerSecond) {
      const waitTime = 500; // 500ms delay as recommended
      console.log(`   ⏸️  Rate limit approaching (${this.rateLimitState.requests.length}/${this.rateLimitState.maxPerSecond}/sec) - waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      // Recursively check again after delay
      return this.enforceRateLimit();
    }

    // Enforce minimum 500ms between orderbook fetches
    const timeSinceLastRequest = now - this.rateLimitState.lastRequestTime;
    if (timeSinceLastRequest < 500) {
      const waitTime = 500 - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Record this request
    this.rateLimitState.requests.push(now);
    this.rateLimitState.lastRequestTime = Date.now();
  }

  private async signRequestWithTimestamp(method: string, path: string, body?: any): Promise<{ signature: string; timestamp: string }> {
    if (!this.privateKey) return { signature: '', timestamp: '' };
    const timestamp = Date.now().toString();
    const pathWithoutQuery = path.split('?')[0];
    const message = `${timestamp}${method}${pathWithoutQuery}`;
    try {
      const signature = crypto.sign('sha256', Buffer.from(message) as any, {
        key: this.privateKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
      });
      return { signature: signature.toString('base64'), timestamp };
    } catch (err) {
      return { signature: '', timestamp: '' };
    }
  }

  // --- SMART MARKET FETCHING ---
  async getMarkets(category?: string): Promise<PredictionMarket[]> {
    if (!this.apiKeyId || !this.keyConfigured) return [];

    try {
      // 1. CALCULATE TIME WINDOW (Next 2 Days / 48 Hours)
      const now = Math.floor(Date.now() / 1000);
      const twoDaysLater = now + (2 * 24 * 60 * 60);

      // 2. BUILD QUERY
      let fullPath = `/trade-api/v2/markets?status=open&limit=1000&max_close_ts=${twoDaysLater}`;
      if (category) fullPath += `&series_ticker=${category}`;

      console.log(`   📡 API Query: fetching markets expiring before ${new Date(twoDaysLater * 1000).toLocaleDateString()}...`);

      const { signature, timestamp } = await this.signRequestWithTimestamp('GET', fullPath);
      if (!signature) return [];

      const apiUrl = this.baseUrl.replace('/trade-api/v2', '') + fullPath;
      const response = await fetch(apiUrl, {
        headers: {
          'KALSHI-ACCESS-KEY': this.apiKeyId,
          'KALSHI-ACCESS-SIGNATURE': signature,
          'KALSHI-ACCESS-TIMESTAMP': timestamp,
        },
      });

      if (!response.ok) return [];
      const data = await response.json();
      return this.transformMarkets(data.markets || []);
    } catch (error) {
      console.error('Error fetching markets:', error);
      return [];
    }
  }

  async getBalance(): Promise<number> {
    if (!this.keyConfigured) return 500;
    try {
      const fullPath = '/trade-api/v2/portfolio/balance';
      const { signature, timestamp } = await this.signRequestWithTimestamp('GET', fullPath);
      if (!signature) return 500;
      const apiUrl = this.baseUrl.replace('/trade-api/v2', '') + fullPath;
      const response = await fetch(apiUrl, {
        headers: {
          'KALSHI-ACCESS-KEY': this.apiKeyId,
          'KALSHI-ACCESS-SIGNATURE': signature,
          'KALSHI-ACCESS-TIMESTAMP': timestamp,
        },
      });
      const data = await response.json();
      return (data.balance || 0) / 100;
    } catch (e) { return 500; }
  }

  /**
   * Get orderbook for a market to calculate Maker prices
   * Returns best bid/ask for YES and NO sides
   * 
   * RATE LIMIT SAFE:
   * - Caches orderbook for 5 seconds to reduce API calls
   * - Enforces 500ms delay between fetches
   * - Handles 429 errors with exponential backoff
   */
  async getOrderBook(ticker: string): Promise<{
    yes: { bid: number; ask: number };
    no: { bid: number; ask: number };
  } | null> {
    if (!this.keyConfigured) return null;

    // Check cache first (5 second TTL)
    const cached = this.orderbookCache.get(ticker);
    const now = Date.now();
    if (cached && (now - cached.timestamp) < this.ORDERBOOK_CACHE_TTL) {
      return cached.data;
    }

    // Enforce rate limiting before API call
    await this.enforceRateLimit();

    try {
      const fullPath = `/trade-api/v2/markets/${ticker}/orderbook`;
      const { signature, timestamp } = await this.signRequestWithTimestamp('GET', fullPath);
      if (!signature) return null;
      
      const apiUrl = this.baseUrl.replace('/trade-api/v2', '') + fullPath;
      let response: Response | null = null;
      let retries = 0;
      const maxRetries = 3;
      let currentSignature = signature;
      let currentTimestamp = timestamp;

      // Retry logic for 429 errors
      while (retries <= maxRetries) {
        response = await fetch(apiUrl, {
          headers: {
            'KALSHI-ACCESS-KEY': this.apiKeyId,
            'KALSHI-ACCESS-SIGNATURE': currentSignature,
            'KALSHI-ACCESS-TIMESTAMP': currentTimestamp,
          },
        });

        // Handle 429 Too Many Requests
        if (response.status === 429) {
          retries++;
          const backoffDelay = Math.min(2000, 500 * Math.pow(2, retries)); // Exponential backoff: 500ms, 1000ms, 2000ms
          console.warn(`   ⚠️  Rate limit hit (429) - waiting ${backoffDelay}ms before retry ${retries}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          // Update signature/timestamp for new request
          const sigResult = await this.signRequestWithTimestamp('GET', fullPath);
          if (sigResult.signature) {
            currentSignature = sigResult.signature;
            currentTimestamp = sigResult.timestamp;
            continue; // Retry with new signature
          }
          return null;
        }

        if (!response.ok) {
          console.error(`   ❌ Orderbook fetch failed: ${response.status} ${response.statusText}`);
          return null;
        }

        // Success - break retry loop
        break;
      }

      if (!response || !response.ok) return null;
      
      const data = await response.json();
      
      // Extract best bid/ask from orderbook
      const yesBids = data.yes?.bids || [];
      const yesAsks = data.yes?.asks || [];
      const noBids = data.no?.bids || [];
      const noAsks = data.no?.asks || [];
      
      const orderbookData = {
        yes: {
          bid: yesBids.length > 0 ? yesBids[0].price : 50,
          ask: yesAsks.length > 0 ? yesAsks[0].price : 50,
        },
        no: {
          bid: noBids.length > 0 ? noBids[0].price : 50,
          ask: noAsks.length > 0 ? noAsks[0].price : 50,
        },
      };

      // Cache the result
      this.orderbookCache.set(ticker, {
        data: orderbookData,
        timestamp: now,
      });

      return orderbookData;
    } catch (e: any) {
      console.error(`   ❌ Error fetching orderbook for ${ticker}:`, e.message);
      return null;
    }
  }

  /**
   * Calculate Maker price (1 cent inside spread)
   * For BUY: best_bid + 1 cent (better than current best bid)
   * For SELL: best_ask - 1 cent (better than current best ask)
   * Returns null if spread is too tight (< 2 cents)
   */
  public calculateMakerPrice(
    orderBook: { yes: { bid: number; ask: number }; no: { bid: number; ask: number } },
    side: 'yes' | 'no',
    action: 'buy' | 'sell'
  ): { price: number; spread: number } | null {
    const market = side === 'yes' ? orderBook.yes : orderBook.no;
    const bestBid = market.bid;
    const bestAsk = market.ask;
    const spread = bestAsk - bestBid;
    
    // Skip if spread is too tight (< 2 cents) - not profitable after fees
    if (spread < 2) {
      return null;
    }
    
    // Calculate maker price: 1 cent inside spread
    let makerPrice: number;
    if (action === 'buy') {
      // Buying: place at best_bid + 1 cent (better than current best bid)
      makerPrice = Math.min(99, bestBid + 1);
    } else {
      // Selling: place at best_ask - 1 cent (better than current best ask)
      makerPrice = Math.max(1, bestAsk - 1);
    }
    
    return {
      price: Math.round(makerPrice),
      spread: spread,
    };
  }

  async placeOrder(order: any): Promise<any> {
      return this.executeTrade(order.ticker, order.side, order.count);
  }

  async buy(ticker: string, count: number, side: string): Promise<any> {
      return this.executeTrade(ticker, side, count);
  }

  /**
   * Place a limit order bet on Kalshi
   * @param ticker Market ticker
   * @param side 'yes' or 'no'
   * @param count Contract count (already calculated)
   * @param limitPrice Limit price in cents (0-100)
   * @returns Trade result
   */
  async placeBet(ticker: string, side: 'yes' | 'no', count: number, limitPrice: number): Promise<any> {
    if (!this.keyConfigured) return { status: 'simulated' };
    
    // CRITICAL: Verify count is a rounded integer derived from $5 notional allocation
    const countInteger = Math.round(count);
    if (countInteger <= 0) {
      throw new Error(`Invalid contract count: ${countInteger} (price: ${limitPrice})`);
    }

    const fullPath = '/trade-api/v2/portfolio/orders';
    
    // CRITICAL: Ensure limitPrice is strictly an integer (cents, 0-100)
    const priceInCents = Math.round(limitPrice);
    if (priceInCents < 0 || priceInCents > 100) {
      throw new Error(`Invalid price: ${priceInCents} cents (must be 0-100)`);
    }
    
    // SURGICAL PAYLOAD: Required fields for Kalshi API
    // ticker, side, action, count, type, and EITHER yes_price OR no_price
    // MAKER STRATEGY: Always use 'limit' orders (not 'market') to qualify for liquidity rebates
    const body: any = {
      ticker: ticker,
      side: side.toLowerCase(),
      action: 'buy', // Required by Kalshi API - 'buy' when placing bets
      count: countInteger, // Contract count (strictly integer, rounded from $5 allocation)
      type: 'limit', // CRITICAL: Use limit orders for Maker status (no fees, earns rebates)
    };

    // Set price based on side - ONLY yes_price OR no_price (strictly integer cents)
    if (side === 'yes') {
      body.yes_price = priceInCents; // Integer price in cents (0-100)
    } else {
      body.no_price = priceInCents; // Integer price in cents (0-100)
    }
    
    // CRITICAL: Manually delete dollar fields immediately before fetch
    // Use delete operator to ensure they are completely removed
    delete body.yes_price_dollars;
    delete body.no_price_dollars;
    
    // DELETE THE GARBAGE: Explicitly remove any field with "dollars" in the name
    Object.keys(body).forEach(key => {
      if (key.toLowerCase().includes('dollar')) {
        delete body[key];
      }
    });
    
    // CRITICAL VERIFICATION: Ensure payload contains ONLY allowed fields
    const allowedFields = ['ticker', 'side', 'action', 'count', 'type', 'yes_price', 'no_price'];
    const bodyKeys = Object.keys(body);
    const invalidFields = bodyKeys.filter(key => !allowedFields.includes(key));
    if (invalidFields.length > 0) {
      throw new Error(`CRITICAL: Invalid fields in payload: ${invalidFields.join(', ')}. Only allowed: ${allowedFields.join(', ')}`);
    }
    
    // Verify exactly one price field is set
    const hasYesPrice = body.yes_price !== undefined;
    const hasNoPrice = body.no_price !== undefined;
    if (hasYesPrice && hasNoPrice) {
      throw new Error('CRITICAL: Both yes_price and no_price set! Only one allowed.');
    }
    if (!hasYesPrice && !hasNoPrice) {
      throw new Error('CRITICAL: No price field set! Must set either yes_price or no_price.');
    }
    
    // Final check: ensure no dollar fields exist
    if (bodyKeys.some(key => key.toLowerCase().includes('dollar'))) {
      throw new Error('CRITICAL: Dollar fields still present after cleanup!');
    }

    // PRE-FLIGHT CHECK: Log exact JSON string being sent to Kalshi
    const payloadJson = JSON.stringify(body);
    console.log(`   🔍 [PRE-FLIGHT CHECK] Kalshi API Payload: ${payloadJson}`);
    
    // Verify payload is strictly integer-based
    if (typeof body.count !== 'number' || !Number.isInteger(body.count)) {
      throw new Error(`CRITICAL: count must be integer, got: ${typeof body.count} ${body.count}`);
    }
    if (body.yes_price !== undefined && (!Number.isInteger(body.yes_price) || body.yes_price < 0 || body.yes_price > 100)) {
      throw new Error(`CRITICAL: yes_price must be integer 0-100, got: ${body.yes_price}`);
    }
    if (body.no_price !== undefined && (!Number.isInteger(body.no_price) || body.no_price < 0 || body.no_price > 100)) {
      throw new Error(`CRITICAL: no_price must be integer 0-100, got: ${body.no_price}`);
    }
    
    const { signature, timestamp } = await this.signRequestWithTimestamp('POST', fullPath, body);
    if (!signature) throw new Error("Signature failed");

    const response = await fetch(`${this.baseUrl}/portfolio/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'KALSHI-ACCESS-KEY': this.apiKeyId,
        'KALSHI-ACCESS-SIGNATURE': signature,
        'KALSHI-ACCESS-TIMESTAMP': timestamp
      },
      body: payloadJson // Use the pre-validated JSON string
    });

    const data = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data));
    return data;
  }

  private async executeTrade(ticker: string, side: string, count: number) {
      if (!this.keyConfigured) return { status: 'simulated' };
      const fullPath = '/trade-api/v2/portfolio/orders';
      const body = {
        ticker: ticker,
        client_order_id: `bot_${Date.now()}`,
        side: side.toLowerCase(),
        action: 'buy',
        count: count,
        type: 'market'
      };

      const { signature, timestamp } = await this.signRequestWithTimestamp('POST', fullPath, body);
      if (!signature) throw new Error("Signature failed");

      const response = await fetch(`${this.baseUrl}/portfolio/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'KALSHI-ACCESS-KEY': this.apiKeyId,
            'KALSHI-ACCESS-SIGNATURE': signature,
            'KALSHI-ACCESS-TIMESTAMP': timestamp
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(JSON.stringify(data));
      return data;
  }

  private transformMarkets(apiMarkets: any[]): PredictionMarket[] {
    return apiMarkets.map(m => ({
      id: m.ticker,
      platform: 'Kalshi',
      title: m.title,
      category: m.category,
      yesPrice: m.yes_bid || 50,
      noPrice: m.no_bid || 50,
      volume: m.volume || 0,
      expiresAt: m.close_time,
      closeDate: m.close_time,
      aiPrediction: 50, // Default to 50% until analyzed
      edge: 0
    }));
  }
}
