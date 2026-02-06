'use client';

import { useState, useEffect } from 'react';

interface HealthStatus {
  service: string;
  status: 'ok' | 'error' | 'unknown';
  uptimeSeconds?: number;
  lastCheck?: string;
}

interface BrainLog {
  ts: string;
  component: string;
  level: 'info' | 'warn' | 'error';
  event: string;
  [key: string]: any;
}

export default function BrainAdminPage() {
  const [healthStatuses, setHealthStatuses] = useState<HealthStatus[]>([]);
  const [logs, setLogs] = useState<BrainLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [testTarget, setTestTarget] = useState('agent:progno');
  const [testCommand, setTestCommand] = useState('test_prediction');
  const [testArgs, setTestArgs] = useState('{"data": {"teamA": "Alabama", "teamB": "Georgia"}}');

  const healthServices = ['progno', 'calmcast', 'petreunion', 'shelter', 'core', 'forge', 'jobs'];

  async function checkHealth() {
    setLoading(true);
    const statuses: HealthStatus[] = [];

    for (const service of healthServices) {
      try {
        const res = await fetch(`/health/${service}`);
        const data = await res.json().catch(() => ({}));
        statuses.push({
          service,
          status: res.ok && data.status === 'ok' ? 'ok' : 'error',
          uptimeSeconds: data.uptimeSeconds,
          lastCheck: new Date().toISOString(),
        });
      } catch (error) {
        statuses.push({
          service,
          status: 'error',
          lastCheck: new Date().toISOString(),
        });
      }
    }

    setHealthStatuses(statuses);
    setLoading(false);
  }

  async function fetchLogs() {
    // In a real implementation, this would fetch from a log store
    // For now, we'll show a placeholder
    setLogs([]);
  }

  async function testDispatch() {
    setLoading(true);
    try {
      const res = await fetch('/api/brain/dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: testTarget,
          command: testCommand,
          args: JSON.parse(testArgs || '{}'),
          priority: 'medium',
        }),
      });

      const data = await res.json();
      alert(`Dispatch result: ${JSON.stringify(data, null, 2)}`);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ 
      padding: 'clamp(1rem, 2vw, 3rem)', 
      maxWidth: 'min(95vw, 1600px)', 
      margin: '0 auto',
      fontSize: 'clamp(14px, 1.2vw, 18px)'
    }}>
      <h1 style={{ 
        fontSize: 'clamp(1.75rem, 3vw, 3rem)', 
        fontWeight: 'bold', 
        marginBottom: 'clamp(1rem, 2vw, 2rem)',
        lineHeight: 1.2
      }}>
        🧠 Brain Control Center
      </h1>

      {/* Health Status */}
      <section style={{ marginBottom: 'clamp(2rem, 4vw, 4rem)' }}>
        <h2 style={{ 
          fontSize: 'clamp(1.25rem, 2.5vw, 2rem)', 
          fontWeight: '600', 
          marginBottom: 'clamp(0.75rem, 1.5vw, 1.5rem)'
        }}>
          Health Status
        </h2>
        <button
          onClick={checkHealth}
          disabled={loading}
          style={{
            padding: 'clamp(0.75rem, 1.5vw, 1rem) clamp(1.5rem, 3vw, 2rem)',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: 'clamp(6px, 0.8vw, 8px)',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: 'clamp(0.75rem, 1.5vw, 1.5rem)',
            fontSize: 'clamp(0.9rem, 1.3vw, 1.1rem)',
            fontWeight: 600,
            minHeight: '44px',
            transition: 'background 0.2s, transform 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.background = '#5568d3';
              e.currentTarget.style.transform = 'scale(1.02)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#667eea';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {loading ? 'Checking...' : 'Refresh Health Checks'}
        </button>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(150px, 100%), 1fr))', 
          gap: 'clamp(0.75rem, 1.5vw, 1.5rem)'
        }}>
          {healthStatuses.map((status) => (
            <div
              key={status.service}
              style={{
                padding: 'clamp(0.75rem, 1.5vw, 1.5rem)',
                border: '1px solid #e5e7eb',
                borderRadius: 'clamp(6px, 0.8vw, 12px)',
                background: status.status === 'ok' ? '#d1fae5' : status.status === 'error' ? '#fee2e2' : '#f3f4f6',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ 
                fontWeight: '600', 
                marginBottom: 'clamp(0.25rem, 0.5vw, 0.5rem)',
                fontSize: 'clamp(1rem, 1.5vw, 1.25rem)'
              }}>{status.service}</div>
              <div style={{ 
                fontSize: 'clamp(0.8rem, 1.1vw, 0.95rem)', 
                color: '#6b7280',
                lineHeight: 1.5
              }}>
                Status: <strong>{status.status}</strong>
              </div>
              {status.uptimeSeconds && (
                <div style={{ 
                  fontSize: 'clamp(0.8rem, 1.1vw, 0.95rem)', 
                  color: '#6b7280',
                  lineHeight: 1.5
                }}>
                  Uptime: {Math.floor(status.uptimeSeconds / 3600)}h
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Dispatch Tester */}
      <section style={{ marginBottom: 'clamp(2rem, 4vw, 4rem)' }}>
        <h2 style={{ 
          fontSize: 'clamp(1.25rem, 2.5vw, 2rem)', 
          fontWeight: '600', 
          marginBottom: 'clamp(0.75rem, 1.5vw, 1.5rem)'
        }}>
          Dispatch Tester
        </h2>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 'clamp(0.75rem, 1.5vw, 1.5rem)', 
          maxWidth: 'min(90vw, 800px)'
        }}>
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: 'clamp(0.25rem, 0.5vw, 0.5rem)', 
              fontWeight: '500',
              fontSize: 'clamp(0.9rem, 1.2vw, 1.1rem)'
            }}>
              Target:
            </label>
            <select
              value={testTarget}
              onChange={(e) => setTestTarget(e.target.value)}
              style={{ 
                width: '100%', 
                padding: 'clamp(0.75rem, 1.5vw, 1rem)', 
                border: '1px solid #d1d5db', 
                borderRadius: 'clamp(6px, 0.8vw, 8px)',
                fontSize: 'clamp(0.9rem, 1.2vw, 1.1rem)',
                minHeight: '44px'
              }}
            >
              <option value="agent:ops">agent:ops</option>
              <option value="agent:devops">agent:devops</option>
              <option value="agent:ai">agent:ai</option>
              <option value="agent:progno">agent:progno</option>
              <option value="agent:calmcast">agent:calmcast</option>
              <option value="agent:petreunion">agent:petreunion</option>
              <option value="agent:shelter">agent:shelter</option>
              <option value="agent:forge">agent:forge</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Command:
            </label>
            <input
              type="text"
              value={testCommand}
              onChange={(e) => setTestCommand(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Args (JSON):
            </label>
            <textarea
              value={testArgs}
              onChange={(e) => setTestArgs(e.target.value)}
              rows={4}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontFamily: 'monospace' }}
            />
          </div>
          <button
            onClick={testDispatch}
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
            }}
          >
            {loading ? 'Dispatching...' : 'Dispatch Action'}
          </button>
        </div>
      </section>

      {/* Log Viewer */}
      <section>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
          Log Viewer
        </h2>
        <button
          onClick={fetchLogs}
          style={{
            padding: '0.5rem 1rem',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '1rem',
          }}
        >
          Fetch Logs
        </button>
        {logs.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            No logs available. Logs are streamed to console and webhook (if configured).
          </div>
        ) : (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'auto', maxHeight: '400px' }}>
            {logs.map((log, idx) => (
              <div
                key={idx}
                style={{
                  padding: '0.75rem',
                  borderBottom: '1px solid #e5e7eb',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  background: log.level === 'error' ? '#fee2e2' : log.level === 'warn' ? '#fef3c7' : 'white',
                }}
              >
                <pre>{JSON.stringify(log, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}


