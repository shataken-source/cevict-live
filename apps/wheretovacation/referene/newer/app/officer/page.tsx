'use client';

import React, { useState, useEffect } from 'react';
import FieldOfficerDashboard from '../../components/petreunion/FieldOfficerDashboard';

/**
 * FIELD OFFICER PORTAL
 * /officer
 * 
 * Entry point for Animal Control and Law Enforcement personnel.
 * Handles registration and verification before showing the main dashboard.
 */

interface OfficerSession {
  userId: string;
  officerId?: number;
  departmentName?: string;
  badgeNumber?: string;
  isVerified: boolean;
  officerName?: string;
}

export default function OfficerPortal() {
  const [session, setSession] = useState<OfficerSession | null>(null);
  const [view, setView] = useState<'loading' | 'login' | 'register' | 'dashboard'>('loading');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for registration
  const [regForm, setRegForm] = useState({
    departmentName: '',
    departmentType: 'animal_control',
    jurisdiction: '',
    badgeNumber: '',
    workEmail: '',
    workPhone: '',
    officerName: ''
  });

  // Check for existing session on mount
  useEffect(() => {
    const storedSession = localStorage.getItem('officer_session');
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession);
        setSession(parsed);
        setView('dashboard');
      } catch {
        setView('login');
      }
    } else {
      setView('login');
    }
  }, []);

  // Simple login (would integrate with actual auth)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const email = (e.target as any).email.value;
    const password = (e.target as any).password.value;

    if (!email || !password) {
      setError('Email and password required');
      return;
    }

    setIsSubmitting(true);

    try {
      // For demo: Create a mock session based on email
      // In production, this would call your auth system
      const userId = `officer-${email.replace(/[^a-z0-9]/gi, '-')}`;
      
      // Check if officer exists
      const response = await fetch(`/api/petreunion/officer/encounters?userId=${userId}`);
      const data = await response.json();

      if (data.success) {
        // Officer exists
        const officerSession: OfficerSession = {
          userId,
          officerId: data.officer?.id,
          departmentName: data.officer?.departmentName,
          isVerified: data.officer?.isVerified || false,
          officerName: email.split('@')[0]
        };
        
        localStorage.setItem('officer_session', JSON.stringify(officerSession));
        setSession(officerSession);
        setView('dashboard');
      } else {
        // Not registered - show registration
        setRegForm(prev => ({ ...prev, workEmail: email }));
        setView('register');
      }
    } catch (err: any) {
      setError('Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const userId = `officer-${regForm.workEmail.replace(/[^a-z0-9]/gi, '-')}`;

      const response = await fetch('/api/petreunion/officer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          departmentName: regForm.departmentName,
          departmentType: regForm.departmentType,
          jurisdiction: regForm.jurisdiction,
          badgeNumber: regForm.badgeNumber,
          workEmail: regForm.workEmail,
          workPhone: regForm.workPhone
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Registration failed');
      }

      // Save session (pending verification)
      const officerSession: OfficerSession = {
        userId,
        officerId: data.officer?.id,
        departmentName: regForm.departmentName,
        isVerified: false,
        officerName: regForm.officerName || regForm.workEmail.split('@')[0]
      };

      localStorage.setItem('officer_session', JSON.stringify(officerSession));
      setSession(officerSession);
      setView('dashboard');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('officer_session');
    setSession(null);
    setView('login');
  };

  // Loading state
  if (view === 'loading') {
    return (
      <div style={styles.container}>
        <div style={styles.loadingBox}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⭐</div>
          <p style={{ color: '#fbbf24' }}>LOADING...</p>
        </div>
      </div>
    );
  }

  // Login view
  if (view === 'login') {
    return (
      <div style={styles.container}>
        <div style={styles.formContainer}>
          {/* Header */}
          <div style={styles.formHeader}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🛡️</div>
            <h1 style={styles.formTitle}>FIELD OFFICER PORTAL</h1>
            <p style={styles.formSubtitle}>Animal Control & Law Enforcement</p>
          </div>

          {/* Error */}
          {error && <div style={styles.errorBox}>{error}</div>}

          {/* Login Form */}
          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>WORK EMAIL</label>
              <input
                type="email"
                name="email"
                placeholder="officer@agency.gov"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>PASSWORD</label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                style={styles.input}
                required
              />
            </div>

            <button type="submit" style={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? 'SIGNING IN...' : 'SIGN IN'}
            </button>
          </form>

          {/* Register Link */}
          <p style={styles.registerText}>
            New officer?{' '}
            <button 
              style={styles.linkButton}
              onClick={() => setView('register')}
            >
              Register with your agency email
            </button>
          </p>

          {/* Info */}
          <div style={styles.infoBox}>
            <p style={{ color: '#fbbf24', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              🔐 PROFESSIONAL ACCESS ONLY
            </p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              This portal is for verified Animal Control and Law Enforcement personnel.
              Registration requires a .gov, .org, or official agency email.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Registration view
  if (view === 'register') {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.formContainer, maxWidth: '500px' }}>
          {/* Header */}
          <div style={styles.formHeader}>
            <button 
              onClick={() => setView('login')}
              style={styles.backButton}
            >
              ← Back
            </button>
            <h1 style={styles.formTitle}>OFFICER REGISTRATION</h1>
            <p style={styles.formSubtitle}>Create your professional account</p>
          </div>

          {/* Error */}
          {error && <div style={styles.errorBox}>{error}</div>}

          {/* Registration Form */}
          <form onSubmit={handleRegister} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>YOUR NAME</label>
              <input
                type="text"
                placeholder="Officer Smith"
                style={styles.input}
                value={regForm.officerName}
                onChange={(e) => setRegForm(prev => ({ ...prev, officerName: e.target.value }))}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>DEPARTMENT NAME</label>
              <input
                type="text"
                placeholder="City of Example Animal Control"
                style={styles.input}
                value={regForm.departmentName}
                onChange={(e) => setRegForm(prev => ({ ...prev, departmentName: e.target.value }))}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>DEPARTMENT TYPE</label>
              <select
                style={styles.select}
                value={regForm.departmentType}
                onChange={(e) => setRegForm(prev => ({ ...prev, departmentType: e.target.value }))}
              >
                <option value="animal_control">Animal Control</option>
                <option value="police">Police Department</option>
                <option value="sheriff">Sheriff's Office</option>
                <option value="municipal">Municipal Services</option>
                <option value="state">State Agency</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>JURISDICTION</label>
              <input
                type="text"
                placeholder="City, County, or Region"
                style={styles.input}
                value={regForm.jurisdiction}
                onChange={(e) => setRegForm(prev => ({ ...prev, jurisdiction: e.target.value }))}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>BADGE/ID NUMBER (Optional)</label>
              <input
                type="text"
                placeholder="12345"
                style={styles.input}
                value={regForm.badgeNumber}
                onChange={(e) => setRegForm(prev => ({ ...prev, badgeNumber: e.target.value }))}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>WORK EMAIL (.gov, .org required)</label>
              <input
                type="email"
                placeholder="officer@agency.gov"
                style={styles.input}
                value={regForm.workEmail}
                onChange={(e) => setRegForm(prev => ({ ...prev, workEmail: e.target.value }))}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>WORK PHONE (Optional)</label>
              <input
                type="tel"
                placeholder="(555) 123-4567"
                style={styles.input}
                value={regForm.workPhone}
                onChange={(e) => setRegForm(prev => ({ ...prev, workPhone: e.target.value }))}
              />
            </div>

            <button type="submit" style={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? 'REGISTERING...' : 'REGISTER'}
            </button>
          </form>

          <p style={{ ...styles.registerText, fontSize: '0.75rem' }}>
            By registering, you confirm you are an authorized Animal Control or 
            Law Enforcement officer. Your account will be reviewed before activation.
          </p>
        </div>
      </div>
    );
  }

  // Dashboard view
  if (view === 'dashboard' && session) {
    return (
      <>
        {/* Logout button */}
        <button 
          onClick={handleLogout}
          style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            zIndex: 1000,
            padding: '0.5rem 1rem',
            backgroundColor: '#333',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          LOGOUT
        </button>
        
        <FieldOfficerDashboard
          userId={session.userId}
          officerName={session.officerName}
          departmentName={session.departmentName}
          isVerified={session.isVerified}
        />
      </>
    );
  }

  return null;
}

// Styles
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  loadingBox: {
    textAlign: 'center' as const,
  },
  formContainer: {
    width: '100%',
    maxWidth: '400px',
  },
  formHeader: {
    textAlign: 'center' as const,
    marginBottom: '2rem',
  },
  formTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#fbbf24',
    margin: '0 0 0.25rem 0',
  },
  formSubtitle: {
    color: '#6b7280',
    fontSize: '0.875rem',
    margin: 0,
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#6b7280',
    fontSize: '0.875rem',
    cursor: 'pointer',
    marginBottom: '1rem',
  },
  errorBox: {
    padding: '1rem',
    backgroundColor: '#7f1d1d',
    borderRadius: '8px',
    color: '#fecaca',
    marginBottom: '1rem',
    textAlign: 'center' as const,
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
    color: '#9ca3af',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
    marginBottom: '0.5rem',
  },
  input: {
    width: '100%',
    padding: '1rem',
    backgroundColor: '#111',
    border: '2px solid #333',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1rem',
    outline: 'none',
  },
  select: {
    width: '100%',
    padding: '1rem',
    backgroundColor: '#111',
    border: '2px solid #333',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1rem',
    outline: 'none',
  },
  submitButton: {
    width: '100%',
    padding: '1rem',
    backgroundColor: '#fbbf24',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  registerText: {
    textAlign: 'center' as const,
    color: '#6b7280',
    marginTop: '1.5rem',
    fontSize: '0.875rem',
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#fbbf24',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: 'inherit',
  },
  infoBox: {
    marginTop: '2rem',
    padding: '1rem',
    backgroundColor: '#111',
    borderRadius: '8px',
    border: '1px solid #333',
    textAlign: 'center' as const,
  },
};

