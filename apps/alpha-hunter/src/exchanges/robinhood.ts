/**
 * Robinhood Crypto Exchange Integration
 * Uses Robinhood Crypto Trading API v1
 * Docs: https://docs.robinhood.com/crypto/trading/
 *
 * Authentication: Ed25519 digital signatures
 * Headers: x-api-key, x-signature (base64), x-timestamp (unix seconds UTC)
 * Message: "{api_key}{timestamp}{path}{method}{body}"
 */

import crypto from 'crypto';

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface RobinhoodAccount {
  account_number: string;
  status: string;
  buying_power: number;
  buying_power_currency: string;
}

interface RobinhoodHolding {
  asset_code: string;
  total_quantity: number;
  quantity_available_for_trading: number;
  cost_basis: number;
}

interface RobinhoodOrder {
  id: string;
  client_order_id: string;
  side: 'buy' | 'sell';
  type: string;
  symbol: string;
  state: string;
  filled_asset_quantity?: string;
  average_price?: string;
  executions?: any[];
  created_at: string;
}

interface RobinhoodTicker {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
}

// ─── Exchange Class ────────────────────────────────────────────────────────────

export class RobinhoodExchange {
  private apiKey: string;
  private privateKey: crypto.KeyObject | null = null;
  private baseUrl: string;
  private configured: boolean;

  constructor() {
    this.apiKey = process.env.ROBINHOOD_API_KEY || '';
    const base64PrivateKey = process.env.ROBINHOOD_PRIVATE_KEY || '';
    this.baseUrl = 'https://trading.robinhood.com';
    this.configured = false;

    if (this.apiKey && base64PrivateKey) {
      try {
        // Robinhood provides a base64-encoded Ed25519 private key (raw 32 bytes or 64 bytes seed+public)
        const privateBytes = Buffer.from(base64PrivateKey, 'base64');
        // Ed25519 private key is 32 bytes; some encodings include 64 bytes (seed+public)
        const seed = privateBytes.subarray(0, 32);
        this.privateKey = crypto.createPrivateKey({
          key: Buffer.concat([
            // PKCS8 DER prefix for Ed25519: 16 bytes header + 34 bytes (2-byte length wrapper + 32 byte key)
            Buffer.from('302e020100300506032b657004220420', 'hex'),
            seed,
          ]),
          format: 'der',
          type: 'pkcs8',
        });
        this.configured = true;
      } catch (err: any) {
        console.warn(`⚠️ Robinhood Ed25519 key import failed: ${err.message}`);
      }
    }

    if (!this.configured) {
      console.log('⚠️ Robinhood not configured - missing ROBINHOOD_API_KEY or ROBINHOOD_PRIVATE_KEY');
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────

  private sign(method: string, path: string, body: string, timestamp: number): string {
    if (!this.privateKey) throw new Error('Robinhood private key not loaded');

    const message = `${this.apiKey}${timestamp}${path}${method}${body}`;
    const signature = crypto.sign(null, Buffer.from(message, 'utf-8'), this.privateKey);
    return signature.toString('base64');
  }

  private async request(method: 'GET' | 'POST', path: string, body?: any): Promise<any> {
    if (!this.configured) {
      throw new Error('Robinhood not configured');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const bodyStr = body ? JSON.stringify(body) : '';
    const signature = this.sign(method, path, bodyStr, timestamp);

    const headers: Record<string, string> = {
      'x-api-key': this.apiKey,
      'x-signature': signature,
      'x-timestamp': timestamp.toString(),
      'Content-Type': 'application/json',
    };

    const url = `${this.baseUrl}${path}`;
    const opts: RequestInit = { method, headers };
    if (method === 'POST' && bodyStr) {
      opts.body = bodyStr;
    }

    const response = await fetch(url, opts);

    if (!response.ok) {
      const errText = await response.text();
      // CloudFront WAF blocks some endpoints (accounts, marketdata) from certain IPs
      if (response.status === 403 && errText.includes('CloudFront')) {
        console.warn(`[ROBINHOOD] CloudFront WAF blocked ${method} ${path} — endpoint unavailable from this IP`);
        throw new Error(`Robinhood CloudFront WAF block on ${path}`);
      }
      throw new Error(`Robinhood API error: ${response.status} - ${errText}`);
    }

    // Some endpoints return 204 No Content
    if (response.status === 204) return {};

    return response.json();
  }

  // ─── Account & Holdings ────────────────────────────────────────────────────

  async getAccount(): Promise<RobinhoodAccount> {
    try {
      const data = await this.request('GET', '/api/v1/crypto/trading/accounts/');
      return {
        account_number: data.account_number || '',
        status: data.status || 'unknown',
        buying_power: parseFloat(data.buying_power || '0'),
        buying_power_currency: data.buying_power_currency || 'USD',
      };
    } catch (e: any) {
      // CloudFront WAF may block this endpoint; return safe defaults
      if (e.message?.includes('CloudFront')) {
        return { account_number: '', status: 'waf_blocked', buying_power: 0, buying_power_currency: 'USD' };
      }
      throw e;
    }
  }

  async getHoldings(assetCodes?: string[]): Promise<RobinhoodHolding[]> {
    let path = '/api/v1/crypto/trading/holdings/';
    if (assetCodes && assetCodes.length > 0) {
      const params = assetCodes.map(c => `asset_code=${c}`).join('&');
      path += `?${params}`;
    }
    const data = await this.request('GET', path);
    const results = data.results || data || [];
    return (Array.isArray(results) ? results : []).map((h: any) => ({
      asset_code: h.asset_code || '',
      total_quantity: parseFloat(h.total_quantity || '0'),
      quantity_available_for_trading: parseFloat(h.quantity_available_for_trading || '0'),
      cost_basis: parseFloat(h.cost_basis || '0'),
    }));
  }

  // ─── Market Data ───────────────────────────────────────────────────────────

  async getBestBidAsk(symbols?: string[]): Promise<RobinhoodTicker[]> {
    try {
      let path = '/api/v1/crypto/marketdata/best_bid_ask/';
      if (symbols && symbols.length > 0) {
        const params = symbols.map(s => `symbol=${s}`).join('&');
        path += `?${params}`;
      }
      const data = await this.request('GET', path);
      const results = data.results || data || [];
      return (Array.isArray(results) ? results : []).map((t: any) => ({
        symbol: t.symbol || '',
        price: (parseFloat(t.best_bid_price || '0') + parseFloat(t.best_ask_price || '0')) / 2,
        bid: parseFloat(t.best_bid_price || '0'),
        ask: parseFloat(t.best_ask_price || '0'),
      }));
    } catch (e: any) {
      // CloudFront WAF may block marketdata; return empty so caller falls back to other exchanges
      if (e.message?.includes('CloudFront')) return [];
      throw e;
    }
  }

  async getTicker(symbol: string): Promise<RobinhoodTicker> {
    const tickers = await this.getBestBidAsk([symbol]);
    if (tickers.length === 0) {
      throw new Error(`No ticker data for ${symbol} (marketdata may be WAF-blocked)`);
    }
    return tickers[0];
  }

  async getPrice(symbol: string): Promise<number> {
    const ticker = await this.getTicker(symbol);
    return ticker.price;
  }

  async getTradingPairs(symbols?: string[]): Promise<any[]> {
    let path = '/api/v1/crypto/trading/trading_pairs/';
    if (symbols && symbols.length > 0) {
      const params = symbols.map(s => `symbol=${s}`).join('&');
      path += `?${params}`;
    }
    const data = await this.request('GET', path);
    return data.results || data || [];
  }

  // ─── Trading ───────────────────────────────────────────────────────────────

  async marketBuy(symbol: string, usdAmount: number): Promise<RobinhoodOrder> {
    console.log(`[ROBINHOOD] Market BUY ${symbol} for $${usdAmount.toFixed(2)}`);

    const clientOrderId = crypto.randomUUID();
    const body = {
      client_order_id: clientOrderId,
      side: 'buy',
      type: 'market',
      symbol,
      market_order_config: {
        asset_quantity: undefined as string | undefined,
        quote_amount: usdAmount.toFixed(2),
      },
    };
    // For market buys, use quote_amount (USD); remove asset_quantity
    delete body.market_order_config.asset_quantity;

    const data = await this.request('POST', '/api/v1/crypto/trading/orders/', body);
    return this.transformOrder(data);
  }

  async marketSell(symbol: string, cryptoAmount: number): Promise<RobinhoodOrder> {
    console.log(`[ROBINHOOD] Market SELL ${symbol} qty=${cryptoAmount}`);

    const clientOrderId = crypto.randomUUID();
    const body = {
      client_order_id: clientOrderId,
      side: 'sell',
      type: 'market',
      symbol,
      market_order_config: {
        asset_quantity: cryptoAmount.toString(),
      },
    };

    const data = await this.request('POST', '/api/v1/crypto/trading/orders/', body);
    return this.transformOrder(data);
  }

  async limitBuy(symbol: string, usdAmount: number, limitPrice: number): Promise<RobinhoodOrder> {
    console.log(`[ROBINHOOD] Limit BUY ${symbol} $${usdAmount.toFixed(2)} @ $${limitPrice.toFixed(2)}`);

    const qty = usdAmount / limitPrice;
    const clientOrderId = crypto.randomUUID();
    const body = {
      client_order_id: clientOrderId,
      side: 'buy',
      type: 'limit',
      symbol,
      limit_order_config: {
        asset_quantity: qty.toFixed(8),
        limit_price: limitPrice.toFixed(2),
        time_in_force: 'gtc',
      },
    };

    const data = await this.request('POST', '/api/v1/crypto/trading/orders/', body);
    return this.transformOrder(data);
  }

  async limitSell(symbol: string, cryptoAmount: number, limitPrice: number): Promise<RobinhoodOrder> {
    console.log(`[ROBINHOOD] Limit SELL ${symbol} qty=${cryptoAmount} @ $${limitPrice.toFixed(2)}`);

    const clientOrderId = crypto.randomUUID();
    const body = {
      client_order_id: clientOrderId,
      side: 'sell',
      type: 'limit',
      symbol,
      limit_order_config: {
        asset_quantity: cryptoAmount.toFixed(8),
        limit_price: limitPrice.toFixed(2),
        time_in_force: 'gtc',
      },
    };

    const data = await this.request('POST', '/api/v1/crypto/trading/orders/', body);
    return this.transformOrder(data);
  }

  async getOrder(orderId: string): Promise<RobinhoodOrder> {
    const data = await this.request('GET', `/api/v1/crypto/trading/orders/${orderId}/`);
    return this.transformOrder(data);
  }

  async getOrders(): Promise<RobinhoodOrder[]> {
    const data = await this.request('GET', '/api/v1/crypto/trading/orders/');
    const results = data.results || data || [];
    return (Array.isArray(results) ? results : []).map((o: any) => this.transformOrder(o));
  }

  async cancelOrder(orderId: string): Promise<void> {
    await this.request('POST', `/api/v1/crypto/trading/orders/${orderId}/cancel/`);
    console.log(`[ROBINHOOD] Cancelled order ${orderId}`);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private transformOrder(raw: any): RobinhoodOrder {
    return {
      id: raw.id || raw.order_id || '',
      client_order_id: raw.client_order_id || '',
      side: raw.side || 'buy',
      type: raw.type || 'market',
      symbol: raw.symbol || '',
      state: raw.state || raw.status || 'unknown',
      filled_asset_quantity: raw.filled_asset_quantity,
      average_price: raw.average_price,
      executions: raw.executions || [],
      created_at: raw.created_at || new Date().toISOString(),
    };
  }

  /**
   * Get accounts in the format ExchangeManager expects
   */
  async getAccounts(): Promise<{ asset: string; free: number; locked: number; total: number }[]> {
    const [account, holdings] = await Promise.all([
      this.getAccount(),
      this.getHoldings(),
    ]);

    const accounts: { asset: string; free: number; locked: number; total: number }[] = [];

    // USD buying power
    accounts.push({
      asset: 'USD',
      free: account.buying_power,
      locked: 0,
      total: account.buying_power,
    });

    // Crypto holdings
    for (const h of holdings) {
      accounts.push({
        asset: h.asset_code,
        free: h.quantity_available_for_trading,
        locked: h.total_quantity - h.quantity_available_for_trading,
        total: h.total_quantity,
      });
    }

    return accounts;
  }
}
