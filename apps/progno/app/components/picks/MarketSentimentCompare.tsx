'use client';

/**
 * Market Sentiment vs Sharp Action comparison.
 * Shows Public (tickets) vs Professional (money) and Line Freeze when divergence is high and line is stable.
 * Use when you have public_tickets %, sharp/money %, and line movement (e.g. from IAI/line-freeze-detector).
 */

export interface MarketSentimentCompareProps {
  homeTeam: string;
  awayTeam: string;
  /** Public ticket % on home (or on favorite) e.g. 75 */
  publicTickets: number;
  /** Sharp / money % on home (or on favorite) e.g. 40 */
  sharpMoney: number;
  /** Line movement in points (e.g. 0 = freeze, -1.5 = moved toward away) */
  lineMovement: number;
  /** Optional: precomputed line-freeze signal for copy */
  lineFreezeReason?: string;
}

export function MarketSentimentCompare({
  homeTeam,
  awayTeam,
  publicTickets,
  sharpMoney,
  lineMovement,
  lineFreezeReason,
}: MarketSentimentCompareProps) {
  const divergence = Math.abs(publicTickets - sharpMoney);
  const isLineFrozen = Math.abs(lineMovement) < 0.5;

  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
      <h3 className="text-blue-400 font-bold mb-4 uppercase tracking-wider text-sm">
        Market Asymmetry Analysis
      </h3>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">Public Consensus (Tickets)</span>
            <span className="text-white font-mono">{publicTickets}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-orange-500 h-full transition-all duration-1000"
              style={{ width: `${Math.min(100, publicTickets)}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">Professional Handle (Money)</span>
            <span className="text-white font-mono">{sharpMoney}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-1000"
              style={{ width: `${Math.min(100, sharpMoney)}%` }}
            />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-800">
          {isLineFrozen && divergence > 20 ? (
            <div className="flex items-center gap-3 text-emerald-400 bg-emerald-400/10 p-3 rounded-lg border border-emerald-400/20">
              <div className="animate-pulse">⚠️</div>
              <p className="text-xs font-medium">
                {lineFreezeReason ?? (
                  <>
                    <strong>LINE FREEZE DETECTED:</strong> The public is heavy on {homeTeam}, but the
                    books refuse to move. Sharp resistance detected.
                  </>
                )}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              Market flow currently aligned with standard expectations.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
