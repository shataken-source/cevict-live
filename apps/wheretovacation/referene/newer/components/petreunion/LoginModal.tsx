'use client';

import React, { useState } from 'react';
import { useAuth } from '../../lib/auth-context';

/**
 * LOGIN MODAL
 * 
 * PetReunion branded login/signup modal with Facebook OAuth
 * 
 * Features:
 * - Continue with Facebook button
 * - Email/password login (future)
 * - Sign up flow
 * - Password reset (future)
 */

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (isNewUser: boolean) => void;
  redirectTo?: string;
}

export default function LoginModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  redirectTo 
}: LoginModalProps) {
  const { loginWithFacebook } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Email form state (for future email auth)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleFacebookLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await loginWithFacebook();

      if (result.success) {
        setSuccess(result.isNewUser 
          ? 'Welcome to PetReunion! 🎉' 
          : 'Welcome back!'
        );
        
        setTimeout(() => {
          onSuccess?.(result.isNewUser || false);
          onClose();
          
          if (redirectTo) {
            window.location.href = redirectTo;
          }
        }, 1500);
      } else {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement email auth
    setError('Email login coming soon! Please use Facebook for now.');
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Close Button */}
        <button style={styles.closeButton} onClick={onClose}>
          ×
        </button>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logo}>🐾</div>
          <h2 style={styles.title}>
            {mode === 'login' ? 'Welcome Back!' : 'Join PetReunion'}
          </h2>
          <p style={styles.subtitle}>
            {mode === 'login' 
              ? 'Sign in to manage your pets and alerts'
              : 'Create an account to protect your pets'
            }
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div style={styles.errorBox}>
            <span>⚠️</span> {error}
          </div>
        )}
        {success && (
          <div style={styles.successBox}>
            <span>✓</span> {success}
          </div>
        )}

        {/* Facebook Button */}
        <button 
          style={styles.facebookButton}
          onClick={handleFacebookLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <span>Connecting...</span>
          ) : (
            <>
              <svg style={styles.facebookIcon} viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Continue with Facebook
            </>
          )}
        </button>

        {/* Divider */}
        <div style={styles.divider}>
          <span style={styles.dividerLine}></span>
          <span style={styles.dividerText}>or</span>
          <span style={styles.dividerLine}></span>
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={styles.input}
              disabled={isLoading}
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={styles.input}
              disabled={isLoading}
            />
          </div>
          <button 
            type="submit" 
            style={styles.submitButton}
            disabled={isLoading}
          >
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Mode Switch */}
        <p style={styles.modeSwitch}>
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button 
                style={styles.linkButton}
                onClick={() => setMode('signup')}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button 
                style={styles.linkButton}
                onClick={() => setMode('login')}
              >
                Sign in
              </button>
            </>
          )}
        </p>

        {/* Terms */}
        <p style={styles.terms}>
          By continuing, you agree to PetReunion's{' '}
          <a href="/terms" style={styles.termsLink}>Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" style={styles.termsLink}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PETREUNION BRANDED STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '1rem',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '2rem',
    width: '100%',
    maxWidth: '420px',
    position: 'relative',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  closeButton: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '0.5rem',
    lineHeight: 1,
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '1.5rem',
  },
  logo: {
    fontSize: '3rem',
    marginBottom: '0.5rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 0.5rem 0',
  },
  subtitle: {
    color: '#6b7280',
    margin: 0,
    fontSize: '0.875rem',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    marginBottom: '1rem',
    color: '#dc2626',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  successBox: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    marginBottom: '1rem',
    color: '#16a34a',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  facebookButton: {
    width: '100%',
    padding: '0.875rem 1rem',
    backgroundColor: '#1877f2',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    transition: 'background-color 0.2s',
  },
  facebookIcon: {
    width: '20px',
    height: '20px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '1.5rem 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    padding: '0 1rem',
    color: '#9ca3af',
    fontSize: '0.875rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  inputGroup: {
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  submitButton: {
    width: '100%',
    padding: '0.875rem 1rem',
    backgroundColor: '#059669', // PetReunion green
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.5rem',
    transition: 'background-color 0.2s',
  },
  modeSwitch: {
    textAlign: 'center' as const,
    marginTop: '1.5rem',
    color: '#6b7280',
    fontSize: '0.875rem',
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#059669',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0,
    fontSize: 'inherit',
  },
  terms: {
    textAlign: 'center' as const,
    marginTop: '1.5rem',
    color: '#9ca3af',
    fontSize: '0.75rem',
    lineHeight: 1.5,
  },
  termsLink: {
    color: '#6b7280',
    textDecoration: 'underline',
  },
};

// Export a standalone Facebook button for use elsewhere
export function FacebookLoginButton({ 
  onSuccess,
  disabled = false,
  fullWidth = false,
  size = 'medium'
}: {
  onSuccess?: (isNewUser: boolean) => void;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium' | 'large';
}) {
  const { loginWithFacebook } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClick = async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await loginWithFacebook();
      if (result.success) {
        onSuccess?.(result.isNewUser || false);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeStyles = {
    small: { padding: '0.5rem 1rem', fontSize: '0.875rem' },
    medium: { padding: '0.75rem 1.25rem', fontSize: '1rem' },
    large: { padding: '1rem 1.5rem', fontSize: '1.125rem' },
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={disabled || isLoading}
        style={{
          ...styles.facebookButton,
          ...sizeStyles[size],
          width: fullWidth ? '100%' : 'auto',
          opacity: disabled || isLoading ? 0.6 : 1,
        }}
      >
        {isLoading ? (
          'Connecting...'
        ) : (
          <>
            <svg style={{ width: size === 'small' ? '16px' : '20px', height: size === 'small' ? '16px' : '20px' }} viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Continue with Facebook
          </>
        )}
      </button>
      {error && (
        <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.5rem' }}>{error}</p>
      )}
    </div>
  );
}

