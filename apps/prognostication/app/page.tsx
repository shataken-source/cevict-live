'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface Pick {
    id: string;
    sport: string;
    league: string;
    home_team: string;
    away_team: string;
    pick: string;
    confidence: number;
    odds: number;
    edge: number;
    expected_value: number;
    game_time: string;
    mc_predicted_score?: {
        home: number;
        away: number;
    };
    analysis: string[];
    is_favorite_pick: boolean;
    value_bet_edge: number;
}

interface PicksData {
    success: boolean;
    elite: Pick[];
    pro: Pick[];
    free: Pick[];
    totalPicks: number;
    timestamp: string;
}

function HomePage() {
    const [picksData, setPicksData] = useState<PicksData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTier, setSelectedTier] = useState<'elite' | 'pro' | 'free'>('elite');

    useEffect(() => {
        async function fetchPicks() {
            try {
                setLoading(true);
                const response = await fetch('/api/picks/today', { cache: 'no-store' });
                const data = await response.json();

                if (data.success) {
                    const allPicks: Pick[] = data.picks || [];

                    const elite = allPicks.filter((p: Pick) => p.confidence >= 80).slice(0, 5);
                    const pro = allPicks.filter((p: Pick) => p.confidence >= 65 && p.confidence < 80).slice(0, 3);
                    const free = allPicks.filter((p: Pick) => p.confidence < 65).slice(0, 2);

                    setPicksData({
                        success: true,
                        elite,
                        pro,
                        free,
                        totalPicks: allPicks.length,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    setError('Failed to load picks');
                }
            } catch (e) {
                setError('Network error loading picks');
            } finally {
                setLoading(false);
            }
        }

        fetchPicks();
    }, []);

    const getCurrentPicks = () => {
        if (!picksData) return [];
        return picksData[selectedTier] || [];
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-400 mx-auto mb-4"></div>
                    <p className="text-slate-300">Loading today's picks...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const currentPicks = getCurrentPicks();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="bg-slate-800/50 backdrop-blur-md border-b border-slate-700">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            <span className="text-emerald-400">PROGNO</span>
                            <span className="text-slate-400 ml-2">PICKS</span>
                        </h1>
                        <p className="text-sm text-slate-400">AI-Powered Sports Predictions</p>
                    </div>
                    <nav className="flex gap-4">
                        <Link href="/pricing" className="text-slate-300 hover:text-emerald-400 transition">
                            Pricing
                        </Link>
                        <Link href="/accuracy" className="text-slate-300 hover:text-emerald-400 transition">
                            Accuracy
                        </Link>
                        <Link href="/admin" className="text-slate-300 hover:text-emerald-400 transition">
                            Admin
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <section className="max-w-7xl mx-auto px-4 py-12">
                <div className="text-center mb-12">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Today's Best Sports Picks
                    </h2>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                        Powered by 7D Claude Effect + Monte Carlo simulations.
                        {picksData?.totalPicks} games analyzed.
                    </p>
                </div>

                {/* Tier Selector */}
                <div className="flex justify-center gap-2 mb-8">
                    {(['elite', 'pro', 'free'] as const).map((tier) => (
                        <button
                            key={tier}
                            onClick={() => setSelectedTier(tier)}
                            className={`px-6 py-3 rounded-lg font-semibold transition-all ${selectedTier === tier
                                    ? tier === 'elite'
                                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                                        : tier === 'pro'
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                            : 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                }`}
                        >
                            <span className="capitalize">{tier}</span>
                            <span className="ml-2 text-sm opacity-80">
                                ({picksData?.[tier]?.length || 0})
                            </span>
                        </button>
                    ))}
                </div>

                {/* Picks Grid */}
                <div className="grid gap-6">
                    {currentPicks.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-slate-400 text-lg">
                                No {selectedTier} picks available for today.
                            </p>
                        </div>
                    ) : (
                        currentPicks.map((pick) => (
                            <div
                                key={pick.id}
                                className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 p-6 hover:border-slate-600 transition"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    {/* Game Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="px-3 py-1 bg-slate-700 rounded-full text-sm text-slate-300">
                                                {pick.sport}
                                            </span>
                                            <span className="text-slate-400 text-sm">
                                                {new Date(pick.game_time).toLocaleString()}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-semibold text-white">
                                            {pick.away_team} @ {pick.home_team}
                                        </h3>
                                        <p className="text-emerald-400 font-medium mt-1">
                                            Pick: {pick.pick}
                                        </p>
                                    </div>

                                    {/* Score Prediction */}
                                    {pick.mc_predicted_score && (
                                        <div className="text-center px-6">
                                            <p className="text-sm text-slate-400 mb-1">Projected Score</p>
                                            <p className="text-2xl font-bold text-white">
                                                {pick.mc_predicted_score.away} - {pick.mc_predicted_score.home}
                                            </p>
                                        </div>
                                    )}

                                    {/* Stats */}
                                    <div className="flex gap-6 text-center">
                                        <div>
                                            <p className="text-2xl font-bold text-emerald-400">
                                                {pick.confidence}%
                                            </p>
                                            <p className="text-sm text-slate-400">Confidence</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-blue-400">
                                                {pick.edge}%
                                            </p>
                                            <p className="text-sm text-slate-400">Edge</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-purple-400">
                                                +{pick.expected_value}
                                            </p>
                                            <p className="text-sm text-slate-400">EV ($)</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Analysis */}
                                {pick.analysis && pick.analysis.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-slate-700">
                                        <ul className="flex flex-wrap gap-2">
                                            {pick.analysis.map((item, idx) => (
                                                <li
                                                    key={idx}
                                                    className="px-3 py-1 bg-slate-700/50 rounded-full text-sm text-slate-300"
                                                >
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Stats */}
                <div className="mt-12 grid grid-cols-3 gap-6 text-center">
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                        <p className="text-3xl font-bold text-emerald-400">7D</p>
                        <p className="text-slate-400">Claude Effect Dimensions</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                        <p className="text-3xl font-bold text-blue-400">1000+</p>
                        <p className="text-slate-400">Monte Carlo Sims/Game</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                        <p className="text-3xl font-bold text-purple-400">Real-Time</p>
                        <p className="text-slate-400">Odds from The Odds API</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 border-t border-slate-800 mt-12">
                <div className="max-w-7xl mx-auto px-4 py-8 text-center">
                    <p className="text-slate-500">
                        © 2026 Progno. AI-powered sports predictions.
                        <Link href="/privacy" className="text-emerald-400 hover:underline ml-2">Privacy</Link>
                        <Link href="/terms" className="text-emerald-400 hover:underline ml-2">Terms</Link>
                    </p>
                </div>
            </footer>
        </div>
    );
}

export default function Home() {
    return (
        <ErrorBoundary>
            <HomePage />
        </ErrorBoundary>
    );
}
