'use client';

import { useState, useEffect } from 'react';
import EnhancedPicksCard from '../components/EnhancedPicksCard';
import ClaudeEffectCard from '../components/ClaudeEffectCard';
import SharpMoneyIndicator from '../components/SharpMoneyIndicator';
import ConfidenceGauge from '../components/ConfidenceGauge';

export default function PrognoDashboard() {
  const [mounted, setMounted] = useState(false);
  const [sport, setSport] = useState('nhl');
  const [games, setGames] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<Record<string, any>>({});
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('prognoWatchlist') || '[]');
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todayBets, setTodayBets] = useState<any[]>([]);

  const predictionCache = new Map<string, any>();

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = async (forceSport = sport) => {
    setLoading(true);
    setError(null);
    setGames([]);
    setScores([]);
    setTodayBets([]);

    if (forceSport === 'today') {
      loadTodayBestBets();
      setLoading(false);
      return;
    }

    if (forceSport === 'picks-display') {
      window.location.href = '/progno/picks-display';
      return;
    }

    if (forceSport === 'trading-dashboard') {
      window.location.href = '/progno/trading-dashboard';
      return;
    }

    try {
      const gamesRes = await fetch(`/api/progno/v2?action=games&sport=${forceSport}`);
      const gamesData = await gamesRes.json();
      if (!gamesData.success) throw new Error(gamesData.error?.message || 'Failed to load games');
      setGames(gamesData.data || []);

      const scoresRes = await fetch(`/api/progno/v2?action=live-scores&sport=${forceSport}`);
      const scoresData = await scoresRes.json();
      if (!scoresData.success) throw new Error(scoresData.error?.message || 'Failed to load scores');
      setScores(scoresData.data || []);
    } catch (err: any) {
      setError(err.message || 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const loadTodayBestBets = () => {
    // Manual only — uses cached predictions
    const withEdge = games.filter(g => {
      const pred = predictionCache.get(g.id);
      return pred && pred.edge > 0;
    });

    withEdge.sort((a, b) => {
      const aEdge = predictionCache.get(a.id)?.edge || 0;
      const bEdge = predictionCache.get(b.id)?.edge || 0;
      return bEdge - aEdge;
    });

    setTodayBets(withEdge.slice(0, 10));
  };

  const predictGame = async (gameId: string) => {
    try {
      const res = await fetch(`/api/progno/v2?action=prediction&gameId=${gameId}`);
      const data = await res.json();
      if (data.success) {
        setPredictions(prev => ({ ...prev, [gameId]: data.data }));
        predictionCache.set(gameId, data.data);
        if (sport === 'today') loadTodayBestBets();
      }
    } catch (err) {
      alert('Error running prediction');
    }
  };

  const saveToWatchlist = (gameId: string) => {
    setWatchlist(prev => {
      if (prev.includes(gameId)) return prev;
      const updated = [...prev, gameId];
      localStorage.setItem('prognoWatchlist', JSON.stringify(updated));
      return updated;
    });
  };

  const removeFromWatchlist = (gameId: string) => {
    setWatchlist(prev => {
      const updated = prev.filter(id => id !== gameId);
      localStorage.setItem('prognoWatchlist', JSON.stringify(updated));
      return updated;
    });
  };

  const printBestBets = () => {
    window.print();
  };

  const clearPredictions = () => setPredictions({});

  useEffect(() => {
    if (mounted) {
      fetchData();
    }
  }, [sport, mounted]);

  const mergedGames = games.map(game => {
    const scoreInfo = scores.find(s => s.id === game.id);
    const isLive = scoreInfo && !scoreInfo.completed;
    const isCompleted = scoreInfo?.completed;

    return {
      ...game,
      scoreInfo,
      prediction: predictions[game.id],
      isSaved: watchlist.includes(game.id),
      hasPotentialArb: Math.abs((game.odds?.moneyline?.home ?? 0) - (game.odds?.moneyline?.away ?? 0)) > 20,
      isLive,
      isCompleted
    };
  });

  if (!mounted) return null;

  const isTodayMode = sport === 'today';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-none mx-auto p-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-4xl font-bold">PROGNO — Live Sports Dashboard</h1>
        </header>

        <div className="flex flex-wrap items-center gap-4 mb-6">
          <label className="font-medium">View:</label>
          <select
            value={sport}
            onChange={e => {
              setSport(e.target.value);
              fetchData(e.target.value);
            }}
            className="p-2 rounded-lg border bg-white border-gray-300"
          >
            <option value="nhl">NHL</option>
            <option value="ncaab">NCAAB</option>
            <option value="nba">NBA</option>
            <option value="nfl">NFL</option>
            <option value="ncaaf">NCAAF</option>
            <option value="mlb">MLB</option>
            <option value="ncaabaseball">NCAA Baseball</option>
            <option value="nascar">NASCAR</option>
            <option value="today">Today's Best Bets</option>
            <option value="picks-display">📊 Picks Display</option>
            <option value="trading-dashboard">🚀 Trading Dashboard</option>
          </select>

          <button
            onClick={() => fetchData()}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${loading ? 'bg-gray-500 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
          >
            {loading ? 'Refreshing...' : 'Refresh Now'}
          </button>

          <button
            onClick={clearPredictions}
            className="px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            Clear Predictions
          </button>
        </div>

        {isTodayMode && todayBets.length > 0 && (
          <div className="mb-6">
            <button
              onClick={printBestBets}
              className="px-6 py-3 rounded-lg font-medium bg-green-600 hover:bg-green-700 text-white transition-colors"
            >
              Print Best Bets
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-300 text-center">
            ⚠️ {error}
          </div>
        )}

        {loading && <p className="text-gray-500 mb-6">Loading...</p>}

        {isTodayMode ? (
          <div>
            <h2 className="text-2xl font-bold mb-6">Today’s Best Bets (True Positive Edge Picks)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {todayBets.length === 0 ? (
                <p className="col-span-full text-center text-gray-500 py-10">
                  No positive edge picks yet. Run predictions in league views to populate the true best bets.
                </p>
              ) : (
                todayBets.map(bet => {
                  const prediction = bet.prediction || {};

                  return (
                    <div key={bet.id} className="space-y-6">
                      <div className="text-xl font-bold text-center mb-2">
                        {bet.homeTeam} vs {bet.awayTeam}
                        <div className="text-base font-semibold text-blue-600 mt-1">
                          Predicted Winner: <span className="font-bold">{prediction.winner || 'Loading...'}</span>
                        </div>
                      </div>

                      <EnhancedPicksCard
                        pick={{
                          sport: bet.league.toUpperCase(),
                          home_team: bet.homeTeam,
                          away_team: bet.awayTeam,
                          game_time: bet.startTime,
                          confidence: prediction.confidence * 100 || 0,
                          analysis: prediction.keyFactors?.join('\n') || '',
                          pick: prediction.winner || 'Unknown',
                          odds: bet.odds?.moneyline?.home || -150,
                          mc_win_probability: prediction.confidence || 0,
                          mc_predicted_score: prediction.score || { home: 0, away: 0 },
                          value_bet_edge: prediction.edge || 0,
                          value_bet_ev: (prediction.edge || 0) * 10,
                          has_value: (prediction.edge || 0) > 0
                        }}
                        showDetails={true}
                      />

                      <ClaudeEffectCard
                        scores={prediction.claudeEffect || {
                          sentimentField: 0.8,
                          narrativeMomentum: 0.7,
                          informationAsymmetry: 0.65,
                          chaosSensitivity: 0.6,
                          networkInfluence: 0.65,
                          temporalDecay: 0.5,
                          emergentPattern: 0.7
                        }}
                        adjustedProbability={prediction.confidence || 0}
                        adjustedConfidence={prediction.confidence || 0}
                        reasoning={prediction.keyFactors || []}
                        recommendations={{ betSize: 'large', reason: `+${prediction.edge || 0}% edge detected` }}
                      />

                      <SharpMoneyIndicator gameId={bet.id} homeTeam={bet.homeTeam} awayTeam={bet.awayTeam} />

                      <div className="flex justify-center">
                        <ConfidenceGauge confidence={prediction.confidence || 0} size="large" showLabel={true} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mergedGames.length === 0 && !loading && (
              <p className="col-span-full text-center text-gray-500 py-10">
                No games or odds available for {sport.toUpperCase()} right now.
              </p>
            )}

            {mergedGames.map(game => {
              const isLive = game.scoreInfo && !game.scoreInfo.completed;
              const isCompleted = game.scoreInfo?.completed;

              return (
                <div
                  key={game.id}
                  className="rounded-xl shadow-lg p-6 transition-all border bg-white border-gray-200"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold">
                        {game.homeTeam} vs {game.awayTeam}
                      </h3>
                      {game.hasPotentialArb && (
                        <span className="text-green-500 font-bold" title="Potential arbitrage opportunity">
                          ⚡
                        </span>
                      )}
                    </div>
                    {game.isSaved ? (
                      <button
                        onClick={() => removeFromWatchlist(game.id)}
                        className="text-yellow-500 hover:text-yellow-400 font-medium"
                      >
                        ★ Saved
                      </button>
                    ) : (
                      <button
                        onClick={() => saveToWatchlist(game.id)}
                        className="text-gray-400 hover:text-yellow-500 font-medium"
                      >
                        ☆ Save
                      </button>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-3">
                    {new Date(game.startTime).toLocaleString()} • {game.venue || 'Unknown'}
                  </p>

                  {isLive && game.scoreInfo && (
                    <p className="text-2xl font-bold text-green-500 mb-4">
                      LIVE: {game.scoreInfo.homeScore} - {game.scoreInfo.awayScore}
                    </p>
                  )}
                  {isCompleted && game.scoreInfo && (
                    <p className="text-2xl font-bold mb-4">
                      FINAL: {game.scoreInfo.homeScore} - {game.scoreInfo.awayScore}
                    </p>
                  )}

                  <div className="space-y-2 text-sm mb-5">
                    <div>
                      <strong>Moneyline:</strong><br />
                      {game.homeTeam}: {game.odds?.moneyline?.home ?? 'N/A'}<br />
                      {game.awayTeam}: {game.odds?.moneyline?.away ?? 'N/A'}
                    </div>
                    <div>
                      <strong>Spread:</strong> {game.homeTeam} {game.odds?.spread?.home ?? 'N/A'} • Total: {game.odds?.total?.line ?? 'N/A'}
                    </div>
                  </div>

                  {game.prediction ? (
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                      <strong className="block mb-2 text-lg">Prediction:</strong>
                      <span className="font-bold text-blue-700">{game.prediction.winner}</span> wins<br />
                      <strong>Confidence:</strong> <ConfidenceGauge confidence={game.prediction.confidence} size="medium" showLabel={false} />
                      <strong>Projected:</strong> {game.prediction.score.home} - {game.prediction.score.away}
                      {game.prediction.edge > 0 && (
                        <div className="mt-2 text-green-600 font-bold">
                          +{game.prediction.edge}% Edge
                        </div>
                      )}

                      {game.prediction.keyFactors && game.prediction.keyFactors.length > 0 && (
                        <div className="mt-4">
                          <strong>Key Factors:</strong>
                          <ul className="list-disc ml-5 mt-2 space-y-1 text-sm">
                            {game.prediction.keyFactors.map((factor: string, i: number) => (
                              <li key={i}>{factor}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => predictGame(game.id)}
                      disabled={loading}
                      className={`w-full py-3 rounded-lg font-medium text-white transition-colors ${loading ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                      Run Prediction
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {watchlist.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-4">
              Watchlist ({watchlist.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mergedGames
                .filter(game => watchlist.includes(game.id))
                .map(game => (
                  <div
                    key={game.id}
                    className="p-4 rounded-lg border bg-white border-gray-200"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold">
                        {game.homeTeam} vs {game.awayTeam}
                      </h4>
                      <button
                        onClick={() => removeFromWatchlist(game.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                    {game.prediction && (
                      <p className="mt-2 text-sm">
                        Prediction: <span className="font-bold text-blue-700">{game.prediction.winner}</span> (<ConfidenceGauge confidence={game.prediction.confidence} size="small" showLabel={false} />)
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        <footer className="mt-16 text-center text-sm text-gray-500">
          © 2026 PROGNO • Cevict Flux v2.0 • Claude Effect Engine<br />
          For entertainment purposes only. Gamble responsibly.
        </footer>
      </div>
    </div>
  );
}
