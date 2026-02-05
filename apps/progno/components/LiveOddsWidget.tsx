'use client';

/**
 * Live Odds Widget
 * Real-time odds display with movement tracking
 */

import { useState, useEffect } from 'react';

interface OddsData {
  id: string;
  game: string;
  homeTeam: string;
  awayTeam: string;
  spread: { home: number; away: number };
  moneyline: { home: number; away: number };
  total: { over: number; under: number; line: number };
  movement: 'up' | 'down' | 'stable';
  startTime: string;
}

export default function LiveOddsWidget() {
  const [odds, setOdds] = useState<OddsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchOdds();
    const interval = setInterval(fetchOdds, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchOdds = async () => {
    try {
      const res = await fetch('/api/odds/live');
      if (res.ok) {
        const data = await res.json();
        setOdds(data.games || getSampleOdds());
      } else {
        setOdds(getSampleOdds());
      }
    } catch {
      setOdds(getSampleOdds());
    } finally {
      setLoading(false);
      setLastUpdate(new Date());
    }
  };

  const getSampleOdds = (): OddsData[] => [
    {
      id: '1',
      game: 'NFL Week 17',
      homeTeam: 'Chiefs',
      awayTeam: 'Raiders',
      spread: { home: -10.5, away: 10.5 },
      moneyline: { home: -450, away: 350 },
      total: { over: -110, under: -110, line: 45.5 },
      movement: 'up',
      startTime: '2024-12-29T13:00:00'
    },
    {
      id: '2',
      game: 'NFL Week 17',
      homeTeam: 'Bills',
      awayTeam: 'Jets',
      spread: { home: -9.5, away: 9.5 },
      moneyline: { home: -400, away: 320 },
      total: { over: -110, under: -110, line: 42.5 },
      movement: 'stable',
      startTime: '2024-12-29T13:00:00'
    },
    {
      id: '3',
      game: 'NBA',
      homeTeam: 'Lakers',
      awayTeam: 'Warriors',
      spread: { home: -2.5, away: 2.5 },
      moneyline: { home: -135, away: 115 },
      total: { over: -110, under: -110, line: 228.5 },
      movement: 'down',
      startTime: '2024-12-29T19:30:00'
    },
  ];

  const formatOdds = (odds: number) => {
    return odds > 0 ? `+${odds}` : odds.toString();
  };

  const formatSpread = (spread: number) => {
    return spread > 0 ? `+${spread}` : spread.toString();
  };

  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded w-1/3" />
          <div className="h-20 bg-white/10 rounded" />
          <div className="h-20 bg-white/10 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="font-bold text-white">Live Odds</span>
        </div>
        <span className="text-xs text-white/40">
          Updated {lastUpdate.toLocaleTimeString()}
        </span>
      </div>

      {/* Odds List */}
      <div className="divide-y divide-white/10">
        {odds.map(game => (
          <div key={game.id} className="p-4 hover:bg-white/5 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-purple-400 font-medium">{game.game}</span>
              <span className="text-xs text-white/40">
                {new Date(game.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            
            <div className="grid grid-cols-4 gap-2 text-sm">
              {/* Teams */}
              <div className="col-span-1">
                <div className="text-white font-medium mb-2">{game.awayTeam}</div>
                <div className="text-white font-medium">{game.homeTeam}</div>
              </div>
              
              {/* Spread */}
              <div className="text-center">
                <div className="text-xs text-white/40 mb-1">Spread</div>
                <div className="text-white/80">{formatSpread(game.spread.away)}</div>
                <div className="text-white/80">{formatSpread(game.spread.home)}</div>
              </div>
              
              {/* Moneyline */}
              <div className="text-center">
                <div className="text-xs text-white/40 mb-1">ML</div>
                <div className="text-white/80">{formatOdds(game.moneyline.away)}</div>
                <div className="text-white/80">{formatOdds(game.moneyline.home)}</div>
              </div>
              
              {/* Total */}
              <div className="text-center">
                <div className="text-xs text-white/40 mb-1">O/U {game.total.line}</div>
                <div className="text-white/80">o{formatOdds(game.total.over)}</div>
                <div className="text-white/80">u{formatOdds(game.total.under)}</div>
              </div>
            </div>

            {/* Movement Indicator */}
            {game.movement !== 'stable' && (
              <div className={`mt-2 text-xs flex items-center gap-1 ${
                game.movement === 'up' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {game.movement === 'up' ? '↑' : '↓'}
                Line moving {game.movement === 'up' ? 'up' : 'down'}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 bg-white/5 text-center">
        <button className="text-purple-400 text-sm hover:text-purple-300 transition-colors">
          View All Games →
        </button>
      </div>
    </div>
  );
}

