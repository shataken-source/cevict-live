'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Pick {
  id: string;
  sport: string;
  home_team: string;
  away_team: string;
  pick: string;
  confidence: number;
  odds: number;
  game_time: string;
}

export default function FreePicksPage() {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPicks() {
      try {
        const response = await fetch('/api/picks/today', { cache: 'no-store' });
        const data = await response.json();

        if (data.success) {
          const freePicks = data.picks
            .filter((p: Pick) => p.confidence < 65)
            .slice(0, 2);
          setPicks(freePicks);
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
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-400"></div>
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
            <span className="text-emerald-400">FREE</span>
            <span className="text-slate-400 ml-2">PICKS</span>
          </Link>
          <nav className="flex gap-4">
            <Link href="/picks/pro" className="text-slate-300 hover:text-blue-400 transition">Pro</Link>
            <Link href="/picks/elite" className="text-slate-300 hover:text-purple-400 transition">Elite</Link>
            <Link href="/pricing" className="text-slate-300 hover:text-emerald-400 transition">Upgrade</Link>
          </nav>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-2 bg-emerald-500/20 border border-emerald-500 rounded-full mb-4">
            <span className="text-emerald-400 font-semibold">FREE TIER</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Daily Free Picks</h1>
          <p className="text-slate-400 mb-4">Sample our predictions with 2 free picks daily.</p>
          <Link href="/pricing" className="text-emerald-400 hover:underline">
            Upgrade for 10x more picks →
          </Link>
        </div>

        <div className="grid gap-6 max-w-2xl mx-auto">
          {picks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400">No free picks available. Check back tomorrow!</p>
            </div>
          ) : (
            picks.map((pick) => (
              <div key={pick.id} className="bg-slate-800/50 rounded-xl border border-emerald-500/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-sm">FREE</span>
                  <span className="text-slate-400">{pick.sport}</span>
                </div>
                <h2 className="text-xl font-bold text-white">{pick.away_team} @ {pick.home_team}</h2>
                <p className="text-slate-400 mt-2">{new Date(pick.game_time).toLocaleString()}</p>
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-sm text-slate-400">Our Pick</p>
                  <p className="text-2xl font-bold text-emerald-400">{pick.pick}</p>
                  <p className="text-sm text-slate-400 mt-2">Confidence: {pick.confidence}%</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Upgrade CTA */}
        <div className="mt-16 text-center bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-8 border border-blue-500/30">
          <h3 className="text-2xl font-bold text-white mb-2">Want More Picks?</h3>
          <p className="text-slate-400 mb-6">Upgrade to Pro for 5 picks/day or Elite for 10 picks/day.</p>
          <Link href="/pricing" className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition">
            View Pricing
          </Link>
        </div>
      </section>
    </div>
  );
}
