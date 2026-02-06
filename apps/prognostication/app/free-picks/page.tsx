'use client';

import { useState, useEffect } from 'react';
import BannerPlaceholder from '@/components/BannerPlaceholder';

interface FreePick {
  gameId: string;
  game: string;
  sport: string;
  pick: string;
  confidencePct: number;
  edgePct: number;
  kickoff: string | null;
}

export default function FreePicksPage() {
  const [picks, setPicks] = useState<FreePick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/picks/today', { cache: 'no-store' });
        const data = await res.json();
        if (data.success && Array.isArray(data.free)) {
          setPicks(data.free);
        } else {
          setPicks([]);
        }
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load picks');
        setPicks([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const formatKickoff = (k: string | null) => {
    if (!k) return '';
    try {
      const d = new Date(k);
      return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch {
      return k;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <BannerPlaceholder position="header" adSlot="prognostication-free-picks-header" />
      <div className="py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl font-bold text-center mb-12">Free Picks</h1>

          {loading && (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <p className="text-gray-600">Loading today&apos;s free picks…</p>
            </div>
          )}

          {error && (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <a href="/premium-picks" className="bg-yellow-400 text-black px-8 py-3 rounded-lg font-semibold inline-block">
                Get Premium Access
              </a>
            </div>
          )}

          {!loading && !error && picks.length === 0 && (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h2 className="text-2xl font-bold mb-3">No free picks right now</h2>
              <p className="text-gray-600 mb-6">Check back later or unlock more picks with premium.</p>
              <a href="/premium-picks" className="bg-yellow-400 text-black px-8 py-3 rounded-lg font-semibold inline-block">
                Get Premium Access
              </a>
            </div>
          )}

          {!loading && !error && picks.length > 0 && (
            <div className="space-y-6">
              <p className="text-center text-gray-600 mb-6">
                Today&apos;s free pick{picks.length !== 1 ? 's' : ''} — powered by Cevict Flex.
              </p>
              {picks.map((pick) => (
                <div key={pick.gameId} className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs font-semibold uppercase text-gray-500">{pick.sport}</span>
                    {pick.kickoff && (
                      <span className="text-xs text-gray-400">{formatKickoff(pick.kickoff)}</span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-3">{pick.game}</h2>
                  <div className="flex flex-wrap gap-4 items-center">
                    <span className="text-lg font-semibold text-green-700">Pick: {pick.pick}</span>
                    <span className="text-sm text-gray-600">Confidence: {pick.confidencePct}%</span>
                    {pick.edgePct !== 0 && (
                      <span className="text-sm text-gray-600">Edge: {pick.edgePct > 0 ? '+' : ''}{pick.edgePct}%</span>
                    )}
                  </div>
                </div>
              ))}
              <div className="text-center pt-4">
                <a href="/premium-picks" className="bg-yellow-400 text-black px-8 py-3 rounded-lg font-semibold inline-block">
                  Get more picks with Premium
                </a>
              </div>
            </div>
          )}

          <BannerPlaceholder position="in-content" adSlot="prognostication-free-picks-incontent" className="my-8" />
        </div>
      </div>
      <BannerPlaceholder position="footer" adSlot="prognostication-free-picks-footer" />
    </div>
  );
}
