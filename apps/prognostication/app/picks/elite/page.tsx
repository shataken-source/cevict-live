'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Pick {
  id: string;
  sport: string;
  league: string;
  home_team: string;
  away_team: string;
  pick: string;
  pick_type: string;
  confidence: number;
  odds: number;
  edge: number;
  expected_value: number;
  game_time: string;
  mc_predicted_score?: { home: number; away: number };
  analysis: string[];
  reasoning: string[];
  is_favorite_pick: boolean;
  value_bet_edge: number;
  triple_align: boolean;
}

export default function ElitePicksPage() {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPicks() {
      try {
        const response = await fetch('/api/picks/today', { cache: 'no-store' });
        const data = await response.json();
        
        if (data.success) {
          // Filter for Elite tier (confidence >= 80)
          const elitePicks = data.picks
            .filter((p: Pick) => p.confidence >= 80)
            .slice(0, 5);
          setPicks(elitePicks);
        } else {
          setError('Failed to load picks');
        }
      } catch (e) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    }

    fetchPicks();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading Elite picks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-md border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-white">
            <span className="text-purple-400">ELITE</span>
            <span className="text-slate-400 ml-2">PICKS</span>
          </Link>
          <nav className="flex gap-4">
            <Link href="/picks/pro" className="text-slate-300 hover:text-blue-400 transition">Pro</Link>
            <Link href="/picks/free" className="text-slate-300 hover:text-emerald-400 transition">Free</Link>
            <Link href="/pricing" className="text-slate-300 hover:text-purple-400 transition">Upgrade</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-2 bg-purple-500/20 border border-purple-500 rounded-full mb-4">
            <span className="text-purple-400 font-semibold">ELITE TIER</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Maximum Confidence Picks
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Our highest-confidence predictions (80%+) with triple alignment and maximum edge.
          </p>
          <p className="text-purple-400 mt-4 font-semibold">
            {picks.length} Elite picks available today
          </p>
        </div>

        {/* Picks Grid */}
        <div className="grid gap-6">
          {picks.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-400 text-xl mb-4">No Elite picks available today.</p>
              <p className="text-slate-500">Check back tomorrow or browse Pro picks.</p>
            </div>
          ) : (
            picks.map((pick, index) => (
              <div key={pick.id} className="bg-slate-800/50 backdrop-blur rounded-xl border-2 border-purple-500/50 p-6 hover:border-purple-400 transition-all shadow-lg shadow-purple-500/10">
                {/* Badge */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 bg-purple-500 text-white rounded-full text-sm font-bold">
                    #{index + 1} ELITE
                  </span>
                  {pick.triple_align && (
                    <span className="px-3 py-1 bg-amber-500 text-black rounded-full text-sm font-bold">
                      ⚡ TRIPLE ALIGN
                    </span>
                  )}
                  <span className="px-3 py-1 bg-slate-700 rounded-full text-sm text-slate-300">
                    {pick.sport}
                  </span>
                </div>

                {/* Teams */}
                <h2 className="text-2xl font-bold text-white mb-2">
                  {pick.away_team} @ {pick.home_team}
                </h2>
                <p className="text-slate-400 mb-4">
                  {new Date(pick.game_time).toLocaleString()}
                </p>

                {/* Pick Info */}
                <div className="grid md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-sm text-slate-400 mb-1">PICK</p>
                    <p className="text-xl font-bold text-purple-400">{pick.pick}</p>
                    <p className="text-sm text-slate-400">{pick.pick_type}</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-sm text-slate-400 mb-1">CONFIDENCE</p>
                    <p className="text-3xl font-bold text-emerald-400">{pick.confidence}%</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-sm text-slate-400 mb-1">EDGE</p>
                    <p className="text-3xl font-bold text-blue-400">{pick.edge}%</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-sm text-slate-400 mb-1">EV</p>
                    <p className="text-3xl font-bold text-amber-400">+${pick.expected_value}</p>
                  </div>
                </div>

                {/* Predicted Score */}
                {pick.mc_predicted_score && (
                  <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
                    <p className="text-sm text-slate-400 mb-2">PROJECTED SCORE</p>
                    <p className="text-2xl font-bold text-white">
                      {pick.mc_predicted_score.away} - {pick.mc_predicted_score.home}
                    </p>
                  </div>
                )}

                {/* Analysis */}
                {pick.reasoning && pick.reasoning.length > 0 && (
                  <div className="border-t border-slate-700 pt-4">
                    <p className="text-sm text-slate-400 mb-2">KEY FACTORS</p>
                    <ul className="space-y-2">
                      {pick.reasoning.map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-300">
                          <span className="text-purple-400 mt-1">▸</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link href="/picks/pro" className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition">
            View Pro Picks →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <p className="text-slate-500">
            © 2026 Progno Elite. Premium sports intelligence.
          </p>
        </div>
      </footer>
    </div>
  );
}
