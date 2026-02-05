'use client';

/**
 * Enhanced Picks Card Component
 * 
 * Shows all bet types for a single game:
 * - Moneyline (who wins)
 * - Spread (point spread)
 * - Total (over/under)
 * 
 * Plus value betting indicators and Monte Carlo confidence
 */

import { useState } from 'react';

interface Pick {
  sport: string;
  home_team: string;
  away_team: string;
  game_time: string;
  confidence: number;
  is_premium: boolean;
  analysis: string;
  
  // Moneyline
  pick: string;
  odds: number;
  
  // Claude Effect
  claude_effect: number;
  sentiment_field: number;
  narrative_momentum: number;
  information_asymmetry: number;
  chaos_sensitivity: number;
  ai_confidence: string;
  
  // Monte Carlo
  mc_win_probability: number;
  mc_predicted_score: { home: number; away: number };
  mc_spread_probability: number;
  mc_total_probability: number;
  mc_iterations: number;
  
  // Value Bet
  value_bet_edge: number;
  value_bet_ev: number;
  has_value: boolean;
}

interface EnhancedPicksCardProps {
  pick: Pick;
  showDetails?: boolean;
}

export default function EnhancedPicksCard({ pick, showDetails = true }: EnhancedPicksCardProps) {
  const [activeTab, setActiveTab] = useState<'moneyline' | 'spread' | 'total'>('moneyline');
  const [expanded, setExpanded] = useState(false);

  const gameTime = new Date(pick.game_time);
  const timeStr = gameTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  const dateStr = gameTime.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });

  const winProb = pick.mc_win_probability || (pick.confidence / 100);
  const spreadProb = pick.mc_spread_probability || 0.5;
  const totalProb = pick.mc_total_probability || 0.5;

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      overflow: 'hidden',
      border: pick.is_premium 
        ? '2px solid rgba(245, 158, 11, 0.5)' 
        : pick.has_value 
          ? '1px solid rgba(16, 185, 129, 0.3)'
          : '1px solid rgba(255, 255, 255, 0.1)',
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1.5rem',
        background: pick.is_premium 
          ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(234, 179, 8, 0.1) 100%)'
          : 'rgba(255, 255, 255, 0.02)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>{getSportEmoji(pick.sport)}</span>
            <div>
              <div style={{ 
                fontSize: '1.125rem', 
                fontWeight: 'bold', 
                color: 'white' 
              }}>
                {pick.away_team} @ {pick.home_team}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                {pick.sport} • {dateStr} • {timeStr}
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {pick.is_premium && (
            <span style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
            }}>
              ⭐ PREMIUM
            </span>
          )}
          {pick.has_value && (
            <span style={{
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#10b981',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}>
              💰 VALUE
            </span>
          )}
          <div style={{
            background: getConfidenceColor(pick.confidence),
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            fontSize: '1.25rem',
            fontWeight: 'bold',
          }}>
            {pick.confidence}%
          </div>
        </div>
      </div>

      {/* Bet Type Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        {(['moneyline', 'spread', 'total'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '1rem',
              background: activeTab === tab ? 'rgba(79, 70, 229, 0.2)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #4f46e5' : '2px solid transparent',
              color: activeTab === tab ? 'white' : 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              transition: 'all 0.2s',
            }}
          >
            {tab === 'moneyline' ? '💵 Moneyline' : tab === 'spread' ? '📊 Spread' : '📈 Total'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: '1.5rem' }}>
        {activeTab === 'moneyline' && (
          <BetTypeContent
            title="Moneyline Pick"
            pick={pick.pick}
            probability={winProb}
            odds={pick.odds}
            edge={pick.value_bet_edge}
            ev={pick.value_bet_ev}
            predictedScore={pick.mc_predicted_score}
            reasoning={`Win probability: ${(winProb * 100).toFixed(1)}% based on ${pick.mc_iterations || 1000}+ simulations`}
          />
        )}
        {activeTab === 'spread' && (
          <BetTypeContent
            title="Spread Pick"
            pick={`${pick.pick} (spread TBD)`}
            probability={spreadProb}
            odds={-110}
            edge={spreadProb > 0.52 ? (spreadProb - 0.52) * 100 : 0}
            ev={spreadProb > 0.52 ? (spreadProb * 91 - (1 - spreadProb) * 100) : 0}
            predictedScore={pick.mc_predicted_score}
            reasoning={`Cover probability: ${(spreadProb * 100).toFixed(1)}%`}
          />
        )}
        {activeTab === 'total' && (
          <BetTypeContent
            title="Total Pick"
            pick={totalProb > 0.5 ? 'Over' : 'Under'}
            probability={Math.max(totalProb, 1 - totalProb)}
            odds={-110}
            edge={(Math.max(totalProb, 1 - totalProb) - 0.52) * 100}
            ev={0}
            predictedScore={pick.mc_predicted_score}
            reasoning={`${totalProb > 0.5 ? 'Over' : 'Under'} probability: ${(Math.max(totalProb, 1 - totalProb) * 100).toFixed(1)}%`}
          />
        )}
      </div>

      {/* Claude Effect Section (Expandable) */}
      {showDetails && (
        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              width: '100%',
              padding: '1rem 1.5rem',
              background: 'rgba(255, 255, 255, 0.02)',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>🤖 Claude Effect AI Details</span>
            <span>{expanded ? '▲' : '▼'}</span>
          </button>
          
          {expanded && (
            <div style={{ padding: '1rem 1.5rem', paddingTop: 0 }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                gap: '1rem',
                marginBottom: '1rem',
              }}>
                <ClaudeEffectMeter label="Sentiment" value={pick.sentiment_field} />
                <ClaudeEffectMeter label="Narrative" value={pick.narrative_momentum} />
                <ClaudeEffectMeter label="Sharp Money" value={pick.information_asymmetry} />
                <ClaudeEffectMeter label="Chaos Risk" value={pick.chaos_sensitivity} />
              </div>
              
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '1rem',
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.8)',
              }}>
                <strong>AI Analysis:</strong> {pick.analysis}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BetTypeContent({
  title,
  pick,
  probability,
  odds,
  edge,
  ev,
  predictedScore,
  reasoning,
}: {
  title: string;
  pick: string;
  probability: number;
  odds: number;
  edge: number;
  ev: number;
  predictedScore?: { home: number; away: number };
  reasoning: string;
}) {
  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '1.5rem',
      }}>
        <div>
          <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.25rem' }}>
            {title}
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'white' }}>
            {pick}
          </div>
          <div style={{ fontSize: '1rem', color: '#60a5fa' }}>
            {odds > 0 ? `+${odds}` : odds}
          </div>
        </div>
        
        {predictedScore && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.25rem' }}>
              Predicted Score
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
              {predictedScore.home} - {predictedScore.away}
            </div>
          </div>
        )}
      </div>

      {/* Probability Bar */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: '0.875rem',
          marginBottom: '0.5rem',
        }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Win Probability</span>
          <span style={{ color: '#10b981', fontWeight: 'bold' }}>{(probability * 100).toFixed(1)}%</span>
        </div>
        <div style={{
          height: '8px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${probability * 100}%`,
            background: probability > 0.65 
              ? 'linear-gradient(90deg, #10b981, #34d399)'
              : probability > 0.55
                ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                : 'linear-gradient(90deg, #60a5fa, #3b82f6)',
            borderRadius: '4px',
          }} />
        </div>
      </div>

      {/* Edge & EV */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '1rem',
        marginBottom: '1rem',
      }}>
        <div style={{
          background: edge > 3 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          padding: '1rem',
          border: edge > 3 ? '1px solid rgba(16, 185, 129, 0.3)' : 'none',
        }}>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>Edge</div>
          <div style={{ 
            fontSize: '1.25rem', 
            fontWeight: 'bold', 
            color: edge > 3 ? '#10b981' : 'white' 
          }}>
            {edge > 0 ? '+' : ''}{edge.toFixed(1)}%
          </div>
        </div>
        <div style={{
          background: ev > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          padding: '1rem',
          border: ev > 0 ? '1px solid rgba(245, 158, 11, 0.3)' : 'none',
        }}>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>Expected Value</div>
          <div style={{ 
            fontSize: '1.25rem', 
            fontWeight: 'bold', 
            color: ev > 0 ? '#f59e0b' : 'white' 
          }}>
            {ev >= 0 ? '+' : ''}${ev.toFixed(0)}/bet
          </div>
        </div>
      </div>

      <div style={{
        fontSize: '0.875rem',
        color: 'rgba(255, 255, 255, 0.6)',
        fontStyle: 'italic',
      }}>
        {reasoning}
      </div>
    </div>
  );
}

function ClaudeEffectMeter({ label, value }: { label: string; value: number }) {
  const normalized = Math.min(1, Math.max(-1, value * 5)); // Scale to -1 to 1
  const percentage = (normalized + 1) / 2 * 100; // Convert to 0-100

  return (
    <div>
      <div style={{ 
        fontSize: '0.75rem', 
        color: 'rgba(255, 255, 255, 0.6)',
        marginBottom: '0.25rem',
      }}>
        {label}
      </div>
      <div style={{
        height: '6px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '3px',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Center marker */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: '2px',
          background: 'rgba(255, 255, 255, 0.3)',
        }} />
        {/* Value indicator */}
        <div style={{
          position: 'absolute',
          left: `${Math.min(percentage, 50)}%`,
          width: `${Math.abs(percentage - 50)}%`,
          height: '100%',
          background: value > 0 
            ? 'linear-gradient(90deg, transparent, #10b981)'
            : 'linear-gradient(270deg, transparent, #ef4444)',
        }} />
      </div>
      <div style={{
        fontSize: '0.75rem',
        fontWeight: 'bold',
        color: value > 0 ? '#10b981' : value < 0 ? '#ef4444' : 'rgba(255, 255, 255, 0.6)',
        marginTop: '0.25rem',
      }}>
        {value > 0 ? '+' : ''}{(value * 100).toFixed(0)}%
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
  return emojis[sport?.toUpperCase()] || '🎯';
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
  if (confidence >= 70) return 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
  if (confidence >= 60) return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
  return 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
}

