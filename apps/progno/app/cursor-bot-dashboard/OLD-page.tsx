'use client';

/**
 * Cursor Bot Dashboard
 * 
 * READ-ONLY view of the autonomous Cursor Effect bot
 * Shows bot status, predictions, performance, and learning progress
 */

import React, { useEffect, useState } from 'react';

interface BotState {
  isRunning: boolean;
  lastCycleTime: string | null;
  totalCycles: number;
  totalPredictions: number;
  totalGamesLearned: number;
  currentAccuracy: number;
  bestAccuracy: number;
  codeVersions: string[];
  currentCodeVersion: string;
  learningRate: number;
  activePredictions: any[];
  completedCycles: any[];
  // Training
  lastAcademyTraining?: string | null;
  academyTasksCompleted?: number;
  academyTasksTotal?: number;
  currentAcademyTask?: string;
  lastKaggleTraining?: string | null;
  kaggleCompetitionsEntered?: string[];
  kaggleBestScore?: number;
  kaggleSubmissions?: number;
}

interface BotPrediction {
  id: string;
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  predictedWinner: string;
  confidence: number;
  edge: number;
  timestamp: string;
  codeVersion: string;
}

export default function CursorBotDashboard() {
  const [botState, setBotState] = useState<BotState | null>(null);
  const [predictions, setPredictions] = useState<BotPrediction[]>([]);
  const [performance, setPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchBotData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchBotData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchBotData = async () => {
    try {
      const [statusRes, predictionsRes, performanceRes] = await Promise.all([
        fetch('/api/cursor-bot?action=status'),
        fetch('/api/cursor-bot?action=predictions&limit=20'),
        fetch('/api/cursor-bot?action=performance&days=7'),
      ]);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setBotState(statusData.data);
      }

      if (predictionsRes.ok) {
        const predData = await predictionsRes.json();
        setPredictions(predData.data || []);
      }

      if (performanceRes.ok) {
        const perfData = await performanceRes.json();
        setPerformance(perfData.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch bot data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    try {
      const res = await fetch('/api/cursor-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', intervalMinutes: 60 }),
      });
      if (res.ok) {
        await fetchBotData();
      }
    } catch (error) {
      console.error('Failed to start bot:', error);
    }
  };

  const handleStop = async () => {
    try {
      const res = await fetch('/api/cursor-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      if (res.ok) {
        await fetchBotData();
      }
    } catch (error) {
      console.error('Failed to stop bot:', error);
    }
  };

  const handleRunCycle = async () => {
    try {
      const res = await fetch('/api/cursor-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run-cycle' }),
      });
      if (res.ok) {
        await fetchBotData();
      }
    } catch (error) {
      console.error('Failed to run cycle:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: '1.5rem' }}>Loading bot status...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
              🤖 Autonomous Cursor Bot
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem' }}>
              Self-learning background bot • Read-only predictions • Training mode
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <label style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh
            </label>
            <button
              onClick={handleRunCycle}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Run Cycle Now
            </button>
            {botState?.isRunning ? (
              <button
                onClick={handleStop}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Stop Bot
              </button>
            ) : (
              <button
                onClick={handleStart}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Start Bot
              </button>
            )}
          </div>
        </div>

        {/* Status Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <StatusCard
            title="Status"
            value={botState?.isRunning ? '🟢 Running' : '🔴 Stopped'}
            subtitle={botState?.lastCycleTime ? `Last cycle: ${new Date(botState.lastCycleTime).toLocaleString()}` : 'Never run'}
          />
          <StatusCard
            title="Total Cycles"
            value={botState?.totalCycles || 0}
            subtitle={`${botState?.completedCycles.length || 0} completed`}
          />
          <StatusCard
            title="Total Predictions"
            value={botState?.totalPredictions || 0}
            subtitle={`${botState?.activePredictions.length || 0} active`}
          />
          <StatusCard
            title="Games Learned"
            value={botState?.totalGamesLearned || 0}
            subtitle="Training samples"
          />
          <StatusCard
            title="Current Accuracy"
            value={`${((botState?.currentAccuracy || 0) * 100).toFixed(1)}%`}
            subtitle={`Best: ${((botState?.bestAccuracy || 0) * 100).toFixed(1)}%`}
          />
          <StatusCard
            title="Code Version"
            value={botState?.currentCodeVersion || 'v1.0.0'}
            subtitle={`${botState?.codeVersions.length || 1} versions`}
          />
        </div>

        {/* Training Status */}
        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' }}>
            🎓 Training Status
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <StatusCard
              title="Bot Academy"
              value={`${botState?.academyTasksCompleted || 0}/${botState?.academyTasksTotal || 0}`}
              subtitle={botState?.lastAcademyTraining 
                ? `Last: ${new Date(botState.lastAcademyTraining).toLocaleDateString()}`
                : 'Never trained'}
            />
            <StatusCard
              title="Kaggle Competitions"
              value={botState?.kaggleCompetitionsEntered?.length || 0}
              subtitle={botState?.kaggleBestScore 
                ? `Best: ${(botState.kaggleBestScore * 100).toFixed(1)}%`
                : 'No submissions yet'}
            />
            <StatusCard
              title="Kaggle Submissions"
              value={botState?.kaggleSubmissions || 0}
              subtitle={botState?.lastKaggleTraining
                ? `Last: ${new Date(botState.lastKaggleTraining).toLocaleDateString()}`
                : 'Never trained'}
            />
          </div>
        </div>

        {/* Recent Predictions */}
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '16px', padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '1.5rem' }}>
            📊 Recent Predictions (Read-Only)
          </h2>
          {predictions.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.7)' }}>No predictions yet. Start the bot to begin generating predictions.</p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {predictions.map((pred) => (
                <div
                  key={pred.id}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>
                        {pred.awayTeam} @ {pred.homeTeam}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
                        {pred.sport} • {new Date(pred.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(59, 130, 246, 0.3)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>Pick</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#60a5fa' }}>
                        {pred.predictedWinner}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
                    <div>
                      <span style={{ color: 'rgba(255,255,255,0.6)' }}>Confidence: </span>
                      <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>{(pred.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div>
                      <span style={{ color: 'rgba(255,255,255,0.6)' }}>Edge: </span>
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                        {pred.edge > 0 ? '+' : ''}{pred.edge.toFixed(3)}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'rgba(255,255,255,0.6)' }}>Code: </span>
                      <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>{pred.codeVersion}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Performance History */}
        {performance.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '16px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '1.5rem' }}>
              📈 Performance History (Last 7 Days)
            </h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {performance.slice(-10).reverse().map((cycle) => (
                <div
                  key={cycle.id}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '1rem',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
                        {new Date(cycle.startTime).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                        {cycle.predictionsMade} predictions • {cycle.gamesAnalyzed} games
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '2rem' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Accuracy</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>
                          {(cycle.performance.accuracy * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Avg Confidence</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#60a5fa' }}>
                          {(cycle.performance.avgConfidence * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.2)' }}>
      <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>{title}</div>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>{value}</div>
      {subtitle && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{subtitle}</div>}
    </div>
  );
}

