/**
 * Kalshi API Client
 * Handles fetching sports markets from Kalshi exchange
 * Focus: Sports probability markets only
 */

import crypto from 'crypto'

function normalizePem(raw: string): string {
  const normalized = raw.replace(/\\n/g, '\n').replace(/"/g, '').trim()
  const beginMatch = normalized.match(/-----BEGIN ([^-]+)-----/)
  const endMatch = normalized.match(/-----END ([^-]+)-----/)
  if (!beginMatch || !endMatch) return normalized
  const type = beginMatch[1]
  const b64 = normalized.replace(/-----BEGIN [^-]+-----/, '').replace(/-----END [^-]+-----/, '').replace(/\s+/g, '')
  const wrapped = (b64.match(/.{1,64}/g) ?? []).join('\n')
  return `-----BEGIN ${type}-----\n${wrapped}\n-----END ${type}-----`
}

function kalshiSign(privateKey: string, method: string, urlPath: string) {
  const ts = Date.now().toString()
  const pathOnly = urlPath.split('?')[0]
  const msg = ts + method.toUpperCase() + pathOnly
  try {
    const s = crypto.createSign('RSA-SHA256')
    s.update(msg)
    s.end()
    const sig = s
      .sign({
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
      })
      .toString('base64')
    return { sig, ts }
  } catch {
    return { sig: '', ts: '' }
  }
}

export interface KalshiMarket {
  ticker: string;
  title: string;
  subtitle?: string;
  category: string;
  subcategory: string;
  yes_bid: number; // Price in cents (0-100)
  yes_ask: number;
  no_bid: number;
  no_ask: number;
  last_price: number;
  volume: number;
  open_interest: number;
  event_ticker: string;
  series_ticker?: string;
  expiry_time: string;
  status: 'open' | 'closed' | 'settled';
  market_type: 'binary' | 'categorical';
  min_tick_size: number;
  strike_price?: number;
  resolution_criteria?: string;
}

export interface KalshiEvent {
  event_ticker: string;
  title: string;
  category: string;
  subcategory: string;
  markets: KalshiMarket[];
  start_time: string;
  end_time: string;
}

export class KalshiClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.KALSHI_API_KEY_ID || '';
    this.apiSecret = process.env.KALSHI_PRIVATE_KEY || '';
    this.baseUrl = process.env.KALSHI_API_URL || 'https://api.elections.kalshi.com/trade-api/v2';
  }

  /**
   * Check if Kalshi credentials are configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.apiSecret);
  }

  /**
   * Build authenticated headers for Kalshi API requests (RSA-PSS signing)
   */
  private getHeaders(method: string, urlPath: string): Record<string, string> {
    const pem = normalizePem(this.apiSecret);
    const { sig, ts } = kalshiSign(pem, method, urlPath);
    return {
      'Content-Type': 'application/json',
      'KALSHI-ACCESS-KEY': this.apiKey,
      'KALSHI-ACCESS-SIGNATURE': sig,
      'KALSHI-ACCESS-TIMESTAMP': ts,
    };
  }

  // Game-winner series prefixes (matches execute/route.ts)
  private static GAME_SERIES: Array<{ prefix: string; sport: string }> = [
    { prefix: 'KXNBAGAME', sport: 'NBA' },
    { prefix: 'KXNCAAMBGAME', sport: 'NCAAB' },
    { prefix: 'KXNCAABGAME', sport: 'NCAAB' },
    { prefix: 'KXNFLGAME', sport: 'NFL' },
    { prefix: 'KXNHLGAME', sport: 'NHL' },
    { prefix: 'KXSHLGAME', sport: 'NHL' },
    { prefix: 'KXMLBGAME', sport: 'MLB' },
    { prefix: 'KXNCAAFGAME', sport: 'NCAAF' },
    { prefix: 'KXNCAAMBSPREAD', sport: 'NCAAB' },
    { prefix: 'KXNBASPREAD', sport: 'NBA' },
    { prefix: 'KXNFLSPREAD', sport: 'NFL' },
    { prefix: 'KXNHLSPREAD', sport: 'NHL' },
    { prefix: 'KXNCAAMBTOTAL', sport: 'NCAAB' },
    { prefix: 'KXNBATOTAL', sport: 'NBA' },
    { prefix: 'KXNFLTOTAL', sport: 'NFL' },
    { prefix: 'KXNHLTOTAL', sport: 'NHL' },
    { prefix: 'KXNCAABBGAME', sport: 'NCAAB' },
    { prefix: 'KXNCAABASEBALL', sport: 'NCAAB' },
    { prefix: 'KXCBGAME', sport: 'NCAAB' },
  ];

  private static BLOCKED_PREFIXES = [
    'KXDIMAYORGAME', 'KXNCAAHOCKEY', 'KXMLBST', 'KXNBA2H',
    'KXNCAAWB', 'KXWNBA', 'KXNBL', 'KXWTA', 'KXATP',
    'KXUFC', 'KXEPL', 'KXLIG', 'KXBUN', 'KXSER', 'KXMLS',
  ];

  /**
   * Fetch sports game-winner markets from Kalshi via /events endpoint.
   * Uses the same approach as the trading execute route:
   * - /events excludes multi-leg parlays by default
   * - Filters by category=Sports and GAME_SERIES prefixes
   * - Skips blocked prefixes (women's, spring training, etc.)
   */
  async getSportsMarkets(
    limit: number = 100,
    status: 'open' | 'closed' | 'all' = 'open'
  ): Promise<KalshiMarket[]> {
    if (!this.isConfigured()) {
      console.warn('Kalshi not configured - returning empty markets');
      return [];
    }

    const all: KalshiMarket[] = [];
    let cursor: string | undefined;
    const eventsPath = '/trade-api/v2/events';
    const baseHost = this.baseUrl.replace('/trade-api/v2', '');

    try {
      for (let pg = 0; pg < 10; pg++) {
        const params = new URLSearchParams({ status, limit: '200', with_nested_markets: 'true' });
        if (cursor) params.set('cursor', cursor);
        const urlPath = `${eventsPath}?${params}`;

        const response = await fetch(`${baseHost}${urlPath}`, {
          headers: this.getHeaders('GET', eventsPath),
        });

        if (!response.ok) {
          console.error(`[KalshiClient] events page ${pg}: ${response.status}`);
          break;
        }

        const d = await response.json();
        const events: any[] = d.events || [];
        if (pg === 0 && events.length === 0) break;

        for (const ev of events) {
          if ((ev.category || '').toUpperCase() !== 'SPORTS') continue;
          const et = (ev.event_ticker || '').toUpperCase();
          if (/NCAAWB|WNBA|WCBB|WOMEN/i.test(et)) continue;
          if (KalshiClient.BLOCKED_PREFIXES.some(bp => et.startsWith(bp))) continue;
          const gs = KalshiClient.GAME_SERIES.find(s => et.startsWith(s.prefix));
          if (!gs) continue;
          for (const m of (ev.markets || [])) {
            all.push({ ...m, event_ticker: ev.event_ticker, category: 'Sports', subcategory: gs.sport } as KalshiMarket);
          }
        }

        cursor = d.cursor;
        if (events.length < 200 || !cursor) break;
        await new Promise(r => setTimeout(r, 150));
      }
    } catch (error: any) {
      console.error('Error fetching Kalshi sports events:', error.message);
    }

    // Sort by volume descending, return top N
    all.sort((a, b) => (b.volume || 0) - (a.volume || 0));
    const result = all.slice(0, limit);
    const withVol = result.filter(m => m.volume > 0).length;
    console.log(`[KalshiClient] Found ${all.length} sports game markets via /events, returning ${result.length} (${withVol} with volume)`);
    return result;
  }

  /**
   * Get market by ticker
   */
  async getMarket(ticker: string): Promise<KalshiMarket | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const urlPath = `/trade-api/v2/markets/${ticker}`;
      const url = `${this.baseUrl}/markets/${ticker}`;

      const response = await fetch(url, {
        headers: this.getHeaders('GET', urlPath),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.market || null;
    } catch (error) {
      console.error(`Error fetching Kalshi market ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get order book for a market (for market maker analysis)
   */
  async getOrderBook(ticker: string): Promise<{
    yes_bids: Array<{ price: number; size: number }>;
    yes_asks: Array<{ price: number; size: number }>;
    no_bids: Array<{ price: number; size: number }>;
    no_asks: Array<{ price: number; size: number }>;
  } | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const urlPath = `/trade-api/v2/markets/${ticker}/orderbook`;
      const url = `${this.baseUrl}/markets/${ticker}/orderbook`;

      const response = await fetch(url, {
        headers: this.getHeaders('GET', urlPath),
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching order book for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Calculate implied probability from market prices
   * Uses mid-price (average of bid/ask) for fair value
   */
  calculateImpliedProbability(market: KalshiMarket): {
    yesProb: number; // 0-1
    noProb: number; // 0-1
    spread: number; // Bid-ask spread in cents
    liquidity: 'high' | 'medium' | 'low';
  } {
    const yesMid = (market.yes_bid + market.yes_ask) / 2;
    const noMid = (market.no_bid + market.no_ask) / 2;

    // Normalize to probabilities (Kalshi prices are in cents, 0-100)
    const yesProb = yesMid / 100;
    const noProb = noMid / 100;

    // Calculate spread
    const spread = market.yes_ask - market.yes_bid;

    // Assess liquidity based on volume and open interest
    let liquidity: 'high' | 'medium' | 'low' = 'low';
    if (market.volume > 10000 || market.open_interest > 50000) {
      liquidity = 'high';
    } else if (market.volume > 1000 || market.open_interest > 5000) {
      liquidity = 'medium';
    }

    return {
      yesProb,
      noProb,
      spread,
      liquidity,
    };
  }
}
