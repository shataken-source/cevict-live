'use client';

import { useState, useEffect } from 'react';

export default function AdminDashboardNew() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Admin Dashboard</h1>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-indigo-300">Loading...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">System Status</h2>
              <div className="space-y-2 text-sm text-gray-400">
                <div>Progno Connection: {stats?.prognoConnected ? '✅ Connected' : '❌ Disconnected'}</div>
                <div>Database: {stats?.database ? '✅ Connected' : '❌ Disconnected'}</div>
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <a href="/admin/picks" className="block text-indigo-400 hover:text-indigo-300">
                  View Picks →
                </a>
                <a href="/admin/performance" className="block text-indigo-400 hover:text-indigo-300">
                  Performance →
                </a>
                <a href="/admin/users" className="block text-indigo-400 hover:text-indigo-300">
                  Users →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
