'use client';

import { useState } from 'react';

export default function FreeSMSSignup() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const response = await fetch('/api/sms/subscribe-free', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: cleanedPhone,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setPhoneNumber('');
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError(data.error || 'Failed to subscribe to free SMS bets');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '16px',
      padding: '32px',
      marginTop: '32px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
    }}>
      <h3 style={{
        fontSize: '28px',
        fontWeight: 'bold',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: 'white',
      }}>
        📱 Get FREE Daily Best Bet via SMS
      </h3>
      <p style={{
        fontSize: '16px',
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: '24px',
        lineHeight: '1.6',
      }}>
        Sign up to receive our <strong>exclusive daily best bet</strong> via SMS - completely free!
        This is our top pick that's not available on the website. Get it delivered to your phone every day.
      </p>

      {success && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.2)',
          border: '1px solid rgba(16, 185, 129, 0.5)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
          color: '#10b981',
          fontSize: '14px',
          fontWeight: '500',
        }}>
          ✅ Successfully subscribed! You'll receive your first free best bet tomorrow.
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.2)',
          border: '1px solid rgba(239, 68, 68, 0.5)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
          color: '#ef4444',
          fontSize: '14px',
          fontWeight: '500',
        }}>
          ❌ {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+1234567890 (include country code)"
          style={{
            flex: '1 1 250px',
            padding: '14px 16px',
            background: 'rgba(255, 255, 255, 0.95)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '10px',
            color: '#1f2937',
            fontSize: '16px',
            fontWeight: '500',
          }}
          disabled={loading || success}
        />
        <button
          onClick={handleSubscribe}
          disabled={loading || success || !phoneNumber.trim()}
          style={{
            padding: '14px 32px',
            background: loading || success || !phoneNumber.trim()
              ? 'rgba(255, 255, 255, 0.3)'
              : 'white',
            border: 'none',
            borderRadius: '10px',
            color: loading || success || !phoneNumber.trim()
              ? 'rgba(255, 255, 255, 0.5)'
              : '#667eea',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: loading || success || !phoneNumber.trim() ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: loading || success || !phoneNumber.trim() ? 'none' : '0 4px 12px rgba(0, 0, 0, 0.15)',
          }}
          onMouseEnter={(e) => {
            if (!loading && !success && phoneNumber.trim()) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading && !success && phoneNumber.trim()) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            }
          }}
        >
          {loading ? 'Subscribing...' : success ? 'Subscribed!' : 'Get Free Bets'}
        </button>
      </div>

      <p style={{
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.7)',
        marginTop: '16px',
        lineHeight: '1.5',
      }}>
        🔒 Your phone number is secure. Standard message rates may apply. You can unsubscribe at any time by replying STOP.
      </p>
    </div>
  );
}

