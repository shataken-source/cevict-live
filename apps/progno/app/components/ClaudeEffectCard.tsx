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
  const formatScore = (score: number) => {
    const pct = score * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
  };

  const getScoreColor = (score: number, isChaos = false) => {
    if (isChaos) {
      if (score > 0.6) return 'text-red-400';
      if (score > 0.4) return 'text-orange-400';
      if (score > 0.2) return 'text-yellow-400';
      return 'text-green-400';
    }
    if (score > 0.05) return 'text-green-400';
    if (score < -0.05) return 'text-red-400';
    return 'text-gray-400';
  };

  const getBetSizeColor = (size: string) => {
    switch (size) {
      case 'large': return 'bg-green-600 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'small': return 'bg-orange-500 text-white';
      case 'avoid': return 'bg-red-600 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-100">🎯 The Claude Effect</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Adjusted Probability</div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {(adjustedProbability * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-white dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Adjusted Confidence</div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {(adjustedConfidence * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-700 dark:text-slate-300">Sentiment Field</span>
          <span className={`font-bold ${getScoreColor(scores.sentimentField)}`}>
            {formatScore(scores.sentimentField)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-700 dark:text-slate-300">Narrative Momentum</span>
          <span className={`font-bold ${getScoreColor(scores.narrativeMomentum)}`}>
            {formatScore(scores.narrativeMomentum, 0.3)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-700 dark:text-slate-300">Information Asymmetry</span>
          <span className={`font-bold ${getScoreColor(scores.informationAsymmetry)}`}>
            {formatScore(scores.informationAsymmetry)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-700 dark:text-slate-300">Chaos Sensitivity</span>
          <span className={`font-bold ${getScoreColor(scores.chaosSensitivity, true)}`}>
            {(scores.chaosSensitivity * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-700 dark:text-slate-300">Network Influence</span>
          <span className={`font-bold ${getScoreColor(scores.networkInfluence)}`}>
            {formatScore(scores.networkInfluence)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-700 dark:text-slate-300">Temporal Decay</span>
          <span className="font-bold text-slate-500 dark:text-slate-400">
            {(scores.temporalDecay * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-700 dark:text-slate-300">Emergent Patterns</span>
          <span className={`font-bold ${getScoreColor(scores.emergentPattern)}`}>
            {formatScore(scores.emergentPattern)}
          </span>
        </div>
      </div>

      {recommendations && (
        <div className={`${getBetSizeColor(recommendations.betSize)} rounded-lg p-4 mb-4 text-center font-medium`}>
          Recommendation: {recommendations.betSize.toUpperCase()} - {recommendations.reason}
        </div>
      )}

      {reasoning.length > 0 && (
        <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4">
          <div className="font-medium mb-2 text-slate-800 dark:text-slate-200">Insights</div>
          <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
            {reasoning.slice(0, 3).map((reason, i) => (
              <li key={i}>• {reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}