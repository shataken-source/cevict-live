'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  starting_bankroll: number;
  current_bankroll: number;
  total_profit_loss: number;
  roi: number;
  total_picks: number;
  wins: number;
  losses: number;
  pending: number;
  win_rate: number;
  sharpe_ratio?: number;
  max_drawdown?: number;
  is_public: boolean;
  strategy_description?: string;
  created_at: string;
  updated_at: string;
}

interface PortfolioPick {
  id: string;
  game_title: string;
  league: string;
  pick_type: string;
  pick_side: string;
  odds: number;
  stake: number;
  status: string;
  pnl?: number;
  placed_at: string;
}

interface Snapshot {
  snapshot_date: string;
  bankroll: number;
  total_picks: number;
  wins: number;
  losses: number;
  profit_loss: number;
  roi: number;
}

export default function PickPortfolioPage() {
  const [leaderboard, setLeaderboard] = useState<Portfolio[]>([]);
  const [myPortfolios, setMyPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [picks, setPicks] = useState<PortfolioPick[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [userIdQuery, setUserIdQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingPicks, setLoadingPicks] = useState(false);

  useEffect(() => {
    fetch('/api/progno/portfolio/leaderboard?limit=20')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setLeaderboard(data.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!userIdQuery.trim()) {
      setMyPortfolios([]);
      return;
    }
    setLoading(true);
    fetch(`/api/progno/portfolio?userId=${encodeURIComponent(userIdQuery)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setMyPortfolios(data.data || []);
        else setMyPortfolios([]);
      })
      .finally(() => setLoading(false));
  }, [userIdQuery]);

  useEffect(() => {
    if (!selectedPortfolio) {
      setPicks([]);
      setSnapshots([]);
      return;
    }
    setLoadingPicks(true);
    Promise.all([
      fetch(`/api/progno/portfolio/picks?portfolioId=${selectedPortfolio.id}&limit=50`).then((r) => r.json()),
      fetch(`/api/progno/portfolio/${selectedPortfolio.id}/snapshots?daysBack=30`).then((r) => r.json()),
    ])
      .then(([picksRes, snapRes]) => {
        if (picksRes.success) setPicks(picksRes.data || []);
        if (snapRes.success) setSnapshots(snapRes.data || []);
      })
      .finally(() => setLoadingPicks(false));
  }, [selectedPortfolio?.id]);

  const portfoliosToShow = userIdQuery.trim() ? myPortfolios : leaderboard;
  const showLeaderboard = !userIdQuery.trim();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pick Portfolio</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Track picks like a portfolio · ROI, performance, leaderboard
            </p>
          </div>
          <Link href="/progno" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Back to Progno
          </Link>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-600 dark:text-slate-400">View my portfolios (userId):</label>
          <input
            type="text"
            value={userIdQuery}
            onChange={(e) => setUserIdQuery(e.target.value)}
            placeholder="e.g. user-uuid"
            className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-1.5 text-sm w-64"
            aria-label="User ID to load portfolios"
          />
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center text-slate-500">
            Loading…
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
              <h2 className="px-4 py-3 font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700">
                {showLeaderboard ? 'Leaderboard (public, 10+ picks)' : 'My portfolios'}
              </h2>
              <ul className="divide-y divide-slate-200 dark:divide-slate-700 max-h-96 overflow-y-auto">
                {portfoliosToShow.length === 0 ? (
                  <li className="px-4 py-6 text-slate-500 text-sm">
                    {showLeaderboard ? 'No public portfolios yet.' : 'No portfolios for this user.'}
                  </li>
                ) : (
                  portfoliosToShow.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedPortfolio(p)}
                        className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex flex-wrap items-center justify-between gap-2 ${
                          selectedPortfolio?.id === p.id ? 'bg-slate-100 dark:bg-slate-700' : ''
                        }`}
                      >
                        <span className="font-medium text-slate-900 dark:text-white truncate">{p.name}</span>
                        <span className={`text-sm font-medium ${p.roi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          ROI {p.roi >= 0 ? '+' : ''}{(p.roi * 100).toFixed(1)}%
                        </span>
                        <span className="text-xs text-slate-500 w-full">
                          {p.wins}W / {p.losses}L · ${p.current_bankroll?.toFixed(0) ?? '-'} bankroll
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
              <h2 className="px-4 py-3 font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700">
                {selectedPortfolio ? selectedPortfolio.name : 'Select a portfolio'}
              </h2>
              {!selectedPortfolio ? (
                <p className="p-6 text-slate-500 text-sm">Select a portfolio from the list to see picks and performance.</p>
              ) : loadingPicks ? (
                <p className="p-6 text-slate-500 text-sm">Loading…</p>
              ) : (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <p className="text-slate-500">P&L</p>
                      <p className={`font-semibold ${selectedPortfolio.total_profit_loss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        ${selectedPortfolio.total_profit_loss >= 0 ? '+' : ''}{selectedPortfolio.total_profit_loss?.toFixed(2) ?? '0'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Win rate</p>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {((selectedPortfolio.win_rate ?? 0) * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Picks</p>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {selectedPortfolio.total_picks ?? 0} ({selectedPortfolio.pending ?? 0} pending)
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Bankroll</p>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        ${selectedPortfolio.current_bankroll?.toFixed(0) ?? '-'}
                      </p>
                    </div>
                  </div>

                  {snapshots.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Last 30 days (snapshots)</p>
                      <div className="overflow-x-auto max-h-48 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-500 border-b border-slate-200 dark:border-slate-700">
                              <th className="text-left py-1">Date</th>
                              <th className="text-right py-1">Bankroll</th>
                              <th className="text-right py-1">P&L</th>
                              <th className="text-right py-1">ROI</th>
                            </tr>
                          </thead>
                          <tbody>
                            {snapshots.slice(-14).map((s, i) => (
                              <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
                                <td className="py-1">{new Date(s.snapshot_date).toLocaleDateString()}</td>
                                <td className="text-right">${s.bankroll.toFixed(0)}</td>
                                <td className={`text-right ${s.profit_loss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  ${s.profit_loss >= 0 ? '+' : ''}{s.profit_loss.toFixed(0)}
                                </td>
                                <td className="text-right">{(s.roi * 100).toFixed(1)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Recent picks</p>
                    {picks.length === 0 ? (
                      <p className="text-slate-500 text-sm">No picks yet.</p>
                    ) : (
                      <ul className="divide-y divide-slate-200 dark:divide-slate-700 max-h-48 overflow-y-auto">
                        {picks.slice(0, 15).map((pick) => (
                          <li key={pick.id} className="py-2 text-sm flex flex-wrap justify-between gap-1">
                            <span className="text-slate-900 dark:text-white truncate">{pick.game_title}</span>
                            <span className="text-slate-500">{pick.pick_side} · {pick.status}</span>
                            {pick.pnl != null && (
                              <span className={pick.pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                ${pick.pnl >= 0 ? '+' : ''}{pick.pnl.toFixed(2)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
