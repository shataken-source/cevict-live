/**
 * KALSHI API INTEGRATION FOR PROGNO
 * Real-time prediction market data from Kalshi
 *
 * Kalshi uses probability-based pricing (0-99 cents = 0-99% probability)
 * Perfect for users in states without legal sports betting
 *
 * Documentation: https://docs.kalshi.com
 */

import crypto from 'crypto';

export interface KalshiMarket {
  ticker: string;
  title: string;
  subtitle?: string;
  category: string;
  subcategory?: string;
  yesBid: number;     // Price to buy YES (0-99 = 0-99% probability)
  yesAsk: number;     // Price to sell YES
  noBid: number;      // Price to buy NO
  noAsk: number;      // Price to sell NO
  lastPrice: number;  // Last traded price (0-99)
  volume: number;
  openTime: string;
  closeTime: string;
  status: 'open' | 'closed' | 'settled';
  result?: 'yes' | 'no';
  // Progno-enhanced fields
  impliedProbability: number;  // Calculated from market prices
  confidence: number;          // Based on volume and spread
}

export interface KalshiSearchResult {
  markets: KalshiMarket[];
  total: number;
  query: string;
  source: 'api' | 'unavailable';
}

export interface KalshiCategory {
  name: string;
  markets: KalshiMarket[];
}

// Kalshi API configuration
const KALSHI_API_BASE = 'https://api.elections.kalshi.com/trade-api/v2';
const KALSHI_DEMO_API_BASE = 'https://demo-api.kalshi.co/trade-api/v2';

/**
 * Get Kalshi API credentials from environment
 */
function getKalshiCredentials(): {
  apiKeyId: string;
  privateKey: string;
  isDemo: boolean;
} | null {
  const apiKeyId = process.env.KALSHI_API_KEY_ID;
  const privateKey = process.env.KALSHI_PRIVATE_KEY;
  const isDemo = process.env.KALSHI_USE_DEMO === 'true';

  if (apiKeyId && privateKey) {
    return { apiKeyId, privateKey, isDemo };
  }

  return null;
}

/**
 * Generate RSA signature for Kalshi API authentication
 * Kalshi requires RSA-PSS signatures with SHA-256
 */
function generateKalshiSignature(
  timestamp: string,
  method: string,
  path: string,
  privateKeyPem: string
): string {
  const pathWithoutQuery = path.split('?')[0];
  const message = `${timestamp}${method}${pathWithoutQuery}`;

  try {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(message);
    sign.end();

    const signature = sign.sign({
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
    }, 'base64');

    return signature;
  } catch (error) {
    console.error('Failed to generate Kalshi signature:', error);
    throw error;
  }
}

/**
 * Make authenticated request to Kalshi API
 */
async function kalshiRequest(
  method: string,
  path: string,
  credentials: { apiKeyId: string; privateKey: string; isDemo: boolean },
  body?: object
): Promise<any> {
  const baseUrl = credentials.isDemo ? KALSHI_DEMO_API_BASE : KALSHI_API_BASE;
  const url = `${baseUrl}${path}`;
  const timestamp = Date.now().toString();

  const signature = generateKalshiSignature(
    timestamp,
    method,
    path,
    credentials.privateKey
  );

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'KALSHI-ACCESS-KEY': credentials.apiKeyId,
    'KALSHI-ACCESS-SIGNATURE': signature,
    'KALSHI-ACCESS-TIMESTAMP': timestamp,
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Kalshi API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * Search Kalshi markets
 */
export async function searchKalshiMarkets(
  query: string,
  limit: number = 20
): Promise<KalshiSearchResult> {
  const credentials = getKalshiCredentials();

  if (!credentials) {
    console.warn('[Kalshi] No API credentials configured');
    return {
      markets: [],
      total: 0,
      query,
      source: 'unavailable',
    };
  }

  try {
    // Build query parameters
    const params = new URLSearchParams({
      limit: limit.toString(),
      status: 'open',
    });

    if (query) {
      params.append('series_ticker', query.toUpperCase());
    }

    const path = `/markets?${params.toString()}`;
    const data = await kalshiRequest('GET', path, credentials);

    // Transform to our format with probability calculations
    const markets: KalshiMarket[] = (data.markets || []).map((m: any) => {
      const yesBid = m.yes_bid || 0;
      const yesAsk = m.yes_ask || 0;
      const noBid = m.no_bid || 0;
      const noAsk = m.no_ask || 0;

      // Calculate implied probability from mid-price
      const yesMid = (yesBid + yesAsk) / 2;
      const noMid = (noBid + noAsk) / 2;
      const impliedProbability = yesMid / 100; // Convert cents to probability

      // Calculate confidence from spread and volume
      const spread = Math.abs(yesAsk - yesBid);
      const volumeScore = Math.min((m.volume || 0) / 50000, 1);
      const spreadScore = Math.max(0, 1 - spread / 20);
      const confidence = (volumeScore * 0.6 + spreadScore * 0.4);

      return {
        ticker: m.ticker,
        title: m.title,
        subtitle: m.subtitle,
        category: m.category || extractCategory(m.series_ticker || ''),
        subcategory: m.subcategory,
        yesBid,
        yesAsk,
        noBid,
        noAsk,
        lastPrice: m.last_price || yesMid,
        volume: m.volume || 0,
        openTime: m.open_time || new Date().toISOString(),
        closeTime: m.close_time || new Date().toISOString(),
        status: m.status || 'open',
        result: m.result,
        impliedProbability,
        confidence,
      };
    });

    return {
      markets,
      total: data.cursor?.total || markets.length,
      query,
      source: 'api',
    };

  } catch (error) {
    console.error('[Kalshi] API error:', error);
    return {
      markets: [],
      total: 0,
      query,
      source: 'unavailable',
    };
  }
}

/**
 * Extract category from series ticker
 */
function extractCategory(seriesTicker: string): string {
  const prefix = seriesTicker.split('-')[0]?.toUpperCase();
  const categories: Record<string, string> = {
    'PRES': 'Politics',
    'SENATE': 'Politics',
    'HOUSE': 'Politics',
    'ECON': 'Economics',
    'FED': 'Economics',
    'INFL': 'Economics',
    'GDP': 'Economics',
    'SPORTS': 'Sports',
    'NFL': 'Sports',
    'NBA': 'Sports',
    'MLB': 'Sports',
    'TECH': 'Tech & Science',
    'AI': 'Tech & Science',
    'CRYPTO': 'Crypto',
    'BTC': 'Crypto',
    'CLIMATE': 'Climate',
    'WEATHER': 'Climate',
    'HEALTH': 'Health',
    'COVID': 'Health',
  };
  return categories[prefix] || 'General';
}

/**
 * Get market probability from Kalshi market
 * Returns probability 0-1 based on market prices
 */
export function getMarketProbability(market: KalshiMarket): number {
  // Use mid-price as probability (already calculated)
  return market.impliedProbability;
}

/**
 * Get all available categories
 */
export function getKalshiCategories(): string[] {
  return [
    'Politics',
    'Economics',
    'Sports',
    'Tech & Science',
    'Crypto',
    'Climate',
    'Health',
    'Culture',
    'World',
  ];
}

/**
 * Find best matching Kalshi market for a prediction question
 */
export async function findBestKalshiMatch(question: string): Promise<{
  market: KalshiMarket | null;
  probability: number;
  confidence: number;
  relevance: number;
}> {
  // Extract keywords for search
  const keywords = extractKeywords(question);
  const searchResults = await searchKalshiMarkets(keywords.join(' '), 10);

  if (searchResults.markets.length === 0 || searchResults.source === 'unavailable') {
    return {
      market: null,
      probability: 0.5,
      confidence: 0,
      relevance: 0,
    };
  }

  // Score each market for relevance
  const scoredMarkets = searchResults.markets.map(market => {
    const titleLower = market.title.toLowerCase();
    const questionLower = question.toLowerCase();

    // Calculate relevance based on keyword matches
    let relevance = 0;
    for (const keyword of keywords) {
      if (titleLower.includes(keyword.toLowerCase())) {
        relevance += 0.2;
      }
    }
    relevance = Math.min(relevance, 1);

    return { market, relevance };
  });

  // Sort by relevance and get best match
  scoredMarkets.sort((a, b) => b.relevance - a.relevance);
  const best = scoredMarkets[0];

  if (!best || best.relevance < 0.2) {
    return {
      market: null,
      probability: 0.5,
      confidence: 0,
      relevance: 0,
    };
  }

  return {
    market: best.market,
    probability: best.market.impliedProbability,
    confidence: Math.min(best.market.confidence * best.relevance, 0.95),
    relevance: best.relevance,
  };
}

/**
 * Extract keywords from a question
 */
function extractKeywords(question: string): string[] {
  const stopWords = new Set([
    'will', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'shall', 'should',
    'may', 'might', 'must', 'can', 'could', 'would', 'of', 'to', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further',
    'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
    'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
    'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom',
  ]);

  return question
    .toLowerCase()
    .replace(/[?!.,;:'"()]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Get trending Kalshi markets by category
 */
export async function getTrendingKalshiMarkets(
  category?: string,
  limit: number = 10
): Promise<KalshiMarket[]> {
  const searchResults = await searchKalshiMarkets(category || '', limit * 2);

  // Sort by volume (most active = trending)
  const sorted = searchResults.markets.sort((a, b) => b.volume - a.volume);

  // Filter by category if specified
  if (category) {
    return sorted
      .filter(m => m.category.toLowerCase() === category.toLowerCase())
      .slice(0, limit);
  }

  return sorted.slice(0, limit);
}

/**
 * Convert Kalshi probability to Progno confidence format
 * Combines market probability with market confidence
 */
export function kalshiToPrognoConfidence(
  kalshiProbability: number,
  marketConfidence: number
): number {
  // Weight: 70% market probability, 30% market confidence
  return Math.round((kalshiProbability * 70 + marketConfidence * 30)) / 100;
}

/**
 * Get Kalshi sports markets specifically
 * For states without legal sports betting
 */
export async function getKalshiSportsMarkets(
  sport?: string,
  limit: number = 20
): Promise<KalshiMarket[]> {
  const sportQueries: Record<string, string> = {
    'nfl': 'NFL',
    'nba': 'NBA',
    'mlb': 'MLB',
    'nhl': 'NHL',
    'ncaaf': 'COLLEGE FOOTBALL',
    'ncaab': 'COLLEGE BASKETBALL',
    'soccer': 'SOCCER',
    'ufc': 'UFC MMA',
    'nascar': 'NASCAR',
  };

  const query = sport ? sportQueries[sport.toLowerCase()] || sport : 'SPORTS';
  const results = await searchKalshiMarkets(query, limit);

  return results.markets.filter(m =>
    m.category === 'Sports' ||
    m.title.toLowerCase().includes('game') ||
    m.title.toLowerCase().includes('win') ||
    m.title.toLowerCase().includes('championship')
  );
}
