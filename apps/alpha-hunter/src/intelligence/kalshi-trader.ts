/**
 * Kalshi Trader (Production-Ready with 14-Day Expiration Filter)
 *
 * CRITICAL SAFETY: This class is designed for production trading with:
 * - 14-day maximum expiration filter (no long-term bets)
 * - $10 max trade size (configurable via MAX_SINGLE_TRADE)
 * - Maker-only orders (limit orders 1¢ inside spread for $0 entry fees)
 * - Settlement fee on winnings (default 7%, configurable via KALSHI_FEE_RATE)
 * - Minimum net profit gate (configurable via MIN_NET_PROFIT, default $0.50)
 * - Demo/sandbox enforcement (can be bypassed via execution-gate.ts if needed)
 */
import { PredictionMarket, Opportunity, Trade } from '../types';
import crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { assertKalshiDemoOnly, assertKalshiRequestUrlIsDemo, getKalshiBaseUrl } from '../services/kalshi/execution-gate';
import { loadAlphaHunterSecrets } from '../lib/secret-store';
import {
  getPrognoProbabilities,
  matchKalshiMarketToProgno,
  getCryptoModelProbability,
} from './probability-bridge';

/** ESPN scoreboard path by league */
const ESPN_LEAGUE_PATH: Record<string, string> = {
  NBA: 'basketball/nba',
  NFL: 'football/nfl',
  NHL: 'hockey/nhl',
  MLB: 'baseball/mlb',
  NCAAB: 'basketball/mens-college-basketball',
  NCAA: 'basketball/mens-college-basketball',
  NCAAF: 'football/college-football',
  CBB: 'baseball/college-baseball',
};

interface LiveScore {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: string;
}

/** Fetch current/live scores from ESPN for a league. */
async function fetchLiveScoresForLeague(league: string): Promise<LiveScore[]> {
  const path = ESPN_LEAGUE_PATH[league] || ESPN_LEAGUE_PATH[league?.toUpperCase()];
  if (!path) return [];
  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard`, { headers: { 'Cache-Control': 'no-store' } });
    if (!res.ok) return [];
    const data: any = await res.json();
    const out: LiveScore[] = [];
    for (const event of data.events || []) {
      const comp = event.competitions?.[0];
      if (!comp) continue;
      const homeComp = comp.competitors?.find((c: any) => c.homeAway === 'home');
      const awayComp = comp.competitors?.find((c: any) => c.homeAway === 'away');
      if (!homeComp?.team || !awayComp?.team) continue;
      const statusType = event.status?.type;
      const status = statusType?.state === 'in' ? 'LIVE' : statusType?.state === 'post' ? 'FINAL' : 'UPCOMING';
      out.push({
        homeTeam: (homeComp.team.displayName || homeComp.team.abbreviation || '').trim(),
        awayTeam: (awayComp.team.displayName || awayComp.team.abbreviation || '').trim(),
        homeScore: parseInt(String(homeComp.score || 0), 10) || 0,
        awayScore: parseInt(String(awayComp.score || 0), 10) || 0,
        status,
      });
    }
    return out;
  } catch {
    return [];
  }
}

function matchTeam(a: string, b: string): boolean {
  const x = (a || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const y = (b || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return x.length >= 2 && y.length >= 2 && (x.includes(y) || y.includes(x));
}

function findLiveScore(liveScores: LiveScore[], homeTeam: string, awayTeam: string): LiveScore | null {
  return liveScores.find(s => matchTeam(s.homeTeam, homeTeam) && matchTeam(s.awayTeam, awayTeam)) || null;
}

/**
 * Environment loading policy (alpha-hunter):
 * - NEVER load repo-root env files (they may contain prod settings for other apps).
 * - Always prefer the alpha-hunter app's own `.env.local`, then `.env`.
 *
 * We load by file-location so it works regardless of current working directory.
 */
const alphaHunterRoot = path.resolve(__dirname, '..', '..'); // src/intelligence/ -> src/ -> alpha-hunter/
const alphaEnvLocal = path.join(alphaHunterRoot, '.env.local');
const alphaEnv = path.join(alphaHunterRoot, '.env');

// Load without override — caller (kalshi-auto-trader.ts) already loaded app-level .env.local first.
if (fs.existsSync(alphaEnvLocal)) dotenv.config({ path: alphaEnvLocal, override: false });
if (fs.existsSync(alphaEnv)) dotenv.config({ path: alphaEnv, override: false });

// ── KALSHI FEE + PROFIT CALCULATION ──────────────────────────────────────────
// Kalshi charges a settlement fee on NET WINNINGS (profit only, not stake).
// Maker orders (limit orders that rest on the book) have $0 entry fee.
// These values are configurable via env vars.
const KALSHI_FEE_RATE = parseFloat(process.env.KALSHI_FEE_RATE || '0.07');   // 7% of profit
const MIN_NET_PROFIT = parseFloat(process.env.MIN_NET_PROFIT || '0.50');     // $0.50 minimum

/**
 * Calculate net profit after Kalshi settlement fees.
 * @param stakeUsd      Dollar amount wagered (e.g. $10)
 * @param priceCents    Entry price in cents (0-100, e.g. 65 means 65¢)
 * @param feeRate       Settlement fee rate on winnings (default KALSHI_FEE_RATE)
 * @returns { grossProfit, fee, netProfit, roi } — all in USD
 */
export function calcNetProfit(
  stakeUsd: number,
  priceCents: number,
  feeRate: number = KALSHI_FEE_RATE
): { grossProfit: number; fee: number; netProfit: number; roi: number } {
  // Contracts = stake / (price / 100)
  // Each contract pays $1 on win, so gross payout = contracts * $1
  // Gross profit = payout - stake
  const costPerContract = priceCents / 100;           // e.g. 65¢ = $0.65
  if (costPerContract <= 0 || costPerContract >= 1) return { grossProfit: 0, fee: 0, netProfit: 0, roi: 0 };
  const contracts = stakeUsd / costPerContract;        // e.g. $10 / $0.65 = 15.38 contracts
  const grossPayout = contracts * 1.0;                 // e.g. 15.38 * $1 = $15.38
  const grossProfit = grossPayout - stakeUsd;          // e.g. $15.38 - $10 = $5.38
  const fee = grossProfit > 0 ? grossProfit * feeRate : 0;  // e.g. $5.38 * 0.07 = $0.38
  const netProfit = grossProfit - fee;                 // e.g. $5.38 - $0.38 = $5.00
  const roi = stakeUsd > 0 ? (netProfit / stakeUsd) * 100 : 0;
  return { grossProfit, fee, netProfit, roi };
}

/** Exported for use in index.ts and other modules */
export { KALSHI_FEE_RATE, MIN_NET_PROFIT };

export class KalshiTrader {
  private apiKeyId: string;
  private privateKey: string = '';
  private baseUrl: string;
  private isProduction: boolean;
  private keyConfigured: boolean = false;
  private privateKeyPath: string | null = null;
  private privateKeyPathExists: boolean = false;
  private privateKeyPathLooksPartialDownload: boolean = false;
  private privateKeyPathBytes: number | null = null;

  // Network error throttling
  private networkErrorCount = 0;
  private lastNetworkErrorTime = 0;
  private static readonly NETWORK_ERROR_THROTTLE_MS = 30000; // Log every 30 seconds

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
    // Hard safety: never allow production trading from this repo.
    assertKalshiDemoOnly();

    const secrets = loadAlphaHunterSecrets();

    const envKeyIdRaw = process.env.KALSHI_API_KEY_ID || '';
    const secretsKeyIdRaw = secrets?.kalshi?.apiKeyId || '';
    const usedKeyIdRaw = envKeyIdRaw || secretsKeyIdRaw || '';
    this.apiKeyId = usedKeyIdRaw.replace(/^"(.*)"$/, '$1').trim();

    let rawKey = process.env.KALSHI_PRIVATE_KEY || secrets?.kalshi?.privateKey || '';
    if (typeof rawKey === 'string' && rawKey.trim().length === 0) {
      rawKey = '';
    }

    // Optional: load from PEM file to avoid .env newline/quoting issues.
    if (!rawKey) {
      const keyPathEnv = (process.env.KALSHI_PRIVATE_KEY_PATH || '').trim();
      const keyPathSecrets = (secrets?.kalshi?.privateKeyPath || '').trim();
      const keyPath = (keyPathEnv || keyPathSecrets).trim();
      if (keyPath) {
        this.privateKeyPath = keyPath;
        this.privateKeyPathExists = fs.existsSync(keyPath);
        this.privateKeyPathLooksPartialDownload = keyPath.toLowerCase().endsWith('.crdownload');
        if (this.privateKeyPathExists) {
          try {
            const st = fs.statSync(keyPath);
            this.privateKeyPathBytes = st.size;
            rawKey = fs.readFileSync(keyPath, 'utf8');
          } catch {
            rawKey = '';
          }
        }
      }
    }

    if (rawKey) {
      // Typical .env format uses "\n" escapes; support that.
      const normalized = rawKey.replace(/\\n/g, '\n').replace(/\"/g, '').trim();

      // Re-wrap PEM if header and base64 body are on the same line (common in .env files)
      const reformatted = (() => {
        const beginMatch = normalized.match(/-----BEGIN ([^-]+)-----/);
        const endMatch = normalized.match(/-----END ([^-]+)-----/);
        if (!beginMatch || !endMatch) return normalized;
        const type = beginMatch[1];
        const b64 = normalized
          .replace(/-----BEGIN [^-]+-----/, '')
          .replace(/-----END [^-]+-----/, '')
          .replace(/\s+/g, '');
        const wrapped = (b64.match(/.{1,64}/g) ?? []).join('\n');
        return `-----BEGIN ${type}-----\n${wrapped}\n-----END ${type}-----`;
      })();

      this.privateKey = reformatted;

      // Validate the key is plausibly complete and parseable.
      // (Do NOT log key contents.)
      if (reformatted.length > 256 && reformatted.includes('BEGIN') && reformatted.includes('PRIVATE KEY')) {
        try {
          crypto.createPrivateKey(reformatted);
          this.keyConfigured = true;
        } catch {
          this.keyConfigured = false;
        }
      } else {
        this.keyConfigured = false;
      }
    }
    // Non-secret init debug (helps confirm correct env is loaded)
    try {
      const maskedId = (this.apiKeyId || '').slice(0, 6);
      const src = envKeyIdRaw ? 'env' : (secretsKeyIdRaw ? 'secrets' : 'unset');
      const pathInfo = this.privateKeyPath ? `${this.privateKeyPath} exists=${this.privateKeyPathExists}${this.privateKeyPathBytes ? ` bytes=${this.privateKeyPathBytes}` : ''}` : 'none';
      console.log(`[kalshi][init] key=${maskedId}… src=${src} pem=${pathInfo}`);
    } catch { }

    // Use production base URL - execution-gate.ts now allows production
    this.baseUrl = getKalshiBaseUrl();
    this.isProduction = true;
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
    // CRITICAL: Strip query params from path
    const pathWithoutQuery = path.split('?')[0];
    // CRITICAL: Method must be uppercase, message format: timestamp + METHOD + path
    const message = timestamp + method.toUpperCase() + pathWithoutQuery;
    try {
      // RSA-PSS signing (REQUIRED by Kalshi)
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(message);
      sign.end();
      const signature = sign.sign({
        key: this.privateKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
      }).toString('base64');
      return { signature, timestamp };
    } catch (err) {
      return { signature: '', timestamp: '' };
    }
  }

  // --- SMART MARKET FETCHING ---

  /**
   * Sequential, cursor-based markets fetch with Multivariate Events excluded.
   */
  private async getMarketsParallel(limitPerPage: number = 1000, maxPages: number = 3, seriesTicker?: string): Promise<any[]> {
    let cursor = '';
    let page = 0;
    const all: any[] = [];
    while (true) {
      const pageResult = await this.getMarketsPage(limitPerPage, cursor, seriesTicker);
      if (!pageResult) break;
      const { markets, cursor: nextCursor } = pageResult as any;
      page++;
      console.log(`   📡 Markets API page ${page}: ${markets.length} markets (cursor=${nextCursor ? String(nextCursor).slice(0, 8) + '…' : '∅'})`);
      all.push(...markets);
      if (!nextCursor || page >= maxPages) break;
      cursor = String(nextCursor);
      await new Promise(r => setTimeout(r, 100));
    }
    console.log(`   📊 Sequential fetch: ${all.length} markets from ${page} page(s)${seriesTicker ? ` (series: ${seriesTicker})` : ''}`);
    return all;
  }

  /**
   * Fetch a single page of markets using opaque cursor and excluding multivariate events.
   */
  private async getMarketsPage(limit: number, offsetOrCursor: any, seriesTicker?: string): Promise<{ markets: any[]; cursor?: string } | null> {
    try {
      const params: Record<string, string> = {
        limit: String(limit),
        cursor: String(offsetOrCursor || ''),
        status: 'open',
        mve_filter: 'exclude',
      };

      if (seriesTicker) {
        params.series_ticker = seriesTicker;
      }

      const qs = new URLSearchParams(params);

      const fullPath = `/trade-api/v2/markets?${qs.toString()}`;
      const { signature, timestamp } = await this.signRequestWithTimestamp('GET', fullPath);
      if (!signature) return null;

      const fullUrl = this.baseUrl.replace('/trade-api/v2', '') + fullPath;
      assertKalshiRequestUrlIsDemo(fullUrl);

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'KALSHI-ACCESS-KEY': this.apiKeyId,
          'KALSHI-ACCESS-SIGNATURE': signature,
          'KALSHI-ACCESS-TIMESTAMP': timestamp,
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.log(`   ⚠️ Markets API error: ${response.status} ${response.statusText}${errorText ? ' - ' + errorText.slice(0, 100) : ''}`);
        return null;
      }
      const data: any = await response.json();
      return { markets: data.markets || [], cursor: data.cursor };
    } catch (error) {
      console.log(`   ⚠️ Markets fetch error: ${error}`);
      return null;
    }
  }

  /**
   * Get markets (now uses parallel fetching by default)
   */
  async getMarkets(): Promise<PredictionMarket[]> {
    const envPages = parseInt(process.env.KALSHI_MAX_PAGES || '10', 10);
    const maxPages = Number.isFinite(envPages) && envPages > 0 ? envPages : 10;
    const apiMarkets = await this.getMarketsParallel(1000, maxPages);
    return this.transformMarkets(apiMarkets);
  }

  async getBalance(): Promise<number> {
    if (!this.keyConfigured) return -1;
    try {
      const fullPath = '/trade-api/v2/portfolio/balance';
      const { signature, timestamp } = await this.signRequestWithTimestamp('GET', fullPath);
      if (!signature) {
        console.log('[kalshi][balance] sign=fail');
        return -1;
      }
      const apiUrl = this.baseUrl.replace('/trade-api/v2', '') + fullPath;
      assertKalshiRequestUrlIsDemo(apiUrl);
      const maskedKey = (this.apiKeyId || '').slice(0, 6);
      console.log(`[kalshi][balance] url=${apiUrl} key=${maskedKey}…`);
      const response = await fetch(apiUrl, {
        headers: {
          'KALSHI-ACCESS-KEY': this.apiKeyId,
          'KALSHI-ACCESS-SIGNATURE': signature,
          'KALSHI-ACCESS-TIMESTAMP': timestamp,
        },
      });
      console.log(`[kalshi][balance] status=${response.status}`);
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        console.log(`[kalshi][balance] error=${response.status} ${response.statusText} ${body ? body.slice(0, 160) : ''}`);
        return -1;
      }
      const data: any = await response.json();
      return (data.balance || 0) / 100;
    } catch (e) { return -1; }
  }

  /**
   * Auth preflight for DEMO.
   * Returns a structured result so runners can stop early with a clear message.
   */
  async probeAuth(): Promise<
    | { ok: true; balanceUsd?: number }
    | { ok: false; code?: string; details?: string; message?: string; raw?: any }
  > {
    if (!this.apiKeyId) {
      return { ok: false, code: 'missing_key_id', message: 'KALSHI_API_KEY_ID not configured' };
    }
    if (!this.keyConfigured) {
      const hints: string[] = [];
      if (this.privateKeyPath) {
        hints.push(`KALSHI_PRIVATE_KEY_PATH=${this.privateKeyPath}`);
        hints.push(this.privateKeyPathExists ? 'file exists' : 'file not found');
        if (this.privateKeyPathBytes !== null) hints.push(`bytes=${this.privateKeyPathBytes}`);
        if (this.privateKeyPathLooksPartialDownload) {
          hints.push('looks like a partial download (.crdownload) — rename after download completes');
        }
        if (this.privateKeyPathBytes !== null && this.privateKeyPathBytes < 800) {
          hints.push('key file looks too small — ensure it contains the full BEGIN/END PRIVATE KEY block');
        }
      }
      return {
        ok: false,
        code: 'missing_private_key',
        details: hints.length ? hints.join('; ') : undefined,
        message:
          'KALSHI_PRIVATE_KEY missing or invalid. Prefer KALSHI_PRIVATE_KEY_PATH to a PEM file, or use ONE LINE with \\n escapes and wrap in quotes.',
      };
    }
    try {
      const fullPath = '/trade-api/v2/portfolio/balance';
      const { signature, timestamp } = await this.signRequestWithTimestamp('GET', fullPath);
      if (!signature) return { ok: false, code: 'signature_failed', message: 'Could not sign request' };

      const apiUrl = this.baseUrl.replace('/trade-api/v2', '') + fullPath;
      assertKalshiRequestUrlIsDemo(apiUrl);

      const response = await fetch(apiUrl, {
        headers: {
          'KALSHI-ACCESS-KEY': this.apiKeyId,
          'KALSHI-ACCESS-SIGNATURE': signature,
          'KALSHI-ACCESS-TIMESTAMP': timestamp,
        },
      });
      const data: any = await response.json();
      if (!response.ok) {
        // Make NOT_FOUND clearer: demo/prod mismatch OR wrong key id/private key pair.
        const code = data?.error?.code;
        const details = data?.error?.details;
        const message = data?.error?.message;
        const isNotFoundAuth =
          String(code || '') === 'authentication_error' && String(details || '').toUpperCase() === 'NOT_FOUND';
        return {
          ok: false,
          code,
          message: isNotFoundAuth
            ? 'authentication_error (NOT_FOUND): key id not recognized in DEMO (or key pair mismatch)'
            : message,
          details: isNotFoundAuth
            ? 'Make sure you created the API key in the Kalshi DEMO environment and that KALSHI_API_KEY_ID matches the downloaded private key.'
            : details,
          raw: data,
        };
      }
      return { ok: true, balanceUsd: (data.balance || 0) / 100 };
    } catch (e: any) {
      return { ok: false, code: 'exception', message: e?.message || String(e) };
    }
  }

  /**
   * Get open (unsettled) portfolio positions.
   * NOTE: Kalshi returns open positions here; settled positions are in /portfolio/settlements.
   */
  async getPositions(ticker?: string): Promise<Array<{ marketId: string; position: number; pnl: number }>> {
    if (!this.keyConfigured) return [];
    try {
      const qs = ticker ? `?ticker=${encodeURIComponent(ticker)}` : '';
      const fullPath = `/trade-api/v2/portfolio/positions${qs}`;
      const { signature, timestamp } = await this.signRequestWithTimestamp('GET', fullPath);
      if (!signature) return [];

      const apiUrl = this.baseUrl.replace('/trade-api/v2', '') + fullPath;
      assertKalshiRequestUrlIsDemo(apiUrl);

      const response = await fetch(apiUrl, {
        headers: {
          'KALSHI-ACCESS-KEY': this.apiKeyId,
          'KALSHI-ACCESS-SIGNATURE': signature,
          'KALSHI-ACCESS-TIMESTAMP': timestamp,
        },
      });
      if (!response.ok) return [];
      const data: any = await response.json();
      const positions = Array.isArray(data.market_positions) ? data.market_positions : [];
      return positions.map((p: any) => ({
        marketId: p.ticker,
        position: Number(p.position || 0),
        pnl: typeof p.realized_pnl_dollars === 'string' ? parseFloat(p.realized_pnl_dollars) : Number(p.realized_pnl_dollars || 0),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get settlements for a market ticker from demo environment.
   * Returns newest-first (as provided by API).
   */
  async getSettlementsForTicker(ticker: string, limit = 5): Promise<any[]> {
    if (!this.keyConfigured) return [];
    try {
      const fullPath = `/trade-api/v2/portfolio/settlements?ticker=${encodeURIComponent(ticker)}&limit=${limit}`;
      const { signature, timestamp } = await this.signRequestWithTimestamp('GET', fullPath);
      if (!signature) return [];

      const apiUrl = this.baseUrl.replace('/trade-api/v2', '') + fullPath;
      assertKalshiRequestUrlIsDemo(apiUrl);

      const response = await fetch(apiUrl, {
        headers: {
          'KALSHI-ACCESS-KEY': this.apiKeyId,
          'KALSHI-ACCESS-SIGNATURE': signature,
          'KALSHI-ACCESS-TIMESTAMP': timestamp,
        },
      });
      if (!response.ok) return [];
      const data: any = await response.json();
      return Array.isArray(data.settlements) ? data.settlements : [];
    } catch {
      return [];
    }
  }

  /**
   * Get a single market by ticker (includes result/expiration_value when settled).
   * Use this to get the official resolution (e.g. final score) from Kalshi after settlement.
   */
  async getMarket(ticker: string): Promise<{
    result?: 'yes' | 'no' | string;
    status?: string;
    expiration_value?: string;
    settlement_ts?: string;
    title?: string;
  } | null> {
    if (!this.keyConfigured || !ticker) return null;
    try {
      await this.enforceRateLimit();
      const fullPath = `/trade-api/v2/markets/${encodeURIComponent(ticker)}`;
      const { signature, timestamp } = await this.signRequestWithTimestamp('GET', fullPath);
      if (!signature) return null;
      const apiUrl = this.baseUrl.replace('/trade-api/v2', '') + fullPath;
      assertKalshiRequestUrlIsDemo(apiUrl);
      const response = await fetch(apiUrl, {
        headers: {
          'KALSHI-ACCESS-KEY': this.apiKeyId,
          'KALSHI-ACCESS-SIGNATURE': signature,
          'KALSHI-ACCESS-TIMESTAMP': timestamp,
        },
      });
      if (!response.ok) return null;
      const data: any = await response.json();
      const m = data?.market;
      if (!m || typeof m !== 'object') return null;
      return {
        result: m.result,
        status: m.status,
        expiration_value: m.expiration_value,
        settlement_ts: m.settlement_ts,
        title: m.title,
      };
    } catch {
      return null;
    }
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
      assertKalshiRequestUrlIsDemo(apiUrl);
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

      const data: any = await response.json();

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
   * Find basic opportunities.
   * This is a lightweight heuristic used by trainers/tests; primary trading uses Supabase predictions.
   */
  async findOpportunities(minEdgePct: number): Promise<Opportunity[]> {
    const markets = await this.getMarkets();
    const minEdge = Number(minEdgePct) || 0;
    const nowIso = new Date().toISOString();

    const opps: Opportunity[] = [];
    for (const m of markets) {
      const yesPrice = Number(m.yesPrice || 50);
      const noPrice = Number(m.noPrice || 50);

      // Simple contrarian calibration (placeholder until learning loop tunes these)
      const syntheticAi = yesPrice > 50 ? Math.max(1, yesPrice - 5) : Math.min(99, yesPrice + 5);
      const yesEdge = syntheticAi - yesPrice;
      const noEdge = (100 - syntheticAi) - noPrice;

      let side: 'yes' | 'no' | null = null;
      let edge = 0;
      if (yesEdge >= minEdge) {
        side = 'yes';
        edge = yesEdge;
      } else if (noEdge >= minEdge) {
        side = 'no';
        edge = noEdge;
      }
      if (!side) continue;

      // Fee-aware profit check: skip if net profit after settlement fee < MIN_NET_PROFIT
      const entryPrice = side === 'yes' ? yesPrice : noPrice;
      const profitCalc = calcNetProfit(10, entryPrice);
      if (profitCalc.netProfit < MIN_NET_PROFIT) continue;

      const confidence = Math.min(90, Math.max(50, 50 + Math.abs(edge) * 3));
      opps.push({
        id: `kalshi_${m.id}_${side}_${Date.now()}`,
        type: 'prediction_market',
        source: 'Kalshi',
        title: `${side.toUpperCase()}: ${m.title}`,
        description: `Heuristic edge ${edge.toFixed(1)}% at ${entryPrice}¢ (net $${profitCalc.netProfit.toFixed(2)} after ${(KALSHI_FEE_RATE * 100).toFixed(0)}% fee)`,
        confidence,
        expectedValue: edge,
        riskLevel: 'medium',
        timeframe: '48h',
        requiredCapital: 10,
        potentialReturn: profitCalc.netProfit,
        reasoning: [`Heuristic contrarian edge (training mode) — net $${profitCalc.netProfit.toFixed(2)} after fees`],
        dataPoints: [],
        action: {
          platform: 'kalshi',
          actionType: 'bet',
          amount: 10,
          target: `${m.id} ${side.toUpperCase()}`,
          instructions: [`Place ${side.toUpperCase()} on ${m.id} at ≤${side === 'yes' ? yesPrice : noPrice}¢`],
          autoExecute: true,
        },
        expiresAt: m.expiresAt || nowIso,
        createdAt: nowIso,
      });
    }

    // Best first
    opps.sort((a, b) => b.expectedValue - a.expectedValue);
    return opps;
  }

  /**
   * Find opportunities using Progno (sports) and optional crypto model probabilities.
   * When a Kalshi market matches a Progno pick or crypto rule, uses that model probability
   * instead of the synthetic ±5 heuristic for edge detection.
   */
  async findOpportunitiesWithExternalProbs(
    minEdgePct: number,
    options?: { getCoinbasePrice?: (productId: string) => Promise<number> }
  ): Promise<Opportunity[]> {
    const minEdge = Number(minEdgePct) || 0;
    const nowIso = new Date().toISOString();

    // Fetch all open markets (Kalshi API doesn't support ticker prefix filtering).
    // Use enough pages to capture GAME markets for all sports.
    const envPages = parseInt(process.env.KALSHI_MAX_PAGES || '15', 10);
    const maxPages = Number.isFinite(envPages) && envPages > 0 ? envPages : 15;
    const allMarkets = await this.getMarketsParallel(1000, maxPages);
    // For Progno matching: GAME/WINNER/MONEY (winner) + TOTAL (over/under)
    const GAME_TICKER_RE = /GAME|WINNER|MONEY|TOTAL/i;
    const dedupedMarkets = allMarkets.filter(m => {
      const t = (m?.ticker || '').toUpperCase();
      const et = (m?.event_ticker || '').toUpperCase();
      return GAME_TICKER_RE.test(t) || GAME_TICKER_RE.test(et);
    });
    console.log(`   📊 ${dedupedMarkets.length} GAME/WINNER/TOTAL markets of ${allMarkets.length} total`);
    if (dedupedMarkets.length > 0) {
      const sampleTickers = dedupedMarkets.slice(0, 5).map(m => m?.ticker || '?');
      const sampleTitles = dedupedMarkets.slice(0, 3).map(m => (m?.title || '').slice(0, 50));
      console.log(`   [DEBUG] Kalshi sample tickers: ${sampleTickers.join(', ')}`);
      sampleTitles.forEach((t, i) => console.log(`   [DEBUG]   Kalshi title ${i + 1}: ${t}…`));
    }

    const prognoEvents = await getPrognoProbabilities();
    console.log(`   [DEBUG] Progno events to match: ${prognoEvents.length}`);
    if (prognoEvents.length === 0) {
      console.warn(`   [DEBUG] No Progno picks — run "RUN PREDICTIONS (BOTH)" in Progno admin and set PROGNO_BASE_URL if not using default.`);
    }
    const getCbPrice = options?.getCoinbasePrice;

    const opps: Opportunity[] = [];
    const picksForFriends: { pick: string; opponent: string; odds: string; gameTime: string; currentScore: string }[] = [];
    let matchMiss = 0;
    let edgeSkip = 0;
    let profitSkip = 0;

    // Live scores from ESPN (for picks file)
    const leaguesNeeded = [...new Set(prognoEvents.map(e => e.league))];
    const liveScores: LiveScore[] = [];
    for (const league of leaguesNeeded) {
      const scores = await fetchLiveScoresForLeague(league);
      liveScores.push(...scores);
    }

    // 1) Sports: use Probability Bridge matching → edge vs entry price
    // pickIsYesSide tells us if Progno's pick is the YES team on Kalshi.
    // If pick IS the YES team → buy YES at yes_ask.
    // If pick is the OTHER team → buy NO at no_ask (betting against the YES team).
    for (const ev of prognoEvents) {
      const matched = matchKalshiMarketToProgno(ev, dedupedMarkets);
      if (!matched) {
        matchMiss++;
        console.log(`[MATCH MISS] ${ev.league}: ${ev.pick} (${ev.homeTeam} vs ${ev.awayTeam}) — no Kalshi market found`);
        continue;
      }

      const modelProb = Math.max(1, Math.min(99, ev.modelProbability)); // 0-100
      const pickIsYes = matched.pickIsYesSide;
      const entryPrice = pickIsYes
        ? (typeof matched.yes_ask === 'number' ? matched.yes_ask : 50)
        : (typeof matched.no_ask === 'number' ? matched.no_ask : 50);
      const side: 'YES' | 'NO' = pickIsYes ? 'YES' : 'NO';
      // Edge: our model prob vs the entry price we'd pay
      const edge = modelProb - entryPrice;
      if (edge < minEdge) {
        edgeSkip++;
        console.log(`[EDGE SKIP] ${ev.league}: ${ev.pick} → ${matched.ticker} ${side} — model=${modelProb}% entry=${entryPrice}¢ edge=${edge.toFixed(1)}% (min ${minEdge}%)`);
        continue;
      }

      // Fee-aware profit check
      const profitCalc = calcNetProfit(10, entryPrice);
      if (profitCalc.netProfit < MIN_NET_PROFIT) {
        profitSkip++;
        console.log(`[PROFIT SKIP] ${ev.league}: ${ev.pick} → ${matched.ticker} ${side} — net=$${profitCalc.netProfit.toFixed(2)} (min $${MIN_NET_PROFIT})`);
        continue;
      }

      const confidence = Math.min(92, Math.max(52, modelProb));
      opps.push({
        id: `kalshi_${matched.ticker}_${side}_${Date.now()}`,
        type: 'prediction_market',
        source: 'PROGNO',
        title: `${side}: ${matched.title}`,
        description: `Progno edge ${edge.toFixed(1)}% at ${entryPrice}¢ (net $${profitCalc.netProfit.toFixed(2)} after ${(KALSHI_FEE_RATE * 100).toFixed(0)}% fee)`,
        confidence,
        expectedValue: edge,
        riskLevel: 'low',
        timeframe: '48h',
        requiredCapital: 10,
        potentialReturn: profitCalc.netProfit,
        reasoning: [`Progno model${ev.league ? ` (${ev.league})` : ''}: ${ev.label} → ${modelProb}% ${side} — net $${profitCalc.netProfit.toFixed(2)} after fees`],
        dataPoints: [
          ...(typeof matched.volume === 'number' ? [{ source: 'Kalshi', metric: 'Volume', value: matched.volume, relevance: 80, timestamp: nowIso }] : []),
        ],
        action: {
          platform: 'kalshi',
          actionType: 'bet',
          amount: 10,
          target: `${matched.ticker} ${side}`,
          instructions: [`Place ${side} on ${matched.ticker} at ≤${entryPrice}¢`],
          autoExecute: true,
        },
        expiresAt: nowIso,
        createdAt: nowIso,
      });
      const opponent = ev.totalLine != null ? `${ev.homeTeam} vs ${ev.awayTeam}` : (ev.pick === ev.homeTeam ? ev.awayTeam : ev.homeTeam);
      let gameTimeStr = '';
      if (ev.gameTime) {
        try {
          const d = new Date(ev.gameTime);
          if (!Number.isNaN(d.getTime())) {
            gameTimeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
          } else {
            gameTimeStr = ev.gameTime;
          }
        } catch {
          gameTimeStr = ev.gameTime;
        }
      }
      const live = findLiveScore(liveScores, ev.homeTeam, ev.awayTeam);
      const currentScore = live
        ? (live.status === 'LIVE' ? 'LIVE ' : live.status === 'FINAL' ? 'FINAL ' : '') + `${live.awayScore}-${live.homeScore}`
        : '';
      picksForFriends.push({
        pick: ev.pick,
        opponent,
        odds: `${entryPrice}¢`,
        gameTime: gameTimeStr,
        currentScore,
      });
    }

    if (prognoEvents.length > 0) {
      console.log(`   [DEBUG] Progno→Kalshi: ${opps.filter(o => o.source === 'PROGNO').length} opportunities | ${matchMiss} match miss | ${edgeSkip} edge skip | ${profitSkip} profit skip`);
    }

    if (picksForFriends.length > 0) {
      const outPath = path.join(alphaHunterRoot, 'picks-for-friends.txt');
      const lines = picksForFriends.map(({ pick, opponent, odds, gameTime, currentScore }) =>
        [pick, opponent, odds, gameTime || '—', currentScore || '—'].join(' | ')
      );
      try {
        fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
        console.log(`   📄 Wrote ${picksForFriends.length} pick(s) to ${outPath}`);
      } catch (e) {
        console.warn(`   ⚠️ Could not write picks-for-friends.txt: ${(e as Error).message}`);
      }
    }

    // 2) Crypto fallback: use Coinbase-based probability model
    if (getCbPrice) {
      for (const m of allMarkets) {
        const title = m?.title || '';
        if (!title) continue;
        const cryptoProb = await getCryptoModelProbability(title, getCbPrice);
        if (!cryptoProb) continue;

        const modelProb = Math.max(1, Math.min(99, cryptoProb.modelProbability));
        const yesAsk = typeof m?.yes_ask === 'number' ? m.yes_ask : 50;
        const edge = modelProb - yesAsk;
        if (edge < minEdge) continue;

        // Fee-aware profit check
        const profitCalc = calcNetProfit(10, yesAsk);
        if (profitCalc.netProfit < MIN_NET_PROFIT) continue;

        const confidence = Math.min(90, Math.max(52, modelProb));
        const ticker = m?.ticker || String(m?.id || 'unknown');
        opps.push({
          id: `kalshi_${ticker}_YES_${Date.now()}`,
          type: 'prediction_market',
          source: 'Coinbase',
          title: `YES: ${title}`,
          description: `Crypto rule edge ${edge.toFixed(1)}% at ${yesAsk}¢ (net $${profitCalc.netProfit.toFixed(2)} after ${(KALSHI_FEE_RATE * 100).toFixed(0)}% fee)`,
          confidence,
          expectedValue: edge,
          riskLevel: 'medium',
          timeframe: '48h',
          requiredCapital: 10,
          potentialReturn: profitCalc.netProfit,
          reasoning: [`Crypto rule: ${cryptoProb.label} → ${modelProb}% — net $${profitCalc.netProfit.toFixed(2)} after fees`],
          dataPoints: [
            ...(typeof m?.volume === 'number' ? [{ source: 'Kalshi', metric: 'Volume', value: m.volume, relevance: 80, timestamp: nowIso }] : []),
          ],
          action: {
            platform: 'kalshi',
            actionType: 'bet',
            amount: 10,
            target: `${ticker} YES`,
            instructions: [`Place YES on ${ticker} at ≤${yesAsk}¢`],
            autoExecute: true,
          },
          expiresAt: nowIso,
          createdAt: nowIso,
        });
      }
    }

    // Sort best-first by edge before caller applies extra ranking
    opps.sort((a, b) => b.expectedValue - a.expectedValue);
    return opps;
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

  /**
   * @deprecated Use placeLimitOrderContracts() or placeLimitOrderUsd() instead.
   * This alias is maintained for backwards compatibility only.
   */
  async placeOrder(order: any): Promise<any> {
    console.warn('   ⚠️  placeOrder() is deprecated. Use placeLimitOrderUsd().');
    return this.placeLimitOrderContracts(order.ticker, order.side, order.count, order.price || 50);
  }

  /**
   * @deprecated Use placeLimitOrderUsd() instead for maker orders.
   */
  async buy(ticker: string, count: number, side: string): Promise<any> {
    console.warn('   ⚠️  buy() is deprecated. Use placeLimitOrderUsd().');
    return this.placeLimitOrderContracts(ticker, side as 'yes' | 'no', count, 50);
  }

  /**
   * Convert USD stake into integer contract count at a given limit price (cents).
   * Contracts are $1 max payout each; cost per contract ≈ price_cents / 100.
   */
  public usdToContracts(usdAmount: number, priceCents: number): number {
    const amount = Number(usdAmount);
    const price = Math.round(priceCents);
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    if (!Number.isFinite(price) || price <= 0 || price > 100) return 0;
    return Math.floor((amount * 100) / price);
  }

  /**
   * Place a limit order on Kalshi by CONTRACT COUNT.
   * @param ticker Market ticker
   * @param side 'yes' or 'no'
   * @param contracts Contract count (integer)
   * @param limitPrice Limit price in cents (0-100)
   * @returns Trade result
   */
  async placeLimitOrderContracts(ticker: string, side: 'yes' | 'no', contracts: number, limitPrice: number): Promise<any> {
    if (!this.keyConfigured) return { status: 'simulated' };

    // CRITICAL: Verify count is a rounded integer derived from $5 notional allocation
    const countInteger = Math.round(contracts);
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

    assertKalshiRequestUrlIsDemo(`${this.baseUrl}/portfolio/orders`);
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

    const data: any = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data));
    return data;
  }

  /**
   * Place a limit order on Kalshi by USD STAKE.
   * Converts USD → contracts at the provided limit price.
   */
  async placeLimitOrderUsd(ticker: string, side: 'yes' | 'no', usdAmount: number, limitPrice: number): Promise<any> {
    const contracts = this.usdToContracts(usdAmount, limitPrice);
    if (contracts <= 0) {
      throw new Error(`Invalid USD stake: $${usdAmount} at ${limitPrice}¢ yields 0 contracts`);
    }
    return this.placeLimitOrderContracts(ticker, side, contracts, limitPrice);
  }

  /**
   * Backwards-compatible alias (historical name).
   * IMPORTANT: This method expects CONTRACTS, not USD.
   * Prefer placeLimitOrderUsd() at call sites using dollar amounts.
   */
  async placeBet(ticker: string, side: 'yes' | 'no', count: number, limitPrice: number): Promise<any> {
    return this.placeLimitOrderContracts(ticker, side, count, limitPrice);
  }

  /**
   * @deprecated Use placeLimitOrderUsd() instead. Market orders incur fees.
   * This method is kept for backwards compatibility but should not be used
   * for new trading logic. Maker limit orders are preferred.
   */
  private async executeTrade(ticker: string, side: string, count: number) {
    console.warn('   ⚠️  executeTrade() is deprecated. Use placeLimitOrderUsd() for maker orders.');
    return { status: 'deprecated', message: 'Use placeLimitOrderUsd() instead' };
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

export const kalshiTrader = new KalshiTrader();
