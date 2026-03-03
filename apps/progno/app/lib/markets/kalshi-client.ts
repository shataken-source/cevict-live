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
   * Fetch sports game-winner markets from Kalshi via /markets endpoint.
   * Queries each GAME_SERIES prefix as a series_ticker (e.g. KXNBAGAME).
   * The /events endpoint does NOT return individual game events — only futures/props.
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
    const marketsPath = '/trade-api/v2/markets';
    const baseHost = this.baseUrl.replace('/trade-api/v2', '');
    const seen = new Set<string>();

    // Query each game series prefix via /markets?series_ticker=PREFIX
    for (const gs of KalshiClient.GAME_SERIES) {
      try {
        let cursor: string | undefined;
        for (let pg = 0; pg < 5; pg++) {
          const params = new URLSearchParams({
            status,
            limit: '200',
            series_ticker: gs.prefix,
            mve_filter: 'exclude',
          });
          if (cursor) params.set('cursor', cursor);
          const urlPath = `${marketsPath}?${params}`;

          const response = await fetch(`${baseHost}${urlPath}`, {
            headers: this.getHeaders('GET', marketsPath),
          });

          if (!response.ok) {
            console.error(`[KalshiClient] ${gs.prefix} page ${pg}: ${response.status}`);
            break;
          }

          const d = await response.json();
          const markets: any[] = d.markets || [];

          for (const m of markets) {
            const ticker = m.ticker || '';
            if (seen.has(ticker)) continue;
            const et = (m.event_ticker || ticker).toUpperCase();
            if (/NCAAWB|WNBA|WCBB|WOMEN/i.test(et)) continue;
            if (KalshiClient.BLOCKED_PREFIXES.some(bp => et.startsWith(bp))) continue;
            seen.add(ticker);
            all.push({ ...m, event_ticker: m.event_ticker || '', category: 'Sports', subcategory: gs.sport } as KalshiMarket);
          }

          cursor = d.cursor;
          if (markets.length < 200 || !cursor) break;
          await new Promise(r => setTimeout(r, 150));
        }
      } catch (error: any) {
        console.error(`[KalshiClient] Error fetching ${gs.prefix}:`, error.message);
      }
    }

    // Sort by volume descending, return top N
    all.sort((a, b) => (b.volume || 0) - (a.volume || 0));
    const result = all.slice(0, limit);
    const withVol = result.filter(m => m.volume > 0).length;
    const sportCounts: Record<string, number> = {};
    result.forEach(m => { sportCounts[m.subcategory] = (sportCounts[m.subcategory] || 0) + 1; });
    console.log(`[KalshiClient] Found ${all.length} sports game markets via /markets, returning ${result.length} (${withVol} with volume). ${JSON.stringify(sportCounts)}`);
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
