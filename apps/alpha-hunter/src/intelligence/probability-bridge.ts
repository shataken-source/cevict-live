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

// Wrapper kept for call-site compatibility; normalizeLeague is a function declaration so it's hoisted.
const safeNormalizeLeague = (raw: string): string => normalizeLeague(raw);

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

/** Normalize league codes according to user convention:
 * - NCAAB = College Basketball
 * - NCAAF = College Football
 * - CBB   = College Baseball (note: distinct from MLB)
 * Accept common synonyms like "College Baseball", "NCAA Baseball".
 */
function normalizeLeague(raw: string): string {
  const s = (raw || '').toString().trim();
  const U = s.toUpperCase();
  if (!U) return 'NBA';
  // Direct keeps
  if (['NBA', 'NFL', 'NHL', 'MLB', 'NCAAB', 'NCAAF', 'CBB'].includes(U)) return U;
  // Synonyms
  if (/^COLLEGE\s+BASKETBALL$/i.test(s) || /^NCAA\s*BASKETBALL$/i.test(s)) return 'NCAAB';
  if (/^COLLEGE\s+FOOTBALL$/i.test(s) || /^NCAA\s*FOOTBALL$/i.test(s)) return 'NCAAF';
  if (/^COLLEGE\s+BASEBALL$/i.test(s) || /^NCAA\s*BASEBALL$/i.test(s)) return 'CBB';
  if (/^BASEBALL$/i.test(s)) return 'MLB';
  return U;
}

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
        league: safeNormalizeLeague(p.league || p.sport || 'NCAAB'),
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
    const data: any = await res.json();
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
        league: safeNormalizeLeague((p.league || p.sport || 'NBA').trim() || 'NBA'),
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
function sanitizeToken(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function teamSearchTokens(team: string): string[] {
  if (!team || !team.trim()) return [];
  const t = sanitizeToken(team);
  const words = t.split(/\s+/).filter(Boolean);
  const tokens: string[] = [t];
  if (words.length > 1) {
    tokens.push(words[words.length - 1]);
    if (words.length >= 2) tokens.push(words.slice(0, -1).join(' '));
  }
  // Add common alias variants for better matching
  const stateAbbrev = t.replace(/\bstate\b/g, 'st');
  const stateExpand = t.replace(/\bst\b/g, 'state');
  const saintAbbrev = t.replace(/\bsaint\b/g, 'st');
  const saintExpand = t.replace(/\bst\b/g, 'saint');
  [stateAbbrev, stateExpand, saintAbbrev, saintExpand].forEach(v => {
    const vv = v.trim();
    if (vv && vv !== t) tokens.push(vv);
  });
  return [...new Set(tokens)].filter(Boolean);
}

/** Titles that are not team-sports outcomes (music, weather, economics, meta, soccer) — skip Progno match */
const NON_SPORTS_TITLE =
  /announcers say|featured on|high temp|temp in|temperature|°f|°c|real gdp|gdp increase|music|album|song|by don toliver|by \w+ toliver|soccer|futbol|fútbol|liga mx|copa |la liga|premier league|bundesliga|serie a|ligue 1|mls cup|eredivisie|champions league|europa league|world cup|concacaf|conmebol|libertadores|sudamericana|colombian|brazilian|mexican league/i;

/** Progno only predicts these leagues — reject everything else */
const ALLOWED_PROGNO_LEAGUES = new Set(['NBA', 'NHL', 'NCAAB', 'NCAAF', 'NFL', 'MLB', 'CBB']);

/** Require league consistency: title says "basketball" → NBA/NCAAB only; "hockey" → NHL only.
 *  Soccer / unsupported sports → always false.
 *  Generic sport words (game/win/match) → only true if Progno league is in our allowed set
 *  AND the title or known tickers confirm the right sport context. */
function titleLeagueMatchesEvent(title: string, league: string): boolean {
  const t = title.toLowerCase();
  const L = (league || '').toUpperCase();

  // Gate: Progno league must be in allowed set
  if (!ALLOWED_PROGNO_LEAGUES.has(L)) return false;

  // Explicit sport keywords in title → must match Progno league
  if (/basketball/i.test(t)) return L === 'NBA' || L === 'NCAAB';
  if (/hockey/i.test(t)) return L === 'NHL';
  if (/football/i.test(t) && !/soccer/i.test(t)) return L === 'NFL' || L === 'NCAAF';
  if (/baseball/i.test(t)) {
    const isCollege = /college|ncaa/i.test(t);
    if (isCollege) return L === 'CBB';
    return L === 'MLB' || L === 'CBB';
  }

  // Soccer / unsupported sports → ALWAYS reject (Progno has no model for these)
  if (/soccer|futbol|fútbol|liga|copa|premier league|bundesliga|serie a|ligue 1|mls |eredivisie|champions league|europa league|concacaf|conmebol|libertadores|sudamericana/i.test(t)) return false;

  // Explicit US league abbreviation in title → verify it matches Progno league
  if (/\bnfl\b/i.test(t)) return L === 'NFL' || L === 'NCAAF';
  if (/\bnba\b/i.test(t)) return L === 'NBA';
  if (/\bmlb\b/i.test(t)) return L === 'MLB';
  if (/\bnhl\b/i.test(t)) return L === 'NHL';
  if (/\bncaa\b/i.test(t)) return L === 'NCAAB' || L === 'NCAAF' || L === 'CBB';

  // Generic sport words (game/win/match/vs) — allow only if Progno league is supported
  // These are ambiguous — could be soccer, esports, etc. — but we already blocked
  // soccer above and NON_SPORTS_TITLE catches other non-sports.
  if (/\b(game|win|winner|beat|vs\.?)\b/i.test(t)) return true;

  return false; // no sport keyword — don't allow (avoids "Drake" → Drake Bulldogs, etc.)
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
  const sportsPrefixes = [
    // Winner/Game/Money markets (highest priority - these are moneyline)
    'KXNBAGAME', 'KXNCAAMBGAME', 'KXNFLGAME', 'KXNHLGAME', 'KXMLBGAME', 'KXNCAAFGAME', 'KXNASCARGAME',
    'KXNCAABBGAME', // College baseball
    'KXNCAAMBMONEY', 'KXNBAMONEY', 'KXNFLMONEY', 'KXNHLMONEY', // Moneyline markets
    'KXMVNBA', 'KXMVNCAAB', 'KXMVNFL', 'KXMVNHL', 'KXMVMLB', 'KXMVNCAAF', 'KXMVNASCAR',
    // Spread/Total/Winner variants (lower priority)
    'KXNCAAMBSPREAD', 'KXNCAAMBWINNER',
    'KXNBASPREAD', 'KXNBAWINNER',
    'KXNFLSPREAD', 'KXNFLWINNER',
    'KXNHLSPREAD', 'KXNHLWINNER',
    // NOTE: Do NOT add broad prefixes like KXNBA, KXNHL — they match props, mentions, halves, etc.
    // Only add specific GAME/MONEY/WINNER prefixes that correspond to full-game outcomes.
  ];
  const homeTokens = teamSearchTokens(prognoEvent.homeTeam);
  const awayTokens = teamSearchTokens(prognoEvent.awayTeam);
  const DEBUG = process.env.ALPHA_DEBUG === '1';
  const debugCounts: Record<string, number> = {
    status: 0,
    yesask: 0,
    nonsports: 0,
    comma: 0,
    noPrefix: 0,
    noPick: 0,
    league: 0,
  };

  for (const market of kalshiMarkets) {
    // Skip invalid markets
    if (!market || typeof market !== 'object') continue;

    // Check market status
    const status = (market.status || '').toLowerCase();
    if (status === 'settled' || status === 'suspended' || status === 'closed') { if (DEBUG) debugCounts.status++; continue; }

    // DEBUG: Log Nebraska/Penn State markets to understand structure
    if (DEBUG && (prognoEvent.homeTeam.includes('Nebraska') || prognoEvent.awayTeam.includes('Nebraska') || prognoEvent.pick.includes('Nebraska'))) {
      const title = market.title || '';
      const ticker = (market.ticker || '').toUpperCase();
      const eventTicker = (market.event_ticker || '').toUpperCase();
      if (/nebraska|penn/i.test(title) || ticker.includes('PSUNEB') || eventTicker.includes('PSUNEB')) {
        console.log(`[NEB DEBUG] Found market: ticker=${market.ticker}, title="${title}", event_ticker=${market.event_ticker}`);
      }
    }

    // Validate yes_ask bounds
    const yesAsk = typeof market.yes_ask === 'number' ? market.yes_ask : null;
    if (yesAsk === null || yesAsk <= 0 || yesAsk >= 100) { if (DEBUG) debugCounts.yesask++; continue; }

    // Get market title
    let marketTitle = market.title;
    if (typeof marketTitle !== 'string') marketTitle = String(marketTitle || '');
    if (!marketTitle) continue;

    const marketTitleLower = marketTitle.toLowerCase();
    const sanitizedTitle = sanitizeToken(marketTitleLower);

    // Skip non-sports markets
    if (NON_SPORTS_TITLE.test(marketTitle)) { if (DEBUG) debugCounts.nonsports++; continue; }

    // Skip TOTAL markets when matching win probability (Progno win prob doesn't apply to totals)
    if (/\bTOTAL\b|Total Points/i.test(marketTitle)) continue;

    // Skip non-game-winner markets - Progno ONLY predicts full-game winners
    // Block: halves, quarters, periods, innings, player props, mentions, spreads, totals
    if (/First Half|1st Half|2nd Half|Second Half|Half.?time|Quarter|Period|Inning/i.test(marketTitle)) continue;
    if (/announcers|mentioned|rebounds|assists|points scored|three.?pointers|steals|blocks|turnovers/i.test(marketTitle)) continue;

    // Skip TIE/draw markets by title - Progno predicts which team wins, not ties
    if (/\btie\b|\bdraw\b|\btied\b/i.test(marketTitleLower)) continue;

    // Prefer to skip multi-leg markets (commas), but allow when clearly a game-winner style with pick team
    const isMulti = marketTitleLower.includes(',');
    // winner-like phrasing: "winner", "win", "beat", OR spread-style "wins by"
    const winnerLike = /\b(winner|win|beat|wins by)\b/.test(sanitizedTitle);
    // Check pick tokens now to reuse below
    const pickTokens = teamSearchTokens(prognoEvent.pick);
    const hasPick = pickTokens.some(t => t.length >= 3 && sanitizedTitle.includes(t));
    if (isMulti && !(winnerLike && hasPick)) { if (DEBUG) debugCounts.comma++; continue; }

    // Check event_ticker OR ticker for sports prefix
    const eventTicker = (market.event_ticker || '').toUpperCase();
    const tickerStr = (market.ticker || '').toUpperCase();
    const hasSportsPrefix = sportsPrefixes.some(p => eventTicker.startsWith(p) || tickerStr.startsWith(p));

    // Skip non-game-winner ticker patterns (must be after tickerStr/eventTicker are declared)
    // 2HWINNER=halftime, SPREAD/TOTAL=lines, MENTION=announcer props, PTS/REB/AST=player props
    if (/-TIE$/i.test(tickerStr)) continue;
    if (/2HWINNER|SPREAD|TOTAL|MENTION|PTS|REB|AST|PROP|FIGHT/i.test(tickerStr)) continue;
    if (/2HWINNER|SPREAD|TOTAL|MENTION|PTS|REB|AST|PROP|FIGHT/i.test(eventTicker)) continue;

    // Check if both teams are in title (strong match)
    const hasHome = homeTokens.some(t => t.length >= 3 && sanitizedTitle.includes(t));
    const hasAway = awayTokens.some(t => t.length >= 3 && sanitizedTitle.includes(t));
    const bothTeamsPresent = hasHome && hasAway;

    // For GAME/WINNER markets: require both teams OR (GAME prefix + pick team + winner-like title)
    const isGameMarket = eventTicker.includes('GAME') || tickerStr.includes('GAME') || /winner\?/i.test(marketTitle);

    if (!bothTeamsPresent) {
      // Allow single-team match ONLY for GAME markets with "Winner?" in title
      if (!isGameMarket || !hasPick || !/winner\?|win\b/i.test(marketTitle)) {
        if (DEBUG) debugCounts.noPick++;
        continue;
      }
    } else {
      // Both teams present — verify the pick team is in the title
      if (!hasPick) { if (DEBUG) debugCounts.noPick++; continue; }
    }

    // Verify league consistency
    if (!titleLeagueMatchesEvent(marketTitle, prognoEvent.league)) { if (DEBUG) debugCounts.league++; continue; }

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

  // Fallback pass: looser match for team-winner style markets when primary pass found none
  // - Skip obvious multi-leg/player-prop conglomerates (e.g., MULTIGAMEEXTENDED)
  // - Accept if BOTH teams appear in title, OR if pick team appears with winner-like phrasing
  for (const market of kalshiMarkets) {
    if (!market || typeof market !== 'object') continue;
    const status = (market.status || '').toLowerCase();
    if (status !== 'open') continue;

    const yesAsk = typeof market.yes_ask === 'number' ? market.yes_ask : null;
    if (yesAsk === null || yesAsk <= 0 || yesAsk >= 100) continue;

    const eventTicker = (market.event_ticker || '').toUpperCase();
    const tickerStr = (market.ticker || '').toUpperCase();
    // Skip known multi-leg groupings to avoid player-prop conglomerates
    if (/MULTIGAME|EXTENDED|PARLAY/i.test(tickerStr) || /MULTIGAME|EXTENDED|PARLAY/i.test(eventTicker)) continue;

    // Skip non-game-winner ticker patterns (same filters as primary pass)
    if (/-TIE$/i.test(tickerStr)) continue;
    if (/2HWINNER|SPREAD|TOTAL|MENTION|PTS|REB|AST|PROP|FIGHT/i.test(tickerStr)) continue;
    if (/2HWINNER|SPREAD|TOTAL|MENTION|PTS|REB|AST|PROP|FIGHT/i.test(eventTicker)) continue;

    let marketTitle = market.title;
    if (typeof marketTitle !== 'string') marketTitle = String(marketTitle || '');
    if (!marketTitle) continue;

    // Skip non-sports markets (soccer, weather, music, economics, etc.)
    if (NON_SPORTS_TITLE.test(marketTitle)) continue;

    // Skip non-game-winner title patterns (same filters as primary pass)
    if (/\bTOTAL\b|Total Points/i.test(marketTitle)) continue;
    if (/First Half|1st Half|2nd Half|Second Half|Half.?time|Quarter|Period|Inning/i.test(marketTitle)) continue;
    if (/announcers|mentioned|rebounds|assists|points scored|three.?pointers|steals|blocks|turnovers/i.test(marketTitle)) continue;
    if (/\btie\b|\bdraw\b|\btied\b/i.test(marketTitle.toLowerCase())) continue;

    const titleSan = sanitizeToken(marketTitle);

    const homeTokens = teamSearchTokens(prognoEvent.homeTeam);
    const awayTokens = teamSearchTokens(prognoEvent.awayTeam);
    const pickTokens = teamSearchTokens(prognoEvent.pick);

    const hasHome = homeTokens.some(t => t.length >= 3 && titleSan.includes(t));
    const hasAway = awayTokens.some(t => t.length >= 3 && titleSan.includes(t));
    const bothTeamsPresent = hasHome && hasAway;
    const winnerLike = /\b(winner|win|beat|vs|at|game|wins by)\b/.test(titleSan);
    const hasPick = pickTokens.some(t => t.length >= 3 && titleSan.includes(t));

    if (bothTeamsPresent || (winnerLike && hasPick)) {
      if (!titleLeagueMatchesEvent(marketTitle, prognoEvent.league)) { if (DEBUG) debugCounts.league++; continue; }
      return {
        ticker: market.ticker || '',
        eventTicker: market.event_ticker || '',
        title: market.title || '',
        yes_ask: yesAsk,
        yes_bid: typeof market.yes_bid === 'number' ? market.yes_bid : yesAsk - 1,
        no_ask: typeof market.no_ask === 'number' ? market.no_ask : 100 - yesAsk,
        no_bid: typeof market.no_bid === 'number' ? market.no_bid : 100 - (typeof market.yes_bid === 'number' ? market.yes_bid : yesAsk),
        volume: typeof market.volume === 'number' ? market.volume : 0,
        open_interest: typeof market.open_interest === 'number' ? market.open_interest : 0,
        status: market.status || 'unknown',
        category: market.category || ''
      };
    }
  }

  if (DEBUG) {
    console.log(`[MATCH DEBUG] No match for ${prognoEvent.pick} (${prognoEvent.league}). Skips:`, debugCounts);
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
