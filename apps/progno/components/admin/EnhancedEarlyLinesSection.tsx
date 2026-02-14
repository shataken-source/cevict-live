'use client';

import { useState } from 'react';

interface EnhancedMatch {
  game_id: string;
  home_team: string;
  away_team: string;
  sport: string;
  early_pick: string;
  early_odds: number;
  early_confidence: number;
  early_edge: number;
  regular_pick: string;
  regular_odds: number;
  regular_confidence: number;
  regular_edge: number;
  side_flipped: boolean;
  odds_movement: number;
  confidence_delta: number;
  edge_delta: number;
  value_score: number;
  recommendation: 'hold' | 'hedge' | 'double_down' | 'close';
  reasoning: string;
}

interface EnhancedResult {
  success: boolean;
  summary?: {
    total_matches: number;
    side_flipped_count: number;
    hedge_opportunities: number;
    double_down_opportunities: number;
    close_opportunities: number;
    avg_odds_movement: number;
    high_value_picks: number;
  };
  matches?: EnhancedMatch[];
  hedges?: EnhancedMatch[];
  double_downs?: EnhancedMatch[];
  error?: string;
}

export default function EnhancedEarlyLinesSection({
  secret,
  earlyDate,
  regularDate
}: {
  secret: string;
  earlyDate: string;
  regularDate: string;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnhancedResult | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'hedges' | 'double_downs'>('all');

  const runAnalysis = async () => {
    if (!secret.trim()) {
      setResult({ success: false, error: 'Enter admin secret first.' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/progno/admin/enhanced-early-lines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: secret.trim(), earlyDate, regularDate }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) {
        setActiveTab('all');
      }
    } catch (e: any) {
      setResult({ success: false, error: e?.message || 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'hedge': return '#6f42c1'; // Purple
      case 'double_down': return '#28a745'; // Green
      case 'close': return '#dc3545'; // Red
      default: return '#6c757d'; // Gray
    }
  };

  const getValueScoreColor = (score: number) => {
    if (score >= 80) return '#28a745';
    if (score >= 60) return '#ffc107';
    return '#6c757d';
  };

  const displayMatches = result?.success ? (
    activeTab === 'hedges' ? result.hedges :
      activeTab === 'double_downs' ? result.double_downs :
        result.matches
  ) : [];

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ padding: '8px 12px', background: '#f0f4f8', borderRadius: '6px' }}>
          <span style={{ fontSize: '12px', color: '#666' }}>Early file: </span>
          <code>predictions-early-{earlyDate}.json</code>
        </div>
        <div style={{ padding: '8px 12px', background: '#f0f4f8', borderRadius: '6px' }}>
          <span style={{ fontSize: '12px', color: '#666' }}>Regular file: </span>
          <code>predictions-{regularDate}.json</code>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading || !secret.trim()}
          style={{
            padding: '8px 14px',
            background: loading ? '#ccc' : '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          {loading ? 'Analyzing…' : 'Analyze Early Lines'}
        </button>
      </div>

      {result && (
        <div style={{
          padding: '16px',
          background: result.success ? '#f0f9ff' : '#ffe6e6',
          borderRadius: '8px',
          border: '1px solid #dde',
          fontSize: '13px'
        }}>
          {result.error ? (
            <p style={{ margin: 0, color: '#c00' }}>{result.error}</p>
          ) : result.success && result.summary ? (
            <>
              {/* Summary Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ padding: '10px', background: 'white', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0070f3' }}>
                    {result.summary.total_matches}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Total Matches</div>
                </div>
                <div style={{ padding: '10px', background: 'white', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#6f42c1' }}>
                    {result.summary.hedge_opportunities}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Hedge Opportunities</div>
                </div>
                <div style={{ padding: '10px', background: 'white', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>
                    {result.summary.double_down_opportunities}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Double-Downs</div>
                </div>
                <div style={{ padding: '10px', background: 'white', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc3545' }}>
                    {result.summary.close_opportunities}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Close Signals</div>
                </div>
                <div style={{ padding: '10px', background: 'white', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffc107' }}>
                    {result.summary.high_value_picks}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>High Value (70+)</div>
                </div>
              </div>

              {/* Tabs */}
              {result.matches && result.matches.length > 0 && (
                <>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <button
                      onClick={() => setActiveTab('all')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        background: activeTab === 'all' ? '#0070f3' : '#e9ecef',
                        color: activeTab === 'all' ? 'white' : '#333'
                      }}
                    >
                      All ({result.matches.length})
                    </button>
                    {result.hedges && result.hedges.length > 0 && (
                      <button
                        onClick={() => setActiveTab('hedges')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          background: activeTab === 'hedges' ? '#6f42c1' : '#e9ecef',
                          color: activeTab === 'hedges' ? 'white' : '#333'
                        }}
                      >
                        Hedges ({result.hedges.length})
                      </button>
                    )}
                    {result.double_downs && result.double_downs.length > 0 && (
                      <button
                        onClick={() => setActiveTab('double_downs')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          background: activeTab === 'double_downs' ? '#28a745' : '#e9ecef',
                          color: activeTab === 'double_downs' ? 'white' : '#333'
                        }}
                      >
                        Double-Downs ({result.double_downs.length})
                      </button>
                    )}
                  </div>

                  {/* Matches Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #dee2e6', background: '#f8f9fa' }}>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Game</th>
                        <th style={{ textAlign: 'center', padding: '8px' }}>Early → Regular</th>
                        <th style={{ textAlign: 'center', padding: '8px' }}>Value Score</th>
                        <th style={{ textAlign: 'center', padding: '8px' }}>Odds Move</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Recommendation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayMatches?.map((m: EnhancedMatch, i: number) => (
                        <tr key={i} style={{
                          borderBottom: '1px solid #eee',
                          background: m.side_flipped ? '#fff8e6' : undefined
                        }}>
                          <td style={{ padding: '8px' }}>
                            <div style={{ fontWeight: 500 }}>{m.home_team} vs {m.away_team}</div>
                            <div style={{ fontSize: '11px', color: '#666' }}>{m.sport}</div>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <div>{m.early_pick} ({m.early_odds > 0 ? '+' : ''}{m.early_odds})</div>
                            <div style={{ color: '#666' }}>↓</div>
                            <div>{m.regular_pick} ({m.regular_odds > 0 ? '+' : ''}{m.regular_odds})</div>
                            {m.side_flipped && (
                              <span style={{
                                fontSize: '10px',
                                background: '#6f42c1',
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                marginTop: '4px',
                                display: 'inline-block'
                              }}>
                                FLIPPED
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <span style={{
                              fontWeight: 'bold',
                              color: getValueScoreColor(m.value_score)
                            }}>
                              {m.value_score}
                            </span>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <span style={{
                              color: m.odds_movement > 0 ? '#28a745' : m.odds_movement < 0 ? '#dc3545' : '#666'
                            }}>
                              {m.odds_movement > 0 ? '+' : ''}{m.odds_movement.toFixed(1)}%
                            </span>
                          </td>
                          <td style={{ padding: '8px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              background: getRecommendationColor(m.recommendation),
                              color: 'white'
                            }}>
                              {m.recommendation.replace('_', ' ')}
                            </span>
                            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px', maxWidth: '200px' }}>
                              {m.reasoning}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
