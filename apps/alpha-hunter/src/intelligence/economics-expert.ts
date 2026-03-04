/**
 * ECONOMICS EXPERT — Data-Driven Kalshi Trading
 *
 * Fetches real economic indicators from FRED (Federal Reserve Economic Data)
 * and generates predictions for Kalshi economics markets:
 * - Fed rate decisions (FOMC meetings)
 * - CPI / inflation readings
 * - Unemployment rate
 * - GDP growth
 * - Recession probability
 *
 * Unlike the category-learner LLM wrapper, this uses actual data feeds
 * with quantitative models to find edge.
 *
 * FRED API: https://fred.stlouisfed.org/docs/api/fred/
 * Free tier: 120 requests/minute, no key needed for HTTPS access.
 */

import { Opportunity } from '../types';

// ── FRED Data Series IDs ─────────────────────────────────────────────────────

const FRED_SERIES = {
  FED_FUNDS_RATE: 'FEDFUNDS',          // Effective federal funds rate
  CPI_ALL_URBAN: 'CPIAUCSL',           // CPI for all urban consumers
  CPI_YOY: 'CPIAUCNS',                 // CPI year-over-year (not seasonally adjusted)
  UNEMPLOYMENT: 'UNRATE',              // Civilian unemployment rate
  GDP_GROWTH: 'A191RL1Q225SBEA',       // Real GDP growth rate (quarterly)
  RECESSION_PROB: 'RECPROUSM156N',     // Smoothed US recession probabilities
  CORE_PCE: 'PCEPILFE',                // Core PCE price index (Fed's preferred inflation measure)
  T10Y2Y: 'T10Y2Y',                    // 10Y-2Y Treasury spread (yield curve)
  INITIAL_CLAIMS: 'ICSA',              // Initial jobless claims (weekly)
} as const;

// ── FOMC Meeting Dates 2025-2026 ─────────────────────────────────────────────

const FOMC_DATES_2025_2026 = [
  '2025-01-29', '2025-03-19', '2025-05-07', '2025-06-18',
  '2025-07-30', '2025-09-17', '2025-10-29', '2025-12-17',
  '2026-01-28', '2026-03-18', '2026-04-29', '2026-06-17',
  '2026-07-29', '2026-09-16', '2026-10-28', '2026-12-16',
];

// ── Types ────────────────────────────────────────────────────────────────────

interface FredObservation {
  date: string;
  value: number;
}

interface EconSnapshot {
  fedFundsRate: number | null;
  cpiLatest: number | null;
  cpiYoY: number | null;          // year-over-year % change
  unemployment: number | null;
  gdpGrowth: number | null;
  recessionProb: number | null;
  yieldCurveSpread: number | null; // 10Y-2Y (negative = inverted)
  initialClaims: number | null;
  // Treasury.gov data
  treasury10Y: number | null;      // 10-year treasury yield
  treasury2Y: number | null;       // 2-year treasury yield
  treasury30Y: number | null;      // 30-year treasury yield
  // EIA energy data
  oilPriceWTI: number | null;      // WTI crude $/barrel
  gasolinePrice: number | null;    // Regular gasoline $/gallon
  // World Bank global indicators
  globalGdpGrowth: number | null;  // World GDP growth forecast %
  // CoinGecko crypto data
  btcPrice: number | null;
  ethPrice: number | null;
  cryptoMarketCap: number | null;  // Total crypto market cap in billions
  btcDominance: number | null;     // BTC dominance %
  fearGreedIndex: number | null;   // 0-100 (0=extreme fear, 100=extreme greed)
  fetchedAt: Date;
}

interface EconMarketSignal {
  ticker: string;
  title: string;
  category: 'fed_rate' | 'inflation' | 'unemployment' | 'gdp' | 'recession' | 'energy' | 'crypto';
  modelProbability: number; // 0-100
  marketPrice: number;      // yes_ask in cents
  edge: number;             // model - market
  side: 'YES' | 'NO';
  confidence: number;
  reasoning: string[];
}

// ── API Clients ─────────────────────────────────────────────────────────────

const FRED_BASE = 'https://api.stlouisfed.org/fred';
const TREASURY_BASE = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service';
const EIA_BASE = 'https://api.eia.gov/v2';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

async function fetchFredSeries(seriesId: string, limit: number = 5): Promise<FredObservation[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return [];

  try {
    const url = `${FRED_BASE}/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data: any = await res.json();
    return (data.observations || [])
      .filter((o: any) => o.value !== '.')
      .map((o: any) => ({ date: o.date, value: parseFloat(o.value) }))
      .filter((o: FredObservation) => !isNaN(o.value));
  } catch {
    return [];
  }
}

// ── Treasury.gov Fetcher (no API key needed) ────────────────────────────────

async function fetchTreasuryYields(): Promise<{ y10: number | null; y2: number | null; y30: number | null }> {
  try {
    // Treasury daily rates: most recent record
    const url = `${TREASURY_BASE}/v2/accounting/od/avg_interest_rates?sort=-record_date&page[size]=10&filter=security_desc:eq:Treasury Bonds,security_desc:eq:Treasury Notes`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { y10: null, y2: null, y30: null };
    const data = await res.json();
    // Fallback: try the daily treasury yield curve endpoint
    const yieldUrl = `${TREASURY_BASE}/v1/accounting/od/rates_of_exchange?sort=-record_date&page[size]=1`;
    // Use FRED for treasury yields instead (more reliable)
    return { y10: null, y2: null, y30: null };
  } catch {
    return { y10: null, y2: null, y30: null };
  }
}

// ── EIA Energy Fetcher ───────────────────────────────────────────────────────

async function fetchEIAData(): Promise<{ oilWTI: number | null; gasoline: number | null }> {
  const apiKey = process.env.EIA_API_KEY;
  // EIA v2 API: fetch WTI crude and retail gasoline prices
  try {
    // WTI Crude Oil (PET.RWTC.W = weekly WTI spot)
    const oilUrl = apiKey
      ? `${EIA_BASE}/petroleum/pri/spt/data/?api_key=${apiKey}&frequency=weekly&data[0]=value&facets[series][]=RWTC&sort[0][column]=period&sort[0][direction]=desc&length=2`
      : `${EIA_BASE}/petroleum/pri/spt/data/?frequency=weekly&data[0]=value&facets[series][]=RWTC&sort[0][column]=period&sort[0][direction]=desc&length=2`;
    const gasUrl = apiKey
      ? `${EIA_BASE}/petroleum/pri/gnd/data/?api_key=${apiKey}&frequency=weekly&data[0]=value&facets[series][]=EMM_EPMR_PTE_NUS_DPG&sort[0][column]=period&sort[0][direction]=desc&length=2`
      : `${EIA_BASE}/petroleum/pri/gnd/data/?frequency=weekly&data[0]=value&facets[series][]=EMM_EPMR_PTE_NUS_DPG&sort[0][column]=period&sort[0][direction]=desc&length=2`;

    const [oilRes, gasRes] = await Promise.all([
      fetch(oilUrl, { signal: AbortSignal.timeout(8000) }).catch(() => null),
      fetch(gasUrl, { signal: AbortSignal.timeout(8000) }).catch(() => null),
    ]);

    let oilWTI: number | null = null;
    let gasoline: number | null = null;

    if (oilRes?.ok) {
      const d = await oilRes.json();
      oilWTI = d?.response?.data?.[0]?.value ?? null;
    }
    if (gasRes?.ok) {
      const d = await gasRes.json();
      gasoline = d?.response?.data?.[0]?.value ?? null;
    }
    return { oilWTI, gasoline };
  } catch {
    return { oilWTI: null, gasoline: null };
  }
}

// ── World Bank Fetcher (no API key needed) ───────────────────────────────────

async function fetchWorldBankGDP(): Promise<number | null> {
  try {
    // World GDP growth rate, most recent year
    const url = 'https://api.worldbank.org/v2/country/WLD/indicator/NY.GDP.MKTP.KD.ZG?format=json&per_page=3&mrv=3';
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    // data[1] is the array of observations
    const obs = data?.[1];
    if (Array.isArray(obs) && obs.length > 0) {
      for (const o of obs) {
        if (o.value !== null && o.value !== undefined) return parseFloat(o.value);
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ── CoinGecko Fetcher (no API key needed, 10-30 req/min) ────────────────────

interface CryptoSnapshot {
  btcPrice: number | null;
  ethPrice: number | null;
  totalMarketCap: number | null;  // billions
  btcDominance: number | null;
  fearGreedIndex: number | null;
}

async function fetchCoinGeckoData(): Promise<CryptoSnapshot> {
  const result: CryptoSnapshot = { btcPrice: null, ethPrice: null, totalMarketCap: null, btcDominance: null, fearGreedIndex: null };
  try {
    const [priceRes, globalRes, fgRes] = await Promise.all([
      fetch(`${COINGECKO_BASE}/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true`, { signal: AbortSignal.timeout(8000) }).catch(() => null),
      fetch(`${COINGECKO_BASE}/global`, { signal: AbortSignal.timeout(8000) }).catch(() => null),
      fetch('https://api.alternative.me/fng/?limit=1', { signal: AbortSignal.timeout(5000) }).catch(() => null),
    ]);

    if (priceRes?.ok) {
      const d = await priceRes.json();
      result.btcPrice = d?.bitcoin?.usd ?? null;
      result.ethPrice = d?.ethereum?.usd ?? null;
    }
    if (globalRes?.ok) {
      const d = await globalRes.json();
      result.totalMarketCap = d?.data?.total_market_cap?.usd ? d.data.total_market_cap.usd / 1e9 : null;
      result.btcDominance = d?.data?.market_cap_percentage?.btc ?? null;
    }
    if (fgRes?.ok) {
      const d = await fgRes.json();
      result.fearGreedIndex = d?.data?.[0]?.value ? parseInt(d.data[0].value) : null;
    }
  } catch { /* silent */ }
  return result;
}

// Cache snapshot per cycle
let snapshotCache: EconSnapshot | null = null;
let snapshotCacheTime = 0;
const SNAPSHOT_TTL = 30 * 60 * 1000; // 30 min

async function getEconSnapshot(): Promise<EconSnapshot> {
  const now = Date.now();
  if (snapshotCache && (now - snapshotCacheTime) < SNAPSHOT_TTL) return snapshotCache;

  // Fetch all data sources in parallel
  const [fedFunds, cpi, unemployment, gdp, recession, yieldCurve, claims, treasury10y, treasury2y, treasury30y, eia, worldGdp, crypto] = await Promise.all([
    fetchFredSeries(FRED_SERIES.FED_FUNDS_RATE, 3),
    fetchFredSeries(FRED_SERIES.CPI_ALL_URBAN, 13), // 13 months for YoY
    fetchFredSeries(FRED_SERIES.UNEMPLOYMENT, 3),
    fetchFredSeries(FRED_SERIES.GDP_GROWTH, 2),
    fetchFredSeries(FRED_SERIES.RECESSION_PROB, 2),
    fetchFredSeries(FRED_SERIES.T10Y2Y, 5),
    fetchFredSeries(FRED_SERIES.INITIAL_CLAIMS, 4),
    // Treasury yields via FRED (more reliable than Treasury.gov API)
    fetchFredSeries('DGS10', 3),    // 10-Year Treasury
    fetchFredSeries('DGS2', 3),     // 2-Year Treasury
    fetchFredSeries('DGS30', 3),    // 30-Year Treasury
    // External APIs
    fetchEIAData(),
    fetchWorldBankGDP(),
    fetchCoinGeckoData(),
  ]);

  // Calculate CPI YoY: (latest / 12-months-ago - 1) * 100
  let cpiYoY: number | null = null;
  if (cpi.length >= 13) {
    const latest = cpi[0].value;
    const yearAgo = cpi[12].value;
    if (yearAgo > 0) cpiYoY = ((latest / yearAgo) - 1) * 100;
  }

  snapshotCache = {
    fedFundsRate: fedFunds[0]?.value ?? null,
    cpiLatest: cpi[0]?.value ?? null,
    cpiYoY,
    unemployment: unemployment[0]?.value ?? null,
    gdpGrowth: gdp[0]?.value ?? null,
    recessionProb: recession[0]?.value ?? null,
    yieldCurveSpread: yieldCurve[0]?.value ?? null,
    initialClaims: claims[0]?.value ?? null,
    // Treasury yields
    treasury10Y: treasury10y[0]?.value ?? null,
    treasury2Y: treasury2y[0]?.value ?? null,
    treasury30Y: treasury30y[0]?.value ?? null,
    // EIA energy
    oilPriceWTI: eia.oilWTI,
    gasolinePrice: eia.gasoline,
    // World Bank
    globalGdpGrowth: worldGdp,
    // CoinGecko
    btcPrice: crypto.btcPrice,
    ethPrice: crypto.ethPrice,
    cryptoMarketCap: crypto.totalMarketCap,
    btcDominance: crypto.btcDominance,
    fearGreedIndex: crypto.fearGreedIndex,
    fetchedAt: new Date(),
  };
  snapshotCacheTime = now;

  console.log(`   [ECON] Snapshot: Fed=${snapshotCache.fedFundsRate}% CPI_YoY=${cpiYoY?.toFixed(1)}% Unemp=${snapshotCache.unemployment}% GDP=${snapshotCache.gdpGrowth}%`);
  console.log(`   [ECON]   Treasury: 2Y=${snapshotCache.treasury2Y}% 10Y=${snapshotCache.treasury10Y}% 30Y=${snapshotCache.treasury30Y}% Curve=${snapshotCache.yieldCurveSpread}`);
  console.log(`   [ECON]   Energy: WTI=$${snapshotCache.oilPriceWTI} Gas=$${snapshotCache.gasolinePrice} | WorldGDP=${snapshotCache.globalGdpGrowth?.toFixed(1)}%`);
  console.log(`   [ECON]   Crypto: BTC=$${snapshotCache.btcPrice?.toLocaleString()} ETH=$${snapshotCache.ethPrice?.toLocaleString()} MCap=$${snapshotCache.cryptoMarketCap?.toFixed(0)}B Dom=${snapshotCache.btcDominance?.toFixed(1)}% F&G=${snapshotCache.fearGreedIndex}`);
  return snapshotCache;
}

// ── Market Analysis Functions ────────────────────────────────────────────────

function classifyEconMarket(title: string, ticker: string): EconMarketSignal['category'] | null {
  const t = title.toLowerCase();
  if (t.includes('fed') || t.includes('fomc') || t.includes('interest rate') || t.includes('rate cut') || t.includes('rate hike'))
    return 'fed_rate';
  if (t.includes('cpi') || t.includes('inflation') || t.includes('pce') || t.includes('consumer price'))
    return 'inflation';
  if (t.includes('unemployment') || t.includes('jobless') || t.includes('nonfarm') || t.includes('jobs'))
    return 'unemployment';
  if (t.includes('gdp') || t.includes('economic growth'))
    return 'gdp';
  if (t.includes('recession'))
    return 'recession';
  if (t.includes('oil') || t.includes('crude') || t.includes('wti') || t.includes('brent') || t.includes('gasoline') || t.includes('gas price') || t.includes('energy price') || t.includes('opec'))
    return 'energy';
  if (t.includes('bitcoin') || t.includes('btc') || t.includes('ethereum') || t.includes('eth') || t.includes('crypto') || t.includes('digital asset'))
    return 'crypto';
  return null;
}

function analyzeFedRate(title: string, yesAsk: number, snap: EconSnapshot): { prob: number; confidence: number; reasoning: string[] } | null {
  const t = title.toLowerCase();
  const reasoning: string[] = [];

  // "Will the Fed cut rates at [meeting]?"
  if (t.includes('cut') || t.includes('lower')) {
    // Next FOMC meeting
    const today = new Date().toISOString().split('T')[0];
    const nextFomc = FOMC_DATES_2025_2026.find(d => d >= today);

    // If Fed funds rate is already low and inflation is above 2.5%, cuts are unlikely
    if (snap.cpiYoY !== null && snap.cpiYoY > 3.0) {
      reasoning.push(`CPI YoY at ${snap.cpiYoY.toFixed(1)}% — too hot for cuts`);
      return { prob: 25, confidence: 70, reasoning };
    }
    if (snap.cpiYoY !== null && snap.cpiYoY > 2.5) {
      reasoning.push(`CPI YoY at ${snap.cpiYoY.toFixed(1)}% — slightly above target, cuts possible but not certain`);
      return { prob: 40, confidence: 60, reasoning };
    }
    if (snap.cpiYoY !== null && snap.cpiYoY <= 2.5 && snap.unemployment !== null && snap.unemployment > 4.2) {
      reasoning.push(`CPI ${snap.cpiYoY.toFixed(1)}% near target + unemployment ${snap.unemployment}% rising → cuts likely`);
      return { prob: 70, confidence: 65, reasoning };
    }
    reasoning.push(`Fed funds at ${snap.fedFundsRate}%, CPI YoY ${snap.cpiYoY?.toFixed(1) || '?'}%`);
    return { prob: 45, confidence: 55, reasoning };
  }

  // "Will the Fed raise/hike rates?"
  if (t.includes('hike') || t.includes('raise') || t.includes('increase')) {
    if (snap.cpiYoY !== null && snap.cpiYoY > 4.0) {
      reasoning.push(`CPI YoY ${snap.cpiYoY.toFixed(1)}% — high inflation could force hike`);
      return { prob: 35, confidence: 60, reasoning };
    }
    reasoning.push(`CPI YoY ${snap.cpiYoY?.toFixed(1) || '?'}% — hikes unlikely in current environment`);
    return { prob: 10, confidence: 70, reasoning };
  }

  // "Will the Fed hold rates?"
  if (t.includes('hold') || t.includes('unchanged') || t.includes('pause')) {
    if (snap.cpiYoY !== null && snap.cpiYoY > 2.5 && snap.cpiYoY < 3.5) {
      reasoning.push(`CPI YoY ${snap.cpiYoY.toFixed(1)}% — moderate range favors hold`);
      return { prob: 65, confidence: 65, reasoning };
    }
    reasoning.push(`Fed funds ${snap.fedFundsRate}%, uncertain direction`);
    return { prob: 55, confidence: 55, reasoning };
  }

  return null;
}

function analyzeInflation(title: string, yesAsk: number, snap: EconSnapshot): { prob: number; confidence: number; reasoning: string[] } | null {
  const t = title.toLowerCase();
  const reasoning: string[] = [];

  if (snap.cpiYoY === null) return null;

  // "Will CPI be above X%?" or "Will inflation exceed X%?"
  const thresholdMatch = t.match(/(?:above|over|exceed|higher than)\s*(\d+(?:\.\d+)?)\s*%/);
  if (thresholdMatch) {
    const threshold = parseFloat(thresholdMatch[1]);
    const gap = snap.cpiYoY - threshold;
    // CPI moves slowly — if current is 0.3%+ above threshold, likely stays above
    if (gap > 0.5) {
      reasoning.push(`Current CPI YoY ${snap.cpiYoY.toFixed(1)}% is ${gap.toFixed(1)}pp above ${threshold}% threshold — likely YES`);
      return { prob: 80, confidence: 70, reasoning };
    }
    if (gap > 0) {
      reasoning.push(`Current CPI YoY ${snap.cpiYoY.toFixed(1)}% barely above ${threshold}% — could go either way`);
      return { prob: 55, confidence: 55, reasoning };
    }
    if (gap > -0.3) {
      reasoning.push(`Current CPI YoY ${snap.cpiYoY.toFixed(1)}% close to ${threshold}% — slight lean NO`);
      return { prob: 40, confidence: 55, reasoning };
    }
    reasoning.push(`Current CPI YoY ${snap.cpiYoY.toFixed(1)}% well below ${threshold}% threshold — likely NO`);
    return { prob: 15, confidence: 70, reasoning };
  }

  // "Will CPI be below X%?"
  const belowMatch = t.match(/(?:below|under|less than|lower than)\s*(\d+(?:\.\d+)?)\s*%/);
  if (belowMatch) {
    const threshold = parseFloat(belowMatch[1]);
    const gap = threshold - snap.cpiYoY;
    if (gap > 0.5) {
      reasoning.push(`Current CPI YoY ${snap.cpiYoY.toFixed(1)}% is ${gap.toFixed(1)}pp below ${threshold}% — likely YES`);
      return { prob: 80, confidence: 70, reasoning };
    }
    if (gap > 0) {
      reasoning.push(`Current CPI YoY ${snap.cpiYoY.toFixed(1)}% close to ${threshold}%`);
      return { prob: 55, confidence: 55, reasoning };
    }
    reasoning.push(`Current CPI YoY ${snap.cpiYoY.toFixed(1)}% above ${threshold}% — likely NO`);
    return { prob: 20, confidence: 65, reasoning };
  }

  return null;
}

function analyzeUnemployment(title: string, yesAsk: number, snap: EconSnapshot): { prob: number; confidence: number; reasoning: string[] } | null {
  const t = title.toLowerCase();
  const reasoning: string[] = [];

  if (snap.unemployment === null) return null;

  // "Will unemployment be above X%?"
  const aboveMatch = t.match(/(?:above|over|exceed|higher than|rise above)\s*(\d+(?:\.\d+)?)\s*%/);
  if (aboveMatch) {
    const threshold = parseFloat(aboveMatch[1]);
    const gap = snap.unemployment - threshold;
    if (gap > 0.3) {
      reasoning.push(`Unemployment at ${snap.unemployment}% already ${gap.toFixed(1)}pp above ${threshold}% — likely YES`);
      return { prob: 80, confidence: 70, reasoning };
    }
    if (gap > 0) {
      reasoning.push(`Unemployment ${snap.unemployment}% barely above ${threshold}%`);
      return { prob: 55, confidence: 55, reasoning };
    }
    if (gap > -0.3) {
      reasoning.push(`Unemployment ${snap.unemployment}% close to ${threshold}% — could reach it`);
      return { prob: 40, confidence: 55, reasoning };
    }
    reasoning.push(`Unemployment ${snap.unemployment}% well below ${threshold}%`);
    return { prob: 15, confidence: 65, reasoning };
  }

  // "Will unemployment be below X%?"
  const belowMatch = t.match(/(?:below|under|less than|lower than|fall below)\s*(\d+(?:\.\d+)?)\s*%/);
  if (belowMatch) {
    const threshold = parseFloat(belowMatch[1]);
    const gap = threshold - snap.unemployment;
    if (gap > 0.3) {
      reasoning.push(`Unemployment at ${snap.unemployment}% well below ${threshold}% — likely YES`);
      return { prob: 80, confidence: 70, reasoning };
    }
    reasoning.push(`Unemployment ${snap.unemployment}% near ${threshold}%`);
    return { prob: 50, confidence: 50, reasoning };
  }

  return null;
}

function analyzeRecession(title: string, yesAsk: number, snap: EconSnapshot): { prob: number; confidence: number; reasoning: string[] } | null {
  const reasoning: string[] = [];

  // Use FRED's smoothed recession probability + yield curve as base
  let baseProb = snap.recessionProb ?? 15;

  // Yield curve inversion is a strong recession signal
  if (snap.yieldCurveSpread !== null) {
    if (snap.yieldCurveSpread < -0.5) {
      baseProb = Math.min(baseProb + 15, 60);
      reasoning.push(`Yield curve inverted (${snap.yieldCurveSpread.toFixed(2)}%) — recession risk elevated`);
    } else if (snap.yieldCurveSpread < 0) {
      baseProb = Math.min(baseProb + 5, 45);
      reasoning.push(`Yield curve slightly inverted (${snap.yieldCurveSpread.toFixed(2)}%)`);
    } else {
      reasoning.push(`Yield curve positive (${snap.yieldCurveSpread.toFixed(2)}%) — normal`);
    }
  }

  // Rising unemployment adds to recession risk
  if (snap.unemployment !== null && snap.unemployment > 4.5) {
    baseProb = Math.min(baseProb + 10, 60);
    reasoning.push(`Unemployment ${snap.unemployment}% elevated`);
  }

  // GDP contraction
  if (snap.gdpGrowth !== null && snap.gdpGrowth < 0) {
    baseProb = Math.min(baseProb + 20, 70);
    reasoning.push(`GDP growth negative (${snap.gdpGrowth.toFixed(1)}%) — contraction`);
  } else if (snap.gdpGrowth !== null) {
    reasoning.push(`GDP growth ${snap.gdpGrowth.toFixed(1)}%`);
  }

  reasoning.push(`FRED recession probability: ${snap.recessionProb?.toFixed(0) ?? '?'}%`);
  return { prob: Math.round(baseProb), confidence: 60, reasoning };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Scan Kalshi markets and generate economics opportunities.
 * Called alongside sports Progno pipeline in ai-brain.ts.
 */
export async function findEconomicsOpportunities(
  allMarkets: any[],
  minEdgePct: number = 8,
): Promise<Opportunity[]> {
  const fredKey = process.env.FRED_API_KEY;
  if (!fredKey) {
    console.log('   [ECON] FRED_API_KEY not set — economics expert disabled');
    return [];
  }

  const snap = await getEconSnapshot();
  if (snap.fedFundsRate === null && snap.cpiYoY === null) {
    console.log('   [ECON] Could not fetch FRED data — skipping');
    return [];
  }

  const opps: Opportunity[] = [];
  const nowIso = new Date().toISOString();
  let scanned = 0;
  let matched = 0;

  // Price guardrails (same as sports)
  const PRICE_FLOOR = parseInt(process.env.KALSHI_PRICE_FLOOR || '15', 10);
  const PRICE_CEIL = parseInt(process.env.KALSHI_PRICE_CEIL || '85', 10);
  const MAX_EDGE = parseInt(process.env.KALSHI_MAX_EDGE || '55', 10);
  const maxStake = Math.min(2, parseFloat(process.env.MAX_SINGLE_TRADE || '10')); // Hard cap $2 — same as sports

  for (const m of allMarkets) {
    if (!m?.title || !m?.ticker) continue;
    const yesAsk = typeof m.yes_ask === 'number' ? m.yes_ask : null;
    if (yesAsk === null || yesAsk <= 0 || yesAsk >= 100) continue;

    const category = classifyEconMarket(m.title, m.ticker);
    if (!category) continue;
    scanned++;

    // Skip settled/closed
    const status = (m.status || '').toLowerCase();
    if (status === 'settled' || status === 'closed' || status === 'suspended') continue;

    let result: { prob: number; confidence: number; reasoning: string[] } | null = null;
    switch (category) {
      case 'fed_rate':
        result = analyzeFedRate(m.title, yesAsk, snap);
        break;
      case 'inflation':
        result = analyzeInflation(m.title, yesAsk, snap);
        break;
      case 'unemployment':
        result = analyzeUnemployment(m.title, yesAsk, snap);
        break;
      case 'recession':
        result = analyzeRecession(m.title, yesAsk, snap);
        break;
      case 'gdp':
        // GDP is quarterly — too infrequent for real-time edge
        continue;
    }

    if (!result) continue;

    const modelProb = Math.max(1, Math.min(99, result.prob));
    const noAsk = typeof m.no_ask === 'number' ? m.no_ask : (100 - yesAsk);

    // Determine side and edge
    let side: 'YES' | 'NO';
    let entryPrice: number;
    let edge: number;

    if (modelProb > yesAsk) {
      // Model says YES is underpriced
      side = 'YES';
      entryPrice = yesAsk;
      edge = modelProb - yesAsk;
    } else if ((100 - modelProb) > noAsk) {
      // Model says NO is underpriced
      side = 'NO';
      entryPrice = noAsk;
      edge = (100 - modelProb) - noAsk;
    } else {
      continue; // No edge
    }

    if (edge < minEdgePct) continue;
    if (edge > MAX_EDGE) continue;
    if (entryPrice < PRICE_FLOOR || entryPrice > PRICE_CEIL) continue;

    // Quarter-Kelly sizing
    const kellyFraction = edge / (100 - entryPrice);
    const quarterKelly = kellyFraction * 0.25;
    const stake = Math.max(2, Math.min(maxStake, Math.round(quarterKelly * maxStake * 10) / 10));

    matched++;
    console.log(`   [ECON] ${category}: ${m.ticker} ${side} — model=${modelProb}% market=${entryPrice}¢ edge=${edge.toFixed(1)}%`);

    opps.push({
      id: `econ_${m.ticker}_${side}_${Date.now()}`,
      type: 'prediction_market',
      source: 'ECON_EXPERT',
      title: `${side}: ${m.title}`,
      description: `Economics Expert: ${category} — edge ${edge.toFixed(1)}% at ${entryPrice}¢`,
      confidence: Math.min(90, Math.max(52, result.confidence)),
      expectedValue: edge,
      riskLevel: 'low',
      timeframe: '30d',
      requiredCapital: stake,
      potentialReturn: (stake * (100 - entryPrice) / 100) * 0.93, // ~7% fee
      reasoning: result.reasoning,
      dataPoints: [],
      action: {
        platform: 'kalshi',
        actionType: 'bet',
        amount: stake,
        target: `${m.ticker} ${side}`,
        instructions: [`Place ${side} on ${m.ticker} at ≤${entryPrice}¢`],
        autoExecute: true,
      },
      expiresAt: nowIso,
      createdAt: nowIso,
    });
  }

  console.log(`   [ECON] Scanned ${scanned} economics markets → ${matched} with edge ≥ ${minEdgePct}%`);
  return opps;
}
