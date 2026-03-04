/**
 * WEATHER EXPERT — Data-Driven Kalshi Weather Trading
 *
 * Fetches real weather forecasts from NWS (National Weather Service) and
 * Open-Meteo APIs to generate predictions for Kalshi weather markets:
 * - Daily high/low temperature for major cities
 * - Snowfall totals
 * - Hurricane/tropical storm landfall
 * - Heat wave / cold snap thresholds
 *
 * NWS API: https://www.weather.gov/documentation/services-web-api
 *   - Free, no API key needed, HTTPS only
 *   - Rate limit: ~50 requests/sec (generous)
 *
 * Open-Meteo API: https://open-meteo.com/
 *   - Free, no API key needed
 *   - Hourly/daily forecasts with ensemble models
 *
 * Like the economics expert, this uses real data with quantitative models.
 */

import { Opportunity } from '../types';

// WeatherAPI.com for cross-validation (key in KeyVault as WEATHER_API_KEY)
interface WeatherApiValidation {
  tempHighF: number;
  tempLowF: number;
  condition: string;
}

async function fetchWeatherApiCrossCheck(city: CityInfo, targetDate: string): Promise<WeatherApiValidation | null> {
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) return null;
  try {
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${city.lat},${city.lon}&days=7&aqi=no&alerts=no`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const day = data?.forecast?.forecastday?.find((d: any) => d.date === targetDate);
    if (!day) return null;
    return {
      tempHighF: day.day.maxtemp_f,
      tempLowF: day.day.mintemp_f,
      condition: day.day.condition?.text || '',
    };
  } catch {
    return null;
  }
}

// ── City Coordinates for NWS + Open-Meteo ────────────────────────────────────

interface CityInfo {
  name: string;
  lat: number;
  lon: number;
  nwsGridpoint?: string; // e.g. "OKX/33,37" for NWS gridpoint API
  kalshiPrefix: string;  // How Kalshi names this city in tickers
  aliases: string[];     // Other names Kalshi might use in titles
}

const CITIES: CityInfo[] = [
  { name: 'New York', lat: 40.7128, lon: -73.9350, kalshiPrefix: 'NYC', aliases: ['new york', 'nyc', 'manhattan', 'central park'] },
  { name: 'Chicago', lat: 41.8781, lon: -87.6298, kalshiPrefix: 'CHI', aliases: ['chicago', 'chi', "o'hare"] },
  { name: 'Los Angeles', lat: 34.0522, lon: -118.2437, kalshiPrefix: 'LA', aliases: ['los angeles', 'la', 'lax'] },
  { name: 'Miami', lat: 25.7617, lon: -80.1918, kalshiPrefix: 'MIA', aliases: ['miami', 'mia'] },
  { name: 'Houston', lat: 29.7604, lon: -95.3698, kalshiPrefix: 'HOU', aliases: ['houston', 'hou'] },
  { name: 'Phoenix', lat: 33.4484, lon: -112.0740, kalshiPrefix: 'PHX', aliases: ['phoenix', 'phx'] },
  { name: 'Denver', lat: 39.7392, lon: -104.9903, kalshiPrefix: 'DEN', aliases: ['denver', 'den'] },
  { name: 'Atlanta', lat: 33.7490, lon: -84.3880, kalshiPrefix: 'ATL', aliases: ['atlanta', 'atl'] },
  { name: 'San Francisco', lat: 37.7749, lon: -122.4194, kalshiPrefix: 'SF', aliases: ['san francisco', 'sf', 'sfo'] },
  { name: 'Seattle', lat: 47.6062, lon: -122.3321, kalshiPrefix: 'SEA', aliases: ['seattle', 'sea'] },
  { name: 'Dallas', lat: 32.7767, lon: -96.7970, kalshiPrefix: 'DFW', aliases: ['dallas', 'dfw', 'dallas-fort worth'] },
  { name: 'Boston', lat: 42.3601, lon: -71.0589, kalshiPrefix: 'BOS', aliases: ['boston', 'bos'] },
  { name: 'Washington DC', lat: 38.9072, lon: -77.0369, kalshiPrefix: 'DC', aliases: ['washington', 'dc', 'washington dc', 'dca'] },
  { name: 'Minneapolis', lat: 44.9778, lon: -93.2650, kalshiPrefix: 'MSP', aliases: ['minneapolis', 'msp', 'twin cities'] },
  { name: 'Detroit', lat: 42.3314, lon: -83.0458, kalshiPrefix: 'DET', aliases: ['detroit', 'det'] },
  { name: 'Philadelphia', lat: 39.9526, lon: -75.1652, kalshiPrefix: 'PHL', aliases: ['philadelphia', 'philly', 'phl'] },
  { name: 'Austin', lat: 30.2672, lon: -97.7431, kalshiPrefix: 'AUS', aliases: ['austin', 'aus'] },
  { name: 'Nashville', lat: 36.1627, lon: -86.7816, kalshiPrefix: 'BNA', aliases: ['nashville', 'bna'] },
];

// ── Weather Data Types ───────────────────────────────────────────────────────

interface DailyForecast {
  date: string;            // YYYY-MM-DD
  tempHighF: number;       // Fahrenheit
  tempLowF: number;
  precipProbability: number; // 0-100
  snowfallInches: number;
  windSpeedMph: number;
  weatherCode: number;     // WMO code
  // Ensemble spread (from Open-Meteo ensemble API)
  tempHighSpread?: number; // std dev of ensemble members
  tempLowSpread?: number;
}

interface WeatherForecastResult {
  city: CityInfo;
  forecasts: DailyForecast[];
  fetchedAt: string;
}

// ── Forecast Cache ───────────────────────────────────────────────────────────

const forecastCache: Map<string, { data: WeatherForecastResult; ts: number }> = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ── Open-Meteo Forecast Fetcher ──────────────────────────────────────────────

async function fetchOpenMeteoForecast(city: CityInfo): Promise<DailyForecast[]> {
  const cacheKey = `OM_${city.kalshiPrefix}`;
  const cached = forecastCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data.forecasts;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,snowfall_sum,wind_speed_10m_max,weather_code` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch` +
    `&timezone=America%2FChicago&forecast_days=7`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.warn(`[weather] Open-Meteo ${city.name} HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    const daily = data.daily;
    if (!daily?.time?.length) return [];

    const forecasts: DailyForecast[] = daily.time.map((date: string, i: number) => ({
      date,
      tempHighF: daily.temperature_2m_max[i],
      tempLowF: daily.temperature_2m_min[i],
      precipProbability: daily.precipitation_probability_max?.[i] ?? 0,
      snowfallInches: daily.snowfall_sum?.[i] ?? 0,
      windSpeedMph: daily.wind_speed_10m_max?.[i] ?? 0,
      weatherCode: daily.weather_code?.[i] ?? 0,
    }));

    forecastCache.set(cacheKey, { data: { city, forecasts, fetchedAt: new Date().toISOString() }, ts: Date.now() });
    return forecasts;
  } catch (err) {
    console.warn(`[weather] Open-Meteo ${city.name} fetch failed:`, (err as Error).message);
    return [];
  }
}

// ── Open-Meteo Ensemble Fetcher (uncertainty estimation) ─────────────────────

async function fetchEnsembleSpread(city: CityInfo, targetDate: string): Promise<{ highSpread: number; lowSpread: number }> {
  const url = `https://ensemble-api.open-meteo.com/v1/ensemble?latitude=${city.lat}&longitude=${city.lon}` +
    `&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit` +
    `&timezone=America%2FChicago&forecast_days=7&models=icon_seamless`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { highSpread: 3, lowSpread: 3 }; // Default uncertainty
    const data = await res.json();
    const daily = data.daily;
    if (!daily?.time) return { highSpread: 3, lowSpread: 3 };

    const idx = daily.time.indexOf(targetDate);
    if (idx < 0) return { highSpread: 3, lowSpread: 3 };

    // Calculate spread across ensemble members
    const highs = daily.temperature_2m_max;
    const lows = daily.temperature_2m_min;

    if (Array.isArray(highs?.[idx])) {
      const hArr = highs[idx] as number[];
      const lArr = lows[idx] as number[];
      const hMean = hArr.reduce((a: number, b: number) => a + b, 0) / hArr.length;
      const lMean = lArr.reduce((a: number, b: number) => a + b, 0) / lArr.length;
      const hStd = Math.sqrt(hArr.reduce((s: number, v: number) => s + (v - hMean) ** 2, 0) / hArr.length);
      const lStd = Math.sqrt(lArr.reduce((s: number, v: number) => s + (v - lMean) ** 2, 0) / lArr.length);
      return { highSpread: hStd || 3, lowSpread: lStd || 3 };
    }

    return { highSpread: 3, lowSpread: 3 };
  } catch {
    return { highSpread: 3, lowSpread: 3 };
  }
}

// ── Market Matching ──────────────────────────────────────────────────────────

type WeatherMarketType = 'temp_high' | 'temp_low' | 'snowfall' | 'precipitation' | 'unknown';

interface ParsedWeatherMarket {
  type: WeatherMarketType;
  city: CityInfo | null;
  threshold: number;       // The threshold value from the market (e.g., 85°F)
  direction: 'above' | 'below' | 'between';
  targetDate: string | null; // YYYY-MM-DD
  ticker: string;
  title: string;
  yesAsk: number;          // Current market price (cents)
}

function parseWeatherMarket(market: any): ParsedWeatherMarket | null {
  const title = (market.title || '').toLowerCase();
  const ticker = (market.ticker || '').toUpperCase();

  // Must look like a weather/temperature market
  const isWeather = /temp|degree|°f|high.*above|low.*below|snow|heat|cold|freeze/i.test(title) ||
    /HIGHTEMP|LOWTEMP|TEMP|SNOW|FREEZE|HEAT/i.test(ticker);
  if (!isWeather) return null;

  // Find city
  let matchedCity: CityInfo | null = null;
  for (const city of CITIES) {
    if (city.aliases.some(a => title.includes(a)) || ticker.includes(city.kalshiPrefix)) {
      matchedCity = city;
      break;
    }
  }
  if (!matchedCity) return null;

  // Determine market type
  let type: WeatherMarketType = 'unknown';
  if (/high|max/i.test(title) || /HIGHTEMP/i.test(ticker)) type = 'temp_high';
  else if (/low|min/i.test(title) || /LOWTEMP/i.test(ticker)) type = 'temp_low';
  else if (/snow/i.test(title) || /SNOW/i.test(ticker)) type = 'snowfall';
  else if (/rain|precip/i.test(title)) type = 'precipitation';
  else if (/temp|degree|°f/i.test(title)) type = 'temp_high'; // default to high
  if (type === 'unknown') return null;

  // Extract threshold (e.g., "above 85°F", "at or above 90", "85 degrees or higher")
  let threshold = 0;
  const threshMatch = title.match(/(\d+)\s*°?f/i) || title.match(/(?:above|below|over|under|exceed|at least|at or above)\s+(\d+)/i);
  if (threshMatch) {
    threshold = parseFloat(threshMatch[1] || threshMatch[2]);
  }
  // Also try ticker: e.g., HIGHTEMP-NYC-26MAR04-T85
  if (!threshold) {
    const tickerMatch = ticker.match(/T(\d+)/);
    if (tickerMatch) threshold = parseFloat(tickerMatch[1]);
  }
  if (!threshold) return null;

  // Direction
  let direction: 'above' | 'below' | 'between' = 'above';
  if (/below|under|less than|at or below|lower than/i.test(title)) direction = 'below';
  if (/between/i.test(title)) direction = 'between';

  // Extract target date from ticker (e.g., HIGHTEMP-NYC-26MAR04 → 2026-03-04)
  let targetDate: string | null = null;
  const dateMatch = ticker.match(/(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(\d{2})/i);
  if (dateMatch) {
    const months: Record<string, string> = {
      JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
      JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
    };
    const year = `20${dateMatch[1]}`;
    const month = months[dateMatch[2].toUpperCase()] || '01';
    const day = dateMatch[3].padStart(2, '0');
    targetDate = `${year}-${month}-${day}`;
  }
  // Also try title: "March 4" or "Mar 4" etc.
  if (!targetDate) {
    const titleDateMatch = title.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{1,2})/i);
    if (titleDateMatch) {
      const months: Record<string, string> = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
      };
      const month = months[titleDateMatch[1].toLowerCase().slice(0, 3)] || '01';
      const day = titleDateMatch[2].padStart(2, '0');
      const year = new Date().getFullYear();
      targetDate = `${year}-${month}-${day}`;
    }
  }

  const yesAsk = market.yes_ask ?? market.yes_bid ?? 50;

  return {
    type,
    city: matchedCity,
    threshold,
    direction,
    targetDate,
    ticker: market.ticker,
    title: market.title,
    yesAsk,
  };
}

// ── Probability Estimation ───────────────────────────────────────────────────

/**
 * Estimate the probability that a temperature threshold will be exceeded,
 * given a forecast point and ensemble uncertainty.
 *
 * Uses a normal distribution approximation:
 *   P(temp > threshold) = 1 - Φ((threshold - forecast) / σ)
 * where σ is the ensemble standard deviation (or a reasonable default).
 */
function normalCDF(x: number): number {
  // Abramowitz & Stegun approximation
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

function estimateTempProbability(
  forecastTemp: number,
  threshold: number,
  direction: 'above' | 'below' | 'between',
  spread: number,
  daysOut: number = 1,
): number {
  // Forecast error grows with horizon:
  //   Day 0-1: ±3-4°F,  Day 2-3: ±5-6°F,  Day 4-7: ±7-9°F
  // This is the single most important parameter — too tight = overconfident = bad trades
  const horizonPenalty = daysOut <= 1 ? 0 : daysOut <= 3 ? 2 : daysOut <= 5 ? 4 : 6;
  const sigma = Math.max(spread, 4.0) + horizonPenalty;

  if (direction === 'above') {
    // P(temp >= threshold)
    return (1 - normalCDF((threshold - forecastTemp) / sigma)) * 100;
  } else if (direction === 'below') {
    // P(temp <= threshold)
    return normalCDF((threshold - forecastTemp) / sigma) * 100;
  }
  // 'between' not fully supported — return 50
  return 50;
}

// ── Main Expert Function ─────────────────────────────────────────────────────

export async function findWeatherOpportunities(
  allMarkets: any[],
  minEdgePct: number = 12,
): Promise<Opportunity[]> {
  const opportunities: Opportunity[] = [];
  const PRICE_FLOOR = parseInt(process.env.KALSHI_PRICE_FLOOR || '15', 10);
  const PRICE_CEIL = parseInt(process.env.KALSHI_PRICE_CEIL || '85', 10);
  const MAX_EDGE = parseInt(process.env.KALSHI_MAX_EDGE || '55', 10);

  // Step 1: Find weather markets
  const weatherMarkets: ParsedWeatherMarket[] = [];
  for (const m of allMarkets) {
    if (m.status !== 'open' && m.status !== 'active') continue;
    const parsed = parseWeatherMarket(m);
    if (parsed) weatherMarkets.push(parsed);
  }

  if (weatherMarkets.length === 0) {
    console.log('[weather-expert] No weather markets found');
    return [];
  }
  console.log(`[weather-expert] Found ${weatherMarkets.length} weather markets, analyzing...`);

  // Step 2: Group by city and fetch forecasts
  const citiesNeeded = new Set(weatherMarkets.map(m => m.city!.kalshiPrefix));
  const forecastsByCity: Map<string, DailyForecast[]> = new Map();

  await Promise.all(
    Array.from(citiesNeeded).map(async (prefix) => {
      const city = CITIES.find(c => c.kalshiPrefix === prefix);
      if (!city) return;
      const forecasts = await fetchOpenMeteoForecast(city);
      if (forecasts.length > 0) {
        forecastsByCity.set(prefix, forecasts);
      }
    })
  );

  // Step 3: Analyze each weather market
  for (const wm of weatherMarkets) {
    try {
      if (!wm.city || !wm.targetDate) continue;

      const forecasts = forecastsByCity.get(wm.city.kalshiPrefix);
      if (!forecasts) continue;

      const dayForecast = forecasts.find(f => f.date === wm.targetDate);
      if (!dayForecast) continue;

      // Get ensemble spread for uncertainty
      const ensemble = await fetchEnsembleSpread(wm.city, wm.targetDate!);

      let forecastTemp: number;
      let spread: number;
      if (wm.type === 'temp_high') {
        forecastTemp = dayForecast.tempHighF;
        spread = ensemble.highSpread;
      } else if (wm.type === 'temp_low') {
        forecastTemp = dayForecast.tempLowF;
        spread = ensemble.lowSpread;
      } else {
        continue; // snowfall/precip handled differently (TODO)
      }

      // Calculate days until target date (affects forecast uncertainty)
      const now = new Date();
      const target = new Date(wm.targetDate + 'T12:00:00Z');
      const daysOut = Math.max(0, Math.round((target.getTime() - now.getTime()) / 86400000));

      // Skip markets > 5 days out — forecast skill degrades too much
      if (daysOut > 5) continue;

      // Cross-validate with WeatherAPI.com if available
      const wapiCheck = await fetchWeatherApiCrossCheck(wm.city, wm.targetDate!);
      if (wapiCheck) {
        const wapiTemp = wm.type === 'temp_high' ? wapiCheck.tempHighF : wapiCheck.tempLowF;
        const modelDiff = Math.abs(forecastTemp - wapiTemp);
        // If the two forecasts disagree by > 5°F, skip — too uncertain
        if (modelDiff > 5) {
          console.log(`[weather-expert] ${wm.ticker}: Open-Meteo=${forecastTemp.toFixed(0)}°F vs WeatherAPI=${wapiTemp.toFixed(0)}°F — models disagree by ${modelDiff.toFixed(0)}°F, skipping`);
          continue;
        }
        // Average the two forecasts for better accuracy
        forecastTemp = (forecastTemp + wapiTemp) / 2;
        // Reduce spread if models agree closely (< 2°F difference)
        if (modelDiff < 2) spread = Math.max(spread * 0.8, 3);
      }

      // Calculate model probability (with horizon-adjusted uncertainty)
      const modelProb = estimateTempProbability(forecastTemp, wm.threshold, wm.direction, spread, daysOut);

      // Market price
      const marketProb = wm.yesAsk;
      if (marketProb < PRICE_FLOOR || marketProb > PRICE_CEIL) continue;

      // Edge calculation
      const edge = modelProb - marketProb;
      const absEdge = Math.abs(edge);

      // Filter: need minimum edge, and reject "too good to be true"
      if (absEdge < minEdgePct || absEdge > MAX_EDGE) continue;

      // Determine trade direction
      const side: 'yes' | 'no' = edge > 0 ? 'yes' : 'no';
      const tradePrice = side === 'yes' ? marketProb : (100 - marketProb);
      const confidence = Math.min(85, 50 + absEdge * 0.8);

      // Quarter-Kelly sizing
      const kellyEdge = absEdge / 100;
      const kellyProb = (side === 'yes' ? modelProb : (100 - modelProb)) / 100;
      const kellyOdds = (100 / tradePrice) - 1;
      const fullKelly = kellyOdds > 0 ? (kellyProb - (1 - kellyProb) / kellyOdds) : 0;
      const stake = Math.max(2, Math.min(10, Math.round(fullKelly * 0.25 * 100)));

      const reasoning = [
        `[WEATHER] ${wm.city.name} ${wm.type === 'temp_high' ? 'high' : 'low'} on ${wm.targetDate}`,
        `Forecast: ${forecastTemp.toFixed(0)}°F (±${spread.toFixed(1)}°F ensemble spread)`,
        `Threshold: ${wm.direction} ${wm.threshold}°F → model ${modelProb.toFixed(0)}% vs market ${marketProb}¢`,
        `Edge: ${edge > 0 ? '+' : ''}${edge.toFixed(1)}% → ${side.toUpperCase()} at ${tradePrice}¢`,
      ];

      opportunities.push({
        id: `weather-${wm.ticker}`,
        title: wm.title,
        description: `${wm.city.name} ${wm.type} ${wm.direction} ${wm.threshold}°F on ${wm.targetDate}`,
        type: 'prediction_market',
        source: 'WEATHER_EXPERT',
        confidence,
        expectedValue: absEdge,
        riskLevel: absEdge > 25 ? 'high' : absEdge > 15 ? 'medium' : 'low',
        timeframe: wm.targetDate || 'Today',
        requiredCapital: stake,
        potentialReturn: stake * (100 / tradePrice - 1),
        reasoning,
        dataPoints: [
          { source: 'Open-Meteo', metric: 'forecast_temp', value: forecastTemp, relevance: 95, timestamp: new Date().toISOString() },
          { source: 'Open-Meteo', metric: 'ensemble_spread', value: spread, relevance: 80, timestamp: new Date().toISOString() },
        ],
        action: {
          platform: 'kalshi',
          actionType: side === 'yes' ? 'buy' : 'sell',
          amount: stake,
          target: `${wm.ticker} ${side.toUpperCase()}`,
          instructions: [`Place ${side.toUpperCase()} on ${wm.ticker} at ≤${tradePrice}¢ (model ${modelProb.toFixed(0)}%)`],
          autoExecute: false, // Manual review until validated
        },
        expiresAt: wm.targetDate ? `${wm.targetDate}T23:59:59Z` : new Date(Date.now() + 86400000).toISOString(),
        createdAt: new Date().toISOString(),
      });

      console.log(`[weather-expert] ${wm.ticker}: ${wm.city.name} ${forecastTemp.toFixed(0)}°F forecast vs ${wm.threshold}°F threshold → ${side.toUpperCase()} (edge ${edge.toFixed(1)}%)`);
    } catch (err) {
      console.warn(`[weather-expert] Error analyzing ${wm.ticker}:`, (err as Error).message);
    }
  }

  console.log(`[weather-expert] Generated ${opportunities.length} opportunities from ${weatherMarkets.length} markets`);
  return opportunities;
}
