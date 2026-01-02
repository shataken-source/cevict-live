'use client';

import { useState, useEffect } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import AdSenseBanner from '@/components/AdSenseBanner';

interface KalshiTrade {
  id: string;
  platform: 'kalshi';
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

const KALSHI_REFERRAL_CODE = process.env.NEXT_PUBLIC_KALSHI_REFERRAL_CODE || 'CEVICT2025';

function HomePageContent() {
  const [trades, setTrades] = useState<KalshiTrade[]>([]);
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [tradesRes, statsRes] = await Promise.all([
          fetch('/api/trades/kalshi?limit=20', { cache: 'no-store' }),
          fetch('/api/stats/live', { cache: 'no-store' }),
        ]);

        if (tradesRes.ok) {
          const tradesData = await tradesRes.json();
          if (tradesData.success) {
            setTrades(tradesData.trades || []);
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
  }, []);

  const getKalshiUrl = (marketId?: string) => {
    if (marketId) {
      return `https://kalshi.com/markets/${marketId}?referral=${KALSHI_REFERRAL_CODE}`;
    }
    return `https://kalshi.com?referral=${KALSHI_REFERRAL_CODE}`;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
      {/* Header Ad Banner */}
      <div className="w-full">
        <AdSenseBanner 
          adSlot={process.env.NEXT_PUBLIC_ADSENSE_HEADER_SLOT || '1234567890'}
          format="horizontal"
          style={{ height: '90px' }}
          className="w-full"
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-black text-white mb-4 tracking-tight">
            PROGNOSTICATION
          </h1>
          <p className="text-xl text-indigo-300 mb-2">
            AI-Powered Prediction Market Intelligence
          </p>
          <p className="text-gray-400 text-sm">
            Live trading signals from our autonomous AI trading system
          </p>
          {lastUpdated && (
            <p className="text-gray-500 text-xs mt-2">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </header>

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
              <div className="text-sm text-gray-400">Total Trades</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-1">
                {stats.openTrades}
              </div>
              <div className="text-sm text-gray-400">Open Positions</div>
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
          <h2 className="text-2xl font-bold text-white mb-6">Recent Trades</h2>
          
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-indigo-300">Loading trades...</p>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
              <p className="text-red-400">Error: {error}</p>
            </div>
          ) : trades.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-xl text-indigo-300 mb-2">No trades yet</p>
              <p className="text-gray-400">
                Our AI trading system will display trades here as they are executed.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {trades.map((trade) => (
                <a
                  key={trade.id}
                  href={getKalshiUrl(trade.market_id)}
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
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          trade.trade_type === 'yes' 
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
                      </div>
                      <h3 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors mb-2">
                        {trade.symbol}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                        <span>Entry: {trade.entry_price}¢</span>
                        <span>Amount: ${trade.amount.toFixed(2)}</span>
                        {trade.confidence && <span>Confidence: {trade.confidence}%</span>}
                        {trade.edge && <span>Edge: +{trade.edge}%</span>}
                        {trade.pnl !== undefined && trade.pnl !== null && (
                          <span className={trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                            P&L: {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                          </span>
                        )}
                      </div>
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
                    Click to view on Kalshi →
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
            ⚠️ Prediction markets involve risk. Only trade with money you can afford to lose.
          </p>
          <p className="text-xs text-gray-500 mb-2">
            © {new Date().getFullYear()} Prognostication. Not affiliated with Kalshi, Inc.
          </p>
          <p className="text-xs text-gray-600">
            All trades shown are from our live AI trading system. Click any trade to view on Kalshi.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <ErrorBoundary>
      <HomePageContent />
    </ErrorBoundary>
  );
}
