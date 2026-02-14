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
}

export default function ProPicksPage() {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPicks() {
      try {
        const response = await fetch('/api/picks/today', { cache: 'no-store' });
        const data = await response.json();
        
        if (data.success) {
          const proPicks = data.picks
            .filter((p: Pick) => p.confidence >= 65 && p.confidence < 80)
            .slice(0, 5);
          setPicks(proPicks);
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
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="bg-slate-800/50 backdrop-blur-md border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-white">
            <span className="text-blue-400">PRO</span>
            <span className="text-slate-400 ml-2">PICKS</span>
          </Link>
          <nav className="flex gap-4">
            <Link href="/picks/elite" className="text-slate-300 hover:text-purple-400 transition">Elite</Link>
            <Link href="/picks/free" className="text-slate-300 hover:text-emerald-400 transition">Free</Link>
            <Link href="/pricing" className="text-slate-300 hover:text-blue-400 transition">Pricing</Link>
          </nav>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-2 bg-blue-500/20 border border-blue-500 rounded-full mb-4">
            <span className="text-blue-400 font-semibold">PRO TIER</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Professional Picks</h1>
          <p className="text-slate-400">High-confidence predictions (65-79%) with strong edge.</p>
          <p className="text-blue-400 mt-4 font-semibold">{picks.length} Pro picks today</p>
        </div>

        <div className="grid gap-6">
          {picks.map((pick) => (
            <div key={pick.id} className="bg-slate-800/50 rounded-xl border border-blue-500/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-bold">PRO</span>
                <span className="text-slate-400">{pick.sport}</span>
              </div>
              <h2 className="text-xl font-bold text-white">{pick.away_team} @ {pick.home_team}</h2>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <p className="text-sm text-slate-400">Confidence</p>
                  <p className="text-2xl font-bold text-emerald-400">{pick.confidence}%</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Edge</p>
                  <p className="text-2xl font-bold text-blue-400">{pick.edge}%</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Pick</p>
                  <p className="text-lg font-bold text-white">{pick.pick}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
