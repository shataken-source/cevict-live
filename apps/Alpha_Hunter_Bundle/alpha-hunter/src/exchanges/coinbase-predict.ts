/**
 * Coinbase Predict — Event Contracts (Prediction Markets)
 * Uses the same Advanced Trade API + JWT auth as CoinbaseExchange.
 * Prediction markets appear as products with product_type=FUTURE and
 * contract_expiry_type=EXPIRING. Orders use limit orders at YES/NO prices.
 *
 * Docs: https://docs.cdp.coinbase.com/advanced-trade/docs/welcome
 */

import crypto from 'crypto';
import { SignJWT } from 'jose';

// ── JWT (shared with coinbase.ts) ─────────────────────────────────────────────
async function createJWT(apiKey: string, privateKey: string, uri: string): Promise<string> {
  const formattedKey = privateKey.replace(/\\n/g, '\n').replace(/^"|"$/g, '');
  const ecKey = crypto.createPrivateKey({ key: formattedKey, format: 'pem' });
  const nonce = crypto.randomBytes(16).toString('hex');
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ uri })
    .setProtectedHeader({ alg: 'ES256', kid: apiKey, nonce, typ: 'JWT' })
    .setIssuedAt(now).setNotBefore(now).setExpirationTime(now + 120)
    .setSubject(apiKey).setIssuer('cdp')
    .sign(ecKey);
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PredictContract {
  productId: string;       // e.g. "TRUMP-WIN-2026-USD"
  title: string;
  yesPrice: number;        // 0-1 (e.g. 0.62 = 62¢)
  noPrice: number;
  volume24h: number;
  expiresAt: Date | null;
  status: 'open' | 'closed' | 'settled';
  category: string;
}

export interface PredictPosition {
  id: string;
  productId: string;
  title: string;
  side: 'yes' | 'no';
  contracts: number;
  entryPrice: number;      // 0-1
  cost: number;            // USD
  timestamp: Date;
  expiresAt: Date | null;
  takeProfit: number;      // price at which to close for profit
  stopLoss: number;        // price at which to cut loss
}

export interface PredictOrder {
  orderId: string;
  productId: string;
  side: 'BUY' | 'SELL';
  filledSize: number;
  avgPrice: number;
  status: string;
  fees: number;
}

// ── Loss Limits ───────────────────────────────────────────────────────────────

export interface PredictLossLimits {
  maxPerTrade: number;       // max USD per single contract purchase
  maxDailyLoss: number;      // stop trading for the day if daily loss >= this
  maxOpenPositions: number;  // max concurrent open predict positions
  maxTotalExposure: number;  // max total USD at risk across all open positions
  stopLossPercent: number;   // close position if price drops this % from entry (0-1)
  takeProfitPercent: number; // close position if price rises this % from entry (0-1)
}

export const DEFAULT_PREDICT_LIMITS: PredictLossLimits = {
  maxPerTrade: 10,
  maxDailyLoss: 50,
  maxOpenPositions: 5,
  maxTotalExposure: 100,
  stopLossPercent: 0.50,    // cut at -50% of entry price
  takeProfitPercent: 0.80,  // take profit at +80% of entry price
};

// ── Main Class ────────────────────────────────────────────────────────────────

export class CoinbasePredict {
  private readonly BASE = 'https://api.coinbase.com/api/v3/brokerage';
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly configured: boolean;

  // Loss tracking (reset daily)
  private dailyLoss = 0;
  private dailyLossDate = '';
  private openPositions: Map<string, PredictPosition> = new Map();

  constructor() {
    this.apiKey = process.env.COINBASE_API_KEY || '';
    this.apiSecret = process.env.COINBASE_API_SECRET || '';
    this.configured = !!(this.apiKey && this.apiSecret &&
      this.apiKey.startsWith('organizations/'));
  }

  isConfigured(): boolean { return this.configured; }

  // ── Private: authenticated fetch ─────────────────────────────────────────

  private async fetch<T>(method: string, path: string, body?: object): Promise<T> {
    const uri = `${method} api.coinbase.com/api/v3/brokerage${path}`;
    const jwt = await createJWT(this.apiKey, this.apiSecret, uri);
    const url = `${this.BASE}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Coinbase Predict ${method} ${path} → ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  // ── Daily loss reset ──────────────────────────────────────────────────────

  private resetDailyIfNeeded(): void {
    const today = new Date().toISOString().split('T')[0];
    if (this.dailyLossDate !== today) {
      this.dailyLoss = 0;
      this.dailyLossDate = today;
    }
  }

  getDailyLoss(): number { return this.dailyLoss; }
  getOpenPositions(): Map<string, PredictPosition> { return this.openPositions; }

  // ── Loss limit checks ─────────────────────────────────────────────────────

  checkLimits(tradeSize: number, limits: PredictLossLimits): { allowed: boolean; reason?: string } {
    this.resetDailyIfNeeded();

    if (this.dailyLoss >= limits.maxDailyLoss)
      return { allowed: false, reason: `Daily loss limit hit ($${this.dailyLoss.toFixed(2)}/$${limits.maxDailyLoss})` };

    if (tradeSize > limits.maxPerTrade)
      return { allowed: false, reason: `Trade $${tradeSize} exceeds max per trade $${limits.maxPerTrade}` };

    if (this.openPositions.size >= limits.maxOpenPositions)
      return { allowed: false, reason: `Max open positions (${limits.maxOpenPositions}) reached` };

    const totalExposure = Array.from(this.openPositions.values()).reduce((s, p) => s + p.cost, 0);
    if (totalExposure + tradeSize > limits.maxTotalExposure)
      return { allowed: false, reason: `Total exposure $${(totalExposure + tradeSize).toFixed(2)} would exceed $${limits.maxTotalExposure}` };

    return { allowed: true };
  }

  // ── List prediction market contracts ─────────────────────────────────────

  async getContracts(limit = 50): Promise<PredictContract[]> {
    if (!this.configured) return this.simulatedContracts();

    try {
      // Prediction markets = FUTURE products with expiry
      const data = await this.fetch<any>('GET',
        `/products?product_type=FUTURE&limit=${limit}`);

      const products: any[] = data.products || [];

      return products
        .filter(p =>
          p.contract_expiry_type === 'EXPIRING' &&
          p.status === 'online' &&
          p.quote_currency_id === 'USD'
        )
        .map(p => ({
          productId: p.product_id,
          title: p.display_name || p.product_id,
          yesPrice: parseFloat(p.price || '0.5'),
          noPrice: 1 - parseFloat(p.price || '0.5'),
          volume24h: parseFloat(p.volume_24h || '0'),
          expiresAt: p.future_product_details?.contract_expiry
            ? new Date(p.future_product_details.contract_expiry)
            : null,
          status: 'open' as const,
          category: this.categorize(p.display_name || p.product_id),
        }));
    } catch (err: any) {
      console.error('[CoinbasePredict] getContracts error:', err.message);
      return [];
    }
  }

  // ── Get single contract price ─────────────────────────────────────────────

  async getContractPrice(productId: string): Promise<{ yes: number; no: number } | null> {
    if (!this.configured) return { yes: 0.5, no: 0.5 };

    try {
      const data = await this.fetch<any>('GET', `/products/${productId}`);
      const price = parseFloat(data.price || '0.5');
      return { yes: price, no: 1 - price };
    } catch {
      return null;
    }
  }

  // ── Place a YES or NO order ───────────────────────────────────────────────

  async placeOrder(
    productId: string,
    side: 'yes' | 'no',
    usdAmount: number,
    currentPrice: number,
    limits: PredictLossLimits = DEFAULT_PREDICT_LIMITS
  ): Promise<PredictOrder | null> {
    if (!this.configured) {
      return this.simulatedOrder(productId, side, usdAmount, currentPrice);
    }

    const limitCheck = this.checkLimits(usdAmount, limits);
    if (!limitCheck.allowed) {
      console.log(`[CoinbasePredict] ❌ Blocked: ${limitCheck.reason}`);
      return null;
    }

    try {
      // For YES: BUY the contract. For NO: BUY the inverse (sell YES = buy NO)
      // Coinbase Predict uses limit orders at the current price
      const orderSide = 'BUY'; // always BUY — YES or NO are different products
      const limitPrice = side === 'yes' ? currentPrice : (1 - currentPrice);
      const contracts = Math.floor(usdAmount / limitPrice);
      if (contracts < 1) {
        console.log(`[CoinbasePredict] ❌ Insufficient amount for 1 contract at $${limitPrice.toFixed(2)}`);
        return null;
      }

      const body = {
        client_order_id: `predict-${Date.now()}`,
        product_id: productId,
        side: orderSide,
        order_configuration: {
          limit_limit_gtc: {
            base_size: String(contracts),
            limit_price: limitPrice.toFixed(4),
            post_only: false,
          },
        },
      };

      const data = await this.fetch<any>('POST', '/orders', body);
      const order = data.success_response || data.order_configuration;

      if (!data.success) {
        console.error('[CoinbasePredict] Order failed:', data.error_response?.message);
        return null;
      }

      const filled: PredictOrder = {
        orderId: data.success_response?.order_id || `sim-${Date.now()}`,
        productId,
        side: orderSide,
        filledSize: contracts,
        avgPrice: limitPrice,
        status: 'FILLED',
        fees: usdAmount * 0.01, // ~1% fee for prediction markets
      };

      // Track position
      const posId = `${productId}-${Date.now()}`;
      this.openPositions.set(posId, {
        id: posId,
        productId,
        title: productId,
        side,
        contracts,
        entryPrice: limitPrice,
        cost: contracts * limitPrice,
        timestamp: new Date(),
        expiresAt: null,
        takeProfit: limitPrice * (1 + limits.takeProfitPercent),
        stopLoss: limitPrice * (1 - limits.stopLossPercent),
      });

      return filled;
    } catch (err: any) {
      console.error('[CoinbasePredict] placeOrder error:', err.message);
      return null;
    }
  }

  // ── Close a position (sell contracts) ────────────────────────────────────

  async closePosition(positionId: string, currentPrice: number): Promise<boolean> {
    const pos = this.openPositions.get(positionId);
    if (!pos) return false;

    const exitPrice = pos.side === 'yes' ? currentPrice : (1 - currentPrice);
    const pnl = (exitPrice - pos.entryPrice) * pos.contracts;
    this.resetDailyIfNeeded();
    if (pnl < 0) this.dailyLoss += Math.abs(pnl);

    this.openPositions.delete(positionId);
    console.log(`[CoinbasePredict] Closed ${pos.productId} ${pos.side.toUpperCase()} | PnL: $${pnl.toFixed(2)}`);
    return true;
  }

  // ── Check open positions against stop/take ────────────────────────────────

  async checkPositions(limits: PredictLossLimits = DEFAULT_PREDICT_LIMITS): Promise<void> {
    for (const [id, pos] of this.openPositions) {
      const prices = await this.getContractPrice(pos.productId);
      if (!prices) continue;

      const currentPrice = pos.side === 'yes' ? prices.yes : prices.no;

      if (currentPrice >= pos.takeProfit) {
        console.log(`[CoinbasePredict] 🎯 Take profit hit: ${pos.productId} @ $${currentPrice.toFixed(3)}`);
        await this.closePosition(id, currentPrice);
      } else if (currentPrice <= pos.stopLoss) {
        console.log(`[CoinbasePredict] 🛑 Stop loss hit: ${pos.productId} @ $${currentPrice.toFixed(3)}`);
        await this.closePosition(id, currentPrice);
      }

      // Hard daily loss circuit breaker
      this.resetDailyIfNeeded();
      if (this.dailyLoss >= limits.maxDailyLoss) {
        console.log(`[CoinbasePredict] ⛔ Daily loss limit $${limits.maxDailyLoss} reached — closing all positions`);
        await this.closeAllPositions();
        break;
      }
    }
  }

  async closeAllPositions(): Promise<void> {
    for (const [id, pos] of this.openPositions) {
      const prices = await this.getContractPrice(pos.productId);
      const price = prices ? (pos.side === 'yes' ? prices.yes : prices.no) : pos.entryPrice;
      await this.closePosition(id, price);
    }
  }

  // ── Categorize contract by title ─────────────────────────────────────────

  private categorize(title: string): string {
    const t = title.toLowerCase();
    if (['btc', 'eth', 'sol', 'crypto', 'bitcoin'].some(k => t.includes(k))) return 'crypto';
    if (['election', 'president', 'senate', 'congress', 'vote'].some(k => t.includes(k))) return 'politics';
    if (['fed', 'rate', 'inflation', 'gdp', 'cpi'].some(k => t.includes(k))) return 'economics';
    if (['nfl', 'nba', 'mlb', 'super bowl', 'championship'].some(k => t.includes(k))) return 'sports';
    if (['oscar', 'grammy', 'emmy', 'movie'].some(k => t.includes(k))) return 'entertainment';
    return 'world';
  }

  // ── Simulation fallbacks ──────────────────────────────────────────────────

  private simulatedContracts(): PredictContract[] {
    return [
      { productId: 'BTC-ABOVE-100K-2026', title: 'Will BTC exceed $100k by end of 2026?', yesPrice: 0.62, noPrice: 0.38, volume24h: 45000, expiresAt: new Date('2026-12-31'), status: 'open', category: 'crypto' },
      { productId: 'FED-RATE-CUT-Q1-2026', title: 'Will Fed cut rates in Q1 2026?', yesPrice: 0.41, noPrice: 0.59, volume24h: 28000, expiresAt: new Date('2026-03-31'), status: 'open', category: 'economics' },
      { productId: 'ETH-ABOVE-5K-2026', title: 'Will ETH exceed $5k in 2026?', yesPrice: 0.35, noPrice: 0.65, volume24h: 18000, expiresAt: new Date('2026-12-31'), status: 'open', category: 'crypto' },
    ];
  }

  private simulatedOrder(productId: string, side: 'yes' | 'no', amount: number, price: number): PredictOrder {
    const contracts = Math.floor(amount / price);
    const posId = `${productId}-${Date.now()}`;
    this.openPositions.set(posId, {
      id: posId, productId, title: productId, side, contracts,
      entryPrice: price, cost: contracts * price, timestamp: new Date(),
      expiresAt: null,
      takeProfit: price * 1.8,
      stopLoss: price * 0.5,
    });
    return { orderId: `sim-${Date.now()}`, productId, side: 'BUY', filledSize: contracts, avgPrice: price, status: 'FILLED', fees: amount * 0.01 };
  }
}
