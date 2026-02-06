/**
 * Claude Effect Visualization Component
 * Displays all 7 dimensions in a card format
 */

'use client';

import React from 'react';

interface ClaudeEffectScores {
  sentimentField: number;
  narrativeMomentum: number;
  informationAsymmetry: number;
  chaosSensitivity: number;
  networkInfluence: number;
  temporalDecay: number;
  emergentPattern: number;
}

interface ClaudeEffectCardProps {
  scores: ClaudeEffectScores;
  adjustedProbability: number;
  adjustedConfidence: number;
  reasoning?: string[];
  warnings?: string[];
  recommendations?: {
    betSize: 'small' | 'medium' | 'large' | 'avoid';
    reason: string;
  };
}

export default function ClaudeEffectCard({
  scores,
  adjustedProbability,
  adjustedConfidence,
  reasoning = [],
  warnings = [],
  recommendations,
}: ClaudeEffectCardProps) {
  const formatPct = (pct: number) => {
    const isWhole = Math.abs(pct - Math.round(pct)) < 0.01;
    return isWhole ? pct.toFixed(0) : pct.toFixed(1);
  };
  const formatScore = (score: number, range: number = 0.2) => {
    const raw = (score / range) * 10;
    const isWhole = Math.abs(raw - Math.round(raw)) < 0.01;
    const str = isWhole ? raw.toFixed(0) : raw.toFixed(1);
    return `${raw >= 0 ? '+' : ''}${str}%`;
  };

  const getScoreColor = (score: number, isChaos: boolean = false) => {
    if (isChaos) {
      if (score > 0.6) return 'text-rose-400';
      if (score > 0.4) return 'text-amber-400';
      if (score > 0.2) return 'text-yellow-400';
      return 'text-emerald-400';
    } else {
      if (score > 0.05) return 'text-emerald-400';
      if (score < -0.05) return 'text-rose-400';
      return 'text-slate-400';
    }
  };

  const getBetSizeColor = (size: string) => {
    switch (size) {
      case 'large': return 'bg-emerald-600 text-white';
      case 'medium': return 'bg-amber-500 text-slate-900';
      case 'small': return 'bg-orange-500 text-white';
      case 'avoid': return 'bg-rose-600 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  return (
    <div className="relative z-10 bg-gradient-to-br from-slate-800 via-indigo-900/80 to-slate-800 rounded-xl p-6 pb-8 text-white shadow-xl border border-slate-600/50 mb-8 overflow-visible">
      <h2 className="text-2xl font-bold mb-4 text-slate-100">🎯 The Claude Effect</h2>

      {/* Main Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
          <div className="text-sm text-slate-300 mb-1">Adjusted Probability</div>
          <div className="text-3xl font-bold text-emerald-400">
            {(adjustedProbability * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
          <div className="text-sm text-slate-300 mb-1">Adjusted Confidence</div>
          <div className="text-3xl font-bold text-sky-400">
            {(adjustedConfidence * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Dimension Scores - gap so label and value don't run together */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center gap-4">
          <span className="text-sm text-slate-200">🎭 Sentiment Field</span>
          <span className={`font-bold shrink-0 ${getScoreColor(scores.sentimentField)}`}>
            {formatScore(scores.sentimentField)}
          </span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="text-sm text-slate-200">📖 Narrative Momentum</span>
          <span className={`font-bold shrink-0 ${getScoreColor(scores.narrativeMomentum)}`}>
            {formatScore(scores.narrativeMomentum, 0.3)}
          </span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="text-sm text-slate-200">🕵️ Information Asymmetry</span>
          <span className={`font-bold shrink-0 ${getScoreColor(scores.informationAsymmetry)}`}>
            {formatScore(scores.informationAsymmetry)}
          </span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="text-sm text-slate-200">🌀 Chaos Sensitivity</span>
          <span className={`font-bold shrink-0 ${getScoreColor(scores.chaosSensitivity, true)}`}>
            {formatPct(scores.chaosSensitivity * 100)}%
          </span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="text-sm text-slate-200">🔗 Network Influence</span>
          <span className={`font-bold shrink-0 ${getScoreColor(scores.networkInfluence)}`}>
            {formatScore(scores.networkInfluence)}
          </span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="text-sm text-slate-200">⏱️ Temporal Decay</span>
          <span className="font-bold text-slate-300 shrink-0">
            {formatPct(scores.temporalDecay * 100)}%
          </span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="text-sm text-slate-200">🧬 Emergent Patterns</span>
          <span className={`font-bold shrink-0 ${getScoreColor(scores.emergentPattern)}`}>
            {formatScore(scores.emergentPattern)}
          </span>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations && (
        <div className={`${getBetSizeColor(recommendations.betSize)} rounded-lg p-3 mb-4 font-medium`}>
          <div className="font-bold text-lg mb-1">
            Recommendation: {recommendations.betSize.toUpperCase()}
          </div>
          <div className="text-sm opacity-95">{recommendations.reason}</div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-rose-900/40 border border-rose-500/30 rounded-lg p-3 mb-4 text-rose-100">
          <div className="font-bold mb-2">⚠️ Warnings</div>
          <ul className="text-sm space-y-1">
            {warnings.map((warning, i) => (
              <li key={i}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Reasoning - extra padding so nothing sits under the next section */}
      {reasoning.length > 0 && (
        <div className="bg-slate-700/50 rounded-lg p-4 pb-5 border border-slate-600/50 mb-2">
          <div className="font-bold mb-2 text-sm text-slate-200">💡 Insights</div>
          <ul className="text-sm space-y-1 text-slate-300">
            {reasoning.slice(0, 3).map((reason, i) => (
              <li key={i}>• {reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

