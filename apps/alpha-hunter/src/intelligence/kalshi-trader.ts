/**
 * Kalshi Trader (Production-Ready with 14-Day Expiration Filter)
 *
 * CRITICAL SAFETY: This class is designed for production trading with:
 * - 14-day maximum expiration filter (no long-term bets)
 * - $2 max trade size (configurable via MAX_SINGLE_TRADE)
 * - Maker-only orders (limit orders 1¢ inside spread for $0 fees)
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

/**
 * Environment loading policy (alpha-hunter):
 * - NEVER load repo-root env files (they may contain prod settings for other apps).
 * - Always prefer the alpha-hunter app's own `.env.local`, then `.env`.
 *
 * We load by file-location so it works regardless of current working directory.
 */
const alphaHunterRoot = path.resolve(__dirname, '..', '..', '..'); // src/intelligence -> alpha-hunter/
const alphaEnvLocal = path.join(alphaHunterRoot, '.env.local');
const alphaEnv = path.join(alphaHunterRoot, '.env');

// Prefer `.env.local` and allow it to override inherited env vars (workspace/global).
if (fs.existsSync(alphaEnvLocal)) dotenv.config({ path: alphaEnvLocal, override: true });
// Load `.env` as defaults only (do not override `.env.local` / process env).
if (fs.existsSync(alphaEnv)) dotenv.config({ path: alphaEnv, override: false });

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

    this.apiKeyId = (process.env.KALSHI_API_KEY_ID || secrets?.kalshi?.apiKeyId || '')
      .replace(/^"(.*)"$/, '$1')
      .trim();

    let rawKey = process.env.KALSHI_PRIVATE_KEY || secrets?.kalshi?.privateKey || '';

    // Optional: load from PEM file to avoid .env newline/quoting issues.
    if (!rawKey) {
      const keyPath = (process.env.KALSHI_PRIVATE_KEY_PATH || secrets?.kalshi?.privateKeyPath || '').trim();
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
      this.privateKey = normalized;

      // Validate the key is plausibly complete and parseable.
      // (Do NOT log key contents.)
      if (normalized.length > 256 && normalized.includes('BEGIN') && normalized.includes('PRIVATE KEY')) {
        try {
          crypto.createPrivateKey(normalized);
          this.keyConfigured = true;
        } catch {
          this.keyConfigured = false;
        }
      } else {
        this.keyConfigured = false;
      }
    }
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
   * Get markets with parallel pagination for faster fetching
   * Fetches multiple pages concurrently instead of sequentially
   */
  private async getMarketsParallel(limitPerPage: number = 100, maxPages: number = 3): Promise<any[]> {
    // First, fetch page 1 to get total count
    const firstPage = await this.getMarketsPage(limitPerPage, 0);
    if (!firstPage || firstPage.length === 0) return [];

    // Calculate remaining pages to fetch
    const remainingPages = Math.min(maxPages - 1, 4); // Max 4 more pages

    if (remainingPages <= 0) {
      return firstPage;
    }

    // Fetch remaining pages in parallel
    const pagePromises: Promise<any[]>[] = [];
    for (let i = 1; i <= remainingPages; i++) {
      pagePromises.push(this.getMarketsPage(limitPerPage, i * limitPerPage));
    }

    const remainingResults = await Promise.allSettled(pagePromises);

    // Combine all markets
    let allMarkets = [...firstPage];
    for (const result of remainingResults) {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        allMarkets = allMarkets.concat(result.value);
      }
    }

    console.log(`   📊 Parallel fetch: ${allMarkets.length} markets from ${maxPages} pages`);
    return allMarkets;
  }

  /**
   * Fetch a single page of markets
   */
  private async getMarketsPage(limit: number, offset: number): Promise<any[]> {
    try {
      const qs = new URLSearchParams({
        limit: String(limit),
        cursor: String(offset),
        status: 'open',
      });

      const fullPath = `/trade-api/v2/markets?${qs.toString()}`;
      const { signature, timestamp } = await this.signRequestWithTimestamp('GET', fullPath);
      if (!signature) return [];

      const fullUrl = this.baseUrl.replace('/trade-api/v2', '') + fullPath;
      assertKalshiRequestUrlIsDemo(fullUrl);

      console.log(`   🔍 DEBUG: Fetching from ${fullUrl}`);

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'KALSHI-ACCESS-KEY': this.apiKeyId,
          'KALSHI-ACCESS-SIGNATURE': signature,
          'KALSHI-ACCESS-TIMESTAMP': timestamp,
        },
      });

      console.log(`   🔍 DEBUG: Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.log(`   ⚠️ Markets API error: ${response.status} ${response.statusText}${errorText ? ' - ' + errorText.slice(0, 100) : ''}`);
        return [];
      }
      const data = await response.json();
      console.log(`   🔍 DEBUG: Response keys: ${Object.keys(data).join(', ')}`);
      console.log(`   🔍 DEBUG: markets array: ${data.markets ? 'present' : 'MISSING'} (${data.markets?.length || 0} items)`);
      console.log(`   📡 Markets API response: ${data.markets?.length || 0} markets`);

      // Show first market if available
      if (data.markets && data.markets.length > 0) {
        console.log(`   🔍 DEBUG: First market ticker: ${data.markets[0].ticker}, title: ${data.markets[0].title?.substring(0, 40)}...`);
      }

      return data.markets || [];
    } catch (error) {
      console.log(`   ⚠️ Markets fetch error: ${error}`);
      return [];
    }
  }

  /**
   * Get markets (now uses parallel fetching by default)
   */
  async getMarkets(): Promise<PredictionMarket[]> {
    const apiMarkets = await this.getMarketsParallel(100, 3); // 3 pages = 300 markets max
    return this.transformMarkets(apiMarkets);
  }

  async getBalance(): Promise<number> {
    if (!this.keyConfigured) return 500;
    try {
      const fullPath = '/trade-api/v2/portfolio/balance';
      const { signature, timestamp } = await this.signRequestWithTimestamp('GET', fullPath);
      if (!signature) return 500;
      const apiUrl = this.baseUrl.replace('/trade-api/v2', '') + fullPath;
      assertKalshiRequestUrlIsDemo(apiUrl);
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
      const data = await response.json();
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
      const data = await response.json();
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
      const data = await response.json();
      return Array.isArray(data.settlements) ? data.settlements : [];
    } catch {
      return [];
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

      const confidence = Math.min(90, Math.max(50, 50 + Math.abs(edge) * 3));
      opps.push({
        id: `kalshi_${m.id}_${side}_${Date.now()}`,
        type: 'prediction_market',
        source: 'Kalshi',
        title: `${side.toUpperCase()}: ${m.title}`,
        description: `Heuristic edge ${edge.toFixed(1)}% at ${side === 'yes' ? yesPrice : noPrice}¢`,
        confidence,
        expectedValue: edge,
        riskLevel: 'medium',
        timeframe: '48h',
        requiredCapital: 5,
        potentialReturn: 5 * (edge / 100),
        reasoning: ['Heuristic contrarian edge (training mode)'],
        dataPoints: [],
        action: {
          platform: 'kalshi',
          actionType: 'bet',
          amount: 5,
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
    const markets = await this.getMarkets();
    const minEdge = Number(minEdgePct) || 0;
    const nowIso = new Date().toISOString();

    const prognoEvents = await getPrognoProbabilities();
    const getCbPrice = options?.getCoinbasePrice;

    const opps: Opportunity[] = [];
    for (const m of markets) {
      const yesPrice = Number(m.yesPrice || 50);
      const noPrice = Number(m.noPrice || 50);
      const title = m.title || '';
      const category = m.category || '';

      let modelProbability: number | null = null;
      let source = 'Kalshi';
      let reasoning: string[] = ['Heuristic contrarian edge'];

      const prognoMatch = matchKalshiMarketToProgno(title, category, prognoEvents);
      if (prognoMatch) {
        modelProbability = prognoMatch.modelProbability;
        source = 'PROGNO';
        const leaguePart = prognoMatch.league ? ` (${prognoMatch.league})` : '';
        reasoning = [`Progno model${leaguePart}: ${prognoMatch.label} → ${modelProbability}%`];
      }

      if (modelProbability == null && getCbPrice) {
        const cryptoProb = await getCryptoModelProbability(title, getCbPrice);
        if (cryptoProb) {
          modelProbability = cryptoProb.modelProbability;
          source = 'Coinbase';
          reasoning = [`Crypto rule: ${cryptoProb.label} → ${modelProbability}%`];
        }
      }

      if (modelProbability == null) {
        modelProbability = yesPrice > 50 ? Math.max(1, yesPrice - 5) : Math.min(99, yesPrice + 5);
      }

      const yesEdge = modelProbability - yesPrice;
      const noEdge = (100 - modelProbability) - noPrice;

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

      const confidence = Math.min(92, Math.max(52, modelProbability));
      opps.push({
        id: `kalshi_${m.id}_${side}_${Date.now()}`,
        type: 'prediction_market',
        source,
        title: `${side.toUpperCase()}: ${title}`,
        description: `${source} edge ${edge.toFixed(1)}% at ${side === 'yes' ? yesPrice : noPrice}¢`,
        confidence,
        expectedValue: edge,
        riskLevel: source === 'PROGNO' ? 'low' : 'medium',
        timeframe: '48h',
        requiredCapital: 5,
        potentialReturn: 5 * (edge / 100),
        reasoning,
        dataPoints: (m.volume != null && m.volume > 0)
          ? [{ source: 'Kalshi', metric: 'Volume', value: m.volume, relevance: 80, timestamp: nowIso }]
          : [],
        action: {
          platform: 'kalshi',
          actionType: 'bet',
          amount: 5,
          target: `${m.id} ${side.toUpperCase()}`,
          instructions: [`Place ${side.toUpperCase()} on ${m.id} at ≤${side === 'yes' ? yesPrice : noPrice}¢`],
          autoExecute: source === 'PROGNO',
        },
        expiresAt: m.expiresAt || nowIso,
        createdAt: nowIso,
      });
    }

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

    const data = await response.json();
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
