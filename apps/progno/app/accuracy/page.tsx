'use client';

/**
 * Accuracy Dashboard Page
 * 
 * Shows our AI's historical performance metrics
 * Competitors like Leans AI show ~71.3% accuracy - we show EVERYTHING
 */

import AccuracyDashboard from '../components/AccuracyDashboard';
import { useRouter } from 'next/navigation';

export default function AccuracyPage() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
          
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '0.5rem',
          }}>
            📊 AI Accuracy Dashboard
          </h1>
          <p style={{
            fontSize: '1.125rem',
            color: 'rgba(255, 255, 255, 0.7)',
          }}>
            Comprehensive performance metrics for Cevict Flex AI predictions
          </p>
        </div>

        {/* Main Dashboard */}
        <AccuracyDashboard />

        {/* Footer Info */}
        <div style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '0.875rem',
        }}>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong style={{ color: 'white' }}>How We Compare:</strong>
          </p>
          <p>
            Rithmm: Basic AI Model • Leans AI: 71.3% Accuracy Claim • Juice Reel: ML Picks • OddsTrader: Computer Analysis
          </p>
          <p style={{ marginTop: '1rem', color: '#10b981' }}>
            <strong>Cevict Flex: 7-Dimensional Claude Effect + Monte Carlo Simulations + Value Betting Detection</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

