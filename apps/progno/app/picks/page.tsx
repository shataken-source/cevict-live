'use client';

/**
 * Daily Picks Page
 * 
 * Shows all AI-generated picks for today with:
 * - Moneyline, spread, and total options
 * - Value bet indicators
 * - Monte Carlo confidence
 * - Claude Effect AI analysis
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import EnhancedPicksCard from '../components/EnhancedPicksCard';

export default function PicksPage() {
  const router = useRouter();
  const [picks, setPicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'premium' | 'value'>('all');
  const [sportFilter, setSportFilter] = useState<string>('all');

  useEffect(() => {
    fetchPicks();
  }, []);

  const fetchPicks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/picks/today');
      const data = await response.json();
      
      if (data.picks) {
        setPicks(data.picks);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch picks');
    } finally {
      setLoading(false);
    }
  };

  // Filter picks
  const filteredPicks = picks.filter(pick => {
    if (filter === 'premium' && !pick.is_premium) return false;
    if (filter === 'value' && !pick.has_value) return false;
    if (sportFilter !== 'all' && pick.sport !== sportFilter) return false;
    return true;
  });

  // Get unique sports
  const sports = ['all', ...new Set(picks.map(p => p.sport))];

  // Stats
  const premiumCount = picks.filter(p => p.is_premium).length;
  const valueCount = picks.filter(p => p.has_value).length;
  const avgConfidence = picks.length > 0 
    ? Math.round(picks.reduce((sum, p) => sum + p.confidence, 0) / picks.length)
    : 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
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
              marginBottom: '1.5rem',
              fontSize: '1rem',
            }}
          >
            ← Back to Home
          </button>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{
                fontSize: '2.5rem',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '0.5rem',
              }}>
                🎯 Today's AI Picks
              </h1>
              <p style={{
                fontSize: '1.125rem',
                color: 'rgba(255, 255, 255, 0.7)',
              }}>
                Powered by Cevict Flex 7-Dimensional Claude Effect + Monte Carlo Simulations
              </p>
            </div>
            
            <button
              onClick={fetchPicks}
              disabled={loading}
              style={{
                background: loading ? '#4b5563' : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold',
              }}
            >
              {loading ? '⏳ Loading...' : '🔄 Refresh Picks'}
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          <StatCard label="Total Picks" value={picks.length} icon="📊" />
          <StatCard label="Premium Picks" value={premiumCount} icon="⭐" color="#f59e0b" />
          <StatCard label="Value Bets" value={valueCount} icon="💰" color="#10b981" />
          <StatCard label="Avg Confidence" value={`${avgConfidence}%`} icon="🎯" color="#60a5fa" />
        </div>

        {/* Filters */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
        }}>
          {/* Type Filter */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['all', 'premium', 'value'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: filter === f ? '#4f46e5' : 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                {f === 'all' ? 'All Picks' : f === 'premium' ? '⭐ Premium' : '💰 Value'}
              </button>
            ))}
          </div>

          {/* Sport Filter */}
          <select
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            {sports.map(sport => (
              <option key={sport} value={sport} style={{ background: '#1a1a2e' }}>
                {sport === 'all' ? 'All Sports' : sport}
              </option>
            ))}
          </select>
        </div>

        {/* Error State */}
        {error && (
          <div style={{
            padding: '2rem',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            textAlign: 'center',
            marginBottom: '2rem',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{
            padding: '4rem',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.6)',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔄</div>
            <div>Generating AI picks...</div>
            <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Running 1000+ Monte Carlo simulations per game
            </div>
          </div>
        )}

        {/* No Picks State */}
        {!loading && !error && filteredPicks.length === 0 && (
          <div style={{
            padding: '4rem',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.6)',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏟️</div>
            <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No picks match your filters</div>
            <div style={{ fontSize: '0.875rem' }}>
              Try changing your filter settings or check back later for more games
            </div>
          </div>
        )}

        {/* Picks Grid */}
        {!loading && filteredPicks.length > 0 && (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {filteredPicks.map((pick, index) => (
              <EnhancedPicksCard key={pick.id || index} pick={pick} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: '3rem',
          padding: '1.5rem',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: '0.875rem',
        }}>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong style={{ color: '#10b981' }}>Cevict Flex AI</strong> • 7-Dimensional Claude Effect • Monte Carlo Simulations • Value Betting Detection
          </p>
          <p>
            Picks are for entertainment purposes only. Please gamble responsibly.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color = 'white' }: { 
  label: string; 
  value: string | number; 
  icon: string;
  color?: string;
}) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '12px',
      padding: '1.25rem',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{icon}</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>{label}</div>
    </div>
  );
}

