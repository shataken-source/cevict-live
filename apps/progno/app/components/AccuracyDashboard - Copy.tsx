'use client';

/**
 * Accuracy Dashboard Component
 * 
 * Displays comprehensive accuracy metrics like competitors show:
 * - Big win rate headline (like "71.3% Accuracy")
 * - Sport-by-sport breakdown
 * - Confidence calibration
 * - Streak tracking
 * - ROI metrics
 * 
 * This is what sets us apart from Rithmm, Leans AI, Juice Reel, etc.
 */

import { useState, useEffect } from 'react';

interface AccuracyData {
  overall: {
    totalPredictions: number;
    completedPredictions: number;
    pendingPredictions: number;
    winRate: number;
    roi: number;
    avgConfidence: number;
    avgEdge: number;
    units: number;
  };
  bySport: {
    [sport: string]: {
      predictions: number;
      wins: number;
      winRate: number;
      roi: number;
      streak: number;
    };
  };
  byConfidence: {
    [range: string]: {
      predictions: number;
      wins: number;
      winRate: number;
      expectedWinRate: number;
      calibration: number;
    };
  };
  timePeriods: {
    last7Days: { predictions: number; wins: number; winRate: number; roi: number };
    last30Days: { predictions: number; wins: number; winRate: number; roi: number };
    last90Days: { predictions: number; wins: number; winRate: number; roi: number };
    allTime: { predictions: number; wins: number; winRate: number; roi: number };
  };
  streaks: {
    currentStreak: number;
    currentStreakType: 'win' | 'loss' | 'none';
    longestWinStreak: number;
    longestLossStreak: number;
  };
  valueBetting: {
    totalValueBets: number;
    valueBetWins: number;
    valueBetWinRate: number;
    avgEdge: number;
    totalEdgeCapture: number;
  };
  comparisons?: {
    vsRithmm: { competitor: string; difference: number; status: string };
    vsLeansAI: { competitor: string; difference: number; status: string };
    vsJuiceReel: { competitor: string; difference: number; status: string };
  };
}

export default function AccuracyDashboard() {
  const [data, setData] = useState<AccuracyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'last7Days' | 'last30Days' | 'last90Days' | 'allTime'>('allTime');

  useEffect(() => {
    fetchAccuracyData();
  }, []);

  const fetchAccuracyData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/accuracy');
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch accuracy data');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📊</div>
        Loading accuracy metrics...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
        {error || 'No data available'}
      </div>
    );
  }

  const winRatePercent = (data.overall.winRate * 100).toFixed(1);
  const periodData = data.timePeriods[selectedPeriod];

  return (
    <div style={{
      padding: '2rem',
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
      borderRadius: '16px',
      color: 'white',
    }}>
      {/* Hero Section - Big Win Rate */}
      <div style={{
        textAlign: 'center',
        marginBottom: '3rem',
        padding: '2rem',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.5rem' }}>
          CEVICT FLEX AI ACCURACY
        </div>
        <div style={{
          fontSize: '5rem',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1,
        }}>
          {winRatePercent}%
        </div>
        <div style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.8)', marginTop: '0.5rem' }}>
          Win Rate • {data.overall.completedPredictions.toLocaleString()} Predictions
        </div>
        
        {/* Streak Badge */}
        {data.streaks.currentStreak > 0 && (
          <div style={{
            display: 'inline-block',
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            background: data.streaks.currentStreakType === 'win' 
              ? 'rgba(16, 185, 129, 0.2)' 
              : 'rgba(239, 68, 68, 0.2)',
            border: `1px solid ${data.streaks.currentStreakType === 'win' ? '#10b981' : '#ef4444'}`,
            borderRadius: '9999px',
            fontSize: '0.875rem',
          }}>
            {data.streaks.currentStreakType === 'win' ? '🔥' : '❄️'} {data.streaks.currentStreak} Game {data.streaks.currentStreakType === 'win' ? 'Win' : 'Loss'} Streak
          </div>
        )}
      </div>

      {/* Key Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        <MetricCard 
          label="ROI" 
          value={`${data.overall.roi >= 0 ? '+' : ''}${data.overall.roi.toFixed(1)}%`}
          color={data.overall.roi >= 0 ? '#10b981' : '#ef4444'}
        />
        <MetricCard 
          label="Units Won" 
          value={`${data.overall.units >= 0 ? '+' : ''}${data.overall.units.toFixed(1)}`}
          color={data.overall.units >= 0 ? '#10b981' : '#ef4444'}
        />
        <MetricCard 
          label="Avg Confidence" 
          value={`${(data.overall.avgConfidence * 100).toFixed(0)}%`}
          color="#60a5fa"
        />
        <MetricCard 
          label="Avg Edge" 
          value={`+${data.overall.avgEdge.toFixed(1)}%`}
          color="#a78bfa"
        />
      </div>

      {/* Time Period Selector */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '2rem',
        flexWrap: 'wrap',
      }}>
        {(['last7Days', 'last30Days', 'last90Days', 'allTime'] as const).map((period) => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: selectedPeriod === period ? '#4f46e5' : 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            {period === 'last7Days' ? '7 Days' : 
             period === 'last30Days' ? '30 Days' : 
             period === 'last90Days' ? '90 Days' : 'All Time'}
          </button>
        ))}
      </div>

      {/* Selected Period Stats */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem',
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem' }}>
          {selectedPeriod === 'allTime' ? 'All Time' : `Last ${selectedPeriod.replace('last', '').replace('Days', ' Days')}`} Performance
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>Predictions</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{periodData.predictions}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>Wins</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>{periodData.wins}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>Win Rate</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{(periodData.winRate * 100).toFixed(1)}%</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>ROI</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: periodData.roi >= 0 ? '#10b981' : '#ef4444' }}>
              {periodData.roi >= 0 ? '+' : ''}{periodData.roi.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Sport Breakdown */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem',
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem' }}>📊 Performance by Sport</h3>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {Object.entries(data.bySport).map(([sport, stats]) => (
            <div key={sport} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.25rem' }}>{getSportEmoji(sport)}</span>
                <span style={{ fontWeight: '600' }}>{sport}</span>
                <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  ({stats.predictions} picks)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    fontSize: '1.125rem', 
                    fontWeight: 'bold',
                    color: stats.winRate >= 0.7 ? '#10b981' : stats.winRate >= 0.6 ? '#fbbf24' : '#ef4444'
                  }}>
                    {(stats.winRate * 100).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    {stats.wins}W-{stats.predictions - stats.wins}L
                  </div>
                </div>
                {stats.streak !== 0 && (
                  <div style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    background: stats.streak > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    fontSize: '0.75rem',
                    color: stats.streak > 0 ? '#10b981' : '#ef4444',
                  }}>
                    {stats.streak > 0 ? '🔥' : '❄️'} {Math.abs(stats.streak)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confidence Calibration */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem',
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem' }}>🎯 Confidence Calibration</h3>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '1rem' }}>
          How accurate are we at each confidence level? (1.0 = perfectly calibrated)
        </p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {Object.entries(data.byConfidence).map(([range, stats]) => (
            <div key={range} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}>
              <div style={{ width: '80px', fontSize: '0.875rem' }}>{range}</div>
              <div style={{ flex: 1, height: '24px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(stats.winRate * 100, 100)}%`,
                  background: stats.calibration >= 0.95 && stats.calibration <= 1.05 
                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                    : stats.calibration > 1.05 
                      ? 'linear-gradient(90deg, #3b82f6, #60a5fa)'
                      : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                }}>
                  {stats.predictions > 0 ? `${(stats.winRate * 100).toFixed(0)}%` : '—'}
                </div>
              </div>
              <div style={{ width: '60px', textAlign: 'right', fontSize: '0.875rem' }}>
                {stats.predictions > 0 ? (
                  <span style={{ 
                    color: stats.calibration >= 0.95 && stats.calibration <= 1.05 
                      ? '#10b981' 
                      : stats.calibration > 1.05 ? '#3b82f6' : '#f59e0b'
                  }}>
                    {stats.calibration.toFixed(2)}x
                  </span>
                ) : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Value Betting Performance */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(234, 179, 8, 0.1) 100%)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem',
        border: '1px solid rgba(245, 158, 11, 0.2)',
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem' }}>💰 Value Betting Performance</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>Value Bets</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{data.valueBetting.totalValueBets}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>Win Rate</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
              {(data.valueBetting.valueBetWinRate * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>Avg Edge</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>+{data.valueBetting.avgEdge.toFixed(1)}%</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>Edge Capture</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
              {(data.valueBetting.totalEdgeCapture * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Competitor Comparison */}
      {data.comparisons && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '1.5rem',
        }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem' }}>🏆 vs Competition</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {Object.values(data.comparisons).map((comp: any) => (
              <div key={comp.competitor} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
              }}>
                <span>{comp.competitor}</span>
                <span style={{ 
                  color: comp.difference > 0 ? '#10b981' : comp.difference === 0 ? '#fbbf24' : '#ef4444',
                  fontWeight: 'bold',
                }}>
                  {comp.status} {comp.difference > 0 ? `+${comp.difference.toFixed(1)}%` : comp.difference === 0 ? '' : `${comp.difference.toFixed(1)}%`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '12px',
      padding: '1rem',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.25rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color }}>
        {value}
      </div>
    </div>
  );
}

function getSportEmoji(sport: string): string {
  const emojis: Record<string, string> = {
    NFL: '🏈',
    NCAAF: '🏈',
    NBA: '🏀',
    NCAAB: '🏀',
    NHL: '🏒',
    MLB: '⚾',
  };
  return emojis[sport] || '🎯';
}

