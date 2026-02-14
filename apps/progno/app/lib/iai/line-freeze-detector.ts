/**
 * Line Freeze detector (stateless).
 * When public money is heavy (>70%) but the line has moved ≤0.5 pts, the book is "taking a stand."
 * RLM = line moves toward the underdog despite public on favorite (strong sharp signal).
 * Use with opening line + current line + public money % (e.g. from Odds API or Action Network).
 */

export interface MarketData {
  gameId: string;
  currentLine: number;
  openingLine: number;
  /** e.g. 85 = 85% of money on favorite (or on home, depending on convention) */
  publicMoneyPct: number;
  publicTicketPct: number;
}

export interface LineFreezeResult {
  isFrozen: boolean;
  isReverse: boolean;
  /** 50 = stable, 78 = freeze, 92 = RLM */
  confidence: number;
  signal: 'SHARP_ACTIVITY' | 'STABLE_MARKET';
  reasoning: string;
}

/**
 * Detect Line Freeze and Reverse Line Movement from a single snapshot.
 * No history required; use when you have opening line, current line, and public %.
 */
export function detectLineFreeze(data: MarketData): LineFreezeResult {
  const lineChange = data.currentLine - data.openingLine;
  const isHeavyPublic = data.publicMoneyPct > 70;

  const isFrozen =
    isHeavyPublic && Math.abs(lineChange) <= 0.5;

  const isReverse =
    isHeavyPublic &&
    ((data.currentLine < data.openingLine && data.openingLine < 0) ||
      (data.currentLine > data.openingLine && data.openingLine > 0));

  const confidence = isReverse ? 92 : isFrozen ? 78 : 50;
  const signal = isReverse || isFrozen ? 'SHARP_ACTIVITY' : 'STABLE_MARKET';
  const reasoning = isReverse
    ? `Heavy public action (${data.publicMoneyPct}%) isn't moving the needle. Pros are hitting the other side.`
    : isFrozen
    ? `Market is ignoring the public volume. The House is comfortable at this price.`
    : 'Normal market flow.';

  return {
    isFrozen,
    isReverse,
    confidence,
    signal,
    reasoning,
  };
}
