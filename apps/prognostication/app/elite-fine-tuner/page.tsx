'use client';

import BannerPlaceholder from '@/components/BannerPlaceholder';
import { BarChart3, CheckCircle, Play, Settings, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface FactorWeights {
  weather: number;
  injuries: number;
  turnoverPercentage: number;
  homeFieldAdvantage: number;
  recentForm: number;
  headToHead: number;
  restDays: number;
  offensiveEfficiency: number;
  defensiveEfficiency: number;
  coaching: number;
}

interface SimulationResult {
  gameId: string;
  game: string;
  team1: string;
  team2: string;
  team1WinProbability: number;
  team2WinProbability: number;
  team1CoverProbability: number;
  team2CoverProbability: number;
  overProbability: number;
  underProbability: number;
  recommendedPick: string;
  confidence: number;
  averageScore: {
    team1: number;
    team2: number;
  };
}

interface CompleteGameAnalysis {
  game: {
    homeTeam: string;
    awayTeam: string;
    league: string;
    sport: string;
    date: string;
    odds: {
      home: number;
      away: number;
      spread?: number;
      total?: number;
    };
  };
  prediction: {
    predictedWinner: string;
    confidence: number;
    confidencePercentage: number;
    edge: number;
    edgePercentage: number;
    quality: number;
    qualityPercentage: number;
    predictedScore: {
      home: number;
      away: number;
    };
    recommendedPick: string;
    recommendedBet: any;
  };
  confidenceBreakdown: {
    baseConfidence: number;
    consensusCalibration: number;
    simulationBoost: number;
    adjustedConfidence: number;
    confidenceSources: Array<{
      method: string;
      confidence: number;
      weight: number;
      contribution: number;
    }>;
  };
  wagerAnalysis: {
    recommendedWager: number;
    wagerPercentage: number;
    kellyFraction: number;
    kellyPercentage: number;
    method: string;
    reasoning: string;
    expectedValue: number | null;
    potentialReturn: {
      ifWin: number;
      ifLoss: number;
      netProfit: number;
    } | null;
  } | null;
  analysis: {
    reasoning: string[];
    riskFactors: string[];
    methods: any[];
    keyFactors: string[];
    teamStats: any;
    recentForm: any;
    weather: any;
    injuries: any;
  };
  simulations: {
    count: number;
    consensusWinner: string;
    consensusPercentage: number;
    consensusBet: any;
    consensusBetPercentage: number;
    consensusStrength: number;
    betConsensusStrength: number;
  };
}

export default function EliteFineTuner() {
  const [userTier, setUserTier] = useState<'free' | 'pro' | 'elite'>('free');
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [availableGames, setAvailableGames] = useState<any[]>([]);
  const [simulationCount, setSimulationCount] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const [completeAnalysis, setCompleteAnalysis] = useState<CompleteGameAnalysis | null>(null);
  const [analyzingGame, setAnalyzingGame] = useState(false);
  const [bankroll, setBankroll] = useState<string>('1000');
  const [riskProfile, setRiskProfile] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [weights, setWeights] = useState<FactorWeights>({
    weather: 10,
    injuries: 15,
    turnoverPercentage: 12,
    homeFieldAdvantage: 8,
    recentForm: 15,
    headToHead: 10,
    restDays: 5,
    offensiveEfficiency: 10,
    defensiveEfficiency: 10,
    coaching: 5,
  });

  useEffect(() => {
    checkUserTier();
    loadAvailableGames();
  }, []);

  const checkUserTier = async () => {
    try {
      const email = localStorage.getItem('user_email') || sessionStorage.getItem('user_email');
      const sessionId = new URLSearchParams(window.location.search).get('session_id');

      if (email || sessionId) {
        const params = new URLSearchParams();
        if (email) params.set('email', email);
        if (sessionId) params.set('session_id', sessionId);

        const res = await fetch(`/api/user/tier?${params.toString()}`);
        const data = await res.json();

        if (data?.tier) {
          setUserTier(data.tier);
          if (data.tier !== 'elite') {
            // Redirect non-elite users
            window.location.href = '/pricing';
          }
        }
      } else {
        window.location.href = '/pricing';
      }
    } catch (err) {
      console.error('Failed to check user tier:', err);
    }
  };

  const loadAvailableGames = async () => {
    try {
      const res = await fetch('/api/picks/today');
      const data = await res.json();

      if (data?.success) {
        // Combine all picks to get available games
        const allPicks = [
          ...(data.free || []),
          ...(data.pro || []),
          ...(data.elite || []),
        ];
        setAvailableGames(allPicks);
        if (allPicks.length > 0) {
          setSelectedGame(allPicks[0].gameId);
        }
      }
    } catch (err) {
      console.error('Failed to load games:', err);
    }
  };

  const updateWeight = (factor: keyof FactorWeights, value: number) => {
    setWeights(prev => ({ ...prev, [factor]: value }));
  };

  const normalizeWeights = () => {
    const total = Object.values(weights).reduce((sum, val) => sum + val, 0);
    if (total === 0) return weights;

    const normalized: FactorWeights = {} as FactorWeights;
    Object.keys(weights).forEach(key => {
      normalized[key as keyof FactorWeights] = (weights[key as keyof FactorWeights] / total) * 100;
    });
    return normalized;
  };

  const runSimulation = async () => {
    if (!selectedGame) {
      alert('Please select a game');
      return;
    }

    setSimulating(true);
    setResults([]);
    setError(null);

    try {
      const normalizedWeights = normalizeWeights();

      const res = await fetch('/api/elite/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: selectedGame,
          weights: normalizedWeights,
          simulationCount,
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        throw new Error(`Failed to parse response: ${res.status} ${res.statusText}`);
      }

      if (!res.ok) {
        const errorMessage = data?.error || data?.details || `HTTP ${res.status}: ${res.statusText}`;
        throw new Error(errorMessage);
      }

      if (data?.success && data?.results) {
        setResults(data.results);
        setError(null);
      } else {
        const errorMessage = data?.error || data?.details || 'Simulation failed - no results returned';
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error('Simulation error:', err);
      const errorMessage = err?.message || 'Failed to run simulation. Please check your configuration and try again.';
      setError(errorMessage);
      alert(`Error: ${errorMessage}\n\nPossible causes:\n- Missing PROGNO_API_URL environment variable\n- Progno API is not running\n- Network connection issue\n- Invalid game ID`);
    } finally {
      setSimulating(false);
    }
  };

  const resetWeights = () => {
    setWeights({
      weather: 10,
      injuries: 15,
      turnoverPercentage: 12,
      homeFieldAdvantage: 8,
      recentForm: 15,
      headToHead: 10,
      restDays: 5,
      offensiveEfficiency: 10,
      defensiveEfficiency: 10,
      coaching: 5,
    });
  };

  const analyzeGame = async () => {
    if (!selectedGame) {
      alert('Please select a game');
      return;
    }

    setAnalyzingGame(true);
    setCompleteAnalysis(null);
    setError(null);

    try {
      // Get game data from available games
      const game = availableGames.find(g => g.gameId === selectedGame);
      if (!game) {
        throw new Error('Game not found');
      }

      // Call analyze-game API - use production URL only
      const prognoUrl = process.env.NEXT_PUBLIC_PROGNO_URL || process.env.NEXT_PUBLIC_PROGNO_BASE_URL;
      if (!prognoUrl) {
        throw new Error('PROGNO_URL not configured. Please set NEXT_PUBLIC_PROGNO_URL or NEXT_PUBLIC_PROGNO_BASE_URL environment variable.');
      }

      // Use new API v2.0 endpoint
      const gameId = game.gameId || `${game.sport}-${game.homeTeam?.toLowerCase().replace(/\s+/g, '-')}-${game.awayTeam?.toLowerCase().replace(/\s+/g, '-')}`;
      const res = await fetch(`${prognoUrl.replace(/\/+$/, '')}/api/progno/v2?action=prediction&gameId=${gameId}&includeClaudeEffect=true&bankroll=${bankroll || 0}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      if (data.completeAnalysis) {
        setCompleteAnalysis(data.completeAnalysis);
      } else {
        // Fallback: construct from legacy response
        setCompleteAnalysis({
          game: {
            homeTeam: game.homeTeam || game.team1,
            awayTeam: game.awayTeam || game.team2,
            league: game.league || 'NFL',
            sport: game.sport || 'americanfootball',
            date: game.date || game.kickoff,
            odds: game.odds || { home: -110, away: 110 },
          },
          prediction: {
            predictedWinner: data.recommendedPick || 'TBD',
            confidence: (data.confidence || 0) / 100,
            confidencePercentage: data.confidence || 0,
            edge: data.edge || 0,
            edgePercentage: data.edge || 0,
            quality: data.quality || 0,
            qualityPercentage: (data.quality || 0) * 100,
            predictedScore: { home: 0, away: 0 },
            recommendedPick: data.recommendedPick || 'TBD',
            recommendedBet: null,
          },
          confidenceBreakdown: {
            baseConfidence: (data.confidence || 0) / 100,
            consensusCalibration: 1,
            simulationBoost: 0,
            adjustedConfidence: (data.confidence || 0) / 100,
            confidenceSources: [],
          },
          wagerAnalysis: data.recommendedWager ? {
            recommendedWager: data.recommendedWager,
            wagerPercentage: bankroll ? (data.recommendedWager / parseFloat(bankroll)) * 100 : 0,
            kellyFraction: data.kellyFraction || 0,
            kellyPercentage: (data.kellyFraction || 0) * 100,
            method: data.method || 'Unknown',
            reasoning: data.betReasoning || '',
            expectedValue: null,
            potentialReturn: null,
          } : null,
          analysis: {
            reasoning: [],
            riskFactors: [],
            methods: [],
            keyFactors: [],
            teamStats: null,
            recentForm: null,
            weather: null,
            injuries: null,
          },
          simulations: {
            count: data.simulations?.count || 0,
            consensusWinner: data.simulations?.consensusWinner || 'TBD',
            consensusPercentage: data.simulations?.consensusPercentage || 0,
            consensusBet: data.simulations?.consensusBet || null,
            consensusBetPercentage: data.simulations?.consensusBetPercentage || 0,
            consensusStrength: 0,
            betConsensusStrength: 0,
          },
        });
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to analyze game');
    } finally {
      setAnalyzingGame(false);
    }
  };

  if (userTier !== 'elite') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-red-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">Elite Access Required</h1>
          <p className="text-xl mb-8">This feature is only available for Elite tier subscribers.</p>
          <Link href="/pricing" className="bg-pink-600 hover:bg-pink-700 px-8 py-4 rounded-lg text-lg font-bold">
            Upgrade to Elite
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-red-900 text-white p-8">
      {/* Header Banner */}
      <BannerPlaceholder position="header" adSlot="prognostication-elite-finetuner-header" />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-5xl font-bold mb-2">Elite Bet Fine-Tuner</h1>
              <p className="text-xl text-gray-300">Customize prediction weights and run advanced simulations</p>
            </div>
            <Link href="/picks" className="bg-pink-600 hover:bg-pink-700 px-6 py-3 rounded-lg font-bold">
              ← Back to Picks
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Game Selection */}
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-pink-500/30">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Settings className="w-6 h-6" />
                Game Selection
              </h2>
              <select
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                className="w-full bg-black/50 border border-pink-500/50 rounded-lg p-3 text-white mb-4"
              >
                {availableGames.map((game) => (
                  <option key={game.gameId} value={game.gameId}>
                    {game.game} ({game.sport})
                  </option>
                ))}
              </select>
            </div>

            {/* Simulation Settings */}
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-pink-500/30">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="w-6 h-6" />
                Simulation Settings
              </h2>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Number of Simulations: {simulationCount}
                </label>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={simulationCount}
                  onChange={(e) => setSimulationCount(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>10</span>
                  <span>500</span>
                </div>
              </div>
              <button
                onClick={runSimulation}
                disabled={simulating || !selectedGame}
                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2"
              >
                {simulating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Running Simulations...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Run Simulation
                  </>
                )}
              </button>

              {error && (
                <div className="mt-4 p-4 bg-red-900/50 border border-red-500 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 text-xl">⚠️</span>
                    <div className="flex-1">
                      <div className="font-bold text-red-400 mb-1">Error</div>
                      <div className="text-sm text-red-200">{error}</div>
                    </div>
                    <button
                      onClick={() => setError(null)}
                      className="text-red-400 hover:text-red-300"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Factor Weights */}
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-pink-500/30">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <TrendingUp className="w-6 h-6" />
                  Factor Weights
                </h2>
                <button
                  onClick={resetWeights}
                  className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded"
                >
                  Reset
                </button>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {Object.entries(weights).map(([factor, value]) => (
                  <div key={factor}>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium capitalize">
                        {factor.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      <span className="text-pink-400 font-bold">{value}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      value={value}
                      onChange={(e) => updateWeight(factor as keyof FactorWeights, Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-pink-500/30">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Weight:</span>
                  <span className="font-bold">
                    {Object.values(weights).reduce((sum, val) => sum + val, 0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2">
            {simulating && (
              <div className="bg-black/30 backdrop-blur-sm rounded-xl p-8 border border-pink-500/30 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pink-500 mx-auto mb-4"></div>
                <p className="text-xl">Running {simulationCount} simulations...</p>
                <p className="text-gray-400 mt-2">This may take a moment</p>
              </div>
            )}

            {!simulating && results.length === 0 && (
              <div className="bg-black/30 backdrop-blur-sm rounded-xl p-12 border border-pink-500/30 text-center">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-xl text-gray-400">Select a game and run a simulation to see results</p>
              </div>
            )}

            {!simulating && results.length > 0 && (
              <div className="space-y-6">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-pink-500/30"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold mb-2">{result.game}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-300">
                          <span>{result.team1}</span>
                          <span className="text-pink-400">vs</span>
                          <span>{result.team2}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-400 mb-1">Confidence</div>
                        <div className="text-3xl font-bold text-green-400">{result.confidence}%</div>
                      </div>
                    </div>

                    {/* Win Probabilities */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-black/50 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-2">{result.team1} Win</div>
                        <div className="text-2xl font-bold text-blue-400">{result.team1WinProbability.toFixed(1)}%</div>
                      </div>
                      <div className="bg-black/50 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-2">{result.team2} Win</div>
                        <div className="text-2xl font-bold text-red-400">{result.team2WinProbability.toFixed(1)}%</div>
                      </div>
                    </div>

                    {/* Cover Probabilities */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-black/50 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-2">{result.team1} Cover</div>
                        <div className="text-2xl font-bold text-green-400">{result.team1CoverProbability.toFixed(1)}%</div>
                      </div>
                      <div className="bg-black/50 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-2">{result.team2} Cover</div>
                        <div className="text-2xl font-bold text-yellow-400">{result.team2CoverProbability.toFixed(1)}%</div>
                      </div>
                    </div>

                    {/* Over/Under */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-black/50 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-2">Over</div>
                        <div className="text-2xl font-bold text-purple-400">{result.overProbability.toFixed(1)}%</div>
                      </div>
                      <div className="bg-black/50 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-2">Under</div>
                        <div className="text-2xl font-bold text-orange-400">{result.underProbability.toFixed(1)}%</div>
                      </div>
                    </div>

                    {/* Recommended Pick */}
                    <div className="mt-4 pt-4 border-t border-pink-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="font-bold">Recommended Pick:</span>
                      </div>
                      <div className="text-xl text-green-400 font-bold">{result.recommendedPick}</div>
                      <div className="text-sm text-gray-400 mt-2">
                        Average Score: {result.team1} {result.averageScore.team1.toFixed(1)} - {result.team2} {result.averageScore.team2.toFixed(1)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* In-Content Banner */}
        <div className="my-8">
          <BannerPlaceholder position="in-content" adSlot="prognostication-elite-finetuner-incontent" />
        </div>
      </div>

      {/* Footer Banner */}
      <BannerPlaceholder position="footer" adSlot="prognostication-elite-finetuner-footer" />
    </div>
  );
}

