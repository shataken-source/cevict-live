'use client';

import BannerPlaceholder from '@/components/BannerPlaceholder';
import { useEffect, useState } from 'react';

interface FactorWeights {
  weather: number;
  injuries: number;
  turnoverPercentage: number;
  homeFieldAdvantage: number;
  recentForm: number;
  h2hHistory: number;
  restDays: number;
  lineMovement: number;
}

interface SimulationResult {
  winRate: number;
  averageScore: {
    home: number;
    away: number;
  };
  confidence: number;
  iterations: number;
}

interface ParlaySuggestion {
  legs: Array<{
    game: string;
    pick: string;
    confidence: number;
  }>;
  totalConfidence: number;
  potentialPayout: number;
}

interface TeaserSuggestion {
  legs: Array<{
    game: string;
    pick: string;
    adjustedSpread: number;
    confidence: number;
  }>;
  totalConfidence: number;
  points: number; // 6, 6.5, 7, 10, etc.
}

export default function EliteBetsPage() {
  const [userTier, setUserTier] = useState<'free' | 'pro' | 'elite'>('free');
  const [loading, setLoading] = useState(true);
  const [weights, setWeights] = useState<FactorWeights>({
    weather: 50,
    injuries: 50,
    turnoverPercentage: 50,
    homeFieldAdvantage: 50,
    recentForm: 50,
    h2hHistory: 50,
    restDays: 50,
    lineMovement: 50,
  });
  const [simulationRuns, setSimulationRuns] = useState(100);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [runningSimulation, setRunningSimulation] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [parlaySuggestion, setParlaySuggestion] = useState<ParlaySuggestion | null>(null);
  const [teaserSuggestion, setTeaserSuggestion] = useState<TeaserSuggestion | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [customPosition, setCustomPosition] = useState({
    gameId: '',
    pick: '',
    spread: 0,
    total: 0,
  });

  useEffect(() => {
    checkUserTier();
  }, []);

  async function checkUserTier() {
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
        // No auth, redirect to pricing
        window.location.href = '/pricing';
      }
    } catch (err) {
      console.error('Failed to check user tier:', err);
    } finally {
      setLoading(false);
    }
  }

  async function runSimulation() {
    if (userTier !== 'elite') return;

    setRunningSimulation(true);
    setSimulationError(null);
    try {
      // Use new API v2.0 endpoint
      const gameId = customPosition.gameId || undefined;
      const url = gameId
        ? `/api/progno/v2?action=simulation&gameId=${gameId}&iterations=${simulationRuns}`
        : `/api/progno/v2?action=simulation&iterations=${simulationRuns}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weights,
          iterations: simulationRuns,
          gameId: gameId,
        }),
      });

      // Check response status before parsing JSON
      if (!res.ok) {
        let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
        try {
          const errorData = await res.json();
          errorMessage = errorData?.error || errorData?.details || errorMessage;
        } catch {
          // If JSON parsing fails, use the default error message
        }
        throw new Error(errorMessage);
      }

      // Parse JSON only after confirming response is OK
      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        throw new Error(`Failed to parse response: ${res.status} ${res.statusText}`);
      }

      if (data.success) {
        setSimulationResult(data.result);
        setSimulationError(null);
      } else {
        const errorMessage = data?.error || data?.details || 'Simulation failed - no results returned';
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error('Simulation failed:', err);
      const errorMessage = err?.message || 'Failed to run simulation. Please check your configuration and try again.';
      setSimulationError(errorMessage);
      alert(`Error: ${errorMessage}\n\nPossible causes:\n- Missing PROGNO_BASE_URL environment variable\n- Progno API is not running\n- Network connection issue`);
    } finally {
      setRunningSimulation(false);
    }
  }

  async function getParlaySuggestion() {
    setLoadingSuggestions(true);
    try {
      // Use new API v2.0 endpoint
      const res = await fetch('/api/progno/v2?action=parlay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legs: [], // Will be populated by API from available picks
          stake: 100,
          weights
        }),
      });

      const data = await res.json();
      if (data.success) {
        setParlaySuggestion(data.suggestion);
      }
    } catch (err) {
      console.error('Failed to get parlay suggestion:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function getTeaserSuggestion() {
    setLoadingSuggestions(true);
    try {
      // Use new API v2.0 endpoint
      const res = await fetch('/api/progno/v2?action=teaser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legs: [], // Will be populated by API from available picks
          points: 6,
          stake: 100,
          weights
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTeaserSuggestion(data.suggestion);
      }
    } catch (err) {
      console.error('Failed to get teaser suggestion:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  function updateWeight(factor: keyof FactorWeights, value: number) {
    setWeights(prev => ({ ...prev, [factor]: value }));
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (userTier !== 'elite') {
    return null; // Will redirect
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #1a1a2e, #16213e)',
      color: 'white',
      padding: '40px 20px',
    }}>
      {/* Header Banner */}
      <div className="mb-8">
        <BannerPlaceholder position="header" adSlot="prognostication-elite-bets-header" />
      </div>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'left' }}>
              Elite Position Fine-Tuner
            </h1>
            <p style={{ fontSize: '1.2rem', textAlign: 'left', marginBottom: '1rem', opacity: 0.9 }}>
              Customize your predictions with advanced controls
            </p>
          </div>
          <a
            href="/elite-fine-tuner"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(to right, #fbbf24, #f59e0b)',
              padding: '14px 32px',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: 'bold',
              textDecoration: 'none',
              color: '#000',
              boxShadow: '0 4px 15px rgba(251, 191, 36, 0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(251, 191, 36, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(251, 191, 36, 0.4)';
            }}
          >
            Open Fine-Tuning Page →
          </a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          {/* Factor Weights */}
          <div style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Factor Weights</h2>
            <p style={{ opacity: 0.8, marginBottom: '1.5rem' }}>Adjust how much each factor influences predictions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {Object.entries(weights).map(([factor, value]) => (
                <div key={factor}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label style={{ textTransform: 'capitalize', fontSize: '1rem' }}>
                      {factor.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    <span style={{ fontWeight: 'bold' }}>{value}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) => updateWeight(factor as keyof FactorWeights, parseInt(e.target.value))}
                    style={{ width: '100%', height: '8px', borderRadius: '4px' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Simulation Controls */}
          <div style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Simulation Settings</h2>
            <p style={{ opacity: 0.8, marginBottom: '1.5rem' }}>Run Monte Carlo simulations to test your settings</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Number of Simulations: {simulationRuns}
                </label>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={simulationRuns}
                  onChange={(e) => setSimulationRuns(parseInt(e.target.value))}
                  style={{ width: '100%', height: '8px', borderRadius: '4px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', opacity: 0.7, marginTop: '0.25rem' }}>
                  <span>10</span>
                  <span>500</span>
                </div>
              </div>

              {simulationError && (
                <div style={{
                  padding: '1rem',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', color: '#fca5a5', marginBottom: '4px' }}>Error</div>
                      <div style={{ fontSize: '0.9rem', color: '#fee2e2' }}>{simulationError}</div>
                    </div>
                    <button
                      onClick={() => setSimulationError(null)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#fca5a5',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        padding: '0 4px'
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={runSimulation}
                disabled={runningSimulation}
                style={{
                  padding: '1rem 2rem',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  background: runningSimulation ? '#666' : 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: runningSimulation ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                }}
              >
                {runningSimulation ? 'Running Simulation...' : 'Run Simulation'}
              </button>

              {simulationResult && (
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '8px',
                }}>
                  <h3 style={{ marginBottom: '0.5rem' }}>Simulation Results</h3>
                  <p>Win Rate: {(simulationResult.winRate * 100).toFixed(1)}%</p>
                  <p>Confidence: {(simulationResult.confidence * 100).toFixed(1)}%</p>
                  <p>Iterations: {simulationResult.iterations}</p>
                  <p>Avg Score: {simulationResult.averageScore.home} - {simulationResult.averageScore.away}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Custom Position Creation */}
        <div style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Create Custom Position</h2>
          <p style={{ opacity: 0.8, marginBottom: '1.5rem' }}>Build your own position with custom parameters</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Game ID</label>
                <input
                  type="text"
                  value={customPosition.gameId}
                  onChange={(e) => setCustomPosition(prev => ({ ...prev, gameId: e.target.value }))}
                  placeholder="Enter game ID"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    background: 'rgba(0, 0, 0, 0.3)',
                    color: 'white',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Spread</label>
                <input
                  type="number"
                  value={customPosition.spread}
                  onChange={(e) => setCustomPosition(prev => ({ ...prev, spread: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    background: 'rgba(0, 0, 0, 0.3)',
                    color: 'white',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Total</label>
                <input
                  type="number"
                  value={customPosition.total}
                  onChange={(e) => setCustomPosition(prev => ({ ...prev, total: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    background: 'rgba(0, 0, 0, 0.3)',
                    color: 'white',
                  }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Pick</label>
              <input
                type="text"
                value={customPosition.pick}
                onChange={(e) => setCustomPosition(prev => ({ ...prev, pick: e.target.value }))}
                placeholder="e.g., Home Team -3.5"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(0, 0, 0, 0.3)',
                  color: 'white',
                }}
              />
            </div>
          </div>
        </div>

        {/* Parlay & Teaser Suggestions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Parlay Suggestions</h2>
            <p style={{ opacity: 0.8, marginBottom: '1.5rem' }}>Get AI-recommended parlay positions</p>
            <div>
              <button
                onClick={getParlaySuggestion}
                disabled={loadingSuggestions}
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  background: loadingSuggestions ? '#666' : 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loadingSuggestions ? 'not-allowed' : 'pointer',
                  marginBottom: '1rem',
                }}
              >
                {loadingSuggestions ? 'Loading...' : 'Get Best Parlay Suggestion'}
              </button>

              {parlaySuggestion && (
                <div style={{
                  padding: '1rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '8px',
                }}>
                  <h4 style={{ marginBottom: '0.5rem' }}>Recommended Parlay</h4>
                  <p style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Confidence: {(parlaySuggestion.totalConfidence * 100).toFixed(1)}%
                  </p>
                  <p style={{ marginBottom: '0.5rem' }}>
                    Potential Payout: {parlaySuggestion.potentialPayout.toFixed(2)}x
                  </p>
                  <div style={{ marginTop: '1rem' }}>
                    <strong>Legs:</strong>
                    {parlaySuggestion.legs.map((leg, idx) => (
                      <div key={idx} style={{ marginTop: '0.5rem', paddingLeft: '1rem' }}>
                        <p>{leg.game}: {leg.pick} ({(leg.confidence * 100).toFixed(1)}%)</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Teaser Suggestions</h2>
            <p style={{ opacity: 0.8, marginBottom: '1.5rem' }}>Get AI-recommended teaser positions</p>
            <div>
              <button
                onClick={getTeaserSuggestion}
                disabled={loadingSuggestions}
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  background: loadingSuggestions ? '#666' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loadingSuggestions ? 'not-allowed' : 'pointer',
                  marginBottom: '1rem',
                }}
              >
                {loadingSuggestions ? 'Loading...' : 'Get Best Teaser Suggestion'}
              </button>

              {teaserSuggestion && (
                <div style={{
                  padding: '1rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '8px',
                }}>
                  <h4 style={{ marginBottom: '0.5rem' }}>Recommended Teaser</h4>
                  <p style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Points: {teaserSuggestion.points}
                  </p>
                  <p style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Confidence: {(teaserSuggestion.totalConfidence * 100).toFixed(1)}%
                  </p>
                  <div style={{ marginTop: '1rem' }}>
                    <strong>Legs:</strong>
                    {teaserSuggestion.legs.map((leg, idx) => (
                      <div key={idx} style={{ marginTop: '0.5rem', paddingLeft: '1rem' }}>
                        <p>{leg.game}: {leg.pick} ({leg.adjustedSpread > 0 ? '+' : ''}{leg.adjustedSpread}) ({(leg.confidence * 100).toFixed(1)}%)</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button
            onClick={() => {
              setWeights({
                weather: 50,
                injuries: 50,
                turnoverPercentage: 50,
                homeFieldAdvantage: 50,
                recentForm: 50,
                h2hHistory: 50,
                restDays: 50,
                lineMovement: 50,
              });
              setSimulationRuns(100);
              setSimulationResult(null);
              setParlaySuggestion(null);
              setTeaserSuggestion(null);
            }}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}

