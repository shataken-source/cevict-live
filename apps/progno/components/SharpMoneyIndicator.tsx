'use client';

/**
 * Sharp Money Indicator
 * Shows professional betting activity - reverse line movement, steam moves
 * Competitor feature: Action Network PRO
 */

import { useState, useEffect } from 'react';

interface SharpMoneyData {
  sharpSide: 'home' | 'away' | 'over' | 'under' | null;
  confidence: number;
  indicators: string[];
  steamMove: boolean;
  reverseLineMove: boolean;
}

interface PublicBettingData {
  spreadPublic: { home: number; away: number };
  moneylinePublic: { home: number; away: number };
  totalPublic: { over: number; under: number };
  ticketCount: number;
  moneyPercentage: { home: number; away: number };
}

interface Props {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
}

export default function SharpMoneyIndicator({ gameId, homeTeam, awayTeam }: Props) {
  const [data, setData] = useState<{
    sharp: SharpMoneyData;
    public: PublicBettingData;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [gameId]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/odds/live?league=NFL&analysis=true`);
      if (res.ok) {
        const result = await res.json();
        const game = result.games?.find((g: any) => g.gameId === gameId);
        if (game?.analysis) {
          setData({
            sharp: game.analysis.sharpMoney,
            public: game.analysis.publicBetting,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching sharp money data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-white/5 rounded-xl p-4">
        <div className="h-4 bg-white/10 rounded w-1/3 mb-2" />
        <div className="h-20 bg-white/10 rounded" />
      </div>
    );
  }

  if (!data) return null;

  const { sharp, public: publicData } = data;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl overflow-hidden border border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🦈</span>
          <h3 className="font-bold text-white">Sharp Money Analysis</h3>
        </div>
        {sharp.steamMove && (
          <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full animate-pulse">
            🔥 STEAM MOVE
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Public vs Money Split */}
        <div>
          <div className="text-xs text-white/50 mb-2">PUBLIC BETTING vs MONEY</div>
          <div className="grid grid-cols-2 gap-4">
            {/* Spread */}
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-xs text-white/40 mb-2">SPREAD</div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-white">{awayTeam}</span>
                <span className="text-sm font-mono text-white">{publicData.spreadPublic.away}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                  style={{ width: `${publicData.spreadPublic.away}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-white">{homeTeam}</span>
                <span className="text-sm font-mono text-white">{publicData.spreadPublic.home}%</span>
              </div>
            </div>

            {/* Moneyline */}
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-xs text-white/40 mb-2">MONEYLINE</div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-white">{awayTeam}</span>
                <span className="text-sm font-mono text-white">{publicData.moneylinePublic.away}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                  style={{ width: `${publicData.moneylinePublic.away}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-white">{homeTeam}</span>
                <span className="text-sm font-mono text-white">{publicData.moneylinePublic.home}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sharp Money Confidence */}
        {sharp.sharpSide && (
          <div className={`rounded-xl p-4 ${
            sharp.confidence > 70 ? 'bg-emerald-500/20 border border-emerald-500/30' :
            sharp.confidence > 40 ? 'bg-yellow-500/20 border border-yellow-500/30' :
            'bg-white/5 border border-white/10'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-white">Sharp Side</span>
              <span className={`text-2xl font-black ${
                sharp.confidence > 70 ? 'text-emerald-400' :
                sharp.confidence > 40 ? 'text-yellow-400' :
                'text-white/60'
              }`}>
                {sharp.confidence}%
              </span>
            </div>
            <div className="text-lg font-bold text-white mb-2">
              {sharp.sharpSide === 'home' ? homeTeam : 
               sharp.sharpSide === 'away' ? awayTeam :
               sharp.sharpSide === 'over' ? 'Over' : 'Under'}
            </div>
            <div className="flex gap-2 flex-wrap">
              {sharp.reverseLineMove && (
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                  ↩️ Reverse Line
                </span>
              )}
              {sharp.steamMove && (
                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                  🔥 Steam
                </span>
              )}
            </div>
          </div>
        )}

        {/* Indicators */}
        {sharp.indicators.length > 0 && (
          <div>
            <div className="text-xs text-white/50 mb-2">INDICATORS</div>
            <div className="space-y-2">
              {sharp.indicators.map((indicator, i) => (
                <div 
                  key={i}
                  className="flex items-start gap-2 text-sm text-white/70"
                >
                  <span className="text-emerald-400">•</span>
                  {indicator}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ticket Count */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/50">Total Tickets</span>
          <span className="text-white font-mono">
            {publicData.ticketCount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-white/5 text-center">
        <p className="text-xs text-white/40">
          💡 Sharp money = Professional bettors. Follow the money, not the public.
        </p>
      </div>
    </div>
  );
}

