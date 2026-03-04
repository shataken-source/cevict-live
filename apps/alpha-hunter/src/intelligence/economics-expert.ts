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
  // FMP stock market data
  sp500Price: number | null;       // S&P 500 current price
  dowPrice: number | null;         // Dow Jones current price
  nasdaqPrice: number | null;      // Nasdaq current price
  vix: number | null;              // CBOE Volatility Index
  sp500DayChange: number | null;   // S&P 500 day change %
  fetchedAt: Date;
}

interface EconMarketSignal {
  ticker: string;
  title: string;
  category: 'fed_rate' | 'inflation' | 'unemployment' | 'gdp' | 'recession' | 'energy' | 'crypto' | 'stock_market';
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

// ── FMP (Financial Modeling Prep) Fetcher ────────────────────────────────────
// Provides real-time stock indices (S&P 500, Dow, Nasdaq) and VIX

const FMP_BASE = 'https://financialmodelingprep.com/stable';

interface FMPStockData {
  sp500Price: number | null;
  dowPrice: number | null;
  nasdaqPrice: number | null;
  vix: number | null;
  sp500DayChange: number | null;
}

async function fetchFMPData(): Promise<FMPStockData> {
  const result: FMPStockData = { sp500Price: null, dowPrice: null, nasdaqPrice: null, vix: null, sp500DayChange: null };
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return result;
  try {
    // Batch fetch: S&P 500, Dow, Nasdaq, VIX in one call
    const symbols = '^GSPC,^DJI,^IXIC,^VIX';
    const url = `${FMP_BASE}/batch-quote?symbols=${symbols}&apikey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      // Try individual quotes as fallback
      const [spRes, vixRes] = await Promise.all([
        fetch(`${FMP_BASE}/quote?symbol=%5EGSPC&apikey=${apiKey}`, { signal: AbortSignal.timeout(8000) }).catch(() => null),
        fetch(`${FMP_BASE}/quote?symbol=%5EVIX&apikey=${apiKey}`, { signal: AbortSignal.timeout(8000) }).catch(() => null),
      ]);
      if (spRes?.ok) {
        const d = await spRes.json();
        const sp = Array.isArray(d) ? d[0] : d;
        result.sp500Price = sp?.price ?? null;
        result.sp500DayChange = sp?.changesPercentage ?? null;
      }
      if (vixRes?.ok) {
        const d = await vixRes.json();
        const v = Array.isArray(d) ? d[0] : d;
        result.vix = v?.price ?? null;
      }
      return result;
    }
    const data = await res.json();
    const quotes = Array.isArray(data) ? data : [data];
    for (const q of quotes) {
      const sym = (q.symbol || '').toUpperCase();
      if (sym.includes('GSPC') || sym.includes('SPX')) {
        result.sp500Price = q.price ?? null;
        result.sp500DayChange = q.changesPercentage ?? null;
      } else if (sym.includes('DJI') || sym.includes('DOW')) {
        result.dowPrice = q.price ?? null;
      } else if (sym.includes('IXIC') || sym.includes('NASDAQ') || sym.includes('COMP')) {
        result.nasdaqPrice = q.price ?? null;
      } else if (sym.includes('VIX')) {
        result.vix = q.price ?? null;
      }
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
  const [fedFunds, cpi, unemployment, gdp, recession, yieldCurve, claims, treasury10y, treasury2y, treasury30y, eia, worldGdp, crypto, fmp] = await Promise.all([
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
    fetchFMPData(),
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
    // FMP stock market
    sp500Price: fmp.sp500Price,
    dowPrice: fmp.dowPrice,
    nasdaqPrice: fmp.nasdaqPrice,
    vix: fmp.vix,
    sp500DayChange: fmp.sp500DayChange,
    fetchedAt: new Date(),
  };
  snapshotCacheTime = now;

  console.log(`   [ECON] Snapshot: Fed=${snapshotCache.fedFundsRate}% CPI_YoY=${cpiYoY?.toFixed(1)}% Unemp=${snapshotCache.unemployment}% GDP=${snapshotCache.gdpGrowth}%`);
  console.log(`   [ECON]   Treasury: 2Y=${snapshotCache.treasury2Y}% 10Y=${snapshotCache.treasury10Y}% 30Y=${snapshotCache.treasury30Y}% Curve=${snapshotCache.yieldCurveSpread}`);
  console.log(`   [ECON]   Energy: WTI=$${snapshotCache.oilPriceWTI} Gas=$${snapshotCache.gasolinePrice} | WorldGDP=${snapshotCache.globalGdpGrowth?.toFixed(1)}%`);
  console.log(`   [ECON]   Crypto: BTC=$${snapshotCache.btcPrice?.toLocaleString()} ETH=$${snapshotCache.ethPrice?.toLocaleString()} MCap=$${snapshotCache.cryptoMarketCap?.toFixed(0)}B Dom=${snapshotCache.btcDominance?.toFixed(1)}% F&G=${snapshotCache.fearGreedIndex}`);
  console.log(`   [ECON]   Markets: S&P=${snapshotCache.sp500Price?.toLocaleString()} (${snapshotCache.sp500DayChange?.toFixed(2)}%) Dow=${snapshotCache.dowPrice?.toLocaleString()} Nasdaq=${snapshotCache.nasdaqPrice?.toLocaleString()} VIX=${snapshotCache.vix}`);
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
  if (t.includes('s&p') || t.includes('sp500') || t.includes('s&p 500') || t.includes('dow') || t.includes('nasdaq') || t.includes('stock market') || t.includes('djia') || t.includes('vix') || t.includes('volatility index'))
    return 'stock_market';
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
  // Enrich with live treasury yield data
  if (snap.treasury10Y !== null && snap.treasury2Y !== null) {
    const liveSpread = snap.treasury10Y - snap.treasury2Y;
    if (liveSpread < -0.3) {
      baseProb = Math.min(baseProb + 10, 70);
      reasoning.push(`Live 10Y-2Y spread: ${liveSpread.toFixed(2)}% (inverted — recession signal)`);
    } else if (liveSpread > 0.5) {
      reasoning.push(`Live 10Y-2Y spread: +${liveSpread.toFixed(2)}% (healthy)`);
    }
  }
  // Oil price shock indicator
  if (snap.oilPriceWTI !== null && snap.oilPriceWTI > 100) {
    baseProb = Math.min(baseProb + 8, 70);
    reasoning.push(`WTI crude at $${snap.oilPriceWTI.toFixed(0)} — energy shock adds recession risk`);
  }
  // Global GDP slowdown
  if (snap.globalGdpGrowth !== null && snap.globalGdpGrowth < 2.0) {
    baseProb = Math.min(baseProb + 5, 65);
    reasoning.push(`Global GDP growth only ${snap.globalGdpGrowth.toFixed(1)}% — weak global backdrop`);
  }
  // VIX as fear gauge
  if (snap.vix !== null) {
    if (snap.vix > 30) {
      baseProb = Math.min(baseProb + 8, 70);
      reasoning.push(`VIX at ${snap.vix.toFixed(1)} — extreme fear, recession signal`);
    } else if (snap.vix > 25) {
      baseProb = Math.min(baseProb + 4, 65);
      reasoning.push(`VIX at ${snap.vix.toFixed(1)} — elevated fear`);
    } else {
      reasoning.push(`VIX at ${snap.vix.toFixed(1)} — markets calm`);
    }
  }
  // S&P 500 drawdown indicator
  if (snap.sp500DayChange !== null && snap.sp500DayChange < -2) {
    baseProb = Math.min(baseProb + 5, 70);
    reasoning.push(`S&P 500 down ${snap.sp500DayChange.toFixed(1)}% today — market stress`);
  }
  return { prob: Math.round(baseProb), confidence: 62, reasoning };
}

function analyzeGDP(title: string, yesAsk: number, snap: EconSnapshot): { prob: number; confidence: number; reasoning: string[] } | null {
  const t = title.toLowerCase();
  const reasoning: string[] = [];
  if (snap.gdpGrowth === null) return null;

  // "Will GDP growth be above X%?" or "Will GDP be positive?"
  const aboveMatch = t.match(/(?:above|over|exceed|higher than|positive)\s*(\d+(?:\.\d+)?)?/);
  if (aboveMatch || t.includes('positive')) {
    const threshold = aboveMatch?.[1] ? parseFloat(aboveMatch[1]) : 0;
    const gap = snap.gdpGrowth - threshold;
    reasoning.push(`GDP growth at ${snap.gdpGrowth.toFixed(1)}% vs ${threshold}% threshold`);
    if (snap.globalGdpGrowth !== null) reasoning.push(`Global GDP: ${snap.globalGdpGrowth.toFixed(1)}%`);
    if (gap > 1.0) return { prob: 80, confidence: 65, reasoning };
    if (gap > 0.3) return { prob: 60, confidence: 55, reasoning };
    if (gap > -0.3) return { prob: 45, confidence: 50, reasoning };
    return { prob: 20, confidence: 60, reasoning };
  }

  // "Will GDP be negative?" / "contraction"
  if (t.includes('negative') || t.includes('contraction') || t.includes('shrink')) {
    reasoning.push(`GDP growth at ${snap.gdpGrowth.toFixed(1)}%`);
    if (snap.gdpGrowth < -0.5) return { prob: 80, confidence: 70, reasoning };
    if (snap.gdpGrowth < 0.5) return { prob: 40, confidence: 55, reasoning };
    return { prob: 15, confidence: 60, reasoning };
  }

  return null;
}

function analyzeEnergy(title: string, yesAsk: number, snap: EconSnapshot): { prob: number; confidence: number; reasoning: string[] } | null {
  const t = title.toLowerCase();
  const reasoning: string[] = [];

  // Oil price markets
  if (t.includes('oil') || t.includes('crude') || t.includes('wti') || t.includes('brent')) {
    if (snap.oilPriceWTI === null) return null;

    // Extract threshold: "Will oil be above $X?"
    const aboveMatch = t.match(/(?:above|over|exceed|higher than|reach)\s*\$?(\d+)/);
    const belowMatch = t.match(/(?:below|under|less than|lower than|fall below)\s*\$?(\d+)/);

    if (aboveMatch) {
      const threshold = parseFloat(aboveMatch[1]);
      const gap = snap.oilPriceWTI - threshold;
      const gapPct = (gap / threshold) * 100;
      reasoning.push(`WTI crude at $${snap.oilPriceWTI.toFixed(2)} vs $${threshold} threshold`);
      if (snap.gasolinePrice !== null) reasoning.push(`Gasoline: $${snap.gasolinePrice.toFixed(2)}/gal`);
      // Oil is mean-reverting but slow — current price is strong predictor
      if (gapPct > 10) return { prob: 82, confidence: 68, reasoning };
      if (gapPct > 3) return { prob: 62, confidence: 58, reasoning };
      if (gapPct > 0) return { prob: 52, confidence: 50, reasoning };
      if (gapPct > -5) return { prob: 38, confidence: 52, reasoning };
      if (gapPct > -15) return { prob: 22, confidence: 58, reasoning };
      return { prob: 12, confidence: 65, reasoning };
    }

    if (belowMatch) {
      const threshold = parseFloat(belowMatch[1]);
      const gap = threshold - snap.oilPriceWTI;
      const gapPct = (gap / threshold) * 100;
      reasoning.push(`WTI crude at $${snap.oilPriceWTI.toFixed(2)} vs $${threshold} threshold`);
      if (gapPct > 10) return { prob: 82, confidence: 68, reasoning };
      if (gapPct > 3) return { prob: 62, confidence: 58, reasoning };
      if (gapPct > 0) return { prob: 52, confidence: 50, reasoning };
      if (gapPct > -5) return { prob: 38, confidence: 52, reasoning };
      return { prob: 15, confidence: 60, reasoning };
    }
  }

  // Gas price markets
  if (t.includes('gasoline') || t.includes('gas price') || t.includes('gallon')) {
    if (snap.gasolinePrice === null) return null;
    const numMatch = t.match(/\$?(\d+(?:\.\d+)?)/);
    if (!numMatch) return null;
    const threshold = parseFloat(numMatch[1]);
    const gap = snap.gasolinePrice - threshold;
    reasoning.push(`Gasoline at $${snap.gasolinePrice.toFixed(2)}/gal vs $${threshold}`);
    if (snap.oilPriceWTI !== null) reasoning.push(`WTI crude: $${snap.oilPriceWTI.toFixed(0)}`);

    const isAboveQ = t.includes('above') || t.includes('over') || t.includes('exceed');
    if (isAboveQ) {
      if (gap > 0.30) return { prob: 80, confidence: 65, reasoning };
      if (gap > 0.10) return { prob: 60, confidence: 55, reasoning };
      if (gap > -0.10) return { prob: 45, confidence: 50, reasoning };
      return { prob: 20, confidence: 60, reasoning };
    } else {
      if (gap < -0.30) return { prob: 80, confidence: 65, reasoning };
      if (gap < -0.10) return { prob: 60, confidence: 55, reasoning };
      if (gap < 0.10) return { prob: 45, confidence: 50, reasoning };
      return { prob: 20, confidence: 60, reasoning };
    }
  }

  return null;
}

function analyzeCrypto(title: string, yesAsk: number, snap: EconSnapshot): { prob: number; confidence: number; reasoning: string[] } | null {
  const t = title.toLowerCase();
  const reasoning: string[] = [];

  // Bitcoin price markets
  const isBtc = t.includes('bitcoin') || t.includes('btc');
  const isEth = t.includes('ethereum') || t.includes('eth');
  const currentPrice = isBtc ? snap.btcPrice : isEth ? snap.ethPrice : null;
  const label = isBtc ? 'BTC' : 'ETH';

  if (!currentPrice) return null;

  // Extract threshold: "Will BTC be above $100,000?"
  const aboveMatch = t.match(/(?:above|over|exceed|higher than|reach|hit)\s*\$?([\d,]+)/);
  const belowMatch = t.match(/(?:below|under|less than|lower than|fall below|drop to)\s*\$?([\d,]+)/);

  if (aboveMatch || belowMatch) {
    const isAbove = !!aboveMatch;
    const threshold = parseFloat((isAbove ? aboveMatch![1] : belowMatch![1]).replace(/,/g, ''));
    const gap = currentPrice - threshold;
    const gapPct = (gap / threshold) * 100;

    reasoning.push(`${label} at $${currentPrice.toLocaleString()} vs $${threshold.toLocaleString()} threshold`);
    if (snap.fearGreedIndex !== null) {
      const fgLabel = snap.fearGreedIndex > 75 ? 'extreme greed' : snap.fearGreedIndex > 60 ? 'greed' : snap.fearGreedIndex > 40 ? 'neutral' : snap.fearGreedIndex > 25 ? 'fear' : 'extreme fear';
      reasoning.push(`Fear & Greed Index: ${snap.fearGreedIndex} (${fgLabel})`);
    }
    if (snap.btcDominance !== null) reasoning.push(`BTC dominance: ${snap.btcDominance.toFixed(1)}%`);
    if (snap.cryptoMarketCap !== null) reasoning.push(`Total crypto market cap: $${snap.cryptoMarketCap.toFixed(0)}B`);

    // Crypto is volatile — current price is less predictive than econ/weather
    // Use wider uncertainty bands, lower confidence
    let prob: number;
    if (isAbove) {
      if (gapPct > 15) prob = 82;
      else if (gapPct > 5) prob = 65;
      else if (gapPct > 0) prob = 52;
      else if (gapPct > -5) prob = 38;
      else if (gapPct > -15) prob = 22;
      else prob = 10;
    } else {
      // "below" question — invert the logic
      if (gapPct < -15) prob = 82;
      else if (gapPct < -5) prob = 65;
      else if (gapPct < 0) prob = 52;
      else if (gapPct < 5) prob = 38;
      else if (gapPct < 15) prob = 22;
      else prob = 10;
    }

    // Fear/greed adjustment: extreme fear → more likely to go down, extreme greed → more likely to go up
    if (snap.fearGreedIndex !== null) {
      if (isAbove && snap.fearGreedIndex > 70) prob = Math.min(prob + 5, 90);
      if (isAbove && snap.fearGreedIndex < 30) prob = Math.max(prob - 5, 5);
      if (!isAbove && snap.fearGreedIndex < 30) prob = Math.min(prob + 5, 90);
      if (!isAbove && snap.fearGreedIndex > 70) prob = Math.max(prob - 5, 5);
    }

    // Lower confidence for crypto — it's inherently less predictable
    return { prob, confidence: 52, reasoning };
  }

  return null;
}

function analyzeStockMarket(title: string, yesAsk: number, snap: EconSnapshot): { prob: number; confidence: number; reasoning: string[] } | null {
  const t = title.toLowerCase();
  const reasoning: string[] = [];

  // S&P 500 price markets: "Will S&P 500 close above X?"
  if (t.includes('s&p') || t.includes('sp500') || t.includes('s&p 500')) {
    if (snap.sp500Price === null) return null;

    const aboveMatch = t.match(/(?:above|over|close above|finish above|exceed|higher than)\s*[\$]?([\d,]+)/);
    const belowMatch = t.match(/(?:below|under|close below|finish below|fall below|lower than)\s*[\$]?([\d,]+)/);

    if (aboveMatch || belowMatch) {
      const isAbove = !!aboveMatch;
      const threshold = parseFloat((isAbove ? aboveMatch![1] : belowMatch![1]).replace(/,/g, ''));
      const gap = snap.sp500Price - threshold;
      const gapPct = (gap / threshold) * 100;

      reasoning.push(`S&P 500 at ${snap.sp500Price.toLocaleString()} vs ${threshold.toLocaleString()} threshold`);
      if (snap.sp500DayChange !== null) reasoning.push(`Day change: ${snap.sp500DayChange > 0 ? '+' : ''}${snap.sp500DayChange.toFixed(2)}%`);
      if (snap.vix !== null) {
        const vixLabel = snap.vix > 30 ? 'high fear' : snap.vix > 20 ? 'elevated' : 'calm';
        reasoning.push(`VIX: ${snap.vix.toFixed(1)} (${vixLabel})`);
      }

      // S&P daily close markets are short-term — current price is strong signal
      // but intraday can move 1-2%, so need wider bands than you'd think
      let prob: number;
      if (isAbove) {
        if (gapPct > 2) prob = 85;
        else if (gapPct > 0.5) prob = 68;
        else if (gapPct > 0) prob = 55;
        else if (gapPct > -0.5) prob = 42;
        else if (gapPct > -1.5) prob = 28;
        else prob = 12;
      } else {
        if (gapPct < -2) prob = 85;
        else if (gapPct < -0.5) prob = 68;
        else if (gapPct < 0) prob = 55;
        else if (gapPct < 0.5) prob = 42;
        else if (gapPct < 1.5) prob = 28;
        else prob = 12;
      }

      // VIX adjustment: high VIX = more uncertainty = push probabilities toward 50
      if (snap.vix !== null && snap.vix > 25) {
        prob = prob > 50 ? Math.max(50, prob - 8) : Math.min(50, prob + 8);
        reasoning.push(`High VIX → increased uncertainty, moderating prediction`);
      }

      return { prob, confidence: 62, reasoning };
    }
  }

  // Dow Jones markets
  if (t.includes('dow') || t.includes('djia')) {
    if (snap.dowPrice === null) return null;
    const aboveMatch = t.match(/(?:above|over|close above|exceed)\s*[\$]?([\d,]+)/);
    if (aboveMatch) {
      const threshold = parseFloat(aboveMatch[1].replace(/,/g, ''));
      const gapPct = ((snap.dowPrice - threshold) / threshold) * 100;
      reasoning.push(`Dow at ${snap.dowPrice.toLocaleString()} vs ${threshold.toLocaleString()} (${gapPct > 0 ? '+' : ''}${gapPct.toFixed(2)}%)`);
      if (gapPct > 1.5) return { prob: 82, confidence: 60, reasoning };
      if (gapPct > 0.3) return { prob: 65, confidence: 55, reasoning };
      if (gapPct > -0.3) return { prob: 48, confidence: 50, reasoning };
      if (gapPct > -1.5) return { prob: 30, confidence: 55, reasoning };
      return { prob: 12, confidence: 60, reasoning };
    }
  }

  // VIX markets: "Will VIX be above X?"
  if (t.includes('vix') || t.includes('volatility index')) {
    if (snap.vix === null) return null;
    const aboveMatch = t.match(/(?:above|over|exceed)\s*(\d+)/);
    if (aboveMatch) {
      const threshold = parseFloat(aboveMatch[1]);
      const gap = snap.vix - threshold;
      reasoning.push(`VIX at ${snap.vix.toFixed(1)} vs ${threshold} threshold`);
      // VIX is mean-reverting — tends to drift back to ~15-20 range
      if (snap.vix > 30) reasoning.push(`VIX elevated — likely to mean-revert down`);
      if (snap.vix < 15) reasoning.push(`VIX historically low — upside risk`);
      if (gap > 5) return { prob: 75, confidence: 60, reasoning };
      if (gap > 2) return { prob: 58, confidence: 55, reasoning };
      if (gap > 0) return { prob: 48, confidence: 50, reasoning };
      if (gap > -3) return { prob: 35, confidence: 55, reasoning };
      return { prob: 18, confidence: 60, reasoning };
    }
  }

  return null;
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
        result = analyzeGDP(m.title, yesAsk, snap);
        break;
      case 'energy':
        result = analyzeEnergy(m.title, yesAsk, snap);
        break;
      case 'crypto':
        result = analyzeCrypto(m.title, yesAsk, snap);
        break;
      case 'stock_market':
        result = analyzeStockMarket(m.title, yesAsk, snap);
        break;
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
