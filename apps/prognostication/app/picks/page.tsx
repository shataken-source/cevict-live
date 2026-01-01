'use client';

import BannerPlaceholder from '@/components/BannerPlaceholder';
import { useState, useEffect } from 'react';

const CATEGORIES = [
  { id: 'all', name: 'All Markets', icon: '🎯', color: 'from-indigo-500 to-purple-600' },
  { id: 'politics', name: 'Politics', icon: '🗳️', color: 'from-red-500 to-rose-600' },
  { id: 'economics', name: 'Economics', icon: '📈', color: 'from-green-500 to-emerald-600' },
  { id: 'weather', name: 'Weather', icon: '🌡️', color: 'from-cyan-500 to-blue-600' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: 'from-purple-500 to-pink-600' },
  { id: 'crypto', name: 'Crypto', icon: '🪙', color: 'from-amber-500 to-orange-600' },
  { id: 'world', name: 'World Events', icon: '🌍', color: 'from-indigo-500 to-violet-600' },
];

interface KalshiPick {
  id: string;
  market: string;
  category: string;
  pick: 'YES' | 'NO';
  probability: number;
  edge: number;
  marketPrice: number;
  expires: string;
  reasoning: string;
  confidence: number;
  historicalPattern?: string;
}

interface PicksResponse {
  success: boolean;
  picks: KalshiPick[];
  stats: {
    avgEdge: number;
    avgConfidence: number;
    yesPicks: number;
    noPicks: number;
  };
}

export default function PicksPage() {
  const [picks, setPicks] = useState<KalshiPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [stats, setStats] = useState<PicksResponse['stats'] | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    async function loadPicks(isInitial = false) {
      if (isInitial) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      try {
        const res = await fetch(`/api/kalshi/picks?category=${activeCategory}&limit=20`);
        if (res.ok) {
          const data: PicksResponse = await res.json();
          setPicks(data.picks);
          setStats(data.stats);
          setLastUpdated(new Date());
        }
      } catch (e) {
        console.warn('Failed to load picks:', e);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
    
    // Load immediately (initial load)
    loadPicks(true);
    
    // Then refresh every 60 seconds (matching bot update frequency)
    const interval = setInterval(() => loadPicks(false), 60000);
    
    return () => clearInterval(interval);
  }, [activeCategory]);

  const getCategoryInfo = (categoryId: string) => {
    return CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header Banner */}
      <BannerPlaceholder position="header" adSlot="1234567890" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-indigo-500/30">
              🎯
            </div>
            <span className="text-3xl font-black text-white">PROGNOSTICATION</span>
          </a>

          <h1 className="text-4xl font-bold text-white mb-4">Kalshi Picks</h1>
          <p className="text-indigo-300 max-w-2xl mx-auto mb-2">
            AI-analyzed prediction market opportunities. Updated every 60 seconds with edge calculations and historical pattern matching.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm">
            {isRefreshing && (
              <span className="inline-flex items-center gap-2 text-green-400">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Updating...
              </span>
            )}
            {lastUpdated && !isRefreshing && (
              <span className="text-gray-400">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            {!lastUpdated && !loading && (
              <span className="text-gray-500">Loading...</span>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="bg-white/5 border border-white/10 rounded-xl px-6 py-3 text-center">
              <div className="text-2xl font-bold text-green-400">+{stats.avgEdge.toFixed(1)}%</div>
              <div className="text-sm text-gray-400">Avg Edge</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-6 py-3 text-center">
              <div className="text-2xl font-bold text-indigo-400">{stats.avgConfidence.toFixed(0)}%</div>
              <div className="text-sm text-gray-400">Avg Confidence</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-6 py-3 text-center">
              <div className="text-2xl font-bold text-white">{picks.length}</div>
              <div className="text-sm text-gray-400">Active Picks</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-6 py-3 text-center">
              <div className="text-2xl font-bold text-amber-400">{stats.yesPicks}/{stats.noPicks}</div>
              <div className="text-sm text-gray-400">YES/NO</div>
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                activeCategory === cat.id
                  ? `bg-gradient-to-r ${cat.color} text-white shadow-lg`
                  : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              <span>{cat.icon}</span>
              <span className="hidden sm:inline">{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Picks Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-indigo-300 text-lg">Loading picks...</p>
          </div>
        ) : picks.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-xl text-indigo-300 mb-2">No picks in this category</p>
            <p className="text-gray-400">Try selecting a different category or check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {picks.map((pick, i) => {
              const category = getCategoryInfo(pick.category);
              return (
                <div
                  key={pick.id}
                  className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden hover:border-white/30 transition-all group"
                >
                  {/* Header */}
                  <div className={`bg-gradient-to-r ${category.color} px-5 py-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{category.icon}</span>
                      <span className="font-semibold text-white">{category.name}</span>
                    </div>
                    <div className={`px-3 py-1 rounded-full font-bold text-sm ${
                      pick.pick === 'YES'
                        ? 'bg-green-500/30 text-green-200'
                        : 'bg-red-500/30 text-red-200'
                    }`}>
                      {pick.pick}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="text-white font-semibold text-lg mb-4 group-hover:text-indigo-300 transition-colors">
                      {pick.market}
                    </h3>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <div className="text-center p-2 bg-white/5 rounded-lg">
                        <div className="text-lg font-bold text-white">{pick.probability}%</div>
                        <div className="text-xs text-gray-500">Our Prob</div>
                      </div>
                      <div className="text-center p-2 bg-white/5 rounded-lg">
                        <div className="text-lg font-bold text-indigo-400">{pick.marketPrice}¢</div>
                        <div className="text-xs text-gray-500">Market</div>
                      </div>
                      <div className="text-center p-2 bg-green-500/10 rounded-lg">
                        <div className="text-lg font-bold text-green-400">+{pick.edge}%</div>
                        <div className="text-xs text-gray-500">Edge</div>
                      </div>
                      <div className="text-center p-2 bg-white/5 rounded-lg">
                        <div className="text-lg font-bold text-amber-400">{pick.confidence}%</div>
                        <div className="text-xs text-gray-500">Conf</div>
                      </div>
                    </div>

                    {/* Reasoning */}
                    <div className="mb-3">
                      <p className="text-sm text-gray-400">
                        💡 <span className="italic">{pick.reasoning}</span>
                      </p>
                    </div>

                    {/* Historical Pattern */}
                    {pick.historicalPattern && (
                      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3">
                        <p className="text-xs text-indigo-300">
                          📚 <span className="font-medium">Historical:</span> {pick.historicalPattern}
                        </p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                      <span className="text-xs text-gray-500">
                        ID: {pick.id}
                      </span>
                      <span className="text-xs text-gray-500">
                        Expires: {new Date(pick.expires).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* In-Content Banner */}
        <div className="my-8">
          <BannerPlaceholder position="in-content" adSlot="1234567891" />
        </div>

        {/* CTA */}
        <div className="text-center mt-12 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-3xl p-8 border border-indigo-500/20">
          <h2 className="text-2xl font-bold text-white mb-4">Want More Picks?</h2>
          <p className="text-indigo-300 mb-6 max-w-xl mx-auto">
            Upgrade to Pro or Elite for unlimited picks, SMS alerts, and exclusive analysis across all market categories.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-8 py-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg"
            >
              View Pricing
              <span>→</span>
            </a>
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-4 rounded-xl border border-white/20 transition-all"
            >
              Back to Home
            </a>
          </div>
        </div>
      </div>

      {/* Footer Banner */}
      <BannerPlaceholder position="footer" adSlot="1234567893" />

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-400 mb-4">
            ⚠️ Prediction markets involve risk. Only trade with money you can afford to lose.
          </p>
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Prognostication. Not affiliated with Kalshi, Inc.
          </p>
        </div>
      </footer>
    </div>
  );
}
