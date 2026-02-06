'use client';

/**
 * Enhanced Picks Card Component
 * 
 * Shows all bet types for a single game:
 * - Moneyline (who wins)
 * - Spread (point spread)
 * - Total (over/under)
 * 
 * Plus value betting indicators and Monte Carlo confidence
 */

import { useState } from 'react';

interface Pick {
  sport: string;
  home_team: string;
  away_team: string;
  game_time: string;
  confidence: number;
  is_premium: boolean;
  analysis: string;
  
  // Moneyline
  pick: string;
  odds: number;
  
  // Claude Effect
  claude_effect: number;
  sentiment_field: number;
  narrative_momentum: number;
  information_asymmetry: number;
  chaos_sensitivity: number;
  ai_confidence: string;
  
  // Monte Carlo
  mc_win_probability: number;
  mc_predicted_score: { home: number; away: number };
  mc_spread_probability: number;
  mc_total_probability: number;
  mc_iterations: number;
  
  // Value Bet
  value_bet_edge: number;
  value_bet_ev: number;
  has_value: boolean;
}

interface EnhancedPicksCardProps {
  pick: Pick;
  showDetails?: boolean;
}

export default function EnhancedPicksCard({ pick, showDetails = true }: EnhancedPicksCardProps) {
  const [activeTab, setActiveTab] = useState<'moneyline' | 'spread' | 'total'>('moneyline');
  const [expanded, setExpanded] = useState(false);

  const gameTime = new Date(pick.game_time);
  const timeStr = gameTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  const dateStr = gameTime.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });

  const winProb = pick.mc_win_probability || (pick.confidence / 100);
  const spreadProb = pick.mc_spread_probability || 0.5;
  const totalProb = pick.mc_total_probability || 0.5;

  return (
    <div className="rounded-2xl overflow-hidden border shadow-lg bg-slate-800 border-slate-600/60"
      style={{
        borderWidth: pick.is_premium ? 2 : 1,
        borderColor: pick.is_premium 
          ? 'rgb(245 158 11 / 0.6)' 
          : pick.has_value 
            ? 'rgb(16 185 129 / 0.5)'
            : undefined,
      }}>
      {/* Header - light strip, no dark “back” */}
      <div className="px-6 py-4 border-b border-slate-500/40 flex justify-between items-center bg-slate-700/30">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getSportEmoji(pick.sport)}</span>
            <div>
              <div className="text-lg font-bold text-slate-100">
                {pick.away_team} @ {pick.home_team}
              </div>
              <div className="text-sm text-slate-400">
                {pick.sport} • {dateStr} • {timeStr}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {pick.is_premium && (
            <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-amber-500">
              ⭐ PREMIUM
            </span>
          )}
          {pick.has_value && (
            <span className="px-3 py-1 rounded-full text-xs font-bold text-emerald-800 bg-emerald-400/90 border border-emerald-500/50">
              💰 VALUE
            </span>
          )}
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Confidence</div>
            <div className="text-lg font-bold text-slate-100">{pick.confidence.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Bet Type Tabs */}
      <div className="flex border-b border-slate-600/60 bg-slate-800/40">
        {(['moneyline', 'spread', 'total'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 px-3 text-sm font-semibold transition-all rounded-t-md border-b-2 -mb-px border-r border-slate-600/60 last:border-r-0 ${
              activeTab === tab
                ? 'bg-slate-700 text-white border-emerald-500'
                : 'bg-slate-700/50 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-700/70'
            }`}
          >
            {tab === 'moneyline' ? '💵 Moneyline' : tab === 'spread' ? '📊 Spread' : '📈 Total'}
          </button>
        ))}
      </div>

      {/* Tab Content - 2 columns on md+ */}
      <div className="p-5 text-slate-200">
        {activeTab === 'moneyline' && (
          <BetTypeContent
            title="Moneyline Pick"
            pick={pick.pick}
            probability={winProb}
            odds={pick.odds}
            edge={pick.value_bet_edge}
            ev={pick.value_bet_ev}
            predictedScore={pick.mc_predicted_score}
            reasoning={`Win probability: ${(winProb * 100).toFixed(1)}% based on ${pick.mc_iterations || 1000}+ simulations`}
          />
        )}
        {activeTab === 'spread' && (
          <BetTypeContent
            title="Spread Pick"
            pick={`${pick.pick} (spread TBD)`}
            probability={spreadProb}
            odds={-110}
            edge={spreadProb > 0.52 ? (spreadProb - 0.52) * 100 : 0}
            ev={spreadProb > 0.52 ? (spreadProb * 91 - (1 - spreadProb) * 100) : 0}
            predictedScore={pick.mc_predicted_score}
            reasoning={`Cover probability: ${(spreadProb * 100).toFixed(1)}%`}
          />
        )}
        {activeTab === 'total' && (
          <BetTypeContent
            title="Total Pick"
            pick={totalProb > 0.5 ? 'Over' : 'Under'}
            probability={Math.max(totalProb, 1 - totalProb)}
            odds={-110}
            edge={(Math.max(totalProb, 1 - totalProb) - 0.52) * 100}
            ev={0}
            predictedScore={pick.mc_predicted_score}
            reasoning={`${totalProb > 0.5 ? 'Over' : 'Under'} probability: ${(Math.max(totalProb, 1 - totalProb) * 100).toFixed(1)}%`}
          />
        )}
      </div>

      {/* Claude Effect Section (Expandable) */}
      {showDetails && (
        <div className="border-t border-slate-600/60">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full py-4 px-6 flex justify-between items-center text-slate-300 hover:text-slate-100 hover:bg-slate-700/50 transition-colors text-sm font-medium"
          >
            <span>🤖 Claude Effect AI Details</span>
            <span className="text-slate-400">{expanded ? '▲' : '▼'}</span>
          </button>
          {expanded && (
            <div className="px-6 pb-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <ClaudeEffectMeter label="Sentiment" value={pick.sentiment_field} />
                <ClaudeEffectMeter label="Narrative" value={pick.narrative_momentum} />
                <ClaudeEffectMeter label="Sharp Money" value={pick.information_asymmetry} />
                <ClaudeEffectMeter label="Chaos Risk" value={pick.chaos_sensitivity} />
              </div>
              <div className="rounded-lg p-4 bg-slate-700/50 border border-slate-600 text-sm text-slate-300">
                <strong className="text-slate-200">AI Analysis:</strong> {pick.analysis}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BetTypeContent({
  title,
  pick,
  probability,
  odds,
  edge,
  ev,
  predictedScore,
  reasoning,
}: {
  title: string;
  pick: string;
  probability: number;
  odds: number;
  edge: number;
  ev: number;
  predictedScore?: { home: number; away: number };
  reasoning: string;
}) {
  const pctStr = (probability * 100).toFixed(1);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Left column: Pick, odds, predicted score */}
      <div className="space-y-2">
        <div className="text-xs text-slate-500 uppercase tracking-wider">{title}</div>
        <div className="text-xl font-bold text-slate-100">{pick}</div>
        <div className="text-base text-sky-400 font-medium">{odds > 0 ? `+${odds}` : odds}</div>
        {predictedScore && (
          <div className="pt-2 border-t border-slate-600/60">
            <div className="text-xs text-slate-500">Predicted Score</div>
            <div className="text-lg font-bold text-slate-200">{predictedScore.home} – {predictedScore.away}</div>
          </div>
        )}
      </div>

      {/* Right column: Win prob (text only, no blue bar), progress bar, Edge & EV */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between items-baseline gap-2 text-sm mb-1">
            <span className="text-slate-400">Win Probability</span>
            <span className="font-bold text-slate-100 tabular-nums">{pctStr}%</span>
          </div>
          <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pctStr}%`,
                background: probability > 0.65 ? 'linear-gradient(90deg, #059669, #10b981)' : probability > 0.55 ? 'linear-gradient(90deg, #d97706, #f59e0b)' : 'linear-gradient(90deg, #475569, #64748b)',
              }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className={`rounded-lg p-3 ${edge > 3 ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-slate-700/50 border border-slate-600/50'}`}>
            <div className="text-[10px] text-slate-500 uppercase">Edge</div>
            <div className={`text-lg font-bold tabular-nums ${edge > 3 ? 'text-emerald-400' : 'text-slate-200'}`}>
              {edge > 0 ? '+' : ''}{edge.toFixed(1)}%
            </div>
          </div>
          <div className={`rounded-lg p-3 ${ev > 0 ? 'bg-amber-500/15 border border-amber-500/30' : 'bg-slate-700/50 border border-slate-600/50'}`}>
            <div className="text-[10px] text-slate-500 uppercase">EV</div>
            <div className={`text-lg font-bold tabular-nums ${ev > 0 ? 'text-amber-300' : 'text-slate-200'}`}>
              {ev >= 0 ? '+' : ''}${ev.toFixed(0)}/bet
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500 italic col-span-full border-t border-slate-600/50 pt-3">{reasoning}</p>
    </div>
  );
}

function ClaudeEffectMeter({ label, value }: { label: string; value: number }) {
  const normalized = Math.min(1, Math.max(-1, value * 5));
  const percentage = (normalized + 1) / 2 * 100;

  return (
    <div>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="h-1.5 bg-slate-600 rounded-full overflow-hidden relative">
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-500 -translate-x-px" />
        <div
          className="absolute top-0 bottom-0 rounded-full"
          style={{
            left: `${Math.min(percentage, 50)}%`,
            width: `${Math.abs(percentage - 50)}%`,
            background: value > 0 ? 'linear-gradient(90deg, transparent, #10b981)' : 'linear-gradient(270deg, transparent, #f43f5e)',
          }}
        />
      </div>
      <div className={`text-xs font-bold mt-1 ${value > 0 ? 'text-emerald-400' : value < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
        {value > 0 ? '+' : ''}{(value * 100).toFixed(1)}%
      </div>
    </div>
  );
}

function getSportEmoji(sport: string): string {
  const emojis: Record<string, string> = {
    NFL: '🏈',
    NCAAF: '🏈',
    NBA: '🏀',
    NCAAB: '🏀',
    NHL: '🏒',
    MLB: '⚾',
  };
  return emojis[sport?.toUpperCase()] || '🎯';
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
  if (confidence >= 70) return 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
  if (confidence >= 60) return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
  return 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
}

