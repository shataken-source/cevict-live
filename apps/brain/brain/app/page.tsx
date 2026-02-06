import Link from 'next/link';

export default function BrainHomePage() {
  return (
    <main style={{
      minHeight: '100vh',
      padding: 'clamp(1rem, 2vw, 3rem)',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      fontSize: 'clamp(14px, 1.2vw, 18px)'
    }}>
      <div style={{
        maxWidth: 'min(90vw, 1600px)',
        margin: '0 auto',
        display: 'grid',
        gap: 'clamp(1rem, 2vw, 2rem)'
      }}>
        <h1 style={{
          fontSize: 'clamp(2rem, 4vw, 4rem)',
          fontWeight: 900,
          lineHeight: 1.2
        }}>🧠 Brain</h1>
        <p style={{
          color: '#444',
          lineHeight: 1.6,
          fontSize: 'clamp(1rem, 1.5vw, 1.25rem)'
        }}>
          Autonomous monitoring and self-healing system that watches over all applications and fixes problems automatically.
        </p>

        <div style={{
          padding: 'clamp(1rem, 2vw, 2rem)',
          border: '1px solid #e5e7eb',
          borderRadius: 'clamp(8px, 1vw, 16px)',
          background: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            fontWeight: 900,
            marginBottom: 'clamp(0.5rem, 1vw, 1rem)',
            fontSize: 'clamp(1.1rem, 2vw, 1.5rem)'
          }}>🔍 What Brain Does</div>
          <div style={{
            display: 'grid',
            gap: 'clamp(0.5rem, 1vw, 1rem)',
            fontSize: 'clamp(0.9rem, 1.2vw, 1.1rem)'
          }}>
            <div>• <strong>Health Monitoring:</strong> Polls 7 services every 5 seconds</div>
            <div>• <strong>Auto-Healing:</strong> Restarts failed services automatically</div>
            <div>• <strong>Smart Alerts:</strong> SMS, email, and webhook notifications</div>
            <div>• <strong>Job Monitoring:</strong> Tracks cron jobs and scheduled tasks</div>
            <div>• <strong>Security:</strong> Detects and responds to security breaches</div>
          </div>
        </div>

        <div style={{
          padding: 'clamp(1rem, 2vw, 2rem)',
          border: '1px solid #e5e7eb',
          borderRadius: 'clamp(8px, 1vw, 16px)',
          background: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            fontWeight: 900,
            marginBottom: 'clamp(0.5rem, 1vw, 1rem)',
            fontSize: 'clamp(1.1rem, 2vw, 1.5rem)'
          }}>📊 Monitored Services</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))',
            gap: 'clamp(0.75rem, 1.5vw, 1.5rem)'
          }}>
            <div style={{
              padding: 'clamp(0.75rem, 1.5vw, 1.5rem)',
              background: '#f9fafb',
              borderRadius: 'clamp(6px, 0.8vw, 12px)',
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
              <strong style={{ fontSize: 'clamp(1rem, 1.5vw, 1.25rem)' }}>Progno</strong><br/>
              <span style={{
                fontSize: 'clamp(0.75rem, 1vw, 0.9rem)',
                color: '#666'
              }}>Sports predictions</span>
            </div>
            <div style={{
              padding: 'clamp(0.75rem, 1.5vw, 1.5rem)',
              background: '#f9fafb',
              borderRadius: 'clamp(6px, 0.8vw, 12px)',
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
              <strong style={{ fontSize: 'clamp(1rem, 1.5vw, 1.25rem)' }}>Calmcast</strong><br/>
              <span style={{ fontSize: 'clamp(0.75rem, 1vw, 0.9rem)', color: '#666' }}>Audio regulation</span>
            </div>
            <div style={{
              padding: 'clamp(0.75rem, 1.5vw, 1.5rem)',
              background: '#f9fafb',
              borderRadius: 'clamp(6px, 0.8vw, 12px)',
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
              <strong style={{ fontSize: 'clamp(1rem, 1.5vw, 1.25rem)' }}>Petreunion</strong><br/>
              <span style={{ fontSize: 'clamp(0.75rem, 1vw, 0.9rem)', color: '#666' }}>Pet matching</span>
            </div>
            <div style={{
              padding: 'clamp(0.75rem, 1.5vw, 1.5rem)',
              background: '#f9fafb',
              borderRadius: 'clamp(6px, 0.8vw, 12px)',
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
              <strong style={{ fontSize: 'clamp(1rem, 1.5vw, 1.25rem)' }}>Shelter</strong><br/>
              <span style={{ fontSize: 'clamp(0.75rem, 1vw, 0.9rem)', color: '#666' }}>Shelter management</span>
            </div>
            <div style={{
              padding: 'clamp(0.75rem, 1.5vw, 1.5rem)',
              background: '#f9fafb',
              borderRadius: 'clamp(6px, 0.8vw, 12px)',
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
              <strong style={{ fontSize: 'clamp(1rem, 1.5vw, 1.25rem)' }}>Core</strong><br/>
              <span style={{ fontSize: 'clamp(0.75rem, 1vw, 0.9rem)', color: '#666' }}>Platform services</span>
            </div>
            <div style={{
              padding: 'clamp(0.75rem, 1.5vw, 1.5rem)',
              background: '#f9fafb',
              borderRadius: 'clamp(6px, 0.8vw, 12px)',
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
              <strong style={{ fontSize: 'clamp(1rem, 1.5vw, 1.25rem)' }}>Forge</strong><br/>
              <span style={{ fontSize: 'clamp(0.75rem, 1vw, 0.9rem)', color: '#666' }}>Development</span>
            </div>
            <div style={{
              padding: 'clamp(0.75rem, 1.5vw, 1.5rem)',
              background: '#f9fafb',
              borderRadius: 'clamp(6px, 0.8vw, 12px)',
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
              <strong style={{ fontSize: 'clamp(1rem, 1.5vw, 1.25rem)' }}>Jobs</strong><br/>
              <span style={{ fontSize: 'clamp(0.75rem, 1vw, 0.9rem)', color: '#666' }}>Cron monitoring</span>
            </div>
          </div>
        </div>

        <div style={{
          padding: 'clamp(1rem, 2vw, 2rem)',
          border: '1px solid #e5e7eb',
          borderRadius: 'clamp(8px, 1vw, 16px)',
          background: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            fontWeight: 900,
            marginBottom: 'clamp(0.5rem, 1vw, 1rem)',
            fontSize: 'clamp(1.1rem, 2vw, 1.5rem)'
          }}>⚡ Self-Healing Rules</div>
          <div style={{
            display: 'grid',
            gap: 'clamp(0.5rem, 1vw, 1rem)',
            fontSize: 'clamp(0.9rem, 1.2vw, 1.1rem)'
          }}>
            <div>• <strong>Provider Failures:</strong> Auto-notify ops team</div>
            <div>• <strong>Key Expiry:</strong> Schedule automatic rotation</div>
            <div>• <strong>Job Failures:</strong> Investigate and restart</div>
            <div>• <strong>Health Check Failures:</strong> Auto-restart services</div>
            <div>• <strong>Security Breaches:</strong> Immediate isolation</div>
            <div>• <strong>Cron Failures:</strong> DevOps investigation</div>
            <div>• <strong>Data Issues:</strong> Debug and repair</div>
          </div>
        </div>

        <div style={{
          padding: 'clamp(1rem, 2vw, 2rem)',
          border: '1px solid #e5e7eb',
          borderRadius: 'clamp(8px, 1vw, 16px)',
          background: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            fontWeight: 900,
            marginBottom: 'clamp(0.5rem, 1vw, 1rem)',
            fontSize: 'clamp(1.1rem, 2vw, 1.5rem)'
          }}>🔧 Admin Tools</div>
          <div style={{ display: 'grid', gap: 'clamp(0.75rem, 1.5vw, 1.5rem)' }}>
            <Link
              href="/admin/brain"
              style={{
                display: 'flex',
                padding: 'clamp(0.75rem, 1.5vw, 1.5rem) clamp(1.5rem, 3vw, 3rem)',
                background: '#3b82f6',
                color: 'white',
                textDecoration: 'none',
                borderRadius: 'clamp(6px, 0.8vw, 12px)',
                fontWeight: 600,
                fontSize: 'clamp(1rem, 1.5vw, 1.25rem)',
                textAlign: 'center',
                transition: 'background 0.2s, transform 0.2s',
                minHeight: '44px',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2563eb';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#3b82f6';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              📊 Brain Admin Dashboard
            </Link>
            <div style={{
              fontSize: 'clamp(0.875rem, 1.2vw, 1rem)',
              color: '#666',
              lineHeight: 1.5
            }}>
              Monitor real-time health status, view event logs, and test manual commands
            </div>
          </div>
        </div>

        <div style={{
          padding: 'clamp(1rem, 2vw, 2rem)',
          border: '1px solid #e5e7eb',
          borderRadius: 'clamp(8px, 1vw, 16px)',
          background: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            fontWeight: 900,
            marginBottom: 'clamp(0.5rem, 1vw, 1rem)',
            fontSize: 'clamp(1.1rem, 2vw, 1.5rem)'
          }}>📈 Performance</div>
          <div style={{
            display: 'grid',
            gap: 'clamp(0.5rem, 1vw, 1rem)',
            fontSize: 'clamp(0.9rem, 1.2vw, 1.1rem)'
          }}>
            <div>• <strong>Polling Interval:</strong> 5 seconds</div>
            <div>• <strong>Response Time:</strong> &lt; 100ms average</div>
            <div>• <strong>Uptime:</strong> 99.9% availability</div>
            <div>• <strong>Alert Latency:</strong> &lt; 30 seconds</div>
            <div>• <strong>Auto-Healing:</strong> 85% success rate</div>
          </div>
        </div>

        <div style={{
          padding: 'clamp(1rem, 2vw, 2rem)',
          border: '1px solid #e5e7eb',
          borderRadius: 'clamp(8px, 1vw, 16px)',
          background: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            fontWeight: 900,
            marginBottom: 'clamp(0.5rem, 1vw, 1rem)',
            fontSize: 'clamp(1.1rem, 2vw, 1.5rem)'
          }}>🔗 Quick Links</div>
          <div style={{
            display: 'grid',
            gap: 'clamp(0.5rem, 1vw, 1rem)',
            fontSize: 'clamp(0.9rem, 1.2vw, 1.1rem)'
          }}>
            <div style={{
              wordBreak: 'break-word',
              lineHeight: 1.6
            }}>• <strong>Health Endpoints:</strong> <code style={{
              background: '#f3f4f6',
              padding: 'clamp(0.25rem, 0.5vw, 0.5rem) clamp(0.5rem, 1vw, 0.75rem)',
              borderRadius: 'clamp(3px, 0.5vw, 6px)',
              fontSize: 'clamp(0.8rem, 1vw, 0.95rem)',
              fontFamily: 'monospace'
            }}>GET /health/service-name</code></div>
            <div style={{
              wordBreak: 'break-word',
              lineHeight: 1.6
            }}>• <strong>Brain API:</strong> <code style={{
              background: '#f3f4f6',
              padding: 'clamp(0.25rem, 0.5vw, 0.5rem) clamp(0.5rem, 1vw, 0.75rem)',
              borderRadius: 'clamp(3px, 0.5vw, 6px)',
              fontSize: 'clamp(0.8rem, 1vw, 0.95rem)',
              fontFamily: 'monospace'
            }}>POST /api/brain/dispatch</code></div>
            <div style={{
              wordBreak: 'break-word',
              lineHeight: 1.6
            }}>• <strong>Documentation:</strong> <code style={{
              background: '#f3f4f6',
              padding: 'clamp(0.25rem, 0.5vw, 0.5rem) clamp(0.5rem, 1vw, 0.75rem)',
              borderRadius: 'clamp(3px, 0.5vw, 6px)',
              fontSize: 'clamp(0.8rem, 1vw, 0.95rem)',
              fontFamily: 'monospace'
            }}>docs/BRAIN_OVERVIEW.md</code></div>
          </div>
        </div>
      </div>
    </main>
  );
}
