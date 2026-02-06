'use client';

/**
 * Rich pick card for Pro/Elite tiers.
 * Elite variant shows key factors, rationale, simulation, projected score.
 * Matches the "enhanced pick" experience from progno's EnhancedPicksCard.
 */

export interface EnginePick {
  gameId: string;
  game: string;
  sport: string;
  pick: string;
  confidencePct: number;
  edgePct: number;
  kickoff: string | null;
  keyFactors?: string[];
  rationale?: string;
  simulationResults?: { winRate?: number; stdDev?: number; iterations?: number };
  predictedScore?: { home: number; away: number };
  riskLevel?: 'low' | 'medium' | 'high';
  stake?: number;
}

interface EnhancedPickCardProps {
  pick: EnginePick;
  variant: 'pro' | 'elite';
}

export default function EnhancedPickCard({ pick, variant }: EnhancedPickCardProps) {
  const isElite = variant === 'elite';
  const hasKeyFactors = Array.isArray(pick.keyFactors) && pick.keyFactors.length > 0;
  const hasRationale = typeof pick.rationale === 'string' && pick.rationale.length > 0;
  const hasSim = pick.simulationResults && typeof pick.simulationResults.winRate === 'number';
  const score = pick.predictedScore;

  const formatKickoff = (k: string | null) => {
    if (!k) return '';
    try {
      const d = new Date(k);
      return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch {
      return k;
    }
  };

  return (
    <div className="overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
      {/* Header */}
      <div className={`p-5 ${isElite ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : 'bg-slate-700'} text-white`}>
        <div className="flex justify-between items-start gap-4">
          <div>
            <span className="text-xs font-semibold uppercase opacity-90">{pick.sport}</span>
            {pick.kickoff && (
              <p className="text-xs opacity-80 mt-0.5">{formatKickoff(pick.kickoff)}</p>
            )}
            <p className="text-lg font-semibold mt-1">{pick.game}</p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-90">Pick</p>
            <p className="text-xl font-bold">{pick.pick}</p>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4 p-5 bg-slate-50 dark:bg-slate-800/50">
        <div className="text-center">
          <div className="text-xs text-slate-500 dark:text-slate-400">Confidence</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{pick.confidencePct}%</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-slate-500 dark:text-slate-400">Edge</div>
          <div className={`text-2xl font-bold ${pick.edgePct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {pick.edgePct >= 0 ? '+' : ''}{pick.edgePct}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {score ? 'Projected' : 'Risk'}
          </div>
          <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
            {score ? `${score.away} – ${score.home}` : (pick.riskLevel ?? '—')}
          </div>
        </div>
      </div>

      {/* Elite-only: Key Factors */}
      {isElite && hasKeyFactors && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Key Factors</h4>
          <ul className="space-y-1.5">
            {pick.keyFactors!.map((f, i) => (
              <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start">
                <span className="mr-2 text-emerald-500">•</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Elite-only: Rationale */}
      {isElite && hasRationale && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Analysis</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">{pick.rationale}</p>
        </div>
      )}

      {/* Elite-only: Simulation */}
      {isElite && hasSim && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Simulation</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Win rate: <strong>{(pick.simulationResults!.winRate! * 100).toFixed(1)}%</strong>
            {pick.simulationResults!.iterations != null && (
              <span className="text-slate-500"> ({pick.simulationResults!.iterations} runs)</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
