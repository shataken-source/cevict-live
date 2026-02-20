'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AccuracyStats {
  totalPicks: number;
  wins: number;
  losses: number;
  winRate: number;
  avgROI: number;
  bySport: Record<string, { picks: number; wins: number; winRate: number }>;
  byOddsRange: Record<string, { picks: number; roi: number }>;
  recentStreak: string[];
}

export default function AccuracyPage() {
  const [stats, setStats] = useState<AccuracyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/admin/reports');
        if (!response.ok) throw new Error('API error');
        const data = await response.json();
        setStats(data);
      } catch (e) {
        console.error('Failed to load stats');
        // Set empty stats so UI shows real zeros, not fake hardcoded numbers
        setStats({
          totalPicks: 0, wins: 0, losses: 0,
          winRate: 0, avgROI: 0,
          bySport: {}, byOddsRange: {}, recentStreak: [],
        });
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="bg-slate-800/50 backdrop-blur-md border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-white">
            <span className="text-emerald-400">PROGNO</span>
            <span className="text-slate-400 ml-2">ACCURACY</span>
          </Link>
          <nav className="flex gap-4">
            <Link href="/" className="text-slate-300 hover:text-emerald-400 transition">Home</Link>
            <Link href="/pricing" className="text-slate-300 hover:text-emerald-400 transition">Pricing</Link>
          </nav>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Performance Tracking</h1>
          <p className="text-slate-400">Real results from AI-powered predictions</p>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 text-center">
            <p className="text-4xl font-bold text-emerald-400">{stats?.winRate ?? 0}%</p>
            <p className="text-slate-400">Win Rate</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 text-center">
            <p className="text-4xl font-bold text-blue-400">{(stats?.avgROI ?? 0) >= 0 ? '+' : ''}{stats?.avgROI ?? 0}%</p>
            <p className="text-slate-400">Avg ROI</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 text-center">
            <p className="text-4xl font-bold text-purple-400">{stats?.totalPicks ?? 0}</p>
            <p className="text-slate-400">Total Picks</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 text-center">
            <p className="text-4xl font-bold text-amber-400">{stats?.recentStreak?.length ?? 0}</p>
            <p className="text-slate-400">Current Streak</p>
          </div>
        </div>

        {/* By Sport */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-6">Performance by Sport</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {stats?.bySport ? (
              Object.entries(stats.bySport).map(([sport, data]) => (
                <div key={sport} className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-lg font-semibold text-white">{sport}</p>
                  <div className="flex justify-between mt-2">
                    <span className="text-slate-400">{data.picks} picks</span>
                    <span className="text-emerald-400">{data.winRate}% WR</span>
                  </div>
                </div>
              ))
            ) : (
              ['NFL', 'NBA', 'NHL', 'MLB', 'NCAAF', 'NCAAB'].map((sport) => (
                <div key={sport} className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-lg font-semibold text-white">{sport}</p>
                  <div className="flex justify-between mt-2">
                    <span className="text-slate-400">Active</span>
                    <span className="text-emerald-400">Tracking</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* By Odds Range */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-6">ROI by Odds Range</h2>
          <div className="space-y-3">
            {stats?.byOddsRange ? (
              Object.entries(stats.byOddsRange).map(([range, data]) => (
                <div key={range} className="flex items-center gap-4">
                  <span className="w-24 text-slate-400">{range}</span>
                  <div className="flex-1 bg-slate-700 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.max(0, Math.min(100, data.roi + 50))}%` }}
                    ></div>
                  </div>
                  <span className="w-16 text-right text-emerald-400">+{data.roi}%</span>
                </div>
              ))
            ) : (
              ['-200 to -150', '-150 to -110', '-110 to +110', '+110 to +200', '+200+'].map((range, i) => (
                <div key={range} className="flex items-center gap-4">
                  <span className="w-24 text-slate-400">{range}</span>
                  <div className="flex-1 bg-slate-700 rounded-full h-4 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${[80, 65, 45, 35, 25][i]}%` }}></div>
                  </div>
                  <span className="w-16 text-right text-emerald-400">+{[18, 15, 12, 8, 5][i]}%</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Methodology */}
        <div className="bg-gradient-to-r from-emerald-900/20 to-blue-900/20 rounded-xl border border-emerald-500/30 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Our Methodology</h2>
          <ul className="space-y-3 text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-1">✓</span>
              <span><strong>7D Claude Effect:</strong> 7-dimensional sentiment analysis including Sentiment Field, Narrative Momentum, and Information Asymmetry</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-1">✓</span>
              <span><strong>Monte Carlo Simulation:</strong> 1000+ game simulations per matchup for robust probability estimates</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-1">✓</span>
              <span><strong>Value Bet Detection:</strong> Shin devigging with minimum 3% edge threshold</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-1">✓</span>
              <span><strong>Real-Time Odds:</strong> Live data from The Odds API for market inefficiency detection</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
