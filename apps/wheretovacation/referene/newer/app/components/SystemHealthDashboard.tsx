'use client';

// Comprehensive System Health Dashboard
// Displays health status for all systems, scrapers, backups, and services

import { useEffect, useState } from 'react';

interface HealthStatus {
  service: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  lastCheck?: string;
  details?: any;
}

interface BackupStatus {
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  lastBackupTime: string | null;
  backupAgeHours: number;
  message: string;
}

interface ScraperStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  lastRun: string | null;
  lastRunAgeHours: number;
  successRate: number;
  averagePetsFound: number;
}

export default function SystemHealthDashboard() {
  const [services, setServices] = useState<HealthStatus[]>([]);
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [scraperStatuses, setScraperStatuses] = useState<ScraperStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const serviceEndpoints = [
    { name: 'Progno', endpoint: '/health/progno' },
    { name: 'PetReunion', endpoint: '/health/petreunion' },
    { name: 'Calmcast', endpoint: '/health/calmcast' },
    { name: 'Core', endpoint: '/health/core' },
  ];

  async function refreshAll() {
    setLoading(true);
    try {
      // Check services
      const serviceChecks = await Promise.allSettled(
        serviceEndpoints.map(async ({ name, endpoint }) => {
          try {
            const res = await fetch(endpoint);
            const data = await res.json().catch(() => ({}));

            if (res.status === 404) {
              return {
                service: name,
                status: 'unknown',
                lastCheck: new Date().toISOString(),
                details: data,
              } as HealthStatus;
            }

            const okStatus = (data as any)?.status;
            return {
              service: name,
              status: res.ok && okStatus === 'ok' ? 'healthy' : res.ok ? 'unknown' : 'error',
              lastCheck: new Date().toISOString(),
              details: data,
            } as HealthStatus;
          } catch {
            return {
              service: name,
              status: 'error' as const,
              lastCheck: new Date().toISOString(),
            } as HealthStatus;
          }
        })
      );

      setServices(
        serviceChecks
          .filter((r): r is PromiseFulfilledResult<HealthStatus> => r.status === 'fulfilled')
          .map(r => r.value)
      );

      // Check backups
      try {
        const backupRes = await fetch('/api/health/backup-verification');
        const backupData = await backupRes.json();
        setBackupStatus(backupData);
      } catch (err) {
        setBackupStatus({
          status: 'unknown',
          lastBackupTime: null,
          backupAgeHours: Infinity,
          message: 'Could not check backup status',
        });
      }

      // Check scrapers
      try {
        const scraperRes = await fetch('/api/health/scraper-status');
        const scraperData = await scraperRes.json();
        setScraperStatuses(scraperData.scrapers || []);
      } catch (err) {
        setScraperStatuses([]);
      }

      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'error':
      case 'critical':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
      case 'critical':
        return '❌';
      default:
        return '❓';
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>🏥 System Health Dashboard</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
          <button
            onClick={refreshAll}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
            }}
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Services Status */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>Services</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
          {services.map((service) => (
            <div
              key={service.service}
              style={{
                padding: '1.5rem',
                border: `2px solid ${getStatusColor(service.status)}`,
                borderRadius: '8px',
                background: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>{getStatusIcon(service.status)}</span>
                <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{service.service}</div>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Status: <strong style={{ color: getStatusColor(service.status) }}>{service.status}</strong>
              </div>
              {service.details?.uptimeSeconds && (
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Uptime: {Math.floor(service.details.uptimeSeconds / 3600)}h
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Backup Status */}
      {backupStatus && (
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>Backup System</h2>
          <div
            style={{
              padding: '1.5rem',
              border: `2px solid ${getStatusColor(backupStatus.status)}`,
              borderRadius: '8px',
              background: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>{getStatusIcon(backupStatus.status)}</span>
              <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>Backup Status</div>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
              {backupStatus.message}
            </div>
            {backupStatus.lastBackupTime && (
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Last backup: {new Date(backupStatus.lastBackupTime).toLocaleString()} (
                {Math.round(backupStatus.backupAgeHours)} hours ago)
              </div>
            )}
          </div>
        </section>
      )}

      {/* Scraper Status */}
      {scraperStatuses.length > 0 && (
        <section>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>Scrapers</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {scraperStatuses.map((scraper) => (
              <div
                key={scraper.name}
                style={{
                  padding: '1.5rem',
                  border: `2px solid ${getStatusColor(scraper.status)}`,
                  borderRadius: '8px',
                  background: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{getStatusIcon(scraper.status)}</span>
                  <div style={{ fontWeight: '600', fontSize: '1.1rem', textTransform: 'capitalize' }}>
                    {scraper.name.replace(/-/g, ' ')}
                  </div>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  <div>Status: <strong style={{ color: getStatusColor(scraper.status) }}>{scraper.status}</strong></div>
                  {scraper.lastRun && (
                    <div style={{ marginTop: '0.25rem' }}>
                      Last run: {Math.round(scraper.lastRunAgeHours)}h ago
                    </div>
                  )}
                  <div style={{ marginTop: '0.25rem' }}>Success rate: {scraper.successRate}%</div>
                  <div style={{ marginTop: '0.25rem' }}>Avg pets found: {scraper.averagePetsFound}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

