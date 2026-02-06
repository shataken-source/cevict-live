'use client';

import { useState, useEffect } from 'react';
import { Shield, Package, BarChart3, Users } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        // Load basic stats
        const [productsRes, lawsRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/laws'),
        ]);

        const productsData = await productsRes.json();
        const lawsData = await lawsRes.json();

        setStats({
          products: productsData.products?.length || 0,
          laws: lawsData.laws?.length || 0,
        });
      } catch (e) {
        console.error('Failed to load stats:', e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-950 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-red-600 rounded-xl flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-400">Manage SmokersRights platform</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-red-400 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-300">Loading...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <Package className="w-8 h-8 text-blue-400" />
                <span className="text-3xl font-bold text-white">{stats?.products || 0}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-400">Products</h3>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <BarChart3 className="w-8 h-8 text-purple-400" />
                <span className="text-3xl font-bold text-white">{stats?.laws || 0}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-400">Laws Tracked</h3>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Link
            href="/admin/products"
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all"
          >
            <Package className="w-8 h-8 text-blue-400 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Manage Products</h2>
            <p className="text-gray-400">Add, edit, or remove marketplace products</p>
          </Link>

          <Link
            href="/admin/analytics"
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all"
          >
            <BarChart3 className="w-8 h-8 text-purple-400 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Analytics</h2>
            <p className="text-gray-400">View platform statistics and metrics</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
