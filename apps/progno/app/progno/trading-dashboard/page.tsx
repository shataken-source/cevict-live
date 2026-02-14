'use client';

import { useState, useEffect } from 'react';

interface PrognoTrade {
  id: string;
  platform: 'progno';
  trade_type: 'yes' | 'no';
  symbol: string;
  market_id?: string;
  entry_price: number;
  amount: number;
  pnl?: number;
  fees: number;
  opened_at: string;
  bot_category?: string;
  confidence?: number;
  edge?: number;
  outcome?: 'win' | 'loss' | 'open';
  homeTeam?: string;
  awayTeam?: string;
  sport?: string;
  predictedScore?: {
    home: number;
    away: number;
  };
  actualScore?: {
    home: number;
    away: number;
  };
}

interface LiveStats {
  totalTrades: number;
  openTrades: number;
  winTrades: number;
  lossTrades: number;
  totalPnl: number;
  winRate: number;
  avgConfidence: number;
  avgEdge: number;
}

const PROGNO_REFERRAL_CODE = process.env.NEXT_PUBLIC_PROGNO_REFERRAL_CODE || 'PROGNO2026';

function TradingDashboardContent() {
  const [trades, setTrades] = useState<PrognoTrade[]>([]);
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedTier, setSelectedTier] = useState<'free' | 'premium' | 'elite'>('elite');
  const [autoSyndicate, setAutoSyndicate] = useState(false);
  const [syndicationStatus, setSyndicationStatus] = useState<string | null>(null);

  const sports = ['all', 'nhl', 'nba', 'nfl', 'mlb', 'ncaab', 'ncaaf'];

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [tradesRes, statsRes] = await Promise.all([
          fetch(`/api/progno/predictions?sport=${selectedSport}&limit=20`, { cache: 'no-store' }),
          fetch('/api/stats/live', { cache: 'no-store' }),
        ]);

        if (tradesRes.ok) {
          const tradesData = await tradesRes.json();
          if (tradesData.success) {
            setTrades(tradesData.picks || []);
          }
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData.success) {
            setStats(statsData.stats);
          }
        }

        setLastUpdated(new Date());
      } catch (e: any) {
        console.error('Failed to load data:', e);
        setError(e.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [selectedSport]);

  const getPrognoUrl = (marketId?: string) => {
    if (marketId) {
      return `https://progno.com/picks?id=${marketId}&ref=${PROGNO_REFERRAL_CODE}`;
    }
    return `https://progno.com?ref=${PROGNO_REFERRAL_CODE}`;
  };

  const getOutcomeColor = (outcome?: string) => {
    if (outcome === 'win') return 'text-green-400 bg-green-500/10 border-green-500/30';
    if (outcome === 'loss') return 'text-red-400 bg-red-500/10 border-red-500/30';
    return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
  };

  const getOutcomeText = (outcome?: string) => {
    if (outcome === 'win') return 'WIN';
    if (outcome === 'loss') return 'LOSS';
    return 'OPEN';
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-gray-400';
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 65) return 'text-yellow-400';
    if (confidence >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  const getEdgeColor = (edge?: number) => {
    if (!edge) return 'text-gray-400';
    if (edge > 5) return 'text-green-400';
    if (edge > 2) return 'text-yellow-400';
    if (edge > 0) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
      {/* Header Ad Banner */}
      <div className="w-full">
        <div className="bg-gray-800 border border-gray-700 p-4 text-center">
          <p className="text-gray-300 text-sm">Ad Space</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-black text-white mb-4 tracking-tight">
            PROGNO TRADING
          </h1>
          <p className="text-xl text-indigo-300 mb-2">
            AI-Powered Sports Prediction Intelligence
          </p>
          <p className="text-gray-400 text-sm">
            Live prediction signals from our autonomous AI trading system
          </p>
          {lastUpdated && (
            <p className="text-gray-500 text-xs mt-2">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </header>

        {/* Sport Filter */}
        <div className="mb-6">
          <select
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
            className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {sports.map(sport => (
              <option key={sport} value={sport} className="bg-gray-800">
                {sport.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Tier Selection & Syndication Controls */}
        <div className="mb-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Syndication Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Target Tier</label>
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
              >
                <option value="free" className="bg-gray-800">Free Tier</option>
                <option value="premium" className="bg-gray-800">Premium Tier</option>
                <option value="elite" className="bg-gray-800">Elite Tier</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Auto-Syndicate</label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoSyndicate}
                  onChange={(e) => setAutoSyndicate(e.target.checked)}
                  className="rounded mr-2"
                />
                <span className="text-sm text-gray-400">
                  Automatically send picks to prognostication.com
                </span>
              </div>
            </div>

            <div>
              <button
                onClick={async () => {
                  try {
                    setSyndicationStatus('Syndicating...');
                    const response = await fetch('/api/syndication', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        tier: selectedTier,
                        picks: trades,
                        webhookUrl: 'https://prognostication.com/api/progno'
                      })
                    });

                    if (response.ok) {
                      const result = await response.json();
                      setSyndicationStatus(`✅ Syndicated ${result.syndicatedPicks} picks to ${selectedTier} tier`);
                    } else {
                      setSyndicationStatus('❌ Syndication failed');
                    }
                  } catch (error) {
                    setSyndicationStatus(`❌ Error: ${error.message}`);
                  }
                }}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                🚀 Syndicate to Prognostication.com
              </button>
            </div>
          </div>

          {syndicationStatus && (
            <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-300">{syndicationStatus}</p>
            </div>
          )}
        </div>

        {/* Live Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-green-400 mb-1">
                {stats.winRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400">Win Rate</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
              <div className={`text-3xl font-bold mb-1 ${stats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${stats.totalPnl >= 0 ? '+' : ''}{stats.totalPnl.toFixed(2)}
              </div>
              <div className="text-sm text-gray-400">Total P&L</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-indigo-400 mb-1">
                {stats.totalTrades}
              </div>
              <div className="text-sm text-gray-400">Total Predictions</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-1">
                {stats.openTrades}
              </div>
              <div className="text-sm text-gray-400">Active Positions</div>
            </div>
          </div>
        )}

        {/* In-Content Ad */}
        <div className="mb-12">
          <AdSenseBanner
            adSlot={process.env.NEXT_PUBLIC_ADSENSE_CONTENT_SLOT || '1234567891'}
            format="horizontal"
            style={{ height: '90px' }}
            className="w-full"
          />
        </div>

        {/* Trades List */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Live Predictions</h2>

          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-indigo-300">Loading predictions...</p>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
              <p className="text-red-400">Error: {error}</p>
            </div>
          ) : trades.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-xl text-indigo-300 mb-2">No predictions yet</p>
              <p className="text-gray-400">
                Our AI prediction system will display trades here as they are generated.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {trades.map((trade) => (
                <a
                  key={trade.id}
                  href={getPrognoUrl(trade.market_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-indigo-500/50 hover:bg-white/10 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getOutcomeColor(trade.outcome)}`}>
                          {getOutcomeText(trade.outcome)}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${trade.trade_type === 'yes'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                          {trade.trade_type.toUpperCase()}
                        </span>
                        {trade.bot_category && (
                          <span className="px-3 py-1 rounded-full text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                            {trade.bot_category.toUpperCase()}
                          </span>
                        )}
                        {trade.sport && (
                          <span className="px-3 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            {trade.sport.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors mb-2">
                        {trade.homeTeam && trade.awayTeam
                          ? `${trade.homeTeam} vs ${trade.awayTeam}`
                          : trade.symbol
                        }
                      </h3>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                        <span>Confidence: {trade.confidence}%</span>
                        {trade.edge && <span>Edge: +{trade.edge}%</span>}
                        <span>Entry: {trade.entry_price}¢</span>
                        <span>Amount: ${trade.amount.toFixed(2)}</span>
                        {trade.pnl !== undefined && trade.pnl !== null && (
                          <span className={trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                            P&L: {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Score Display */}
                      {trade.predictedScore && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <div className="text-sm text-gray-400 mb-1">Predicted Score:</div>
                          <div className="text-lg font-bold text-white">
                            {trade.predictedScore.home} - {trade.predictedScore.away}
                          </div>
                        </div>
                      )}

                      {trade.actualScore && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <div className="text-sm text-gray-400 mb-1">Actual Score:</div>
                          <div className="text-lg font-bold text-white">
                            {trade.actualScore.home} - {trade.actualScore.away}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-1">
                        {new Date(trade.opened_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-600">
                        {new Date(trade.opened_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-4 pt-4 border-t border-white/10">
                    Click to view on Progno →
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* Footer Ad */}
        <div className="mb-12">
          <AdSenseBanner
            adSlot={process.env.NEXT_PUBLIC_ADSENSE_FOOTER_SLOT || '1234567892'}
            format="horizontal"
            style={{ height: '90px' }}
            className="w-full"
          />
        </div>

        {/* Footer */}
        <footer className="border-t border-white/10 pt-8 pb-12 text-center">
          <p className="text-sm text-gray-400 mb-4">
            ⚠️ Sports predictions involve risk. Only bet with money you can afford to lose.
          </p>
          <p className="text-xs text-gray-500 mb-2">
            © {new Date().getFullYear()} Progno Trading. Professional Sports Prediction System.
          </p>
          <p className="text-xs text-gray-600">
            All predictions shown are from our live AI prediction system. Click any prediction to view details.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default function TradingDashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
      <TradingDashboardContent />
    </div>
  );
}
