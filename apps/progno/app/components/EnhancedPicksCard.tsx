'use client';

import React from 'react';

interface EnhancedPick {
  homeTeam: string;
  awayTeam: string;
  winner: string;
  confidence: number;
  score?: {
    home?: number;
    away?: number;
  };
  value_bet_edge: string | number | null;
  keyFactors?: string[];
  claudeEffect?: {
    sentimentField?: number;
    narrativeMomentum?: number;
    informationAsymmetry?: number;
    chaosSensitivity?: number;
    networkInfluence?: number;
    temporalDecay?: number;
    emergentPattern?: number;
  };
  league?: string;
  gameId?: string;
}

export default function EnhancedPicksCard({ pick }: { pick: EnhancedPick }) {
  // Edge parsing (safe)
  const edgeNum = pick.value_bet_edge != null ? parseFloat(pick.value_bet_edge as string) : null;
  const isPositiveEdge = edgeNum !== null && edgeNum > 0;
  const isNegativeEdge = edgeNum !== null && edgeNum < 0;

  // Confidence — handle both decimal (0.xx) and percent (xx.x) inputs safely
  const rawConfidence = pick.confidence || 0;
  const displayConfidence = rawConfidence > 1 
    ? rawConfidence.toFixed(1) 
    : (rawConfidence * 100).toFixed(1);

  // Projected score display — safe
  const projectedScore = pick.score && pick.score.home != null && pick.score.away != null
    ? `${pick.score.away} – ${pick.score.home}`
    : 'N/A';

  // Claude Effect average — ultra-safe
  let claudeAvg: number | null = null;
  if (pick.claudeEffect && typeof pick.claudeEffect === 'object') {
    const values = Object.values(pick.claudeEffect).filter(v => typeof v === 'number' && !isNaN(v));
    if (values.length > 0) {
      claudeAvg = values.reduce((a, b) => a + b, 0) / values.length;
    }
  }

  // Has Claude Effect data?
  const hasClaudeEffect = pick.claudeEffect && typeof pick.claudeEffect === 'object' && Object.keys(pick.claudeEffect).length > 0;

  // Has key factors? (safe array check)
  const hasKeyFactors = Array.isArray(pick.keyFactors) && pick.keyFactors.length > 0;

  return (
    <div className="overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
      <div className="p-0">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">{pick.awayTeam}</p>
              <p className="text-lg font-semibold">@ {pick.homeTeam}</p>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-90">Predicted Winner</p>
              <p className="text-xl font-bold">{pick.winner}</p>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-4 p-5 bg-slate-50 dark:bg-slate-800/50">
          <div className="text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400">Confidence</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {displayConfidence}%
            </div>
          </div>

          <div className="text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400">Projected Score</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {projectedScore}
            </div>
          </div>

          <div className="text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400">Edge</div>
            <div
              className={`text-2xl font-bold ${
                isPositiveEdge
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : isNegativeEdge
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {edgeNum != null
                ? `${edgeNum >= 0 ? '+' : ''}${edgeNum.toFixed(1)}%`
                : 'N/A'}
            </div>
          </div>
        </div>

        {/* Key Factors */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Key Factors
          </h4>
          <ul className="space-y-2">
            {hasKeyFactors ? (
              pick.keyFactors!.map((factor, i) => (
                <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start">
                  <span className="mr-2 text-emerald-500">•</span>
                  {factor}
                </li>
              ))
            ) : (
              <li className="text-sm text-slate-600 dark:text-slate-400 italic">No factors available</li>
            )}
          </ul>
        </div>

        {/* Claude Effect — only if data exists */}
        {hasClaudeEffect && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border-t border-amber-200 dark:border-amber-800/50">
            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-3">
              Claude Effect (Avg: {claudeAvg !== null ? (claudeAvg * 100).toFixed(1) + '%' : 'N/A'})
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {Object.entries(pick.claudeEffect!).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">
                    {key.replace(/([A-Z])/g, ' $1').trim()}:
                  </span>
                  <span className="font-medium text-amber-900 dark:text-amber-100">
                    {typeof value === 'number' ? (value * 100).toFixed(1) + '%' : 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}