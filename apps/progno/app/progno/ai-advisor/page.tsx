'use client';

import { useState, useEffect } from 'react';
import { SportsAIBot, SportsAdviceRequest, SportsAdviceResponse } from '../../lib/sports-ai-bot';

export default function AIAdvisorPage() {
  const [aiBot] = useState(() => new SportsAIBot());
  const [currentPicks, setCurrentPicks] = useState<any[]>([]);
  const [userQuestion, setUserQuestion] = useState('');
  const [advice, setAdvice] = useState<SportsAdviceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'advisor' | 'kalshi' | 'polymarket'>('advisor');

  // Load current picks from localStorage or API
  useEffect(() => {
    loadCurrentPicks();
  }, []);

  const loadCurrentPicks = async () => {
    try {
      // Try to load today's predictions
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/progno/predictions?date=${today}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentPicks(data.picks || []);
      }
    } catch (error) {
      console.error('Failed to load current picks:', error);
      // Use mock data for demo
      setCurrentPicks([
        {
          homeTeam: 'Lakers',
          awayTeam: 'Celtics',
          sport: 'NBA',
          confidence: 0.75,
          edge: 3.2,
          pick: 'Lakers -2.5'
        },
        {
          homeTeam: 'Rangers',
          awayTeam: 'Islanders',
          sport: 'NHL',
          confidence: 0.68,
          edge: 2.1,
          pick: 'Over 5.5'
        }
      ]);
    }
  };

  const getAdvice = async () => {
    if (!userQuestion.trim()) return;
    
    setLoading(true);
    try {
      const request: SportsAdviceRequest = {
        currentPicks,
        userQuestion,
        context: 'Progno AI Advisor - Sports Betting Analysis'
      };
      
      const response = await aiBot.analyzePicks(request);
      setAdvice(response);
    } catch (error) {
      console.error('Failed to get AI advice:', error);
      setAdvice({
        advice: 'Sorry, I encountered an error while analyzing your picks. Please try again.',
        confidence: 0,
        reasoning: ['Error occurred during analysis'],
        recommendations: ['Try refreshing the page', 'Check your internet connection'],
        riskLevel: 'high'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadKalshiMarkets = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/kalshi-polymarket?source=kalshi');
      const data = await response.json();
      setCurrentPicks(data.data?.markets || []);
    } catch (error) {
      console.error('Failed to load Kalshi markets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPolymarketMarkets = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/kalshi-polymarket?source=polymarket');
      const data = await response.json();
      setCurrentPicks(data.data?.markets || []);
    } catch (error) {
      console.error('Failed to load Polymarket markets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#10b981';
    if (confidence >= 0.6) return '#f59e0b';
    if (confidence >= 0.4) return '#f97316';
    return '#ef4444';
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: '8px' }}>🤖 Progno AI Advisor</h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        Get AI-powered sports betting advice, analyze prediction markets, and optimize your betting strategy.
      </p>

      {/* Tab Navigation */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e5e7eb' }}>
          <button
            onClick={() => setActiveTab('advisor')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === 'advisor' ? '#0070f3' : 'transparent',
              color: activeTab === 'advisor' ? 'white' : '#666',
              cursor: 'pointer',
              borderBottom: activeTab === 'advisor' ? '2px solid #0070f3' : 'none',
              fontWeight: activeTab === 'advisor' ? '600' : '400'
            }}
          >
            🧠 AI Advisor
          </button>
          <button
            onClick={() => setActiveTab('kalshi')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === 'kalshi' ? '#0070f3' : 'transparent',
              color: activeTab === 'kalshi' ? 'white' : '#666',
              cursor: 'pointer',
              borderBottom: activeTab === 'kalshi' ? '2px solid #0070f3' : 'none',
              fontWeight: activeTab === 'kalshi' ? '600' : '400'
            }}
          >
            📊 Kalshi Markets
          </button>
          <button
            onClick={() => setActiveTab('polymarket')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === 'polymarket' ? '#0070f3' : 'transparent',
              color: activeTab === 'polymarket' ? 'white' : '#666',
              cursor: 'pointer',
              borderBottom: activeTab === 'polymarket' ? '2px solid #0070f3' : 'none',
              fontWeight: activeTab === 'polymarket' ? '600' : '400'
            }}
          >
            📈 Polymarket
          </button>
        </div>
      </div>

      {/* AI Advisor Tab */}
      {activeTab === 'advisor' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Input Section */}
          <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>💬 Ask AI Advisor</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Your Question:
              </label>
              <textarea
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                placeholder="Ask about bankroll management, value betting, strategy, or specific picks..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <button
              onClick={getAdvice}
              disabled={loading || !userQuestion.trim()}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: loading ? '#9ca3af' : '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? '🤔 Analyzing...' : '🚀 Get Advice'}
            </button>
          </div>

          {/* Current Picks */}
          <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>📋 Current Picks</h3>
            
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {currentPicks.length > 0 ? (
                currentPicks.map((pick, index) => (
                  <div key={index} style={{
                    padding: '12px',
                    marginBottom: '8px',
                    background: 'white',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {pick.homeTeam} vs {pick.awayTeam}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {pick.sport} • {pick.pick}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                      <span style={{ color: getConfidenceColor(pick.confidence) }}>
                        Confidence: {Math.round(pick.confidence * 100)}%
                      </span>
                      <span style={{ color: pick.edge > 0 ? '#10b981' : '#ef4444' }}>
                        Edge: {pick.edge > 0 ? '+' : ''}{pick.edge}%
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
                  No current picks available
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Advice Response */}
      {advice && activeTab === 'advisor' && (
        <div style={{ marginTop: '24px', background: '#f0f9ff', padding: '24px', borderRadius: '12px', border: '1px solid #3b82f6' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#1e40af' }}>
            🤖 AI Analysis
          </h3>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontWeight: '600', marginBottom: '8px' }}>Advice:</div>
            <div style={{ lineHeight: '1.6' }}>{advice.advice}</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontWeight: '600', marginRight: '8px' }}>Confidence:</span>
            <div style={{
              background: getConfidenceColor(advice.confidence),
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              {Math.round(advice.confidence * 100)}%
            </div>
            <span style={{ marginLeft: '12px', color: getRiskLevelColor(advice.riskLevel) }}>
              Risk Level: {advice.riskLevel.toUpperCase()}
            </span>
          </div>

          {advice.reasoning.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>Reasoning:</div>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {advice.reasoning.map((reason, index) => (
                  <li key={index} style={{ marginBottom: '4px' }}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {advice.recommendations.length > 0 && (
            <div>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>Recommendations:</div>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {advice.recommendations.map((rec, index) => (
                  <li key={index} style={{ marginBottom: '4px' }}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {advice.valueBets && advice.valueBets.length > 0 && (
            <div>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>🎯 Value Bet Opportunities:</div>
              {advice.valueBets.map((bet, index) => (
                <div key={index} style={{
                  padding: '12px',
                  marginBottom: '8px',
                  background: 'white',
                  borderRadius: '8px',
                  border: '1px solid #10b981'
                }}>
                  <div style={{ fontWeight: '600' }}>{bet.game}</div>
                  <div style={{ color: '#666' }}>{bet.pick}</div>
                  <div style={{ color: '#10b981' }}>Confidence: {Math.round(bet.confidence * 100)}%</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>{bet.reasoning}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Kalshi Markets Tab */}
      {activeTab === 'kalshi' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <button
              onClick={loadKalshiMarkets}
              disabled={loading}
              style={{
                padding: '12px 24px',
                background: loading ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Loading...' : '🔄 Refresh Kalshi Markets'}
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {currentPicks.map((market, index) => (
              <div key={index} style={{
                padding: '16px',
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h4 style={{ marginTop: 0, marginBottom: '8px', color: '#1f2937' }}>
                  {market.title}
                </h4>
                <p style={{ marginBottom: '12px', color: '#666', fontSize: '14px' }}>
                  {market.description}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: '#10b981', fontWeight: '600' }}>
                      Yes: {market.yes_bid}
                    </span>
                    <span style={{ color: '#ef4444', fontWeight: '600', marginLeft: '12px' }}>
                      No: {market.no_bid}
                    </span>
                  </div>
                  {market.edge && (
                    <span style={{
                      background: market.edge > 0 ? '#10b981' : '#ef4444',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {market.edge > 0 ? '+' : ''}{market.edge}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Polymarket Tab */}
      {activeTab === 'polymarket' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <button
              onClick={loadPolymarketMarkets}
              disabled={loading}
              style={{
                padding: '12px 24px',
                background: loading ? '#9ca3af' : '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Loading...' : '🔄 Refresh Polymarket'}
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {currentPicks.map((market, index) => (
              <div key={index} style={{
                padding: '16px',
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h4 style={{ marginTop: 0, marginBottom: '8px', color: '#1f2937' }}>
                  {market.question}
                </h4>
                <p style={{ marginBottom: '12px', color: '#666', fontSize: '14px' }}>
                  {market.description}
                </p>
                {market.outcomes && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {market.outcomes.map((outcome: any, idx: number) => (
                      <div key={idx} style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                          {outcome.outcome}
                        </div>
                        <div style={{ color: '#8b5cf6', fontSize: '18px', fontWeight: '700' }}>
                          {outcome.price}
                        </div>
                        <div style={{ color: '#666', fontSize: '12px' }}>
                          {Math.round(outcome.probability * 100)}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
