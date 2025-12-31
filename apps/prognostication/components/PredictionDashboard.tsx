'use client';

import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, TrendingDown, Activity, Clock, Filter, RefreshCw } from 'lucide-react';
import prognoAPI from '../lib/progno-api';

interface Prediction {
  id: string;
  sport: string;
  game: string;
  prediction: string;
  predictionType: string;
  confidence: number;
  analysis: string;
  timestamp: string;
  status: 'active' | 'won' | 'lost';
  odds?: any;
  value: 'high' | 'medium' | 'low';
}

interface Stats {
  totalPredictions: number;
  winRate: number;
  activePicks: number;
  sports: Record<string, { winRate: number; total: number }>;
}

export default function PredictionDashboard() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [minConfidence, setMinConfidence] = useState(70);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch predictions and stats
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [predictionsData, statsData] = await Promise.all([
        prognoAPI.getPredictions(selectedSport, 50),
        prognoAPI.getStatistics()
      ]);

      // Filter predictions based on criteria
      let filteredPredictions = predictionsData.predictions || [];
      
      if (selectedStatus !== 'all') {
        filteredPredictions = filteredPredictions.filter((p: Prediction) => p.status === selectedStatus);
      }
      
      filteredPredictions = filteredPredictions.filter((p: Prediction) => p.confidence >= minConfidence);

      setPredictions(filteredPredictions);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [selectedSport, selectedStatus, minConfidence]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedSport, selectedStatus, minConfidence]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'won':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'lost':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-400';
    if (confidence >= 80) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getValueColor = (value: string) => {
    switch (value) {
      case 'high': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  if (loading && predictions.length === 0) {
    return (
      <div className="min-h-screen bg-sports-bg flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading PROGNO predictions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-sports-card border-b border-sports-border sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-sports-text">PROGNO Predictions</h1>
              <p className="text-sm text-gray-400">AI-Powered Sports Betting Insights</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      {stats && (
        <div className="bg-sports-card border-b border-sports-border">
          <div className="container mx-auto px-4 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-sports-text">{stats.totalPredictions}</div>
                <div className="text-sm text-gray-400">Total Predictions</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-sports-accent">{stats.winRate}%</div>
                <div className="text-sm text-gray-400">Win Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-500">{stats.activePicks}</div>
                <div className="text-sm text-gray-400">Active Picks</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-sports-accent">
                  {predictions.filter(p => p.status === 'won').length}W
                </div>
                <div className="text-sm text-gray-400">Recent Wins</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-sports-card border-b border-sports-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Filters:</span>
            </div>
            
            <select
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
              className="bg-sports-bg border border-sports-border rounded px-3 py-1 text-sm text-gray-300"
            >
              <option value="all">All Sports</option>
              <option value="NFL">NFL</option>
              <option value="NBA">NBA</option>
              <option value="MLB">MLB</option>
              <option value="NHL">NHL</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-sports-bg border border-sports-border rounded px-3 py-1 text-sm text-gray-300"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>

            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-400">Min Confidence:</label>
              <input
                type="range"
                min="70"
                max="100"
                value={minConfidence}
                onChange={(e) => setMinConfidence(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-gray-300 w-8">{minConfidence}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Predictions Grid */}
      <main className="container mx-auto px-4 py-8">
        {error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-4 text-red-400 hover:text-red-300 underline"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {predictions.map((prediction) => (
              <div
                key={prediction.id}
                className="bg-sports-card rounded-lg border border-sports-border p-6 hover:border-primary-500/50 transition-colors"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs font-medium">
                      {prediction.sport}
                    </span>
                    {getStatusIcon(prediction.status)}
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getConfidenceColor(prediction.confidence)}`}>
                      {prediction.confidence}%
                    </div>
                    <div className="text-xs text-gray-500">Confidence</div>
                  </div>
                </div>

                {/* Game Info */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-sports-text mb-2">
                    {prediction.game}
                  </h3>
                  <div className="text-2xl font-bold text-primary-500 mb-2">
                    {prediction.prediction}
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>{prediction.predictionType}</span>
                    <span className={getValueColor(prediction.value)}>
                      {prediction.value} value
                    </span>
                  </div>
                </div>

                {/* Analysis */}
                <div className="mb-4">
                  <p className="text-sm text-gray-300 line-clamp-3">
                    {prediction.analysis}
                  </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(prediction.timestamp).toLocaleString()}</span>
                  </div>
                  <button className="text-primary-500 hover:text-primary-400 transition-colors">
                    View Analysis →
                  </button>
                </div>

                {/* Odds Display */}
                {prediction.odds && (
                  <div className="mt-4 pt-4 border-t border-sports-border">
                    <div className="text-xs text-gray-400 mb-2">Current Odds</div>
                    <div className="flex justify-between text-sm">
                      {prediction.predictionType === 'moneyline' && (
                        <>
                          <span>Home: {prediction.odds.home}</span>
                          <span>Away: {prediction.odds.away}</span>
                        </>
                      )}
                      {prediction.predictionType === 'spread' && (
                        <>
                          <span>Spread: {prediction.odds.spread}</span>
                          <span>Both: {prediction.odds.homeOdds}</span>
                        </>
                      )}
                      {prediction.predictionType === 'over/under' && (
                        <>
                          <span>Total: {prediction.odds.total}</span>
                          <span>O/U: {prediction.odds.overOdds}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {predictions.length === 0 && !loading && !error && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No predictions found</p>
            <p className="text-gray-500 text-sm mt-2">
              Try adjusting your filters or check back later
            </p>
          </div>
        )}
      </main>

      {/* Auto-refresh indicator */}
      <div className="fixed bottom-4 right-4 bg-sports-card border border-sports-border rounded-lg px-3 py-2 flex items-center space-x-2">
        <Activity className="w-4 h-4 text-green-500 animate-pulse" />
        <span className="text-xs text-gray-400">Auto-refreshing</span>
      </div>
    </div>
  );
}
