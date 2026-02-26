'use client';

import { useState } from 'react';

interface EarlyOdds {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  gameDate: string;
  capturedAt: string;
  source: string;
  odds: {
    homeML?: number;
    awayML?: number;
    spread?: number;
    spreadOdds?: number;
    total?: number;
    overOdds?: number;
    underOdds?: number;
  };
}

interface Injury {
  playerId: string;
  playerName: string;
  team: string;
  sport: string;
  status: 'out' | 'doubtful' | 'questionable' | 'probable' | 'day-to-day';
  injury: string;
  lastUpdate: string;
  impactScore?: number;
}

interface News {
  id: string;
  headline: string;
  description: string;
  sport: string;
  teams: string[];
  publishedAt: string;
  source: string;
  oddsImpact: 'high' | 'medium' | 'low';
}

interface EarlyLinesData {
  success: boolean;
  timestamp: string;
  summary: {
    sports: string;
    daysAhead: number;
    earlyGames: number;
    earlyPicks: number;
    regularPicks: number;
    significantMoves: number;
    arbOpportunities: number;
    injuries: number;
    news: number;
  };
  data: {
    earlyOdds: EarlyOdds[];
    injuries: Injury[];
    news: News[];
    lineMovements: any[];
    arbOpportunities: any[];
    topArbSummaries: string[];
  };
}

const C = {
  bg: '#04080f',
  card: '#080f1a',
  border: '#12233a',
  text: '#e0e7f1',
  textDim: '#8b9bb5',
  accent: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
};

export default function EarlyLinesSection() {
  const [data, setData] = useState<EarlyLinesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSports, setSelectedSports] = useState('NFL,NBA,NHL,MLB,NCAAB,CBB');

  const fetchEarlyLines = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/early-lines/analysis?sports=${selectedSports}&daysAhead=3`);
      const result = await response.json();
      if (result.success) {
        setData(result);
      } else {
        setError(result.error || 'Failed to fetch early lines data');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const getOddsImpactBadge = (impact: 'high' | 'medium' | 'low') => {
    const colors = {
      high: C.danger,
      medium: C.warning,
      low: C.success,
    };
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          backgroundColor: colors[impact] + '20',
          color: colors[impact],
          border: `1px solid ${colors[impact]}40`,
        }}
      >
        {impact}
      </span>
    );
  };

  const getImpactBadge = (score: number) => {
    let color = C.success;
    let label = 'Low';
    if (score >= 80) {
      color = C.danger;
      label = 'High';
    } else if (score >= 50) {
      color = C.warning;
      label = 'Medium';
    }
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          backgroundColor: color + '20',
          color: color,
          border: `1px solid ${color}40`,
        }}
      >
        {label} ({score})
      </span>
    );
  };

  const formatOdds = (odds: number | undefined | null) => {
    if (odds == null || isNaN(odds)) return '—';
    return odds > 0 ? `+${odds}` : odds.toString();
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return iso;
    }
  };

  return (
    <div style={{ marginBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: C.text, margin: 0 }}>
          📊 Early Lines & Line-Move Arbs
        </h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            value={selectedSports}
            onChange={(e) => setSelectedSports(e.target.value)}
            placeholder="NFL,NBA,NHL,MLB,NCAAB,CBB"
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: `1px solid ${C.border}`,
              backgroundColor: C.card,
              color: C.text,
              fontSize: '14px',
              width: '200px',
            }}
          />
          <button
            onClick={fetchEarlyLines}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: C.accent,
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Loading...' : 'Fetch Early Lines'}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '12px',
            borderRadius: '6px',
            backgroundColor: C.danger + '20',
            border: `1px solid ${C.danger}40`,
            color: C.danger,
            marginBottom: '20px',
          }}
        >
          Error: {error}
        </div>
      )}

      {data && (
        <>
          {/* Summary Stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: C.card, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '12px', color: C.textDim, marginBottom: '4px' }}>Early Games</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: C.accent }}>{data.summary.earlyGames}</div>
            </div>
            <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: C.card, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '12px', color: C.textDim, marginBottom: '4px' }}>Injuries</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: C.warning }}>{data.summary.injuries}</div>
            </div>
            <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: C.card, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '12px', color: C.textDim, marginBottom: '4px' }}>Breaking News</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: C.success }}>{data.summary.news}</div>
            </div>
            <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: C.card, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '12px', color: C.textDim, marginBottom: '4px' }}>Arb Opportunities</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: C.danger }}>{data.summary.arbOpportunities}</div>
            </div>
          </div>

          {/* Early Odds */}
          {data.data.earlyOdds.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: C.text, marginBottom: '12px' }}>
                🎯 Early Odds (2-5 Days Out)
              </h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                {data.data.earlyOdds.map((game) => (
                  <div
                    key={game.gameId}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      backgroundColor: C.card,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>
                          {game.awayTeam} @ {game.homeTeam}
                        </div>
                        <div style={{ fontSize: '12px', color: C.textDim }}>
                          {formatDate(game.gameDate)} • {game.sport}
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: C.textDim, textAlign: 'right' }}>
                        <div>Source: {game.source}</div>
                        <div>Captured: {formatDate(game.capturedAt)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                      {game.odds.homeML && (
                        <div>
                          <div style={{ fontSize: '11px', color: C.textDim, marginBottom: '4px' }}>Moneyline</div>
                          <div style={{ fontSize: '13px', color: C.text }}>
                            {game.homeTeam.split(' ').pop()}: {formatOdds(game.odds.homeML)}
                          </div>
                          <div style={{ fontSize: '13px', color: C.text }}>
                            {game.awayTeam.split(' ').pop()}: {formatOdds(game.odds.awayML!)}
                          </div>
                        </div>
                      )}
                      {game.odds.spread && (
                        <div>
                          <div style={{ fontSize: '11px', color: C.textDim, marginBottom: '4px' }}>Spread</div>
                          <div style={{ fontSize: '13px', color: C.text }}>
                            {game.homeTeam.split(' ').pop()}: {game.odds.spread > 0 ? '+' : ''}
                            {game.odds.spread} ({formatOdds(game.odds.spreadOdds!)})
                          </div>
                        </div>
                      )}
                      {game.odds.total && (
                        <div>
                          <div style={{ fontSize: '11px', color: C.textDim, marginBottom: '4px' }}>Total</div>
                          <div style={{ fontSize: '13px', color: C.text }}>
                            O/U {game.odds.total} ({formatOdds(game.odds.overOdds!)}/{formatOdds(game.odds.underOdds!)})
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Injuries */}
          {data.data.injuries.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: C.text, marginBottom: '12px' }}>
                🏥 Injury Report (Top 20 by Impact)
              </h3>
              <div style={{ display: 'grid', gap: '8px' }}>
                {data.data.injuries.slice(0, 20).map((injury) => (
                  <div
                    key={injury.playerId}
                    style={{
                      padding: '12px',
                      borderRadius: '6px',
                      backgroundColor: C.card,
                      border: `1px solid ${C.border}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>
                        {injury.playerName} ({injury.team})
                      </div>
                      <div style={{ fontSize: '12px', color: C.textDim }}>
                        {injury.status.toUpperCase()} • {injury.injury.substring(0, 100)}
                        {injury.injury.length > 100 ? '...' : ''}
                      </div>
                    </div>
                    <div style={{ marginLeft: '16px' }}>
                      {injury.impactScore !== undefined && getImpactBadge(injury.impactScore)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Breaking News */}
          {data.data.news.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: C.text, marginBottom: '12px' }}>
                📰 Breaking News
              </h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                {data.data.news.map((article) => (
                  <div
                    key={article.id}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      backgroundColor: C.card,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>
                          {article.headline}
                        </div>
                        <div style={{ fontSize: '12px', color: C.textDim, marginBottom: '8px' }}>
                          {article.description}
                        </div>
                        <div style={{ fontSize: '11px', color: C.textDim }}>
                          {article.sport} • {article.teams.join(', ')} • {formatDate(article.publishedAt)}
                        </div>
                      </div>
                      <div style={{ marginLeft: '16px' }}>{getOddsImpactBadge(article.oddsImpact)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Arb Opportunities */}
          {data.data.arbOpportunities.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: C.text, marginBottom: '12px' }}>
                💰 Line-Move Arb Opportunities
              </h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                {data.data.topArbSummaries.map((summary, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      backgroundColor: C.card,
                      border: `2px solid ${C.success}`,
                    }}
                  >
                    <pre
                      style={{
                        fontSize: '12px',
                        color: C.text,
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        margin: 0,
                      }}
                    >
                      {summary}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.data.arbOpportunities.length === 0 && data.data.earlyOdds.length > 0 && (
            <div
              style={{
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: C.card,
                border: `1px solid ${C.border}`,
                textAlign: 'center',
                color: C.textDim,
              }}
            >
              No arb opportunities detected yet. Generate early picks and regular picks to enable arb detection.
            </div>
          )}
        </>
      )}

      {!data && !loading && (
        <div
          style={{
            padding: '40px',
            borderRadius: '8px',
            backgroundColor: C.card,
            border: `1px solid ${C.border}`,
            textAlign: 'center',
            color: C.textDim,
          }}
        >
          Click "Fetch Early Lines" to load odds, injuries, news, and arb opportunities
        </div>
      )}
    </div>
  );
}
