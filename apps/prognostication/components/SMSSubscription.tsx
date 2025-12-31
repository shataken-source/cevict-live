'use client';

import { useState } from 'react';

interface SMSSubscriptionProps {
  userTier: 'pro' | 'elite' | 'free';
  userEmail?: string;
}

export default function SMSSubscription({ userTier, userEmail }: SMSSubscriptionProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (userTier === 'free') {
    return null; // Don't show SMS subscription for free users
  }

  const handleSubscribe = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    // Basic phone validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const cleanedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    if (!phoneRegex.test(cleanedPhone)) {
      setError('Invalid phone number. Please include country code (e.g., +1234567890)');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/sms/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail || localStorage.getItem('user_email') || '',
          phoneNumber: cleanedPhone,
          sessionId: new URLSearchParams(window.location.search).get('session_id'),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setPhoneNumber('');
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError(data.error || 'Failed to subscribe to SMS alerts');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'rgba(16, 185, 129, 0.1)',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      borderRadius: '12px',
      padding: '24px',
      marginTop: '32px',
    }}>
      <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        📱 SMS Alerts
      </h3>
      <p style={{ fontSize: '14px', color: '#d1d5db', marginBottom: '16px' }}>
        Get instant notifications when new {userTier === 'elite' ? 'Elite' : 'Pro'} picks are available, plus last-minute updates for weather, injuries, and lineup changes.
      </p>

      {success && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.2)',
          border: '1px solid rgba(16, 185, 129, 0.5)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          color: '#10b981',
          fontSize: '14px',
        }}>
          ✅ SMS alerts enabled! You'll receive notifications for new picks and updates.
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.2)',
          border: '1px solid rgba(239, 68, 68, 0.5)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          color: '#ef4444',
          fontSize: '14px',
        }}>
          ❌ {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+1234567890"
          style={{
            flex: 1,
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '16px',
          }}
          disabled={loading || success}
        />
        <button
          onClick={handleSubscribe}
          disabled={loading || success || !phoneNumber.trim()}
          style={{
            padding: '12px 24px',
            background: loading || success || !phoneNumber.trim()
              ? 'rgba(75, 85, 99, 0.5)'
              : 'linear-gradient(to right, #10b981, #059669)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: loading || success || !phoneNumber.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Subscribing...' : success ? 'Subscribed!' : 'Enable Alerts'}
        </button>
      </div>

      <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '12px' }}>
        Standard message rates may apply. You can unsubscribe at any time.
      </p>
    </div>
  );
}

