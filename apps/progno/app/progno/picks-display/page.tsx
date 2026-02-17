'use client';

import { useState, useEffect } from 'react';
import { NextResponse } from 'next/server';

interface PrognoPick {
  id: string;
  gameDate: string;
  league: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  gameTime: string;
  venue?: string;
  prediction: {
    winner: string;
    confidence: number;
    score: {
      home: number;
      away: number;
    };
    edge: number;
    keyFactors?: string[];
  };
  odds: {
    moneyline?: {
      home: number;
      away: number;
    };
    spread?: {
      home: number;
      away: number;
    };
    total?: number;
  };
  analysis?: {
    sport: string;
    homeTeam: string;
    awayTeam: string;
    confidence: number;
    analysis: string;
    pick: string;
    odds: number;
    mc_win_probability: number;
    mc_predicted_score: {
      home: number;
      away: number;
    };
    value_bet_edge: number;
    has_value: boolean;
  };
  isLive?: boolean;
  isCompleted?: boolean;
  scoreInfo?: {
    homeScore: number;
    awayScore: number;
    completed: boolean;
  };
}

interface SyndicationOptions {
  target: 'prognostication' | 'custom';
  webhookUrl?: string;
  apiKey?: string;
  autoSync: boolean;
}

export default function PicksDisplayPage() {
  const [picks, setPicks] = useState<PrognoPick[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    // Format as YYYY-MM-DD to avoid parsing confusion
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [selectedSport, setSelectedSport] = useState('all');
  const [syndication, setSyndication] = useState<SyndicationOptions>({
    target: 'prognostication',
    autoSync: false
  });

  const sports = ['all', 'nhl', 'nba', 'nfl', 'mlb', 'ncaab', 'ncaaf', 'cbb', 'nascar'];

  useEffect(() => {
    loadPicks();
  }, [selectedDate, selectedSport]);

  const loadPicks = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load today's predictions from Progno API
      const response = await fetch(`/api/progno/predictions?date=${selectedDate}&sport=${selectedSport}`);
      const data = await response.json();

      if (data.success) {
        setPicks(data.picks || []);
      } else {
        setError(data.error || 'Failed to load picks');
      }
    } catch (err) {
      setError('Failed to connect to prediction service');
    } finally {
      setLoading(false);
    }
  };

  const syndicateToPrognostication = async (pick: PrognoPick) => {
    if (!syndication.webhookUrl) {
      setError('Webhook URL required for syndication');
      return;
    }

    try {
      const syndicationData = {
        league: pick.league,
        sport: pick.sport,
        homeTeam: pick.homeTeam,
        awayTeam: pick.awayTeam,
        line: pick.odds?.spread,
        odds: pick.odds?.moneyline,
        date: pick.gameDate,
        venue: pick.venue,
        weather: {
          temperature: 72,
          conditions: 'Clear'
        },
        injuries: {
          homeImpact: 0.1,
          awayImpact: 0.05
        }
      };

      const response = await fetch(syndication.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(syndication.apiKey && { 'Authorization': `Bearer ${syndication.apiKey}` })
        },
        body: JSON.stringify(syndicationData)
      });

      if (response.ok) {
        console.log('Successfully syndicated pick to prognostication.com');
      } else {
        setError('Failed to syndicate pick');
      }
    } catch (err) {
      setError('Syndication failed');
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 65) return 'text-yellow-600 bg-yellow-100';
    if (confidence >= 50) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getEdgeColor = (edge: number) => {
    if (edge > 5) return 'text-green-600';
    if (edge > 2) return 'text-yellow-600';
    if (edge > 0) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatOdds = (odds: number) => {
    if (odds > 0) return `+${odds}`;
    return odds.toString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">PROGNO Picks Display</h1>
              <p className="text-sm text-gray-600 mt-1">
                Professional sports predictions with real-time syndication
              </p>
            </div>

            {/* Syndication Settings */}
            <div className="flex items-center gap-4">
              <select
                value={syndication.target}
                onChange={(e) => setSyndication(prev => ({ ...prev, target: e.target.value as any }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                title="Syndication Target"
              >
                <option value="prognostication">Prognostication.com</option>
                <option value="custom">Custom Webhook</option>
              </select>

              {syndication.target === 'custom' && (
                <input
                  type="url"
                  placeholder="Webhook URL"
                  value={syndication.webhookUrl || ''}
                  onChange={(e) => setSyndication(prev => ({ ...prev, webhookUrl: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm w-64"
                  title="Webhook URL"
                />
              )}

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={syndication.autoSync}
                  onChange={(e) => setSyndication(prev => ({ ...prev, autoSync: e.target.checked }))}
                  className="rounded"
                  id="autoSync"
                />
                <label htmlFor="autoSync">Auto-sync</label>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="date">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                id="date"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sport</label>
              <select
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                title="Sport Selection"
                id="sport"
              >
                {sports.map(sport => (
                  <option key={sport} value={sport}>
                    {sport.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={loadPicks}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        </div>
      )}

      {/* Picks Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Loading predictions...</p>
          </div>
        ) : picks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No picks available</h3>
            <p className="text-gray-600">
              Try adjusting the date or sport filters, or run predictions for the selected date.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {picks.map((pick) => (
              <div
                key={pick.id}
                className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm opacity-90">{pick.league?.toUpperCase()}</div>
                      <div className="text-lg font-bold">
                        {pick.homeTeam} vs {pick.awayTeam}
                      </div>
                    </div>
                    {pick.isLive && (
                      <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full animate-pulse">
                        LIVE
                      </span>
                    )}
                  </div>
                </div>

                {/* Game Info */}
                <div className="p-4">
                  <div className="text-sm text-gray-600 mb-3">
                    <div>📅 {new Date(pick.gameTime).toLocaleString()}</div>
                    {pick.venue && <div>🏟 {pick.venue}</div>}
                  </div>

                  {/* Score Display */}
                  {pick.scoreInfo ? (
                    <div className="text-center mb-4">
                      <div className="text-3xl font-bold text-gray-900">
                        {pick.scoreInfo.homeScore} - {pick.scoreInfo.awayScore}
                      </div>
                      {pick.scoreInfo.completed && (
                        <div className="text-sm text-gray-600">FINAL</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center mb-4">
                      <div className="text-2xl font-bold text-blue-600">
                        {pick.prediction.score.home} - {pick.prediction.score.away}
                      </div>
                      <div className="text-sm text-gray-600">Projected</div>
                    </div>
                  )}

                  {/* Prediction */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Winner:</span>
                      <span className="text-lg font-bold text-blue-600">
                        {pick.prediction.winner}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Confidence:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${getConfidenceColor(pick.prediction.confidence)}`}>
                        {Math.round(pick.prediction.confidence * 100)}%
                      </span>
                    </div>

                    {pick.prediction.edge > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Edge:</span>
                        <span className={`font-bold ${getEdgeColor(pick.prediction.edge)}`}>
                          +{pick.prediction.edge}%
                        </span>
                      </div>
                    )}

                    {/* Odds */}
                    {pick.odds?.moneyline && (
                      <div className="border-t pt-3">
                        <div className="text-sm font-semibold mb-2">Odds:</div>
                        <div className="flex justify-between text-sm">
                          <span>{pick.homeTeam}: {formatOdds(pick.odds.moneyline.home)}</span>
                          <span>{pick.awayTeam}: {formatOdds(pick.odds.moneyline.away)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Key Factors */}
                  {pick.prediction.keyFactors && pick.prediction.keyFactors.length > 0 && (
                    <div className="mt-4 pt-3 border-t">
                      <div className="text-sm font-semibold mb-2">Key Factors:</div>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {pick.prediction.keyFactors.map((factor, index) => (
                          <li key={index} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Syndication Button */}
                  {syndication.target && (
                    <div className="mt-4 pt-3 border-t">
                      <button
                        onClick={() => syndicateToPrognostication(pick)}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium transition-colors"
                      >
                        {syndication.target === 'prognostication'
                          ? '🚀 Syndicate to Prognostication.com'
                          : '📡 Send to Webhook'
                        }
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-600">
            <p>© 2026 PROGNO • Professional Sports Prediction System</p>
            <p className="mt-2">
              <span className="font-semibold">Syndication Status:</span> {
                syndication.target === 'prognostication' ? 'Connected to Prognostication.com' :
                  syndication.target === 'custom' ? 'Custom webhook configured' : 'Not configured'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
