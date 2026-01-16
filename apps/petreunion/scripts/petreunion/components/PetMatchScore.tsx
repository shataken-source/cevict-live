'use client';

/**
 * Pet Match Score Component
 * Shows AI matching confidence for found pets
 */

import { useState } from 'react';

interface MatchScoreProps {
  score: number; // 0-100
  matchedFeatures: string[];
  lostPet: {
    name: string;
    breed: string;
    location: string;
  };
  foundPet: {
    breed: string;
    location: string;
    foundDate: string;
  };
  onContactOwner: () => void;
  onDismiss: () => void;
}

export default function PetMatchScore({
  score,
  matchedFeatures,
  lostPet,
  foundPet,
  onContactOwner,
  onDismiss,
}: MatchScoreProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getScoreColor = () => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  const getScoreLabel = () => {
    if (score >= 80) return 'High Match';
    if (score >= 60) return 'Possible Match';
    return 'Low Match';
  };

  const getScoreEmoji = () => {
    if (score >= 80) return '🎯';
    if (score >= 60) return '🤔';
    return '❓';
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
      {/* Header with Score */}
      <div className={`bg-gradient-to-r ${getScoreColor()} p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm opacity-80 mb-1">AI Match Score</div>
            <div className="text-4xl font-black flex items-center gap-2">
              {score}%
              <span className="text-2xl">{getScoreEmoji()}</span>
            </div>
            <div className="text-sm font-medium opacity-90">{getScoreLabel()}</div>
          </div>
          <div className="w-24 h-24 relative">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="8"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                stroke="white"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 251.2} 251.2`}
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Comparison */}
      <div className="p-6">
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Lost Pet */}
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">
              🐕
            </div>
            <div className="font-bold text-slate-900">{lostPet.name}</div>
            <div className="text-sm text-slate-500">{lostPet.breed}</div>
            <div className="text-xs text-slate-400 mt-1">📍 {lostPet.location}</div>
          </div>

          {/* Match Arrow */}
          <div className="flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
              ↔️
            </div>
          </div>

          {/* Found Pet */}
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">
              ❓
            </div>
            <div className="font-bold text-slate-900">Found Pet</div>
            <div className="text-sm text-slate-500">{foundPet.breed}</div>
            <div className="text-xs text-slate-400 mt-1">📍 {foundPet.location}</div>
            <div className="text-xs text-slate-400">Found {foundPet.foundDate}</div>
          </div>
        </div>

        {/* Matched Features */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition-all"
        >
          <span>🔍 {matchedFeatures.length} matching features</span>
          <svg
            className={`w-5 h-5 transition-transform ${showDetails ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDetails && (
          <div className="mt-3 p-4 bg-slate-50 rounded-xl">
            <div className="space-y-2">
              {matchedFeatures.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-green-500">✓</span>
                  <span className="text-slate-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onContactOwner}
            className={`flex-1 py-3 rounded-xl font-semibold text-white transition-all ${
              score >= 60
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:shadow-lg hover:shadow-green-500/25'
                : 'bg-slate-400'
            }`}
          >
            {score >= 60 ? '📞 Contact Owner' : 'Contact Owner'}
          </button>
          <button
            onClick={onDismiss}
            className="px-6 py-3 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition-all"
          >
            Not a Match
          </button>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-slate-400 text-center mt-4">
          AI match scores are estimates. Always verify with the pet owner before confirmation.
        </p>
      </div>
    </div>
  );
}

