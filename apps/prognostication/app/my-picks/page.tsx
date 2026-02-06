'use client';

import BannerPlaceholder from '@/components/BannerPlaceholder';
import EnhancedPickCard, { type EnginePick } from '@/components/EnhancedPickCard';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function MyPicksPage() {
  const [tier, setTier] = useState<'free' | 'pro' | 'elite' | null>(null);
  const [loading, setLoading] = useState(true);
  const [proPicks, setProPicks] = useState<EnginePick[]>([]);
  const [elitePicks, setElitePicks] = useState<EnginePick[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function run() {
      const email = typeof window !== 'undefined'
        ? (localStorage.getItem('user_email') || sessionStorage.getItem('user_email') || '')
        : '';
      const sessionId = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('session_id')
        : null;

      if (!email && !sessionId) {
        if (mounted) {
          setTier('free');
          setLoading(false);
        }
        return;
      }

      try {
        const params = new URLSearchParams();
        if (email) params.set('email', email);
        if (sessionId) params.set('session_id', sessionId);

        const tierRes = await fetch(`/api/user/tier?${params.toString()}`);
        const tierData = await tierRes.json();
        const userTier = (tierData?.tier === 'pro' || tierData?.tier === 'elite') ? tierData.tier : 'free';

        if (!mounted) return;
        setTier(userTier);

        if (userTier === 'free') {
          setLoading(false);
          return;
        }

        const picksRes = await fetch(`/api/picks/today?${params.toString()}`, { cache: 'no-store' });
        const picksData = await picksRes.json();

        if (!mounted) return;
        if (picksData.success) {
          setProPicks(Array.isArray(picksData.pro) ? picksData.pro : []);
          setElitePicks(Array.isArray(picksData.elite) ? picksData.elite : []);
        } else {
          setError(picksData.error || 'Failed to load picks');
        }
      } catch (e: any) {
        if (mounted) {
          setError(e?.message ?? 'Something went wrong');
          setTier(tier ?? 'free');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <BannerPlaceholder position="header" adSlot="prognostication-my-picks-header" />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="inline-block w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600 dark:text-slate-400">Loading your picks…</p>
        </div>
        <BannerPlaceholder position="footer" adSlot="prognostication-my-picks-footer" />
      </div>
    );
  }

  if (tier === 'free' || tier === null) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <BannerPlaceholder position="header" adSlot="prognostication-my-picks-header" />
        <div className="container mx-auto px-4 py-16 text-center max-w-xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">My Picks</h1>
          <p className="text-gray-600 dark:text-slate-400 mb-6">
            Sign in with the email you used to subscribe, or subscribe to Pro or Elite to see your daily picks here.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg"
            >
              Sign in
            </Link>
            <Link
              href="/pricing"
              className="inline-flex justify-center px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg"
            >
              View pricing
            </Link>
          </div>
        </div>
        <BannerPlaceholder position="footer" adSlot="prognostication-my-picks-footer" />
      </div>
    );
  }

  const allPro = proPicks;
  const allElite = elitePicks;
  const hasPro = allPro.length > 0;
  const hasElite = allElite.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <BannerPlaceholder position="header" adSlot="prognostication-my-picks-header" />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          My Picks
        </h1>
        <p className="text-gray-600 dark:text-slate-400 mb-8">
          {tier === 'elite' ? 'Pro + Elite picks (full analysis).' : 'Pro picks (full analysis).'}
        </p>

        {error && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <p className="text-amber-800 dark:text-amber-200">{error}</p>
          </div>
        )}

        {!hasPro && !hasElite && !error && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-8 text-center">
            <p className="text-gray-600 dark:text-slate-400">No picks available right now. Check back later or ensure Progno has generated today&apos;s picks.</p>
          </div>
        )}

        {hasPro && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Pro Picks</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {allPro.map((p) => (
                <EnhancedPickCard key={p.gameId} pick={p} variant="pro" />
              ))}
            </div>
          </section>
        )}

        {tier === 'elite' && hasElite && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Elite Picks (Enhanced)</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {allElite.map((p) => (
                <EnhancedPickCard key={p.gameId} pick={p} variant="elite" />
              ))}
            </div>
          </section>
        )}

        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/elite-bets" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            Elite tools (simulations, parlays) →
          </Link>
          {tier === 'pro' && (
            <Link href="/pricing" className="text-purple-600 dark:text-purple-400 hover:underline">
              Upgrade to Elite →
            </Link>
          )}
        </div>
        <BannerPlaceholder position="in-content" adSlot="prognostication-my-picks-incontent" className="my-8" />
      </div>
      <BannerPlaceholder position="footer" adSlot="prognostication-my-picks-footer" />
    </div>
  );
}
