'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminDashboardNew() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cacheClearing, setCacheClearing] = useState(false);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/admin/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (e) {
        console.error('Failed to load stats:', e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const handleClearCache = async () => {
    setCacheClearing(true);
    try {
      await fetch('/api/admin/clear-cache', { method: 'POST' });
      alert('Cache cleared successfully');
    } catch (e) {
      alert('Failed to clear cache');
    } finally {
      setCacheClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <div className="flex gap-3">
            <button
              onClick={handleClearCache}
              disabled={cacheClearing}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {cacheClearing ? 'Clearing...' : '🗑️ Clear Cache'}
            </button>
            <Link href="/api/admin/reports" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
              📊 Reports
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-indigo-300">Loading...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* System Status */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">System Status</h2>
              <div className="space-y-3 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Progno: {stats?.prognoConnected ? 'Connected' : 'Disconnected'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Database: {stats?.database ? 'Connected' : 'Disconnected'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  7D Claude: Operational
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Monte Carlo: Active
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Today's Stats</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{stats?.todayPicks || 0}</p>
                  <p className="text-sm text-gray-400">Picks</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-400">{stats?.activeUsers || 0}</p>
                  <p className="text-sm text-gray-400">Active Users</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-400">{stats?.winRate || 0}%</p>
                  <p className="text-sm text-gray-400">Win Rate</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-400">${stats?.revenue || 0}</p>
                  <p className="text-sm text-gray-400">Revenue</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Navigation</h2>
              <div className="space-y-2">
                <a href="/picks/elite" className="block text-indigo-400 hover:text-indigo-300 py-1">
                  Elite Picks →
                </a>
                <a href="/picks/pro" className="block text-indigo-400 hover:text-indigo-300 py-1">
                  Pro Picks →
                </a>
                <a href="/picks/free" className="block text-indigo-400 hover:text-indigo-300 py-1">
                  Free Picks →
                </a>
                <a href="/accuracy" className="block text-indigo-400 hover:text-indigo-300 py-1">
                  Accuracy Reports →
                </a>
                <a href="/pricing" className="block text-indigo-400 hover:text-indigo-300 py-1">
                  Pricing Page →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
