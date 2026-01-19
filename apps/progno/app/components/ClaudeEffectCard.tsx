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
  const formatScore = (score: number, range: number = 0.2) => {
    const percentage = (score / range) * 100;
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`;
  };

  const getScoreColor = (score: number, isChaos: boolean = false) => {
    if (isChaos) {
      // CSI: higher = worse (red), lower = better (green)
      if (score > 0.6) return 'text-red-500';
      if (score > 0.4) return 'text-orange-500';
      if (score > 0.2) return 'text-yellow-500';
      return 'text-green-500';
    } else {
      // Other dimensions: positive = green, negative = red
      if (score > 0.05) return 'text-green-500';
      if (score < -0.05) return 'text-red-500';
      return 'text-gray-400';
    }
  };

  const getBetSizeColor = (size: string) => {
    switch (size) {
      case 'large': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'small': return 'bg-orange-500';
      case 'avoid': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-900 via-pink-900 to-red-900 rounded-lg p-6 text-white shadow-xl">
      <h2 className="text-2xl font-bold mb-4">🎯 The Claude Effect</h2>

      {/* Main Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-black/30 rounded-lg p-4">
          <div className="text-sm text-gray-300 mb-1">Adjusted Probability</div>
          <div className="text-3xl font-bold text-green-400">
            {(adjustedProbability * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-black/30 rounded-lg p-4">
          <div className="text-sm text-gray-300 mb-1">Adjusted Confidence</div>
          <div className="text-3xl font-bold text-blue-400">
            {(adjustedConfidence * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Dimension Scores */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm">🎭 Sentiment Field</span>
          <span className={`font-bold ${getScoreColor(scores.sentimentField)}`}>
            {formatScore(scores.sentimentField)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm">📖 Narrative Momentum</span>
          <span className={`font-bold ${getScoreColor(scores.narrativeMomentum)}`}>
            {formatScore(scores.narrativeMomentum, 0.3)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm">🕵️ Information Asymmetry</span>
          <span className={`font-bold ${getScoreColor(scores.informationAsymmetry)}`}>
            {formatScore(scores.informationAsymmetry)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm">🌀 Chaos Sensitivity</span>
          <span className={`font-bold ${getScoreColor(scores.chaosSensitivity, true)}`}>
            {(scores.chaosSensitivity * 100).toFixed(0)}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm">🔗 Network Influence</span>
          <span className={`font-bold ${getScoreColor(scores.networkInfluence)}`}>
            {formatScore(scores.networkInfluence)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm">⏱️ Temporal Decay</span>
          <span className="font-bold text-gray-400">
            {(scores.temporalDecay * 100).toFixed(0)}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm">🧬 Emergent Patterns</span>
          <span className={`font-bold ${getScoreColor(scores.emergentPattern)}`}>
            {formatScore(scores.emergentPattern)}
          </span>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations && (
        <div className={`${getBetSizeColor(recommendations.betSize)} rounded-lg p-3 mb-4`}>
          <div className="font-bold text-lg mb-1">
            Recommendation: {recommendations.betSize.toUpperCase()}
          </div>
          <div className="text-sm opacity-90">{recommendations.reason}</div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-red-900/50 rounded-lg p-3 mb-4">
          <div className="font-bold mb-2">⚠️ Warnings</div>
          <ul className="text-sm space-y-1">
            {warnings.map((warning, i) => (
              <li key={i}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Reasoning */}
      {reasoning.length > 0 && (
        <div className="bg-black/30 rounded-lg p-3">
          <div className="font-bold mb-2 text-sm">💡 Insights</div>
          <ul className="text-sm space-y-1">
            {reasoning.slice(0, 3).map((reason, i) => (
              <li key={i}>• {reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

