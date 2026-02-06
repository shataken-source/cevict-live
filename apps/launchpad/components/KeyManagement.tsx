// Component: apps/launchpad/components/KeyManagement.tsx
'use client';

import { useState } from 'react';

export default function KeyManagement() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [dryRun, setDryRun] = useState(false);
  const [scanCodebase, setScanCodebase] = useState(false);
  const [verbose, setVerbose] = useState(false);
  const [forceOverwrite, setForceOverwrite] = useState(false);
  const [backup, setBackup] = useState(true);
  const [validateKeys, setValidateKeys] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [appFilter, setAppFilter] = useState('');

  const distributeKeys = async () => {
    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch('/api/keys/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryRun,
          scanCodebase,
          verbose,
          forceOverwrite,
          backup,
          validateKeys,
          interactive,
          appFilter: appFilter.trim() || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        setResults(data);
      } else {
        setError(data.message || 'Failed to distribute keys');
      }
    } catch (err) {
      setError('Failed to distribute keys: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem',
      borderRadius: '12px',
      color: 'white'
    }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        ?? API Key Management
      </h2>

      <p style={{ marginBottom: '1.5rem', opacity: 0.9 }}>
        Automatically distribute API keys to all apps in the monorepo
      </p>

      <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Dry Run (preview only)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={forceOverwrite}
              onChange={(e) => setForceOverwrite(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Force Overwrite (replace existing)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={backup}
              onChange={(e) => setBackup(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Create Backup</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={validateKeys}
              onChange={(e) => setValidateKeys(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Validate Key Formats</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={scanCodebase}
              onChange={(e) => setScanCodebase(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Scan Codebase</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={verbose}
              onChange={(e) => setVerbose(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Verbose Output</span>
          </label>
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>App Filter (optional - e.g., "progno" to process only progno app):</span>
            <input
              type="text"
              value={appFilter}
              onChange={(e) => setAppFilter(e.target.value)}
              placeholder="Leave empty for all apps"
              style={{
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: '0.875rem'
              }}
            />
          </label>
        </div>
      </div>

      <button
        onClick={distributeKeys}
        disabled={loading}
        style={{
          background: loading ? '#888' : 'white',
          color: '#667eea',
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          border: 'none',
          fontWeight: 'bold',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '1rem',
          width: '100%'
        }}
      >
        {loading ? 'Distributing...' : '🔑 Distribute Keys'}
      </button>

      {error && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: 'rgba(255, 0, 0, 0.2)',
          borderRadius: '8px'
        }}>
          ? {error}
        </div>
      )}

      {results && results.results && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '8px'
        }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
            ✅ Distribution Complete
          </h3>
          <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>App</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem' }}>Added</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem' }}>Skipped</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem' }}>Missing</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem' }}>Invalid</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem' }}>Total</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem' }}>Backup</th>
                </tr>
              </thead>
              <tbody>
                {results.results.map((result: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{result.app}</td>
                    <td style={{ textAlign: 'right', padding: '0.5rem', color: '#4ade80' }}>{result.added}</td>
                    <td style={{ textAlign: 'right', padding: '0.5rem', color: '#fbbf24' }}>{result.skipped}</td>
                    <td style={{ textAlign: 'right', padding: '0.5rem', color: '#f87171' }}>{result.missing || 0}</td>
                    <td style={{ textAlign: 'right', padding: '0.5rem', color: result.invalid > 0 ? '#ef4444' : 'inherit' }}>{result.invalid || 0}</td>
                    <td style={{ textAlign: 'right', padding: '0.5rem' }}>{result.total}</td>
                    <td style={{ textAlign: 'center', padding: '0.5rem', fontSize: '0.75rem' }}>{result.backup || 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {results.output && verbose && (
            <details style={{ marginTop: '1rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Full Output</summary>
              <pre style={{
                fontSize: '0.75rem',
                opacity: 0.8,
                marginTop: '0.5rem',
                maxHeight: '300px',
                overflow: 'auto',
                background: 'rgba(0,0,0,0.2)',
                padding: '0.5rem',
                borderRadius: '4px'
              }}>
                {results.output}
              </pre>
            </details>
          )}
        </div>
      )}

      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        fontSize: '0.875rem'
      }}>
        <h4 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Available Keys:
        </h4>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>? Stripe (Payment processing)</li>
          <li>? The Odds API (Sports data)</li>
          <li>? SportsBlaze (Backup sports data)</li>
          <li>? OpenWeather (Weather predictions)</li>
          <li>? Google Custom Search</li>
          <li>? Google Gemini (AI analysis)</li>
          <li>? Kalshi (Prediction markets)</li>
          <li>? Supabase (Database)</li>
          <li>? Facebook (Social login)</li>
        </ul>
      </div>
    </div>
  );
}
