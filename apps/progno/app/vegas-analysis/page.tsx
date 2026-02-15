'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function VegasAnalysis() {
  const router = useRouter();
  const [league, setLeague] = useState('NFL');
  const [bankroll, setBankroll] = useState('1000');
  const [riskProfile, setRiskProfile] = useState('balanced');
  const [confidenceThreshold, setConfidenceThreshold] = useState('10');
  const [simulationCount, setSimulationCount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [picks, setPicks] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [games, setGames] = useState<any[]>([]);

  const handleFetchOdds = async () => {
    setLoading(true);
    setMessage('Fetching live odds...');

    try {
      const sportMap: Record<string, string> = {
        'NFL': 'nfl',
        'NBA': 'nba',
        'MLB': 'mlb',
        'NHL': 'nhl',
        'NCAAF': 'cfb',
        'NCAAB': 'cbb',
        'NASCAR': 'nascar',
      };
      const sport = sportMap[league] || 'nfl';
      const date = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/progno/v2?action=games&sport=${sport}&date=${date}`);
      const data = await response.json();

      if (!response.ok) {
        let errorMsg = data?.error?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
        errorMsg = errorMsg.replace(/^Failed to fetch[:\s]*/gi, '').trim();
        throw new Error(errorMsg || 'Unknown error occurred');
      }

      const list = data?.data || [];
      setGames(list);
      setMessage(`✅ Fetched ${list.length} games for ${league}`);
    } catch (error: any) {
      // Extract a more user-friendly error message
      let errorMsg = error.message || 'Unknown error occurred';

      // Remove duplicate "Failed to fetch odds" prefix if present
      errorMsg = errorMsg
        .replace(/^Failed to fetch odds[:\s]*/gi, '')
        .replace(/^Failed to fetch[:\s]*/gi, '')
        .trim();

      // Check if it's an API key error
      if (errorMsg.includes('ODDS_API_KEY') || errorMsg.includes('API key') || errorMsg.includes('not set') || errorMsg.includes('not configured')) {
        errorMsg = 'ODDS_API_KEY not configured. Please set it in environment variables or use the admin panel.';
      }

      // Network errors
      if (errorMsg.includes('fetch') || errorMsg.includes('network') || errorMsg.includes('NetworkError')) {
        errorMsg = 'Network error. Please check your connection and try again.';
      }

      // Only add prefix if errorMsg doesn't already have context
      const finalMessage = errorMsg && !errorMsg.toLowerCase().includes('odds')
        ? `❌ Failed to fetch odds: ${errorMsg}`
        : `❌ ${errorMsg || 'Unknown error occurred'}`;

      setMessage(finalMessage);
      console.error('Fetch odds error:', error);
    }

    setLoading(false);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setMessage(`Analyzing games with ${simulationCount} simulations per game...`);

    try {
      // Get today and tomorrow's date
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayStr = today.toISOString().split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const sportMap: Record<string, string> = {
        'NFL': 'nfl',
        'NBA': 'nba',
        'MLB': 'mlb',
        'NHL': 'nhl',
        'NCAAF': 'cfb',
        'NCAAB': 'cbb',
        'NASCAR': 'nascar',
      };
      const sport = sportMap[league] || 'nfl';

      // Fetch games for today (and optionally tomorrow) via public v2 endpoint
      const gamesResp = await fetch(`/api/progno/v2?action=games&sport=${sport}&date=${todayStr}`);
      const gamesJson = await gamesResp.json();
      if (!gamesResp.ok) {
        const errMsg = gamesJson?.error?.message || gamesJson?.error || 'Failed to fetch games';
        throw new Error(errMsg);
      }
      const fetchedGames = gamesJson?.data || [];
      setGames(fetchedGames);

      // Run predictions for each game using the prediction engine
      const picksWithSimulations: any[] = [];
      const threshold = parseFloat(confidenceThreshold) || 0;
      console.log(`[Vegas Analysis] Processing ${fetchedGames.length} games with threshold: ${threshold}%`);

      for (const game of fetchedGames) {
        try {
          const gameId = game.id || `${sport}-${game.awayTeam?.name?.toLowerCase()?.replace(/\s+/g, '-')}-${game.homeTeam?.name?.toLowerCase()?.replace(/\s+/g, '-')}`;
          const analyzeResponse = await fetch(`/api/progno/v2?action=prediction&gameId=${encodeURIComponent(gameId)}&includeClaudeEffect=true&bankroll=${parseFloat(bankroll) || 1000}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });

          if (analyzeResponse.ok) {
            const analysisData = await analyzeResponse.json();
            const pdata = analysisData?.data || {};

            // Calculate confidence - handle both decimal (0.58) and percentage (58) formats
            let confidencePct: number;
            if (pdata.confidenceScore !== undefined) {
              // Use confidenceScore if available (already a percentage)
              confidencePct = pdata.confidenceScore;
            } else if (pdata.winProbability !== undefined) {
              // Convert winProbability from decimal to percentage
              confidencePct = pdata.winProbability > 1 ? pdata.winProbability : Math.round(pdata.winProbability * 100);
            } else {
              confidencePct = 0;
            }

            const edgePct = Math.round(((pdata.spread?.edge ?? 0) || 0) * 100) / 100;
            const quality = Math.round(((pdata.quality ?? 0) || 0) * 100) / 100;
            const primaryPick = pdata.recommendation?.primaryPick || {};
            const wager =
              primaryPick.recommendedWager ??
              primaryPick.amount ??
              pdata.recommendation?.recommendedWager ??
              pdata.recommendation?.amount ??
              null;

            // Only add pick if it meets confidence threshold
            if (confidencePct >= threshold) {
              picksWithSimulations.push({
                game: `${game.awayTeam?.name} @ ${game.homeTeam?.name}`,
                sport: sport.toUpperCase(),
                kickoff: game.startTime,
                pick: pdata.predictedWinner || primaryPick.side || 'TBD',
                confidencePct,
                edgePct,
                qualityScore: quality,
                recommendedWager: wager,
                betReasoning: primaryPick.reasoning || pdata.recommendation?.reasoning,
                simulationResults: pdata,
                gameId: game.id || gameId, // Add gameId for unique key
              });
              console.log(`[Vegas Analysis] Added pick: ${game.awayTeam?.name} @ ${game.homeTeam?.name} - ${confidencePct}% confidence`);
            } else {
              console.log(`[Vegas Analysis] Skipped pick: ${game.awayTeam?.name} @ ${game.homeTeam?.name} - ${confidencePct}% < ${threshold}% threshold`);
            }
          } else {
            const errorData = await analyzeResponse.json().catch(() => ({}));
            console.error(`Error analyzing game ${gameId}:`, errorData.error || 'Unknown error');
          }
        } catch (err) {
          console.error(`Error analyzing game ${game.id}:`, err);
        }
      }

      // Picks are already filtered by threshold when added
      setPicks(picksWithSimulations);
      setMessage(`✅ Analyzed ${fetchedGames.length} games (${todayStr}), generated ${picksWithSimulations.length} picks above ${confidenceThreshold}% confidence`);
    } catch (error: any) {
      setMessage(`❌ Failed to analyze: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            marginBottom: '2rem',
            fontSize: '1rem',
          }}
        >
          ← Back to Home
        </button>

        {/* Header */}
        <h1 style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '0.5rem',
        }}>
          📊 Vegas Analysis
        </h1>
        <p style={{
          fontSize: '1.125rem',
          color: 'rgba(255, 255, 255, 0.7)',
          marginBottom: '3rem',
        }}>
          Analyze today and tomorrow's games with customizable simulations
        </p>

        {/* Configuration Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem',
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            color: 'white',
            marginBottom: '2rem',
          }}>
            Configuration
          </h2>

          {/* League */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '1rem',
              marginBottom: '0.5rem',
              fontWeight: '500',
            }}>
              League
            </label>
            <select
              value={league}
              onChange={(e) => setLeague(e.target.value)}
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1rem',
                borderRadius: '8px',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#1a1a1a',
                cursor: 'pointer',
              }}
            >
              <option value="NFL">NFL</option>
              <option value="NBA">NBA</option>
              <option value="MLB">MLB</option>
              <option value="NHL">NHL</option>
              <option value="NCAAF">NCAAF</option>
              <option value="NCAAB">NCAAB</option>
              <option value="NASCAR">NASCAR</option>
            </select>
          </div>
          {/* Bankroll */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '1rem',
              marginBottom: '0.5rem',
              fontWeight: '500',
            }}>
              Bankroll ($)
            </label>
            <input
              type="number"
              value={bankroll}
              onChange={(e) => setBankroll(e.target.value)}
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1rem',
                borderRadius: '8px',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#1a1a1a',
              }}
            />
          </div>

          {/* Risk Profile */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '1rem',
              marginBottom: '0.5rem',
              fontWeight: '500',
            }}>
              Risk Profile
            </label>
            <select
              value={riskProfile}
              onChange={(e) => setRiskProfile(e.target.value)}
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1rem',
                borderRadius: '8px',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#1a1a1a',
                cursor: 'pointer',
              }}
            >
              <option value="conservative">Conservative</option>
              <option value="balanced">Balanced</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>

          {/* Confidence Threshold */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '1rem',
              marginBottom: '0.5rem',
              fontWeight: '500',
            }}>
              Minimum Confidence (%)
            </label>
            <input
              type="number"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(e.target.value)}
              min="0"
              max="100"
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1rem',
                borderRadius: '8px',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#1a1a1a',
              }}
            />
            <p style={{
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.6)',
              marginTop: '0.5rem',
            }}>
              Only show predictions above this confidence level
            </p>
          </div>

          {/* Simulation Count */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '1rem',
              marginBottom: '0.5rem',
              fontWeight: '500',
            }}>
              Simulations Per Game: {simulationCount}
            </label>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={simulationCount}
              onChange={(e) => setSimulationCount(Number(e.target.value))}
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                background: 'rgba(255, 255, 255, 0.2)',
                outline: 'none',
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.6)',
              marginTop: '0.5rem',
            }}>
              <span>10 (Fast)</span>
              <span>500 (Accurate)</span>
            </div>
            <p style={{
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.6)',
              marginTop: '0.5rem',
            }}>
              More simulations = more accurate but slower analysis
            </p>
          </div>
        </div>

        {/* Actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFetchOdds();
            }}
            disabled={loading}
            style={{
              padding: '1.25rem',
              fontSize: '1.125rem',
              fontWeight: 'bold',
              background: loading ? '#64748b' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              position: 'relative',
              zIndex: 100,
              pointerEvents: 'auto'
            }}
          >
            {loading ? '⏳ Fetching...' : '📥 Fetch Live Odds'}
          </button>

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAnalyze();
            }}
            disabled={loading || analyzing}
            style={{
              padding: '1.25rem',
              fontSize: '1.125rem',
              position: 'relative',
              zIndex: 100,
              pointerEvents: 'auto',
              fontWeight: 'bold',
              background: (loading || analyzing) ? '#64748b' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: (loading || analyzing) ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            }}
          >
            {analyzing ? '⏳ Analyzing...' : '🎯 Analyze & Generate Picks'}
          </button>
        </div>

        {/* API Key Status */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.9)',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1.5rem',
          border: message.includes('ODDS_API_KEY') && message.includes('not configured')
            ? '1px solid rgba(239, 68, 68, 0.3)'
            : '1px solid rgba(16, 185, 129, 0.3)',
        }}>
          <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
            <strong style={{ color: '#e5e7eb' }}>API Key Status:</strong>
          </div>
          <div style={{ fontSize: '0.875rem', color: message.includes('ODDS_API_KEY') && message.includes('not configured') ? '#fbbf24' : '#10b981' }}>
            {message.includes('ODDS_API_KEY') && message.includes('not configured') ? (
              <>
                ⚠️ The Odds API key must be set in environment variables (ODDS_API_KEY or NEXT_PUBLIC_ODDS_API_KEY).
                <div style={{ marginTop: '0.5rem' }}>
                  Get a free key at: <a href="https://the-odds-api.com/" target="_blank" rel="noopener" style={{ color: '#60a5fa', textDecoration: 'underline' }}>the-odds-api.com</a>
                </div>
              </>
            ) : (
              '✅ API key is configured. Ready to fetch odds!'
            )}
          </div>
        </div>

        {/* Message */}
        {message && (
          <div style={{
            padding: '1rem',
            background: message.includes('✅') ? 'rgba(16, 185, 129, 0.2)' : message.includes('⚠️') ? 'rgba(251, 191, 36, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '1rem',
            textAlign: 'center',
            marginBottom: '2rem',
            border: message.includes('✅') ? '1px solid rgba(16, 185, 129, 0.3)' : message.includes('⚠️') ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
          }}>
            {message}
            {message.includes('ODDS_API_KEY') && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', opacity: 0.9 }}>
                Configure the API key in Vercel environment variables or contact your administrator.
              </div>
            )}
          </div>
        )}

        {/* Picks Results */}
        {picks.length > 0 && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            padding: '2rem',
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              color: 'white',
              marginBottom: '1.5rem',
            }}>
              🎯 Generated Picks ({picks.length})
            </h2>
            <div style={{
              display: 'grid',
              gap: '1rem',
            }}>
              {picks.map((pick, index) => (
                <div
                  key={pick.gameId || `pick-${index}`}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '0.75rem',
                  }}>
                    <div>
                      <div style={{
                        fontSize: '1.125rem',
                        fontWeight: 'bold',
                        color: 'white',
                        marginBottom: '0.25rem',
                      }}>
                        {pick.game}
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        color: 'rgba(255, 255, 255, 0.7)',
                      }}>
                        {pick.sport} • {pick.kickoff ? new Date(pick.kickoff).toLocaleDateString() : 'TBD'}
                      </div>
                    </div>
                    <div style={{
                      background: 'rgba(59, 130, 246, 0.3)',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      fontSize: '1.25rem',
                      fontWeight: 'bold',
                      color: '#60a5fa',
                    }}>
                      {pick.pick}
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '1.5rem',
                    fontSize: '0.875rem',
                    flexWrap: 'wrap',
                  }}>
                    <div>
                      <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Confidence: </span>
                      <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>{pick.confidencePct}%</span>
                    </div>
                    <div>
                      <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Edge: </span>
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>{pick.edgePct > 0 ? '+' : ''}{pick.edgePct}%</span>
                    </div>
                    <div>
                      <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Quality: </span>
                      <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>{pick.qualityScore.toFixed(1)}</span>
                    </div>
                    {pick.recommendedWager !== undefined && pick.recommendedWager > 0 && (
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
          </div>
        )}
      </div>
    </div >
  );
}
