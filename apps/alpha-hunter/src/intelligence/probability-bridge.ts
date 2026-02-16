/**
 * Probability Bridge: Progno + Kalshi + Crypto
 *
 * Unifies model probabilities from:
 * - Progno: sports picks (confidence + Monte Carlo win prob) → match to Kalshi sports markets
 * - Crypto: Coinbase spot + simple rule → match to Kalshi BTC/ETH markets
 *
 * Use these "model probabilities" in findOpportunities to detect edge vs market yes_price.
 */

export interface PrognoEventProbability {
  /** e.g. "Chiefs win" */
  label: string;
  /** Team names for matching Kalshi title */
  teamNames: string[];
  /** Model probability 0-100 for the pick (YES side) */
  modelProbability: number;
  league: string;
  /** Raw pick for display */
  pick: string;
  homeTeam: string;
  awayTeam: string;
  /** Monte Carlo win prob if available (0-1) */
  mcWinProbability?: number;
}

export interface CryptoModelProbability {
  /** e.g. "BTC above 100000" */
  label: string;
  modelProbability: number;
  asset: string;
  strike?: number;
  currentPrice?: number;
}

const BOT_API_KEY = process.env.BOT_API_KEY;

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
        const isHomePick = pick === homeTeam;
        const mcProb = isHomePick ? p.mc_win_probability : 1 - p.mc_win_probability;
        modelProbability = Math.round(mcProb * 100);
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
  if (/\b(game|match|win|beat|vs\.?|at\s)\b|nfl|nba|mlb|nhl|ncaa/i.test(t)) return true; // explicit sport/game context
  return false; // no sport keyword — don't allow single-team match (avoids "Drake" → Drake Bulldogs, "Denver" → Denver Pioneers)
}

/**
 * Match a Kalshi market title (and optional category) to a Progno event.
 * Uses normalized team tokens, "vs"/"at"/"beat"/"win", and prefers both teams present.
 * Skips non-sports titles (weather, music, GDP) and enforces league consistency (e.g. basketball ↔ NBA/NCAAB).
 */
export function matchKalshiMarketToProgno(
  marketTitle: string,
  category: string | undefined,
  prognoEvents: PrognoEventProbability[]
): { modelProbability: number; side: 'yes' | 'no'; label: string; league?: string } | null {
  const title = (marketTitle || '').toLowerCase();
  if (NON_SPORTS_TITLE.test(title)) return null;

  const hasSportsKeyword = /win|beat|vs\.?|at\s|nfl|nba|mlb|nhl|ncaa|soccer|football|basketball|baseball|hockey|game|match/i.test(title);
  const categoryIsSports = !category || /sport|nfl|nba|mlb|nhl|ncaa|soccer|football|basketball|baseball|hockey/i.test(category);

  for (const ev of prognoEvents) {
    const homeTokens = teamSearchTokens(ev.homeTeam);
    const awayTokens = teamSearchTokens(ev.awayTeam);
    const pickTokens = teamSearchTokens(ev.pick);

    const titleHasPick = pickTokens.some((tok) => tok.length >= 2 && title.includes(tok));
    const titleHasHome = homeTokens.some((tok) => tok.length >= 2 && title.includes(tok));
    const titleHasAway = awayTokens.some((tok) => tok.length >= 2 && title.includes(tok));
    const bothTeamsInTitle = titleHasHome && titleHasAway;
    const oneTeamAndPick = (titleHasHome || titleHasAway) && titleHasPick;

    if (!titleHasPick && !titleHasHome && !titleHasAway) continue;
    if (!hasSportsKeyword && !categoryIsSports) continue;
    // When both teams are in the title, trust the matchup; otherwise require league consistency (e.g. basketball ↔ NBA/NCAAB)
    if (!bothTeamsInTitle && !titleLeagueMatchesEvent(title, ev.league)) continue;

    if (bothTeamsInTitle || oneTeamAndPick || titleHasPick) {
      const modelProb = ev.modelProbability;
      const side: 'yes' | 'no' = modelProb >= 50 ? 'yes' : 'no';
      return { modelProbability: modelProb, side, label: ev.label, league: ev.league };
    }
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
