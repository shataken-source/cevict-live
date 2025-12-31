'use client';

/**
 * Parlay Builder
 * Build multi-leg parlays with odds calculation
 * Competitor feature: DraftKings/FanDuel Parlay Builder
 */

import { useState, useEffect } from 'react';

interface ParlayLeg {
  id: string;
  game: string;
  pick: string;
  odds: number;
  confidence: number;
}

interface Props {
  initialLegs?: ParlayLeg[];
}

export default function ParlayBuilder({ initialLegs = [] }: Props) {
  const [legs, setLegs] = useState<ParlayLeg[]>(initialLegs);
  const [stake, setStake] = useState(10);
  const [showOddsFormat, setShowOddsFormat] = useState<'american' | 'decimal'>('american');

  // Calculate parlay odds
  const calculateParlayOdds = (): number => {
    if (legs.length === 0) return 0;
    
    const decimalOdds = legs.map(leg => {
      if (leg.odds > 0) {
        return (leg.odds / 100) + 1;
      } else {
        return (100 / Math.abs(leg.odds)) + 1;
      }
    });
    
    return decimalOdds.reduce((acc, odds) => acc * odds, 1);
  };

  const parlayDecimal = calculateParlayOdds();
  const payout = stake * parlayDecimal;
  const profit = payout - stake;

  // Calculate combined confidence
  const combinedConfidence = legs.length > 0
    ? legs.reduce((acc, leg) => acc * (leg.confidence / 100), 1) * 100
    : 0;

  // Convert to American odds
  const parlayAmerican = parlayDecimal >= 2
    ? `+${((parlayDecimal - 1) * 100).toFixed(0)}`
    : `-${(100 / (parlayDecimal - 1)).toFixed(0)}`;

  const addLeg = (leg: ParlayLeg) => {
    if (legs.length >= 10) return; // Max 10 legs
    if (legs.find(l => l.id === leg.id)) return; // No duplicates
    setLegs([...legs, leg]);
  };

  const removeLeg = (id: string) => {
    setLegs(legs.filter(l => l.id !== id));
  };

  const clearAll = () => {
    setLegs([]);
  };

  // Sample picks to add
  const availablePicks: ParlayLeg[] = [
    { id: '1', game: 'Chiefs vs Raiders', pick: 'Chiefs -10.5', odds: -110, confidence: 72 },
    { id: '2', game: 'Bills vs Jets', pick: 'Bills -9.5', odds: -110, confidence: 78 },
    { id: '3', game: 'Lakers vs Warriors', pick: 'Over 228.5', odds: -110, confidence: 65 },
    { id: '4', game: 'Eagles vs Cowboys', pick: 'Eagles ML', odds: -175, confidence: 70 },
    { id: '5', game: 'Celtics vs Heat', pick: 'Celtics -7.5', odds: -110, confidence: 68 },
  ];

  return (
    <div className="bg-gradient-to-br from-slate-900 to-purple-900/50 rounded-2xl overflow-hidden border border-purple-500/30">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-purple-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎰</span>
            <h2 className="text-xl font-bold text-white">Parlay Builder</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/50">{legs.length}/10 legs</span>
            {legs.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Current Parlay */}
        {legs.length > 0 ? (
          <div className="space-y-2 mb-4">
            {legs.map((leg, i) => (
              <div 
                key={leg.id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-white">{leg.pick}</div>
                    <div className="text-xs text-white/50">{leg.game}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-mono text-white">
                      {leg.odds > 0 ? `+${leg.odds}` : leg.odds}
                    </div>
                    <div className={`text-xs ${leg.confidence >= 70 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                      {leg.confidence}% conf
                    </div>
                  </div>
                  <button
                    onClick={() => removeLeg(leg.id)}
                    className="p-1 hover:bg-white/10 rounded-lg transition-all"
                  >
                    <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-white/40">
            <div className="text-4xl mb-2">📋</div>
            <p>Add picks to build your parlay</p>
          </div>
        )}

        {/* Available Picks */}
        <div className="mb-4">
          <div className="text-xs text-white/50 mb-2">AI RECOMMENDED PICKS</div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {availablePicks
              .filter(p => !legs.find(l => l.id === p.id))
              .map(pick => (
                <button
                  key={pick.id}
                  onClick={() => addLeg(pick)}
                  className="flex-shrink-0 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white transition-all"
                >
                  <div className="font-medium">{pick.pick}</div>
                  <div className="text-xs text-white/50">{pick.confidence}%</div>
                </button>
              ))}
          </div>
        </div>

        {/* Parlay Summary */}
        {legs.length > 0 && (
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xs text-white/50">PARLAY ODDS</div>
                <div className="text-2xl font-bold text-white">
                  {showOddsFormat === 'american' ? parlayAmerican : parlayDecimal.toFixed(2)}
                </div>
                <button
                  onClick={() => setShowOddsFormat(f => f === 'american' ? 'decimal' : 'american')}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Switch to {showOddsFormat === 'american' ? 'Decimal' : 'American'}
                </button>
              </div>
              <div>
                <div className="text-xs text-white/50">COMBINED CONFIDENCE</div>
                <div className={`text-2xl font-bold ${
                  combinedConfidence >= 50 ? 'text-emerald-400' :
                  combinedConfidence >= 30 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {combinedConfidence.toFixed(1)}%
                </div>
                <div className="text-xs text-white/40">
                  {combinedConfidence >= 50 ? '✓ Good value' : 
                   combinedConfidence >= 30 ? '⚠️ Risky' : 
                   '❌ Very risky'}
                </div>
              </div>
            </div>

            {/* Stake Input */}
            <div className="mb-4">
              <div className="text-xs text-white/50 mb-2">STAKE</div>
              <div className="flex gap-2">
                {[5, 10, 25, 50, 100].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setStake(amount)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      stake === amount
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={stake}
                onChange={(e) => setStake(Number(e.target.value))}
                className="w-full mt-2 bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-white text-center"
                min={1}
              />
            </div>

            {/* Payout */}
            <div className="flex items-center justify-between p-4 bg-white/10 rounded-xl">
              <div>
                <div className="text-sm text-white/50">Potential Payout</div>
                <div className="text-3xl font-black text-emerald-400">
                  ${payout.toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-white/50">Profit</div>
                <div className="text-xl font-bold text-emerald-400">
                  +${profit.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Warnings */}
            {legs.length >= 5 && (
              <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-yellow-400">
                  <span>⚠️</span>
                  <span>Large parlays are harder to hit. Consider smaller 2-3 leg parlays.</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

