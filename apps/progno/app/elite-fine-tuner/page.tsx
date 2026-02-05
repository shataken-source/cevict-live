'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface MethodWeights {
  statisticalModel: number;
  eloRating: number;
  recentForm: number;
  headToHead: number;
  marketEfficiency: number;
  weatherImpact: number;
  injuryImpact: number;
  homeAdvantage: number;
  momentum: number;
  machineLearning: number;
}

interface SimulationSettings {
  simulationCount: number;
  varianceFactor: number;
  confidenceThreshold: number;
  edgeThreshold: number;
}

export default function EliteFineTunerPage() {
  const router = useRouter();
  const [userTier, setUserTier] = useState<'free' | 'pro' | 'elite' | 'checking'>('checking');
  const [league, setLeague] = useState('NFL');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'fine-tune' | 'parlay' | 'teaser'>('fine-tune');

  // Method weights (0-200, default 100 = 1.0x)
  const [weights, setWeights] = useState<MethodWeights>({
    statisticalModel: 100,
    eloRating: 100,
    recentForm: 100,
    headToHead: 100,
    marketEfficiency: 120,
    weatherImpact: 60,
    injuryImpact: 80,
    homeAdvantage: 70,
    momentum: 90,
    machineLearning: 150,
  });

  // Simulation settings
  const [simSettings, setSimSettings] = useState<SimulationSettings>({
    simulationCount: 500,
    varianceFactor: 150, // 1.5x default
    confidenceThreshold: 60,
    edgeThreshold: 2.0,
  });

  // Parlay/Teaser settings
  const [parlayLegs, setParlayLegs] = useState(3);
  const [teaserLegs, setTeaserLegs] = useState(2);
  const [teaserPoints, setTeaserPoints] = useState(6);

  // Bankroll management
  const [bankroll, setBankroll] = useState('1000');
  const [riskProfile, setRiskProfile] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');

  const updateWeight = (key: keyof MethodWeights, value: number) => {
    setWeights(prev => ({ ...prev, [key]: value }));
  };

  const updateSimSetting = (key: keyof SimulationSettings, value: number) => {
    setSimSettings(prev => ({ ...prev, [key]: value }));
  };

  // Check user tier on mount
  useEffect(() => {
    async function checkUserTier() {
      try {
        // Try to get email from localStorage/sessionStorage (if coming from prognostication)
        const email = typeof window !== 'undefined'
          ? (localStorage.getItem('user_email') || sessionStorage.getItem('user_email'))
          : null;
        const sessionId = typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('session_id')
          : null;

        if (email || sessionId) {
          // Check with prognostication API if available
          const prognoUrl = process.env.NEXT_PUBLIC_PROGNO_BASE_URL || 'https://prognostication.com';
          const params = new URLSearchParams();
          if (email) params.set('email', email);
          if (sessionId) params.set('session_id', sessionId);

          try {
            const res = await fetch(`${prognoUrl}/api/user/tier?${params.toString()}`);
            const data = await res.json();
            if (data?.tier) {
              setUserTier(data.tier);
              if (data.tier !== 'elite') {
                // Not elite, show access denied
                return;
              }
            } else {
              setUserTier('free');
            }
          } catch (err) {
            console.warn('Could not verify tier, allowing access for development');
            setUserTier('elite'); // Allow in development
          }
        } else {
          // No auth info, assume free tier
          setUserTier('free');
        }
      } catch (err) {
        console.error('Error checking user tier:', err);
        setUserTier('free');
      }
    }
    checkUserTier();
  }, []);

  const handleFineTune = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // Get today and tomorrow's games
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const todayStr = today.toISOString().split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const sportMap: Record<string, string> = {
        'NFL': 'americanfootball_nfl',
        'NBA': 'basketball_nba',
        'MLB': 'baseball_mlb',
        'NHL': 'icehockey_nhl',
        'NCAAF': 'americanfootball_ncaaf',
        'NCAAB': 'basketball_ncaab',
      };

      const sportKey = sportMap[league] || 'americanfootball_nfl';

      // Fetch games
      const oddsResponse = await fetch(`/api/progno/odds?sport=${sportKey}&dateFrom=${todayStr}&dateTo=${tomorrowStr}`);
      if (!oddsResponse.ok) {
        throw new Error('Failed to fetch games');
      }

      const games = await oddsResponse.json();
      const filteredGames = games.filter((game: any) => {
        if (!game.commence_time) return false;
        const gameDate = new Date(game.commence_time).toISOString().split('T')[0];
        return gameDate === todayStr || gameDate === tomorrowStr;
      });

      if (filteredGames.length === 0) {
        throw new Error('No games found for selected dates');
      }

      // Analyze games with custom weights
      const analysisResults = [];
      for (const game of filteredGames.slice(0, 10)) { // Limit to 10 games for performance
        try {
          const analyzeResponse = await fetch('/api/progno/elite-analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gameData: game,
              simulationCount: simSettings.simulationCount,
              varianceFactor: simSettings.varianceFactor / 100, // Convert to decimal
              methodWeights: {
                'statistical-model': weights.statisticalModel / 100,
                'elo-rating': weights.eloRating / 100,
                'recent-form': weights.recentForm / 100,
                'head-to-head': weights.headToHead / 100,
                'market-efficiency': weights.marketEfficiency / 100,
                'weather-impact': weights.weatherImpact / 100,
                'injury-impact': weights.injuryImpact / 100,
                'home-advantage': weights.homeAdvantage / 100,
                'momentum': weights.momentum / 100,
                'machine-learning': weights.machineLearning / 100,
              },
              confidenceThreshold: simSettings.confidenceThreshold / 100,
              edgeThreshold: simSettings.edgeThreshold,
              bankroll: parseFloat(bankroll) || 1000,
              riskProfile: riskProfile,
            }),
          });

          if (analyzeResponse.ok) {
            const data = await analyzeResponse.json();
            if (data.confidence >= simSettings.confidenceThreshold && Math.abs(data.edge) >= simSettings.edgeThreshold) {
              analysisResults.push({
                game: `${game.away_team} @ ${game.home_team}`,
                ...data,
              });
            }
          }
        } catch (err) {
          console.error(`Error analyzing game ${game.id}:`, err);
        }
      }

      setResults({
        gamesAnalyzed: filteredGames.length,
        picksGenerated: analysisResults.length,
        picks: analysisResults.sort((a, b) => b.confidence - a.confidence),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to analyze games');
    } finally {
      setLoading(false);
    }
  };

  const handleGetParlay = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // Use new API v2.0 endpoint
      const response = await fetch('/api/progno/v2?action=parlay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numberOfLegs: parlayLegs,
          minConfidence: simSettings.confidenceThreshold,
          minEdge: simSettings.edgeThreshold,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResults(data);
      } else {
        setError(data.error || 'Failed to generate parlay');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get parlay suggestion');
    } finally {
      setLoading(false);
    }
  };

  const handleGetTeaser = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // Use new API v2.0 endpoint
      const response = await fetch('/api/progno/v2?action=teaser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numberOfLegs: teaserLegs,
          points: teaserPoints,
          minConfidence: simSettings.confidenceThreshold,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResults(data);
      } else {
        setError(data.error || 'Failed to generate teaser');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get teaser suggestion');
    } finally {
      setLoading(false);
    }
  };

  // Show access denied for non-elite users
  if (userTier === 'checking') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <div>Checking access...</div>
        </div>
      </div>
    );
  }

  if (userTier !== 'elite') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        padding: '2rem',
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '600px',
          background: 'rgba(0, 0, 0, 0.3)',
          padding: '3rem',
          borderRadius: '16px',
          border: '2px solid rgba(255, 107, 0, 0.5)',
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Elite Access Required
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '2rem' }}>
            The Elite Bet Fine-Tuner is exclusively available for Elite tier subscribers.
          </p>
          <p style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '2rem' }}>
            Upgrade to Elite to unlock advanced prediction customization, factor weight adjustments, and unlimited simulations.
          </p>
          <a
            href="https://prognostication.com/pricing"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #ff6b00 0%, #ffab00 100%)',
              color: '#000',
              padding: '1rem 2rem',
              borderRadius: '8px',
              fontSize: '1.125rem',
              fontWeight: 'bold',
              textDecoration: 'none',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              cursor: 'pointer',
            }}
          >
            Upgrade to Elite →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      padding: '2rem',
      color: 'white',
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              marginBottom: '1rem',
            }}
          >
            ← Back to Home
          </button>
          <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            ⚡ Elite Fine-Tuner
          </h1>
          <p style={{ fontSize: '1.125rem', color: 'rgba(255, 255, 255, 0.7)' }}>
            Advanced prediction engine tuning for Elite users only
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
        }}>
          {[
            { id: 'fine-tune', label: '🎯 Fine-Tune Engine', icon: '⚙️' },
            { id: 'parlay', label: '🎲 Best Parlay', icon: '🎲' },
            { id: 'teaser', label: '🎯 Best Teaser', icon: '🎯' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '1rem 2rem',
                background: activeTab === tab.id
                  ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                  : 'transparent',
                border: 'none',
                borderRadius: '8px 8px 0 0',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold',
                borderBottom: activeTab === tab.id ? '3px solid #60a5fa' : 'none',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Fine-Tune Tab */}
        {activeTab === 'fine-tune' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '2rem',
          }}>
            {/* Left Column - Method Weights */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '2rem',
            }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#60a5fa' }}>
                📊 Prediction Method Weights
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '1.5rem' }}>
                Adjust how much each prediction method influences the final result. 100 = default weight.
              </p>

              {Object.entries(weights).map(([key, value]) => (
                <div key={key} style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </label>
                    <span style={{ fontSize: '0.875rem', color: '#60a5fa', fontWeight: 'bold' }}>
                      {value}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={value}
                    onChange={(e) => updateWeight(key as keyof MethodWeights, parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      height: '8px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.25rem' }}>
                    <span>0% (Disabled)</span>
                    <span>200% (2x Weight)</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column - Simulation Settings */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '2rem',
            }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#10b981' }}>
                🎲 Simulation Settings
              </h2>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                  League
                </label>
                <select
                  value={league}
                  onChange={(e) => setLeague(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.95)',
                    color: '#1a1a1a',
                    fontSize: '1rem',
                  }}
                >
                  <option value="NFL">NFL</option>
                  <option value="NBA">NBA</option>
                  <option value="MLB">MLB</option>
                  <option value="NHL">NHL</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                  Bankroll ($)
                </label>
                <input
                  type="number"
                  value={bankroll}
                  onChange={(e) => setBankroll(e.target.value)}
                  min="100"
                  step="100"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.95)',
                    color: '#1a1a1a',
                    fontSize: '1rem',
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.25rem' }}>
                  Total bankroll for bet sizing calculations
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                  Risk Profile
                </label>
                <select
                  value={riskProfile}
                  onChange={(e) => setRiskProfile(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.95)',
                    color: '#1a1a1a',
                    fontSize: '1rem',
                  }}
                >
                  <option value="conservative">Conservative (25% Kelly)</option>
                  <option value="balanced">Balanced (50% Kelly)</option>
                  <option value="aggressive">Aggressive (75% Kelly)</option>
                </select>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.25rem' }}>
                  Controls bet size relative to Kelly Criterion
                </div>
              </div>

              {Object.entries(simSettings).map(([key, value]) => (
                <div key={key} style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </label>
                    <span style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: 'bold' }}>
                      {key === 'confidenceThreshold' || key === 'edgeThreshold'
                        ? (key === 'confidenceThreshold' ? `${value}%` : `${value}%`)
                        : key === 'varianceFactor' ? `${value}%` : value}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={key === 'simulationCount' ? 10 : key === 'varianceFactor' ? 50 : key === 'confidenceThreshold' ? 50 : 0}
                    max={key === 'simulationCount' ? 1000 : key === 'varianceFactor' ? 300 : key === 'confidenceThreshold' ? 90 : key === 'edgeThreshold' ? 10 : 100}
                    step={key === 'simulationCount' ? 10 : key === 'varianceFactor' ? 5 : key === 'confidenceThreshold' ? 1 : key === 'edgeThreshold' ? 0.1 : 1}
                    value={value}
                    onChange={(e) => updateSimSetting(key as keyof SimulationSettings, parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      height: '8px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      outline: 'none',
                    }}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.25rem' }}>
                    {key === 'simulationCount' && 'More simulations = more accurate but slower'}
                    {key === 'varianceFactor' && 'Higher variance = more diverse simulation outcomes'}
                    {key === 'confidenceThreshold' && 'Minimum confidence to include in picks'}
                    {key === 'edgeThreshold' && 'Minimum edge percentage to include'}
                  </div>
                </div>
              ))}

              <button
                onClick={handleFineTune}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1.125rem',
                  fontWeight: 'bold',
                  background: loading ? '#64748b' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginTop: '1rem',
                }}
              >
                {loading ? '⏳ Analyzing...' : '🚀 Run Fine-Tuned Analysis'}
              </button>
            </div>
          </div>
        )}

        {/* Parlay Tab */}
        {activeTab === 'parlay' && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            padding: '2rem',
          }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#a78bfa' }}>
              🎲 Best Parlay Recommendation
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '2rem' }}>
              Get Progno's best parlay recommendation based on your settings
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                Number of Legs: {parlayLegs}
              </label>
              <input
                type="range"
                min="2"
                max="5"
                value={parlayLegs}
                onChange={(e) => setParlayLegs(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.25rem' }}>
                <span>2 legs</span>
                <span>5 legs</span>
              </div>
            </div>

            <button
              onClick={handleGetParlay}
              disabled={loading}
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1.125rem',
                fontWeight: 'bold',
                background: loading ? '#64748b' : 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '⏳ Generating Parlay...' : '🎲 Get Best Parlay'}
            </button>
          </div>
        )}

        {/* Teaser Tab */}
        {activeTab === 'teaser' && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            padding: '2rem',
          }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#f59e0b' }}>
              🎯 Best Teaser Recommendation
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '2rem' }}>
              Get Progno's best teaser recommendation with adjusted spreads/totals
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                Number of Legs: {teaserLegs}
              </label>
              <input
                type="range"
                min="2"
                max="4"
                value={teaserLegs}
                onChange={(e) => setTeaserLegs(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                Teaser Points: {teaserPoints}
              </label>
              <input
                type="range"
                min="4"
                max="10"
                step="0.5"
                value={teaserPoints}
                onChange={(e) => setTeaserPoints(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.25rem' }}>
                <span>4 points</span>
                <span>10 points</span>
              </div>
            </div>

            <button
              onClick={handleGetTeaser}
              disabled={loading}
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1.125rem',
                fontWeight: 'bold',
                background: loading ? '#64748b' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '⏳ Generating Teaser...' : '🎯 Get Best Teaser'}
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#fca5a5',
          }}>
            ❌ {error}
          </div>
        )}

        {/* Results Display */}
        {results && (
          <div style={{
            marginTop: '2rem',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            padding: '2rem',
          }}>
            {activeTab === 'fine-tune' && results.picks && (
              <>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#10b981' }}>
                  📊 Analysis Results
                </h2>
                <div style={{ marginBottom: '1.5rem', fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                  Analyzed {results.gamesAnalyzed} games • Generated {results.picksGenerated} picks
                </div>
                {results.picks.length > 0 ? (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {results.picks.map((pick: any, index: number) => (
                      <div
                        key={index}
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '12px',
                          padding: '1.5rem',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                          <div>
                            <div style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                              {pick.game}
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#60a5fa' }}>
                              {pick.recommendedPick || 'TBD'}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', flexWrap: 'wrap' }}>
                          <div>
                            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Confidence: </span>
                            <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>{pick.confidence}%</span>
                          </div>
                          <div>
                            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Edge: </span>
                            <span style={{ color: '#10b981', fontWeight: 'bold' }}>{pick.edge > 0 ? '+' : ''}{pick.edge}%</span>
                          </div>
                          <div>
                            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Quality: </span>
                            <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>{pick.quality?.toFixed(1)}</span>
                          </div>
                          {pick.recommendedWager !== undefined && (
                            <div>
                              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Wager: </span>
                              <span style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '1rem' }}>
                                ${pick.recommendedWager?.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                        {pick.betReasoning && (
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                            {pick.betReasoning}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    No picks met your confidence and edge thresholds. Try lowering them.
                  </div>
                )}
              </>
            )}

            {activeTab === 'parlay' && results.legs && (
              <>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#a78bfa' }}>
                  🎲 Recommended Parlay ({results.legs.length} legs)
                </h2>
                <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
                  <div>
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Total Confidence: </span>
                    <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>
                      {(results.totalConfidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Potential Payout: </span>
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                      {results.potentialPayout.toFixed(1)}x
                    </span>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {results.legs.map((leg: any, index: number) => (
                    <div
                      key={index}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '1rem',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                      }}
                    >
                      <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Leg {index + 1}</div>
                      <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                        {leg.game}
                      </div>
                      <div style={{ fontSize: '1rem', color: '#a78bfa', fontWeight: 'bold', marginTop: '0.25rem' }}>
                        {leg.pick}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.25rem' }}>
                        Confidence: {(leg.confidence * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'teaser' && results.legs && (
              <>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#f59e0b' }}>
                  🎯 Recommended Teaser ({results.legs.length} legs, {results.points} points)
                </h2>
                <div style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Total Confidence: </span>
                  <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                    {(results.totalConfidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {results.legs.map((leg: any, index: number) => (
                    <div
                      key={index}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '1rem',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                      }}
                    >
                      <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Leg {index + 1}</div>
                      <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                        {leg.game}
                      </div>
                      <div style={{ fontSize: '1rem', color: '#f59e0b', fontWeight: 'bold', marginTop: '0.25rem' }}>
                        {leg.pick}
                      </div>
                      {leg.adjustedSpread !== undefined && (
                        <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem' }}>
                          Adjusted: {leg.adjustedSpread > 0 ? '+' : ''}{leg.adjustedSpread.toFixed(1)}
                        </div>
                      )}
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.25rem' }}>
                        Confidence: {(leg.confidence * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

