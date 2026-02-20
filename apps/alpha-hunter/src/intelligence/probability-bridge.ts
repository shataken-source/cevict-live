/** Unifies model probabilities from Progno/Kalshi. Model probabilities are ALWAYS 0-100 scale. */
export interface PrognoEventProbability {
  label: string;
  teamNames: string[];
  /** Model probability 0-100 for the pick (YES side) - ALWAYS 0-100 SCALE */
  modelProbability: number;
  league: string;
  pick: string;
  homeTeam: string;
  awayTeam: string;
  mcWinProbability?: number;
}

export interface KalshiMarketMatch {
  ticker: string;
  eventTicker: string;
  title: string;
  yes_ask: number;
  yes_bid: number;
  no_ask: number;
  no_bid: number;
  volume: number;
  open_interest: number;
  status: string;
  category?: string;
}

export interface CryptoModelProbability {
  /** e.g. "BTC above 100000" */
  label: string;
  modelProbability: number;
  asset: string;
  strike?: number;
  currentPrice?: number;
}

import fs from 'fs';
import path from 'path';

const BOT_API_KEY = process.env.BOT_API_KEY;

/**
 * Load Progno picks from local JSON file and normalize to event + model probability (0-100).
 */
export function getPrognoProbabilitiesFromFile(filePath: string): PrognoEventProbability[] {
  console.log(`[DEBUG] Loading from: ${filePath}`);
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`[DEBUG] File not found: ${filePath}`);
      return [];
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    console.log(`[DEBUG] File content length: ${content.length}`);
    if (!content || content.trim() === '') {
      console.error(`[DEBUG] File is empty: ${filePath}`);
      return [];
    }
    const data = JSON.parse(content);
    console.log(`[DEBUG] Parsed data type: ${typeof data}, keys: ${data ? Object.keys(data).join(',') : 'null'}`);
    if (!data || typeof data !== 'object') {
      console.error(`[DEBUG] Invalid JSON data in file: ${filePath}`);
      return [];
    }
    const picks = data.picks || [];
    console.log(`[DEBUG] Found ${picks.length} picks`);
    if (!Array.isArray(picks)) {
      console.error(`[DEBUG] Invalid picks array in file: ${filePath}`);
      return [];
    }
    const out: PrognoEventProbability[] = [];

    for (const p of picks) {
      const pick = (p.pick || '').trim();
      const homeTeam = (p.home_team || '').trim();
      const awayTeam = (p.away_team || '').trim();
      if (!pick) continue;

      // Model probability: prefer Monte Carlo win prob for picked side, else confidence
      // ALWAYS returns 0-100 scale
      let modelProbability = typeof p.confidence === 'number' ? p.confidence : 50;
      if (typeof p.mc_win_probability === 'number') {
        modelProbability = Math.round(p.mc_win_probability * 100); // Convert 0-1 to 0-100
      }

      // Clamp to valid range
      modelProbability = Math.max(1, Math.min(99, modelProbability));

      // Build team names array for matching - ONLY use actual team names, not pick words
      const teamNames: string[] = [];
      if (homeTeam) teamNames.push(homeTeam);
      if (awayTeam) teamNames.push(awayTeam);

      out.push({
        label: pick === homeTeam ? `${homeTeam} win` : pick === awayTeam ? `${awayTeam} win` : pick,
        teamNames,
        modelProbability, // 0-100 scale
        league: p.league || p.sport || 'NCAAB',
        pick,
        homeTeam,
        awayTeam,
        mcWinProbability: p.mc_win_probability,
      });
    }
    return out;
  } catch (error: any) {
    console.error(`Failed to load Progno probabilities from ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Fetch today's Progno picks and normalize to event + model probability (0-100).
 * Uses confidence as primary; falls back to mc_win_probability when available.
 * Base URL is read at call time so scripts can set PROGNO_BASE_URL after dotenv.
 */
export async function getPrognoProbabilities(): Promise<PrognoEventProbability[]> {
  const base = process.env.PROGNO_BASE_URL || 'https://prognoultimatev2-cevict-projects.vercel.app';
  try {
    const res = await fetch(`${base}/api/picks/today`, {
      headers: BOT_API_KEY ? { 'x-api-key': BOT_API_KEY } : {},
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || typeof data !== 'object') return [];
    const picks = data.picks || [];
    const out: PrognoEventProbability[] = [];
    for (const p of picks) {
      const pick = (p.pick || '').trim();
      const homeTeam = (p.home_team || '').trim();
      const awayTeam = (p.away_team || '').trim();
      if (!pick) continue;
      // Model probability: prefer Monte Carlo win prob for picked side, else confidence
      let modelProbability = typeof p.confidence === 'number' ? p.confidence : 50;
      if (typeof p.mc_win_probability === 'number') {
        // Use normalized team tokens to properly identify which side is picked
        const homeTokens = teamSearchTokens(homeTeam);
        const awayTokens = teamSearchTokens(awayTeam);
        const pickTokens = teamSearchTokens(pick);

        // Check if pick matches home team (use primary token, usually the mascot/location)
        const pickPrimary = pickTokens[0] || pick.toLowerCase();
        const isHomePick = homeTokens.some(t => pickPrimary.includes(t) || t.includes(pickPrimary));
        const isAwayPick = awayTokens.some(t => pickPrimary.includes(t) || t.includes(pickPrimary));

        // Only use MC probability if we can identify which side is picked
        if (isHomePick || isAwayPick) {
          const mcProb = isHomePick ? p.mc_win_probability : 1 - p.mc_win_probability;
          modelProbability = Math.round(mcProb * 100);
        }
      }
      modelProbability = Math.max(1, Math.min(99, modelProbability));
      const teamNames = [homeTeam, awayTeam].filter(Boolean);
      const label = pick === homeTeam ? `${homeTeam} win` : pick === awayTeam ? `${awayTeam} win` : pick;
      out.push({
        label,
        teamNames,
        modelProbability,
        league: (p.league || p.sport || 'NBA').trim() || 'NBA',
        pick,
        homeTeam,
        awayTeam,
        mcWinProbability: p.mc_win_probability,
      });
    }
    return out;
  } catch (e) {
    console.error('[probability-bridge] Progno fetch failed:', (e as Error).message);
    return [];
  }
}

/** Normalize team name for matching: "Kansas City Chiefs" → ["chiefs", "kansas city"], "Lakers" → ["lakers"] */
function teamSearchTokens(team: string): string[] {
  if (!team || !team.trim()) return [];
  const t = team.trim().toLowerCase();
  const words = t.split(/\s+/);
  const tokens: string[] = [t];
  if (words.length > 1) {
    tokens.push(words[words.length - 1]); // "Chiefs", "Lakers"
    if (words.length >= 2) tokens.push(words.slice(0, -1).join(' ')); // "Kansas City", "LA"
  }
  return [...new Set(tokens)].filter(Boolean);
}

/** Titles that are not team-sports outcomes (music, weather, economics, meta) — skip Progno match */
const NON_SPORTS_TITLE =
  /announcers say|featured on|high temp|temp in|temperature|°f|°c|real gdp|gdp increase|music|album|song|by don toliver|by \w+ toliver/i;

/** Require league consistency: title says "basketball" → NBA/NCAAB only; "hockey" → NHL only. No sport keyword → no single-team match (avoids Drake/Denver false matches). */
function titleLeagueMatchesEvent(title: string, league: string): boolean {
  const t = title.toLowerCase();
  const L = (league || '').toUpperCase();
  if (/basketball/i.test(t)) return L === 'NBA' || L === 'NCAAB';
  if (/hockey/i.test(t)) return L === 'NHL';
  if (/football/i.test(t) && !/soccer/i.test(t)) return /nfl|ncaa/i.test(L) || L === 'NFL';
  if (/baseball/i.test(t)) return L === 'MLB';
  if (/soccer/i.test(t)) return true;
  if (/\b(game|match|win|winner|beat|vs\.?|at\s)\b|nfl|nba|mlb|nhl|ncaa/i.test(t)) return true; // explicit sport/game context
  return false; // no sport keyword — don't allow single-team match (avoids "Drake" → Drake Bulldogs, "Denver" → Denver Pioneers)
}

/**
 * Match a Kalshi market to a Progno event.
 * Requires both teams present in title OR event_ticker prefix match + single team.
 * Validates market status, bounds, and returns complete market metadata.
 */
export function matchKalshiMarketToProgno(
  prognoEvent: PrognoEventProbability,
  kalshiMarkets: any[]
): KalshiMarketMatch | null {
  const sportsPrefixes = ['KXMVNBA', 'KXMVNCAAB', 'KXMVNFL', 'KXMVNHL', 'KXMVMLB', 'KXNBAGAME', 'KXNCAABGAME', 'KXNFLGAME', 'KXNHLGAME', 'KXMLBGAME', 'KXNCAAFGAME'];
  const homeTokens = teamSearchTokens(prognoEvent.homeTeam);
  const awayTokens = teamSearchTokens(prognoEvent.awayTeam);

  for (const market of kalshiMarkets) {
    // Skip invalid markets
    if (!market || typeof market !== 'object') continue;

    // Check market status
    const status = (market.status || '').toLowerCase();
    if (status === 'settled' || status === 'suspended' || status === 'closed') continue;

    // Validate yes_ask bounds
    const yesAsk = typeof market.yes_ask === 'number' ? market.yes_ask : null;
    if (yesAsk === null || yesAsk <= 0 || yesAsk >= 100) continue;

    // Get market title
    let marketTitle = market.title;
    if (typeof marketTitle !== 'string') marketTitle = String(marketTitle || '');
    if (!marketTitle) continue;

    const marketTitleLower = marketTitle.toLowerCase();

    // Skip non-sports markets
    if (NON_SPORTS_TITLE.test(marketTitle)) continue;

    // Skip multi-leg markets (contain commas)
    if (marketTitleLower.includes(',')) continue;

    // Check event_ticker for sports prefix
    const eventTicker = (market.event_ticker || '').toUpperCase();
    const hasSportsPrefix = sportsPrefixes.some(p => eventTicker.startsWith(p));

    // Check if both teams are in title (strong match)
    const hasHome = homeTokens.some(t => t.length >= 3 && marketTitleLower.includes(t));
    const hasAway = awayTokens.some(t => t.length >= 3 && marketTitleLower.includes(t));
    const bothTeamsPresent = hasHome && hasAway;

    // For KXNBAGAME/KXNCAABGAME etc., each market has ONE team in title:
    // "Utah at Memphis Winner?" has two markets: one resolving for Utah, one for Memphis.
    // We need to match the market for the PICKED team specifically.
    const pickTokens = teamSearchTokens(prognoEvent.pick);
    const hasPick = pickTokens.some(t => t.length >= 3 && marketTitleLower.includes(t));

    // Require either:
    // 1. Both teams present in title (old-style multi-team markets), OR
    // 2. Sports prefix + pick team found in title + league consistency
    if (!bothTeamsPresent) {
      if (!hasSportsPrefix) continue;
      if (!hasPick) continue;
      if (!titleLeagueMatchesEvent(marketTitle, prognoEvent.league)) continue;
    } else {
      // Both teams present — still require the pick team to be in the title
      // so we don't accidentally match the wrong side of the market
      if (!hasPick) continue;
    }

    // Found a valid match - return complete market data
    return {
      ticker: market.ticker || '',
      eventTicker: market.event_ticker || '',
      title: market.title || '',
      yes_ask: yesAsk,
      yes_bid: typeof market.yes_bid === 'number' ? market.yes_bid : yesAsk - 1,
      no_ask: typeof market.no_ask === 'number' ? market.no_ask : 100 - yesAsk,
      no_bid: typeof market.no_bid === 'number' ? market.no_bid : 100 - yesAsk - 1,
      volume: typeof market.volume === 'number' ? market.volume : 0,
      open_interest: typeof market.open_interest === 'number' ? market.open_interest : 0,
      status: market.status || 'unknown',
      category: market.category || ''
    };
  }

  return null;
}

/**
 * Stub: derive a model probability (0-100) for a Kalshi crypto market using Coinbase.
 * Parses titles like "Will Bitcoin be above $100000 by ...?" or "BTC above 100k".
 * Returns null if not crypto or Coinbase unavailable.
 */
export async function getCryptoModelProbability(
  marketTitle: string,
  getCoinbasePrice?: (productId: string) => Promise<number>
): Promise<CryptoModelProbability | null> {
  const title = (marketTitle || '').toLowerCase();
  const hasBtc = /bitcoin|btc/i.test(title);
  const hasEth = /ethereum|eth/i.test(title);
  if (!hasBtc && !hasEth) return null;

  const productId = hasBtc ? 'BTC-USD' : 'ETH-USD';
  const asset = hasBtc ? 'BTC' : 'ETH';

  // Parse strike: "above $100000", "above 100000", "above 100k", "above 100,000"
  const aboveMatch = title.match(/above\s*\$?\s*([\d,]+)k?/i) || title.match(/([\d,]+)\s*(\$|usd)/i);
  const rawNum = aboveMatch ? aboveMatch[1].replace(/,/g, '') : null;
  const strike = rawNum ? (rawNum.length <= 3 ? parseInt(rawNum, 10) * 1000 : parseInt(rawNum, 10)) : undefined;

  if (!getCoinbasePrice) return null;

  try {
    const currentPrice = await getCoinbasePrice(productId);
    if (!currentPrice || currentPrice <= 0) return null;

    const label = strike != null ? `${asset} above ${strike}` : asset;
    let modelProbability = 50;
    if (strike != null) {
      const ratio = currentPrice / strike;
      if (ratio >= 1.02) modelProbability = 72;
      else if (ratio >= 1) modelProbability = 58;
      else if (ratio >= 0.98) modelProbability = 48;
      else if (ratio >= 0.95) modelProbability = 38;
      else modelProbability = 28;
    }
    return { label, modelProbability, asset, strike, currentPrice };
  } catch {
    return null;
  }
}
