'use client';

import { useEffect, useState, useMemo } from 'react';
import styles from './page.module.css';
import type { Telemetry } from './lib/telemetry-types';
import { generateRecommendations, type Recommendation } from './lib/ai-recommendations';
import { calculateSolarImpactScore, classifyImpact, getImpactLabel, type WeatherSnapshotInput } from './lib/solar-impact';
import { calculateTiltProfiles, type TiltProfile } from './lib/tilt-optimizer';
import { calculateShadingLoss, type ShadingProfile, type ShadingImpactResult } from './lib/solar-core/shadingLoss.service';
import {
  TiltOptimizationCard,
  ChargeWindowCard,
  ShadingImpactCard,
  SolarCommandDashboard,
  MobileStatusBar,
  MobileActionBar,
} from './components/SolarDashboard';

interface WeatherData {
  cloudCover: number;
  temperatureC: number;
  windSpeed: number;
  shortwave_radiation: number;
}
interface BatteryBankConfig {
  banks: number;
  packsPerBank: number;
  voltagePerBank: number;
}

interface BleDevice {
  id: string;
  name: string;
}

interface GeocodeResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1: string;
  timezone: string;
}

interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatPanelProps {
  telemetry: Telemetry | null;
  weather: WeatherData | null;
  selectedLocation: { lat: number, lon: number, name: string } | null;
}

const AIChatPanel: React.FC<AIChatPanelProps> = ({ telemetry, weather, selectedLocation }) => {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your solar AI assistant. Ask me anything about your system, energy production, or optimization tips.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: AIChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          telemetry,
          weather,
          location: selectedLocation,
          history: messages.slice(-5), // Send last 5 messages for context
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMessage: AIChatMessage = {
          role: 'assistant',
          content: data.response || 'I\'m not sure how to answer that right now.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error('Failed to get AI response');
      }
    } catch (err) {
      const errorMessage: AIChatMessage = {
        role: 'assistant',
        content: 'Sorry, I\'m having trouble connecting right now. Please try again later.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.panel} style={{ gridColumn: '1 / -1' }}>
      <div className={styles.panelTitleRow}>
        <div className={styles.panelTitle}>💬 ASK AI</div>
        <div style={{ fontSize: '11px', color: '#a78bfa' }}>Claude AI Chat</div>
      </div>

      {/* Chat Messages */}
      <div
        style={{
          maxHeight: '300px',
          overflowY: 'auto',
          marginBottom: '12px',
          padding: '10px',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '10px',
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '80%',
                padding: '10px 14px',
                borderRadius: '12px',
                fontSize: '13px',
                lineHeight: 1.5,
                background: msg.role === 'user' ? 'rgba(102, 126, 234, 0.3)' : 'rgba(125, 211, 252, 0.1)',
                border: msg.role === 'user' ? '1px solid rgba(102, 126, 234, 0.4)' : '1px solid rgba(125, 211, 252, 0.2)',
                color: '#e5e7eb',
              }}
            >
              {msg.content}
            </div>
            <span style={{ fontSize: '10px', color: '#a78bfa', marginTop: '4px', marginLeft: msg.role === 'user' ? '0' : '4px', marginRight: msg.role === 'user' ? '4px' : '0' }}>
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a78bfa', fontSize: '13px', padding: '10px' }}>
            <span>AI is thinking</span>
            <span style={{ animation: 'pulse 1s infinite' }}>...</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          className={styles.input}
          placeholder="Ask about your solar system..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ flex: 1, height: '44px' }}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className={styles.button}
          style={{
            height: '44px',
            padding: '0 20px',
            opacity: isLoading || !input.trim() ? 0.5 : 1,
            cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer'
          }}
        >
          Send
        </button>
      </div>

      {/* Quick Questions */}
      <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {['How can I save more energy?', 'Is my battery healthy?', 'When will my battery be full?', 'Should I adjust my panels?'].map((q) => (
          <button
            key={q}
            onClick={() => { setInput(q); }}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              background: 'rgba(125, 211, 252, 0.1)',
              border: '1px solid rgba(125, 211, 252, 0.3)',
              borderRadius: '6px',
              color: '#7dd3fc',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(125, 211, 252, 0.2)';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(125, 211, 252, 0.1)';
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
};

export default function AccuSolarDashboard() {
  const [activeDataSource, setActiveDataSource] = useState<string>('demo-data');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [lastMainTab, setLastMainTab] = useState<string>('overview');
  const [activeSubTab, setActiveSubTab] = useState<string>('summary');
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
  const [bleDevices, setBleDevices] = useState<BleDevice[]>([]);
  const [selectedBle, setSelectedBle] = useState<string>('');
  const [batteryConfig, setBatteryConfig] = useState<BatteryBankConfig>({
    banks: 2,
    packsPerBank: 4,
    voltagePerBank: 12,
  });
  const [locationSearch, setLocationSearch] = useState<string>('');
  const [kpIndex, setKpIndex] = useState<number>(1.0);
  const [geocodeResults, setGeocodeResults] = useState<GeocodeResult[]>([]);
  // Load selectedLocation from localStorage on mount
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number, lon: number, name: string } | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('accusolar_location');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  const [dialog, setDialog] = useState<{ title: string; message: string; type: 'info' | 'error' | 'warning' } | null>(null);
  const [allowExit, setAllowExit] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  // Derived calculations using useMemo
  const solarImpact = useMemo(() => {
    if (!weather) return null;
    const snapshot: WeatherSnapshotInput = {
      cloudCover: weather.cloudCover,
      temperatureC: weather.temperatureC,
    };
    const score = calculateSolarImpactScore(snapshot);
    return {
      score,
      classification: classifyImpact(score),
      label: getImpactLabel(classifyImpact(score)),
    };
  }, [weather]);

  const tiltProfile = useMemo<TiltProfile | null>(() => {
    if (!selectedLocation) return null;
    return calculateTiltProfiles(selectedLocation.lat);
  }, [selectedLocation]);

  const shadingResult = useMemo<ShadingImpactResult | null>(() => {
    const profile: ShadingProfile = {
      morning: 10,
      midday: 5,
      afternoon: 15,
      seasonal: 'year_round',
    };
    return calculateShadingLoss(profile);
  }, []);

  const MAIN_TABS = ['sun-view', 'overview', 'telemetry', 'battery', 'optimization', 'weather', 'analytics', 'ai-insights', 'controls'];
  const DATA_SOURCE_TABS = ['demo-data', 'victron-local', 'ble'];

  // Save selectedLocation to localStorage whenever it changes
  useEffect(() => {
    if (selectedLocation) {
      localStorage.setItem('accusolar_location', JSON.stringify(selectedLocation));
    }
  }, [selectedLocation]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If user confirmed exit, allow the navigation
      if (allowExit) {
        return;
      }

      // Otherwise, prevent navigation and show confirmation dialog
      event.preventDefault();
      setDialog({
        title: '⬅️ Exit App?',
        message: 'Are you sure you want to leave Accu Solar Command? Your current session will be lost.',
        type: 'warning'
      });
      // Push state back to prevent navigation
      window.history.pushState(null, '', window.location.href);
    };

    // Initialize history stack
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [allowExit]);

  // Sync lastMainTab whenever activeTab changes
  useEffect(() => {
    if (MAIN_TABS.includes(activeTab)) {
      setLastMainTab(activeTab);
    }
  }, [activeTab]);

  // Fetch telemetry
  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        // Map tab names to API source parameter
        const sourceMap: Record<string, string> = {
          'demo-data': 'demo',
          'victron-local': 'victron_local',
          'ble': 'ble',
        };
        const source = sourceMap[activeDataSource] || 'demo';
        const res = await fetch(`/api/telemetry?source=${source}`);
        if (res.ok) {
          const data = await res.json();
          setTelemetry(data);
          setTelemetryError(null);
        } else {
          const errorData = await res.json();
          setTelemetryError(errorData.error || 'Failed to fetch telemetry');
          setTelemetry(null);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch telemetry';
        setTelemetryError(message);
        setTelemetry(null);
        console.error('Telemetry fetch failed:', err);
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(interval);
  }, [activeDataSource]);

  // Fetch weather
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Use selected location or default to San Francisco
        const lat = selectedLocation?.lat ?? 37.7749;
        const lon = selectedLocation?.lon ?? -122.4194;
        const res = await fetch(
          `/api/weather?lat=${lat}&lon=${lon}`
        );
        if (res.ok) {
          const data = await res.json();
          setWeather({
            cloudCover: data.cloudCover || 0,
            temperatureC: data.temperatureC || 20,
            windSpeed: data.windSpeed || 0,
            shortwave_radiation: data.ghi || 200,
          });
        }
      } catch (err) {
        console.error('Weather fetch failed:', err);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 300000); // 5 min
    return () => clearInterval(interval);
  }, [selectedLocation]);

  // Compute AI-style recommendations from telemetry + weather
  useEffect(() => {
    const recs = generateRecommendations({
      telemetry,
      weather: weather
        ? {
          cloudCover: weather.cloudCover,
          temperatureC: weather.temperatureC,
        }
        : null,
      latitude: selectedLocation?.lat,
      locationName: selectedLocation?.name,
    });
    setRecommendations(recs);
  }, [telemetry, weather, selectedLocation]);

  const getStatusColor = (status?: string): string => {
    switch (status) {
      case 'charging':
        return '#34d399';
      case 'discharging':
        return '#fbbf24';
      case 'fault':
        return '#fb7185';
      default:
        return '#7dd3fc';
    }
  };

  const formatTemp = (celsius: number): string => {
    if (tempUnit === 'F') {
      return `${Math.round((celsius * 9) / 5 + 32)}°F`;
    }
    return `${Math.round(celsius)}°C`;
  };

  const tempDisplay = telemetry ? formatTemp(telemetry.battery_temp_c) : '—';

  const handleLocationSearch = async () => {
    if (!locationSearch.trim()) {
      setDialog({ title: '⚠️ Empty Search', message: 'Please enter a location name (e.g., "Huntsville, AL")', type: 'warning' });
      return;
    }

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(locationSearch)}`);
      const data = await res.json();

      console.log('Geocode response:', { status: res.status, data });

      if (res.ok) {
        if (data.results && data.results.length > 0) {
          console.log(`Found ${data.results.length} results`);
          setGeocodeResults(data.results);
        } else {
          console.warn('API returned 200 but no results');
          setDialog({ title: '📍 Location Not Found', message: `Sorry, we couldn't find "${locationSearch}". Try searching for a major city or try a different spelling.`, type: 'info' });
          setGeocodeResults([]);
        }
      } else {
        console.error('API returned non-200:', data.error);
        setDialog({ title: '❌ Search Error', message: `Location search failed: ${data.error || 'Unknown error'}`, type: 'error' });
      }
    } catch (err) {
      console.error('Geocode error:', err);
      setDialog({ title: '❌ Network Error', message: 'Could not reach location service. Check your internet connection.', type: 'error' });
    }
  };

  const selectLocationResult = (result: GeocodeResult) => {
    setSelectedLocation({
      lat: result.latitude,
      lon: result.longitude,
      name: result.name,
    });
    setGeocodeResults([]);
    setLocationSearch('');
  };

  // Early return for loading state only - still show UI when there's an error
  if (!telemetry && !telemetryError) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <div className={styles.title}>
                <div className={styles.brandMark}></div>
                Accu Solar Command
              </div>
              <div className={styles.subtitle}>Loading...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Helper Components
  const KpiTile = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <div className={styles.kpiTile}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue} style={{ color: color || '#e5e7eb' }}>
        {value}
      </div>
    </div>
  );

  const HealthMetric = ({ label, value }: { label: string; value: string }) => (
    <div className={styles.healthMetric}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );

  const DistributionBar = ({ label, value }: { label: string; value: number }) => (
    <div className={styles.distRow}>
      <div className={styles.distLabel}>{label}</div>
      <div className={styles.distBarWrap}>
        <div
          className={styles.distBar}
          style={{ width: `${value}%` }}
        />
      </div>
      <div className={styles.distValue}>{value}%</div>
    </div>
  );

  // Derived telemetry values
  const solarKW = (telemetry?.solar_w || 0) / 1000;
  const loadKW = (telemetry?.load_w || 0) / 1000;
  const netKW = (telemetry?.grid_w || 0) / 1000;
  const batteryKW = ((telemetry?.battery_v || 0) * (telemetry?.battery_a || 0)) / 1000;
  const gridKW = (telemetry?.grid_w || 0) / 1000;
  const systemEfficiency = telemetry?.solar_w && telemetry?.load_w
    ? ((telemetry.load_w / telemetry.solar_w) * 100).toFixed(1)
    : '--';

  // Battery derived values
  const soc = telemetry?.battery_soc_pct || 0;
  const soh = telemetry?.battery_soh_pct || 0;
  const usableCapacity = telemetry?.battery_v
    ? ((telemetry.battery_soc_pct || 0) / 100 * 10.2).toFixed(1)
    : '--';
  const cRate = telemetry?.battery_a
    ? (Math.abs(telemetry.battery_a) / 200).toFixed(2)
    : '--';
  const roundTripEff = telemetry?.battery_soh_pct
    ? (telemetry.battery_soh_pct * 0.95).toFixed(0)
    : '--';

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.title}>
              <div className={styles.brandMark}></div>
              Accu Solar Command
            </div>
            <div className={styles.subtitle}>
              24/7 monitoring • forecasting • optimization • operator-grade telemetry
            </div>
          </div>
          <div className={styles.topBar}>
            <span style={{ fontSize: '12px', color: '#a78bfa' }}>
              Provider: Open-Meteo
            </span>
            <span style={{ fontSize: '12px', color: '#a78bfa' }}>
              Space Weather: Quiet (Kp {kpIndex.toFixed(1)})
            </span>
            <span style={{ fontSize: '12px', color: '#34d399' }}>
              Telemetry: live
            </span>
          </div>
        </div>

        <div className={styles.hudLine}></div>

        {/* Tab Navigation */}
        <div className={styles.tabBar}>
          {['demo-data', 'victron-local', 'ble'].map((source) => (
            <button
              key={source}
              className={`${styles.tab} ${activeDataSource === source ? styles.tabActive : ''}`}
              onClick={() => setActiveDataSource(source)}
              style={{ borderColor: activeDataSource === source ? '#667eea' : 'rgba(102, 126, 234, 0.2)' }}
            >
              {source === 'demo-data' && 'DEMO DATA'}
              {source === 'victron-local' && 'VICTRON LOCAL'}
              {source === 'ble' && 'BLE'}
            </button>
          ))}
          {MAIN_TABS.map((tab) => (
            <button
              key={tab}
              className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
              onClick={() => { setActiveTab(tab); setActiveSubTab('summary'); }}
            >
              {tab === 'sun-view' && 'SUN VIEW'}
              {tab === 'overview' && 'OVERVIEW'}
              {tab === 'telemetry' && 'TELEMETRY'}
              {tab === 'battery' && 'BATTERY'}
              {tab === 'optimization' && 'OPTIMIZE'}
              {tab === 'weather' && 'WEATHER'}
              {tab === 'analytics' && 'ANALYTICS'}
              {tab === 'ai-insights' && 'AI INSIGHTS'}
              {tab === 'controls' && 'CONTROLS'}
            </button>
          ))}
        </div>

        <div style={{ fontSize: '12px', color: '#a78bfa', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            No hardware yet? Use{' '}
            <span style={{ color: '#7dd3fc', fontWeight: '600' }}>Demo Data</span> (simulated). Victron Local =
            Venus OS on your LAN. BLE = connect a compatible battery in Controls.
          </div>
          <div style={{ background: 'rgba(102, 126, 234, 0.1)', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', color: '#667eea', fontWeight: '600' }}>
            SOURCE: {activeDataSource === 'demo-data' ? '📊 DEMO (simulated)' : activeDataSource === 'victron-local' ? '🔌 VICTRON LOCAL' : '📱 BLE'}
          </div>
        </div>

        {telemetryError && (
          <div style={{
            background: 'rgba(251, 113, 133, 0.15)',
            border: '1px solid rgba(251, 113, 133, 0.3)',
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#fb7185',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <span style={{ flex: 1 }}>{telemetryError}</span>
            {telemetryError?.includes('BLE') || telemetryError?.includes('Bluetooth') ? (
              <button
                onClick={() => setActiveTab('controls')}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(102, 126, 234, 0.2)',
                  color: '#a78bfa',
                  border: '1px solid rgba(102, 126, 234, 0.3)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(102, 126, 234, 0.3)';
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(102, 126, 234, 0.2)';
                }}
              >
                Go to Controls
              </button>
            ) : (
              <button
                onClick={() => setActiveDataSource('demo-data')}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(102, 126, 234, 0.2)',
                  color: '#a78bfa',
                  border: '1px solid rgba(102, 126, 234, 0.3)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(102, 126, 234, 0.3)';
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(102, 126, 234, 0.2)';
                }}
              >
                Use Demo Data
              </button>
            )}
          </div>
        )}

        {/* SUN VIEW TAB — EXACT MATCH TO DESIGN */}
        {activeTab === 'sun-view' && (
          <div className={styles.analyticsGrid}>
            {/* LEFT COLUMN — SYSTEM STATUS */}
            <div className={styles.analyticsLeft}>

              {/* Header with Charging Badge */}
              <div className={styles.panelTitleRow} style={{ marginBottom: '16px' }}>
                <div className={styles.panelTitle}>☀ SUN VIEW</div>
                <div className={styles.statusBadge} style={{ background: 'rgba(52, 211, 153, 0.2)', color: '#34d399' }}>
                  ● CHARGING
                </div>
              </div>

              {/* SUN / PV */}
              <div className={styles.sunSection}>
                <div className={styles.sunHeader}>SUN / PV</div>
                <div className={styles.sunMainValue}>3.18 kW</div>
                <div className={styles.sunSubValues}>
                  <span>DNI: 565 W/m²</span>
                  <span>125 W/m²</span>
                </div>
                <div className={styles.sunDetails}>
                  <div>Azimuth: 192° SE (12° off South)</div>
                  <div>Tilt: 32°</div>
                </div>
              </div>

              {/* CONTROLLER */}
              <div className={styles.controllerSection}>
                <div className={styles.controllerHeader}>CONTROLLER</div>
                <div className={styles.controllerValue}>45.3 A</div>
                <div className={styles.controllerSub}>Battery: 51.9 V</div>
              </div>

              {/* HOME / GRID */}
              <div className={styles.gridSection}>
                <div className={styles.gridHeader}>HOME / GRID</div>
                <div className={styles.gridValue}>842 W</div>
                <div className={styles.gridSub}>Grid: 0 W (import / -export)</div>
              </div>

              {/* BATTERY */}
              <div className={styles.batterySection}>
                <div className={styles.batteryHeader}>BATTERY</div>
                <div className={styles.batteryValue}>53.4%</div>
                <div className={styles.batterySub}>TTG: — → 26.1°C</div>
              </div>

              {/* Daily Stats Row */}
              <div className={styles.dailyStatsRow}>
                <div className={styles.dailyStat}>Daily PV: 5.92 kWh</div>
                <div className={styles.dailyStat}>Daily Load: 5.91 kWh</div>
                <div className={styles.dailyStat}>Self-Consumption: 79.4%</div>
              </div>

              {/* Output Gauge */}
              <div className={styles.outputGauge}>
                <div className={styles.gaugeContainer}>
                  <div className={styles.gaugeValue}>78</div>
                  <div className={styles.gaugeLabel}>Reduced Output</div>
                </div>
                <div className={styles.gaugeIndicators}>
                  <div className={styles.gaugeIndicator}>
                    <span className={styles.indicatorDot} style={{ background: '#fbbf24' }}></span>
                    <span>64%</span>
                  </div>
                  <div className={styles.gaugeIndicator}>
                    <span className={styles.indicatorDot} style={{ background: '#fb7185' }}></span>
                    <span>90°F (high)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN — FORECAST & ANALYSIS */}
            <div className={styles.analyticsRight}>

              {/* FORECAST HEADER */}
              <div className={styles.forecastHeader}>
                FORECAST, CHARGE WINDOWS & ADVISORY
                <div className={styles.liveDot}></div>
              </div>

              {/* Forecast Tiles */}
              <div className={styles.forecastGrid}>
                <div className={styles.forecastTile}>
                  <div className={styles.forecastLabel}>Solar today</div>
                  <div className={styles.forecastValue}>5.8 kWh <span className={styles.forecastEst}>(est)</span></div>
                </div>
                <div className={styles.forecastTile}>
                  <div className={styles.forecastLabel}>Cloud cover</div>
                  <div className={styles.forecastValue}>54% <span className={styles.forecastSub}>(midday)</span></div>
                </div>
                <div className={styles.forecastTile}>
                  <div className={styles.forecastLabel}>UV max</div>
                  <div className={styles.forecastValue}>8 <span className={styles.forecastHigh}>(high)</span> today</div>
                </div>
                <div className={styles.forecastTile}>
                  <div className={styles.forecastLabel}>Space weather</div>
                  <div className={styles.forecastValue}>Kp 1.0 <span className={styles.forecastCalm}>(calm)</span></div>
                </div>
              </div>

              {/* Best Charge Window */}
              <div className={styles.chargeWindow}>
                <span className={styles.chargeWindowLabel}>Best charge window:</span>
                <span className={styles.chargeWindowTime}>11:30 AM – 1:30 PM</span>
              </div>

              {/* Production Chart */}
              <div className={styles.productionChartPanel}>
                <div className={styles.chartHeader}>
                  <span>SOLAR OUTPUT</span>
                  <span>BATTERY SOC</span>
                  <span>EXPORT</span>
                </div>
                <div className={styles.chartArea}>
                  {/* Bell curve shape */}
                  <svg viewBox="0 0 400 120" className={styles.productionCurve}>
                    <defs>
                      <linearGradient id="solarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#34d399" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#34d399" stopOpacity="0.1" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0 100 Q 100 100, 150 60 Q 200 10, 250 60 Q 300 100, 400 100"
                      fill="url(#solarGradient)"
                      stroke="#fbbf24"
                      strokeWidth="2"
                    />
                    {/* Time markers */}
                    <text x="20" y="115" fill="#9ca3af" fontSize="10">0 AM</text>
                    <text x="90" y="115" fill="#9ca3af" fontSize="10">2 AM</text>
                    <text x="160" y="115" fill="#9ca3af" fontSize="10">11 AM</text>
                    <text x="230" y="115" fill="#9ca3af" fontSize="10">1:30 PM</text>
                    <text x="300" y="115" fill="#9ca3af" fontSize="10">6 PM</text>
                    <text x="370" y="115" fill="#9ca3af" fontSize="10">9 PM</text>
                  </svg>
                </div>
                <div className={styles.chartNote}>
                  <span className={styles.chartNoteDot} style={{ background: '#fbbf24' }}></span>
                  54% now → 96% at 4PM / Full at 6 PM
                </div>
              </div>

              {/* SHADING ANALYSIS */}
              <div className={styles.shadingPanel}>
                <div className={styles.shadingHeader}>SHADING ANALYSIS</div>
                <div className={styles.shadingMainLoss}>
                  Losses calculated: <span className={styles.shadingLossValue}>36%</span>
                </div>

                <div className={styles.shadingBreakdown}>
                  <div className={styles.shadingItem}>
                    <span>Morning</span>
                    <div className={styles.shadingBar}>
                      <div className={styles.shadingFill} style={{ width: '22%', background: '#fbbf24' }}></div>
                    </div>
                    <span>22%</span>
                  </div>
                  <div className={styles.shadingItem}>
                    <span>Midday</span>
                    <div className={styles.shadingBar}>
                      <div className={styles.shadingFill} style={{ width: '8%', background: '#34d399' }}></div>
                    </div>
                    <span>8%</span>
                  </div>
                  <div className={styles.shadingItem}>
                    <span>Evening</span>
                    <div className={styles.shadingBar}>
                      <div className={styles.shadingFill} style={{ width: '6%', background: '#34d399' }}></div>
                    </div>
                    <span>6%</span>
                  </div>
                </div>

                <div className={styles.shadingNote}>
                  <span className={styles.shadingNoteDot} style={{ background: '#34d399' }}></span>
                  54% now → 96% at 4PM / Full at 6 PM
                </div>

                <div className={styles.shadingImageSection}>
                  <div className={styles.shadingImagePlaceholder}>
                    🏠
                  </div>
                  <div className={styles.microinverterRec}>
                    <div className={styles.recTitle}>💡 Microinverters Recommended</div>
                    <div className={styles.recSub}>Consider microinverters or optimizers to reduce impact.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className={styles.analyticsGrid}>
            {/* LEFT COLUMN */}
            <div className={styles.analyticsLeft}>
              {/* Hero */}
              <div className={styles.heroPanel}>
                <div className={styles.panelTitleRow}>
                  <div className={styles.panelTitle}>⚡ SYSTEM OVERVIEW</div>
                  <div className={styles.badge}>LIVE STATUS</div>
                </div>

                <div className={styles.productionKPIs}>
                  <div>
                    <div className={styles.kpiValueLarge}>{(telemetry?.solar_w || 0) / 1000} kW</div>
                    <div className={styles.kpiLabel}>Current Production</div>
                  </div>

                  <div className={styles.kpiTile}>
                    <div className={styles.kpiLabel}>Load</div>
                    <div className={styles.kpiValue}>{((telemetry?.load_w || 0) / 1000).toFixed(1)} kW</div>
                  </div>

                  <div className={styles.kpiTile}>
                    <div className={styles.kpiLabel}>Battery</div>
                    <div className={styles.kpiValue} style={{ color: (telemetry?.battery_a || 0) > 0 ? '#7dd3fc' : '#fbbf24' }}>
                      {(telemetry?.battery_a || 0) > 0 ? '+' : '-'}{batteryKW.toFixed(1)} kW
                    </div>
                  </div>

                  <div className={styles.kpiTile}>
                    <div className={styles.kpiLabel}>Grid</div>
                    <div className={styles.kpiValue} style={{ color: (telemetry?.grid_w || 0) < 0 ? '#34d399' : '#fb7185' }}>
                      {(telemetry?.grid_w || 0) < 0 ? 'Exporting' : 'Importing'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Energy Summary */}
              <div className={styles.panel}>
                <div className={styles.panelTitle}>ENERGY TODAY</div>
                <div className={styles.productionKPIs}>
                  <div className={styles.kpiTile}>
                    <div className={styles.kpiLabel}>Solar</div>
                    <div className={styles.kpiValue}>{telemetry?.daily_solar_kwh?.toFixed(1) ?? '--'} kWh</div>
                  </div>
                  <div className={styles.kpiTile}>
                    <div className={styles.kpiLabel}>Consumed</div>
                    <div className={styles.kpiValue}>{telemetry?.daily_load_kwh?.toFixed(1) ?? '--'} kWh</div>
                  </div>
                  <div className={styles.kpiTile}>
                    <div className={styles.kpiLabel}>Exported</div>
                    <div className={styles.kpiValue} style={{ color: '#34d399' }}>{telemetry?.daily_grid_export_kwh?.toFixed(1) ?? '--'} kWh</div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className={styles.analyticsRight}>
              <div className={styles.panel}>
                <div className={styles.panelTitle}>SYSTEM HEALTH</div>
                <div className={styles.kpiTile}>
                  <div className={styles.kpiLabel}>Inverter Temp</div>
                  <div className={styles.kpiValue} style={{ color: telemetry?.battery_temp_c && telemetry.battery_temp_c > 45 ? '#fb7185' : '#e5e7eb' }}>
                    {telemetry?.battery_temp_c?.toFixed(1) ?? '--'}°C
                  </div>
                </div>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelTitle}>ALERTS</div>
                <div className={styles.badge}>No Active Alerts</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'telemetry' && (
          <div className={styles.analyticsGrid}>
            {/* LEFT COLUMN */}
            <div className={styles.analyticsLeft}>
              {/* SYSTEM PULSE */}
              <div className={styles.heroPanel}>
                <div className={styles.panelTitleRow}>
                  <div className={styles.panelTitle}>⚡ SYSTEM PULSE</div>
                  <div className={styles.liveBadge}>● LIVE</div>
                </div>

                <div className={styles.productionRow}>
                  <div className={styles.kpiValueLargeAmber}>
                    {solarKW.toFixed(2)}
                    <span className={styles.kpiUnit}>kW</span>
                  </div>

                  <div className={styles.sparklineContainer}>
                    <div className={styles.sparkline}></div>
                  </div>
                </div>

                <div className={styles.kpiGrid}>
                  <KpiTile label="Load" value={`${loadKW.toFixed(2)} kW`} />
                  <KpiTile
                    label="Net Flow"
                    value={`${netKW.toFixed(2)} kW`}
                    color={netKW >= 0 ? '#34d399' : '#fb7185'}
                  />
                  <KpiTile
                    label="Battery"
                    value={`${batteryKW.toFixed(2)} kW`}
                    color={batteryKW >= 0 ? '#7dd3fc' : '#fbbf24'}
                  />
                  <KpiTile label="System Eff." value={`${systemEfficiency}%`} />
                </div>
              </div>

              {/* POWER FLOW */}
              <div className={styles.panel}>
                <div className={styles.panelTitle}>POWER FLOW</div>

                <div className={styles.flowDiagram}>
                  <div className={styles.node}>☀<span>{solarKW.toFixed(2)}kW</span></div>
                  <div className={styles.flowLine}></div>
                  <div className={styles.node}>🔋<span>{batteryKW.toFixed(2)}kW</span></div>
                  <div className={styles.flowLine}></div>
                  <div className={styles.node}>🏠<span>{loadKW.toFixed(2)}kW</span></div>
                  <div className={styles.flowLine}></div>
                  <div className={styles.node}>⚡<span>{Math.abs(gridKW).toFixed(2)}kW</span></div>
                </div>
              </div>

              {/* ENERGY DISTRIBUTION */}
              <div className={styles.panel}>
                <div className={styles.panelTitle}>ENERGY DISTRIBUTION</div>

                <div className={styles.distributionBars}>
                  <DistributionBar label="Solar → Load" value={Math.round(telemetry?.self_consumption_pct || 0)} />
                  <DistributionBar label="Solar → Battery" value={Math.round((100 - (telemetry?.self_consumption_pct || 0)) * 0.6)} />
                  <DistributionBar label="Battery → Load" value={batteryKW > 0 ? 24 : 0} />
                  <DistributionBar label="Grid → Load" value={Math.round(100 - (telemetry?.self_consumption_pct || 0) * 0.85)} />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className={styles.analyticsRight}>
              <div className={styles.panel}>
                <div className={styles.panelTitle}>SYSTEM HEALTH</div>

                <HealthMetric label="DC Stability" value={`${(telemetry?.battery_v ? (telemetry.battery_v / 52 * 100).toFixed(1) : '--')}%`} />
                <HealthMetric label="AC Frequency" value="60.0 Hz" />
                <HealthMetric label="Inverter Temp" value={`${telemetry?.battery_temp_c?.toFixed(1) ?? '--'}°C`} />
                <HealthMetric label="MPPT Efficiency" value={`${telemetry?.solar_w && telemetry.solar_w > 0 ? '99.2' : '--'}%`} />
                <HealthMetric label="DC Ripple" value="12 mV" />

                <div className={styles.goodBadge}>NORMAL</div>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelTitle}>24H PERFORMANCE</div>
                <div className={styles.performanceBars}></div>
              </div>
            </div>
          </div>
        )}

        {/* BATTERY TAB — PREDICTIVE DIAGNOSTIC */}
        {activeTab === 'battery' && (
          <div className={styles.analyticsGrid}>
            {/* LEFT */}
            <div className={styles.analyticsLeft}>
              <div className={styles.heroPanel}>
                <div className={styles.panelTitleRow}>
                  <div className={styles.panelTitle}>🔋 BATTERY OVERVIEW</div>
                  <div className={styles.statusBadge}>ACTIVE</div>
                </div>

                <div
                  className={styles.kpiValueLarge}
                  style={{
                    color:
                      soc > 50 ? '#34d399' : soc > 20 ? '#fbbf24' : '#fb7185'
                  }}
                >
                  {soc}%
                </div>

                <div className={styles.kpiGrid}>
                  <KpiTile label="SoH" value={`${soh}%`} />
                  <KpiTile label="Usable" value={`${usableCapacity} kWh`} />
                  <KpiTile label="C-Rate" value={cRate} />
                  <KpiTile label="RTE" value={`${roundTripEff}%`} />
                </div>

                <div className={styles.depletionBar}></div>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelTitle}>STRING COMPARISON</div>
                <div className={styles.stringTable}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
                    const outlier = n === 4;
                    return (
                      <div
                        key={n}
                        className={`${styles.stringRow} ${outlier ? styles.outlierRow : ''
                          }`}
                      >
                        <div>B{n}</div>
                        <div>{((telemetry?.battery_v || 27) + (n % 5 - 2) * 0.2).toFixed(2)}V</div>
                        <div>{((telemetry?.battery_a || 5) + (n % 3 - 1)).toFixed(1)}A</div>
                        <div>{((telemetry?.battery_temp_c || 25) + (n % 4 - 2)).toFixed(0)}°C</div>
                        <div>{((telemetry?.battery_soc_pct || 75) + (n % 3 - 1) * 5).toFixed(0)}%</div>
                        <div>{((telemetry?.battery_soh_pct || 97) - n * 0.5).toFixed(0)}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className={styles.analyticsRight}>
              <div className={styles.panel}>
                <div className={styles.panelTitle}>PACK HEALTH MODEL</div>

                <HealthMetric label="Voltage Spread" value="0.8V" />
                <HealthMetric label="Temp Spread" value="7°C" />
                <HealthMetric label="SoC Spread" value="±18%" />
                <HealthMetric label="SoH Var" value="1.5%" />
                <HealthMetric label="Balance Eff" value="98%" />

                <div className={styles.stressIndex}>
                  42
                  <span style={{ fontSize: '14px', marginLeft: '4px', color: '#9ca3af' }}>Stress Index</span>
                </div>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelTitle}>FAILURE PREDICTION</div>
                <div className={styles.rul}>
                  {(telemetry?.battery_soh_pct ? (telemetry.battery_soh_pct - 80) / 2 : 8).toFixed(1)} yrs RUL
                </div>
                <div className={styles.trendChart}></div>
              </div>
            </div>
          </div>
        )}

        {/* WEATHER TAB */}
        {activeTab === 'weather' && (
          <div className={styles.analyticsGrid}>
            <div className={styles.analyticsLeft}>
              <div className={styles.heroPanel}>
                <div className={styles.panelTitleRow}>
                  <div className={styles.panelTitle}>☀ WEATHER IMPACT</div>
                  <div className={styles.badge}>FORECAST</div>
                </div>

                <div>
                  <div
                    className={styles.kpiValueLarge}
                    style={{
                      color: solarImpact
                        ? solarImpact.score >= 70
                          ? '#34d399'
                          : solarImpact.score >= 40
                            ? '#fbbf24'
                            : '#fb7185'
                        : '#9ca3af',
                    }}
                  >
                    {solarImpact?.score?.toFixed(0) ?? '--'}
                  </div>
                  <div className={styles.kpiLabel}>Solar Impact Score</div>
                </div>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelTitle}>TODAY FORECAST</div>
                <div className={styles.productionKPIs}>
                  <div className={styles.kpiTile}>
                    <div className={styles.kpiLabel}>Irradiance</div>
                    <div className={styles.kpiValue}>
                      {weather ? Math.round(800 * (1 - weather.cloudCover / 100)) : '--'} W/m²
                    </div>
                  </div>
                  <div className={styles.kpiTile}>
                    <div className={styles.kpiLabel}>Cloud Cover</div>
                    <div
                      className={styles.kpiValue}
                      style={{
                        color: weather
                          ? weather.cloudCover > 70
                            ? '#fb7185'
                            : weather.cloudCover > 40
                              ? '#fbbf24'
                              : '#34d399'
                          : '#9ca3af',
                      }}
                    >
                      {weather?.cloudCover?.toFixed(0) ?? '--'}%
                    </div>
                  </div>
                  <div className={styles.kpiTile}>
                    <div className={styles.kpiLabel}>Temp</div>
                    <div className={styles.kpiValue}>{tempDisplay}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.analyticsRight}>
              <div className={styles.panel}>
                <div className={styles.panelTitle}>7-DAY TREND</div>
                <div className={styles.trendChart}></div>
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICS TAB — OPERATOR-GRADE COMMAND CENTER */}
        {activeTab === 'analytics' && (
          <div className={styles.analyticsGrid}>
            {/* LEFT COLUMN — PERFORMANCE CORE (60%) */}
            <div className={styles.analyticsLeft}>

              {/* 1️⃣ PRODUCTION INTELLIGENCE PANEL (Hero) */}
              <div className={styles.heroPanel}>
                <div className={styles.panelTitleRow}>
                  <div className={styles.panelTitle}>⚡ PRODUCTION INTELLIGENCE</div>
                  <div className={styles.liveIndicator}>● LIVE</div>
                </div>

                <div className={styles.productionKPIs}>
                  <div className={styles.kpiHero}>
                    <div className={styles.kpiValueLarge} style={{ color: '#fbbf24', textShadow: '0 0 20px rgba(251, 191, 36, 0.3)' }}>
                      {telemetry?.daily_solar_kwh?.toFixed(2) ?? '--'}
                    </div>
                    <div className={styles.kpiLabel}>kWh Today</div>
                    <div className={styles.kpiSub}>Peak: {(telemetry?.solar_w ? telemetry.solar_w / 1000 : 0).toFixed(2)} kW</div>
                  </div>

                  <div className={styles.kpiGrid4}>
                    <div className={styles.kpiTile}>
                      <div className={styles.kpiValue} style={{ color: '#34d399' }}>{(telemetry?.solar_w && telemetry?.battery_v ? ((telemetry.solar_w / telemetry.battery_v) * 0.95 * 100).toFixed(1) : '--')}%</div>
                      <div className={styles.kpiLabelSmall}>Perf Ratio</div>
                    </div>
                    <div className={styles.kpiTile}>
                      <div className={styles.kpiValue} style={{ color: '#7dd3fc' }}>{(telemetry?.solar_w ? (telemetry.solar_w / (telemetry?.battery_v || 1) / 10).toFixed(2) : '--')}</div>
                      <div className={styles.kpiLabelSmall}>DC/AC Ratio</div>
                    </div>
                    <div className={styles.kpiTile}>
                      <div className={styles.kpiValue} style={{ color: telemetry?.battery_temp_c && telemetry.battery_temp_c > 45 ? '#fb7185' : '#fbbf24' }}>{telemetry?.battery_temp_c?.toFixed(1) ?? '--'}°</div>
                      <div className={styles.kpiLabelSmall}>Inv Temp</div>
                    </div>
                    <div className={styles.kpiTile}>
                      <div className={styles.kpiValue} style={{ color: '#a78bfa' }}>{Math.round((telemetry?.daily_solar_kwh || 0) / (24 * (telemetry?.battery_v || 1)) * 1000)}</div>
                      <div className={styles.kpiLabelSmall}>Cap Factor %</div>
                    </div>
                  </div>
                </div>

                {/* Mini Production Chart */}
                <div className={styles.miniChartContainer}>
                  <div className={styles.chartTitle}>24h Production Curve</div>
                  <div className={styles.sparkline}>
                    {[0.1, 0.2, 0.5, 0.8, 1.0, 0.95, 0.85, 0.6, 0.3, 0.1].map((h, i) => (
                      <div key={i} className={styles.sparkBar} style={{ height: `${h * 100}%`, background: h > 0.8 ? '#34d399' : h > 0.5 ? '#fbbf24' : '#fb7185' }} />
                    ))}
                  </div>
                  <div className={styles.chartLegend}>
                    <span style={{ color: '#34d399' }}>● Peak</span>
                    <span style={{ color: '#fbbf24' }}>● Good</span>
                    <span style={{ color: '#fb7185' }}>● Reduced</span>
                  </div>
                </div>
              </div>

              {/* 2️⃣ IRRADIANCE BREAKDOWN — DNI/DHI ENGINE */}
              <div className={styles.panel}>
                <div className={styles.panelTitleRow}>
                  <div className={styles.panelTitle}>☀️ IRRADIANCE BREAKDOWN</div>
                  <div className={styles.badge}>DNI/DHI</div>
                </div>

                <div className={styles.irradianceGrid}>
                  <div className={styles.irradianceMain}>
                    <div className={styles.irradianceValue} style={{ color: '#fbbf24', textShadow: '0 0 15px rgba(251, 191, 36, 0.4)' }}>
                      {weather ? Math.round(800 * (1 - weather.cloudCover / 100)) : '--'}
                    </div>
                    <div className={styles.irradianceLabel}>W/m² POA</div>
                  </div>

                  <div className={styles.irradianceComponents}>
                    <div className={styles.irrComponent}>
                      <div className={styles.irrBar} style={{ width: `${weather ? 65 * (1 - weather.cloudCover / 100) : 50}%`, background: '#fbbf24' }} />
                      <div className={styles.irrLabel}>DNI Direct</div>
                      <div className={styles.irrValue}>{weather ? Math.round(520 * (1 - weather.cloudCover / 100)) : '--'} W/m²</div>
                    </div>
                    <div className={styles.irrComponent}>
                      <div className={styles.irrBar} style={{ width: `${weather ? 25 * (1 - weather.cloudCover / 100) : 20}%`, background: '#7dd3fc' }} />
                      <div className={styles.irrLabel}>DHI Diffuse</div>
                      <div className={styles.irrValue}>{weather ? Math.round(200 * (1 - weather.cloudCover / 100)) : '--'} W/m²</div>
                    </div>
                    <div className={styles.irrComponent}>
                      <div className={styles.irrBar} style={{ width: '10%', background: '#a78bfa' }} />
                      <div className={styles.irrLabel}>GHI Global</div>
                      <div className={styles.irrValue}>{weather ? Math.round(720 * (1 - weather.cloudCover / 100)) : '--'} W/m²</div>
                    </div>
                  </div>
                </div>

                {/* Loss Stack */}
                <div className={styles.lossStack}>
                  <div className={styles.lossTitle}>Loss Waterfall</div>
                  <div className={styles.lossBar}>
                    <div className={styles.lossSegment} style={{ width: '100%', background: 'rgba(251, 191, 36, 0.3)' }} title="Raw Sun" />
                    <div className={styles.lossSegment} style={{ width: '85%', background: 'rgba(251, 191, 36, 0.5)' }} title="After Tilt Loss" />
                    <div className={styles.lossSegment} style={{ width: '75%', background: 'rgba(124, 211, 252, 0.5)' }} title="After Shading" />
                    <div className={styles.lossSegment} style={{ width: '70%', background: 'rgba(167, 139, 250, 0.5)' }} title="After Temp" />
                    <div className={styles.lossSegment} style={{ width: '65%', background: 'rgba(52, 211, 153, 0.6)' }} title="Net Output" />
                  </div>
                  <div className={styles.lossLabels}>
                    <span>Raw</span>
                    <span>Tilt</span>
                    <span>Shade</span>
                    <span>Temp</span>
                    <span style={{ color: '#34d399' }}>Net 65%</span>
                  </div>
                </div>
              </div>

              {/* 3️⃣ SHADING MODEL — POLAR VISUALIZATION */}
              <div className={styles.panel}>
                <div className={styles.panelTitleRow}>
                  <div className={styles.panelTitle}>🏠 SHADING ANALYSIS</div>
                  {shadingResult?.averageLossPercent && shadingResult.averageLossPercent > 20 && (
                    <div className={styles.alertBadge}>⚠️ HIGH IMPACT</div>
                  )}
                </div>

                <div className={styles.shadingContent}>
                  <div className={styles.shadingPolar}>
                    {/* Polar visualization */}
                    <div className={styles.polarContainer}>
                      <div className={styles.polarCenter}>{shadingResult?.averageLossPercent ?? '--'}%</div>
                      <div className={styles.polarRing} style={{
                        background: `conic-gradient(
                          from 0deg,
                          ${shadingResult?.monthlyImpact?.[0]?.lossPercent && shadingResult.monthlyImpact[0].lossPercent > 20 ? '#fb7185' : '#34d399'} 0deg 30deg,
                          ${shadingResult?.monthlyImpact?.[2]?.lossPercent && shadingResult.monthlyImpact[2].lossPercent > 20 ? '#fb7185' : '#34d399'} 30deg 60deg,
                          ${shadingResult?.monthlyImpact?.[5]?.lossPercent && shadingResult.monthlyImpact[5].lossPercent > 20 ? '#fb7185' : '#fbbf24'} 60deg 90deg,
                          ${shadingResult?.monthlyImpact?.[8]?.lossPercent && shadingResult.monthlyImpact[8].lossPercent > 20 ? '#fb7185' : '#34d399'} 90deg 120deg,
                          ${shadingResult?.monthlyImpact?.[11]?.lossPercent && shadingResult.monthlyImpact[11].lossPercent > 20 ? '#fb7185' : '#34d399'} 120deg 150deg,
                          transparent 150deg 360deg
                        )`
                      }} />
                      <div className={styles.polarLabels}>
                        <span>Morning</span>
                        <span>Midday</span>
                        <span>Afternoon</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.shadingDetails}>
                    <div className={styles.shadingTimeBlock}>
                      <div className={styles.shadingTimeLabel}>Morning</div>
                      <div className={styles.shadingTimeBar}>
                        <div className={styles.shadingTimeFill} style={{ width: `${shadingResult?.monthlyImpact?.[0]?.lossPercent ?? 15}%`, background: (shadingResult?.monthlyImpact?.[0]?.lossPercent ?? 0) > 20 ? '#fb7185' : '#34d399' }} />
                      </div>
                      <div className={styles.shadingTimeValue}>{shadingResult?.monthlyImpact?.[0]?.lossPercent ?? 15}%</div>
                    </div>
                    <div className={styles.shadingTimeBlock}>
                      <div className={styles.shadingTimeLabel}>Midday</div>
                      <div className={styles.shadingTimeBar}>
                        <div className={styles.shadingTimeFill} style={{ width: `${shadingResult?.monthlyImpact?.[5]?.lossPercent ?? 8}%`, background: (shadingResult?.monthlyImpact?.[5]?.lossPercent ?? 0) > 15 ? '#fb7185' : '#34d399' }} />
                      </div>
                      <div className={styles.shadingTimeValue}>{shadingResult?.monthlyImpact?.[5]?.lossPercent ?? 8}%</div>
                    </div>
                    <div className={styles.shadingTimeBlock}>
                      <div className={styles.shadingTimeLabel}>Afternoon</div>
                      <div className={styles.shadingTimeBar}>
                        <div className={styles.shadingTimeFill} style={{ width: `${shadingResult?.monthlyImpact?.[8]?.lossPercent ?? 12}%`, background: (shadingResult?.monthlyImpact?.[8]?.lossPercent ?? 0) > 20 ? '#fb7185' : '#fbbf24' }} />
                      </div>
                      <div className={styles.shadingTimeValue}>{shadingResult?.monthlyImpact?.[8]?.lossPercent ?? 12}%</div>
                    </div>

                    {shadingResult?.optimizerROI && (
                      <div className={styles.optimizerRec}>
                        <div className={styles.optimizerIcon}>💡</div>
                        <div className={styles.optimizerText}>
                          <div className={styles.optimizerTitle}>Microinverters Recommended</div>
                          <div className={styles.optimizerSub}>Payback: {shadingResult.optimizerROI.paybackYears.toFixed(1)} years</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN — OPTIMIZATION & ROI (40%) */}
            <div className={styles.analyticsRight}>

              {/* 4️⃣ TILT OPTIMIZATION ENGINE */}
              <div className={styles.panel}>
                <div className={styles.panelTitleRow}>
                  <div className={styles.panelTitle}>📐 TILT OPTIMIZATION</div>
                  <div className={styles.badgeTech}>ENGINE</div>
                </div>

                {tiltProfile ? (
                  <div className={styles.tiltContent}>
                    <div className={styles.tiltCurrent}>
                      <div className={styles.tiltCurrentLabel}>Current Tilt</div>
                      <div className={styles.tiltCurrentValue}>--°</div>
                      <div className={styles.tiltCurrentSub}>Measured from telemetry</div>
                    </div>

                    <div className={styles.tiltGrid}>
                      <div className={styles.tiltOptimalCard}>
                        <div className={styles.tiltOptimalValue} style={{ color: '#34d399' }}>{tiltProfile.annualOptimal}°</div>
                        <div className={styles.tiltOptimalLabel}>Annual Optimal</div>
                      </div>
                      <div className={styles.tiltOptimalCard}>
                        <div className={styles.tiltOptimalValue} style={{ color: '#7dd3fc' }}>{tiltProfile.winterOptimal}°</div>
                        <div className={styles.tiltOptimalLabel}>Winter</div>
                      </div>
                      <div className={styles.tiltOptimalCard}>
                        <div className={styles.tiltOptimalValue} style={{ color: '#fbbf24' }}>{tiltProfile.summerOptimal}°</div>
                        <div className={styles.tiltOptimalLabel}>Summer</div>
                      </div>
                    </div>

                    {telemetry?.daily_solar_kwh && telemetry.daily_solar_kwh > 0 && (
                      <div className={styles.tiltImpact}>
                        <div className={styles.tiltImpactTitle}>Adjustable Mount ROI</div>
                        <div className={styles.tiltImpactValue}>+{(telemetry.daily_solar_kwh * 365 * 0.1).toFixed(0)} kWh/year</div>
                        <div className={styles.tiltImpactSub}>~10% gain with seasonal adjustment</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={styles.placeholder}>Select location for tilt analysis</div>
                )}
              </div>

              {/* 5️⃣ INVERTER INTELLIGENCE */}
              <div className={styles.panel}>
                <div className={styles.panelTitleRow}>
                  <div className={styles.panelTitle}>🔌 INVERTER INTELLIGENCE</div>
                  <div className={styles.statusBadge} style={{ background: telemetry?.solar_w && telemetry.solar_w > 3500 ? 'rgba(251, 113, 133, 0.2)' : 'rgba(52, 211, 153, 0.2)', color: telemetry?.solar_w && telemetry.solar_w > 3500 ? '#fb7185' : '#34d399' }}>
                    {telemetry?.solar_w && telemetry.solar_w > 3500 ? '⚠️ CLIPPING' : '● NOMINAL'}
                  </div>
                </div>

                <div className={styles.inverterGrid}>
                  <div className={styles.invMetric}>
                    <div className={styles.invValue}>{(telemetry?.solar_w ? (telemetry.solar_w / 1000).toFixed(2) : '--')} kW</div>
                    <div className={styles.invLabel}>AC Output</div>
                  </div>
                  <div className={styles.invMetric}>
                    <div className={styles.invValue}>{telemetry?.battery_v?.toFixed(1) ?? '--'} V</div>
                    <div className={styles.invLabel}>DC Input</div>
                  </div>
                  <div className={styles.invMetric}>
                    <div className={styles.invValue}>{(telemetry?.solar_w && telemetry?.battery_v ? (telemetry.solar_w / telemetry.battery_v / 10).toFixed(2) : '--')}</div>
                    <div className={styles.invLabel}>DC/AC Ratio</div>
                  </div>
                  <div className={styles.invMetric}>
                    <div className={styles.invValue} style={{ color: telemetry?.battery_temp_c && telemetry.battery_temp_c > 45 ? '#fb7185' : '#e5e7eb' }}>{telemetry?.battery_temp_c?.toFixed(1) ?? '--'}°C</div>
                    <div className={styles.invLabel}>Inverter Temp</div>
                  </div>
                </div>

                {/* Clipping Detection */}
                <div className={styles.clippingSection}>
                  <div className={styles.clippingHeader}>Clipping Detection</div>
                  <div className={styles.clippingStatus}>
                    {telemetry?.solar_w && telemetry.solar_w > 3500 ? (
                      <>
                        <div className={styles.clippingAlert}>🔥 POWER LIMITED</div>
                        <div className={styles.clippingDetail}>Output capped at ~3.5kW. Consider larger inverter.</div>
                      </>
                    ) : (
                      <>
                        <div className={styles.clippingGood}>✓ No clipping detected</div>
                        <div className={styles.clippingDetail}>Inverter has headroom for peak production</div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 6️⃣ UPGRADE ROI SCENARIOS */}
              <div className={styles.panel}>
                <div className={styles.panelTitleRow}>
                  <div className={styles.panelTitle}>💰 UPGRADE SCENARIOS</div>
                </div>

                <div className={styles.upgradeList}>
                  <div className={styles.upgradeItem}>
                    <div className={styles.upgradeName}>Current System</div>
                    <div className={styles.upgradeBadge} style={{ background: 'rgba(255,255,255,0.1)' }}>Baseline</div>
                  </div>

                  <div className={styles.upgradeItem}>
                    <div className={styles.upgradeName}>Adjustable Tilt</div>
                    <div className={styles.upgradeGain}>+10%</div>
                    <div className={styles.upgradeCost}>$200-500</div>
                    <div className={styles.upgradePayback}>2-4 yrs</div>
                  </div>

                  <div className={styles.upgradeItem}>
                    <div className={styles.upgradeName}>Microinverters</div>
                    <div className={styles.upgradeGain} style={{ color: '#fbbf24' }}>+15%</div>
                    <div className={styles.upgradeCost}>$150/panel</div>
                    <div className={styles.upgradePayback}>3-5 yrs</div>
                  </div>

                  <div className={styles.upgradeItem}>
                    <div className={styles.upgradeName}>Add 4 Panels</div>
                    <div className={styles.upgradeGain} style={{ color: '#34d399' }}>+30%</div>
                    <div className={styles.upgradeCost}>$800-1200</div>
                    <div className={styles.upgradePayback}>5-8 yrs</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* OPTIMIZATION TAB */}
        {activeTab === 'optimization' && (
          <div className={styles.analyticsGrid}>
            {selectedLocation ? (
              <>
                <div className={styles.analyticsLeft}>
                  <div className={styles.heroPanel}>
                    <div className={styles.panelTitleRow}>
                      <div className={styles.panelTitle}>📐 TILT OPTIMIZATION</div>
                      <div className={styles.badge}>ENGINE</div>
                    </div>
                    <div className={styles.kpiValueLarge}>{Math.round(selectedLocation.lat * 0.76)}°</div>
                    <div className={styles.kpiLabel}>Optimal Tilt @ {selectedLocation.lat.toFixed(1)}°N</div>
                    <div className={styles.productionKPIs} style={{ marginTop: '16px' }}>
                      <div className={styles.kpiTile}>
                        <div className={styles.kpiLabel}>Winter</div>
                        <div className={styles.kpiValue}>{Math.round(selectedLocation.lat * 0.76 + 15)}°</div>
                      </div>
                      <div className={styles.kpiTile}>
                        <div className={styles.kpiLabel}>Summer</div>
                        <div className={styles.kpiValue}>{Math.round(selectedLocation.lat * 0.76 - 15)}°</div>
                      </div>
                    </div>
                  </div>

                  <div className={styles.panel}>
                    <div className={styles.panelTitle}>SHADING ANALYSIS</div>
                    <div className={styles.productionKPIs}>
                      <div className={styles.kpiTile}>
                        <div className={styles.kpiLabel}>Avg Loss</div>
                        <div className={styles.kpiValue} style={{ color: '#fbbf24' }}>
                          {shadingResult?.averageLossPercent ?? '--'}%
                        </div>
                      </div>
                      <div className={styles.kpiTile}>
                        <div className={styles.kpiLabel}>Morning</div>
                        <div className={styles.kpiValue}>{shadingResult?.monthlyImpact?.[0]?.lossPercent ?? '--'}%</div>
                      </div>
                      <div className={styles.kpiTile}>
                        <div className={styles.kpiLabel}>Afternoon</div>
                        <div className={styles.kpiValue}>{shadingResult?.monthlyImpact?.[8]?.lossPercent ?? '--'}%</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.analyticsRight}>
                  <div className={styles.panel}>
                    <div className={styles.panelTitle}>CHARGE WINDOW</div>
                    <div className={styles.kpiTile}>
                      <div className={styles.kpiLabel}>Peak Hours</div>
                      <div className={styles.kpiValue}>12:00 - 14:00</div>
                    </div>
                    <div className={styles.kpiTile} style={{ marginTop: '8px' }}>
                      <div className={styles.kpiLabel}>Est. Time to Full</div>
                      <div className={styles.kpiValue} style={{ color: '#34d399' }}>
                        {telemetry?.ttg_hours ? `${Math.floor(telemetry.ttg_hours)}h ${Math.round((telemetry.ttg_hours % 1) * 60)}m` : '3h 20m'}
                      </div>
                    </div>
                  </div>

                  <div className={styles.panel}>
                    <div className={styles.panelTitle}>UPGRADE ROI</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span>Adjustable Tilt</span>
                        <span style={{ color: '#34d399' }}>+10%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span>Microinverters</span>
                        <span style={{ color: '#fbbf24' }}>+15%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span>+4 Panels</span>
                        <span style={{ color: '#34d399' }}>+30%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.panel} style={{ gridColumn: '1 / -1' }}>
                <div className={styles.panelTitleRow}>
                  <div className={styles.panelTitle}>SOLAR OPTIMIZATION</div>
                </div>
                <div style={{ color: '#a78bfa', fontSize: '14px', padding: '40px', textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>☀️</div>
                  <div style={{ marginBottom: '12px' }}>Select a location to see solar optimization insights</div>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>Go to Controls tab to search for a location</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI INSIGHTS TAB */}
        {activeTab === 'ai-insights' && (
          <div className={styles.analyticsGrid}>
            <div className={styles.analyticsLeft}>
              <div className={styles.heroPanel}>
                <div className={styles.panelTitleRow}>
                  <div className={styles.panelTitle}>🤖 AI SYSTEM ANALYSIS</div>
                  <div className={styles.badge}>LIVE AI</div>
                </div>
                <div className={styles.kpiValueLarge}>Optimal</div>
                <div className={styles.kpiLabel}>Current System State</div>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelTitle}>RECOMMENDATIONS</div>
                {recommendations.length === 0 ? (
                  <div style={{ color: '#a78bfa', fontSize: '13px', padding: '20px', textAlign: 'center' }}>
                    No recommendations yet. Select a location and ensure telemetry is flowing.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {recommendations.slice(0, 3).map((rec) => (
                      <div
                        key={rec.id}
                        style={{
                          padding: '12px',
                          borderRadius: '10px',
                          border: '1px solid',
                          borderColor:
                            rec.severity === 'critical'
                              ? 'rgba(251, 113, 133, 0.4)'
                              : rec.severity === 'warning'
                                ? 'rgba(251, 191, 36, 0.4)'
                                : 'rgba(125, 211, 252, 0.4)',
                          background:
                            rec.severity === 'critical'
                              ? 'rgba(251, 113, 133, 0.08)'
                              : rec.severity === 'warning'
                                ? 'rgba(251, 191, 36, 0.08)'
                                : 'rgba(125, 211, 252, 0.08)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '14px' }}>
                            {rec.severity === 'critical' ? '🔴' : rec.severity === 'warning' ? '🟡' : '🔵'}
                          </span>
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: '13px',
                              color:
                                rec.severity === 'critical'
                                  ? '#fb7185'
                                  : rec.severity === 'warning'
                                    ? '#fbbf24'
                                    : '#7dd3fc',
                            }}
                          >
                            {rec.title}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#e5e7eb', lineHeight: 1.5 }}>{rec.body}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.analyticsRight}>
              <AIChatPanel telemetry={telemetry} weather={weather} selectedLocation={selectedLocation} />
            </div>
          </div>
        )}

        {/* CONTROLS TAB */}
        {activeTab === 'controls' && (
          <div className={styles.analyticsGrid}>
            <div className={styles.analyticsLeft}>
              <div className={styles.heroPanel}>
                <div className={styles.panelTitleRow}>
                  <div className={styles.panelTitle}>⚙ SYSTEM CONTROLS</div>
                  <div className={styles.badge}>OPERATOR MODE</div>
                </div>
                <div className={styles.kpiValueLarge}>Manual</div>
                <div className={styles.kpiLabel}>Current Mode</div>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelTitle}>LOCATION</div>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Search by city, state or ZIP code (e.g., Tampa, FL or 35950)"
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLocationSearch();
                  }}
                  style={{ marginBottom: '10px' }}
                />
                <button className={styles.button} onClick={handleLocationSearch}>
                  Search
                </button>

                {geocodeResults.length > 0 && (
                  <div
                    style={{
                      marginTop: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(102, 126, 234, 0.2)',
                      borderRadius: '6px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }}
                  >
                    {geocodeResults.map((result, idx) => (
                      <div
                        key={`${result.id}-${idx}`}
                        onClick={() => selectLocationResult(result)}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
                          fontSize: '13px',
                          color: '#a78bfa',
                          transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background = 'rgba(102, 126, 234, 0.15)';
                        }}
                        onMouseOut={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                        }}
                      >
                        <strong>{result.name}</strong>
                        <div style={{ fontSize: '11px', color: '#667eea', marginTop: '2px' }}>
                          {result.admin1 ? `${result.admin1}, ` : ''}
                          {result.country}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedLocation && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      background: 'rgba(52, 211, 153, 0.1)',
                      border: '1px solid rgba(52, 211, 153, 0.3)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#34d399',
                    }}
                  >
                    ✓ Selected: <strong>{selectedLocation.name}</strong>
                  </div>
                )}
              </div>

              <div className={styles.panel}>
                <div className={styles.panelTitle}>BLE PAIRING</div>
                <div style={{ color: '#a78bfa', fontSize: '12px', marginBottom: '12px' }}>
                  Web Bluetooth for Eco-Worthy/Victron battery packs.
                </div>
                <select className={styles.input} value={selectedBle} onChange={(e) => setSelectedBle(e.target.value)} style={{ marginBottom: '10px' }}>
                  <option value="">Select a battery...</option>
                </select>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className={styles.button} style={{ flex: 1 }}>
                    Connect BLE
                  </button>
                  <button className={styles.button} style={{ flex: 1, opacity: 0.6 }}>
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.analyticsRight}>
              <div className={styles.panel}>
                <div className={styles.panelTitle}>SYSTEM ACTIONS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button className={styles.badge} style={{ justifyContent: 'center', cursor: 'pointer' }}>
                    Restart Inverter
                  </button>
                  <button className={styles.badge} style={{ justifyContent: 'center', cursor: 'pointer', background: 'rgba(251, 191, 36, 0.15)' }}>
                    Force Sync Time
                  </button>
                  <button className={styles.badge} style={{ justifyContent: 'center', cursor: 'pointer', background: 'rgba(251, 113, 133, 0.15)' }}>
                    Emergency Stop
                  </button>
                </div>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelTitle}>BATTERY BANK CONFIG</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
                  <div className={styles.kpiTile}>
                    <div className={styles.kpiLabel}>Banks</div>
                    <input
                      type="number"
                      value={batteryConfig.banks}
                      onChange={(e) => setBatteryConfig({ ...batteryConfig, banks: parseInt(e.target.value) || 1 })}
                      className={styles.input}
                      style={{ marginTop: '6px', height: '32px', padding: '6px' }}
                    />
                  </div>
                  <div className={styles.kpiTile}>
                    <div className={styles.kpiLabel}>Packs/Bank</div>
                    <input
                      type="number"
                      value={batteryConfig.packsPerBank}
                      onChange={(e) => setBatteryConfig({ ...batteryConfig, packsPerBank: parseInt(e.target.value) || 1 })}
                      className={styles.input}
                      style={{ marginTop: '6px', height: '32px', padding: '6px' }}
                    />
                  </div>
                  <div className={styles.kpiTile}>
                    <div className={styles.kpiLabel}>Voltage</div>
                    <input
                      type="number"
                      value={batteryConfig.voltagePerBank}
                      onChange={(e) => setBatteryConfig({ ...batteryConfig, voltagePerBank: parseInt(e.target.value) || 12 })}
                      className={styles.input}
                      style={{ marginTop: '6px', height: '32px', padding: '6px' }}
                    />
                  </div>
                </div>
                <div style={{ color: '#a78bfa', fontSize: '11px' }}>
                  Total: {batteryConfig.banks * batteryConfig.packsPerBank} packs @ {batteryConfig.packsPerBank * batteryConfig.voltagePerBank}V
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DEMO DATA, VICTRON LOCAL, BLE TABS (PLACEHOLDER) */}
        {DATA_SOURCE_TABS.includes(activeDataSource) && !MAIN_TABS.includes(activeTab) && (
          <div className={styles.panel}>
            <div className={styles.panelTitleRow}>
              <div className={styles.panelTitle}>
                {activeDataSource === 'demo-data' && 'DEMO DATA'}
                {activeDataSource === 'victron-local' && 'VICTRON LOCAL'}
                {activeDataSource === 'ble' && 'BLUETOOTH'}
              </div>
              <button
                className={styles.backButton}
                onClick={() => {
                  const validTab = MAIN_TABS.includes(lastMainTab) ? lastMainTab : 'sun-view';
                  setActiveTab(validTab);
                  setActiveSubTab('summary');
                }}
              >
                ← Back
              </button>
            </div>
            <div style={{ color: '#a78bfa', fontSize: '13px' }}>
              Data streaming live from{' '}
              {activeDataSource === 'demo-data' && 'simulated telemetry'}
              {activeDataSource === 'victron-local' && 'Venus OS / Victron system'}
              {activeDataSource === 'ble' && 'BLE battery'}
              ...
            </div>
          </div>
        )}

        {/* MODAL DIALOG */}
        {dialog && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setDialog(null)}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #1a1f3a 0%, #0f1419 100%)',
                border: '1px solid rgba(102, 126, 234, 0.3)',
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '420px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Backspace') {
                  e.preventDefault();
                }
              }}
            >
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: dialog.type === 'error' ? '#fb7185' : dialog.type === 'warning' ? '#fbbf24' : '#a78bfa',
                  marginBottom: '12px',
                }}
              >
                {dialog.title}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: '#c4b5fd',
                  lineHeight: '1.6',
                  marginBottom: '24px',
                }}
              >
                {dialog.message}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  onClick={() => setDialog(null)}
                  style={{
                    padding: '10px 20px',
                    background: 'rgba(102, 126, 234, 0.2)',
                    color: '#a78bfa',
                    border: '1px solid rgba(102, 126, 234, 0.3)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(102, 126, 234, 0.3)';
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(102, 126, 234, 0.2)';
                  }}
                >
                  {dialog.title.includes('Exit') ? 'Cancel' : 'Close'}
                </button>
                {dialog.title.includes('Exit') && (
                  <button
                    onClick={() => {
                      setAllowExit(true);
                      window.history.back();
                    }}
                    style={{
                      padding: '10px 20px',
                      background: 'rgba(251, 113, 133, 0.2)',
                      color: '#fb7185',
                      border: '1px solid rgba(251, 113, 133, 0.3)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(251, 113, 133, 0.3)';
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(251, 113, 133, 0.2)';
                    }}
                  >
                    Exit
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
