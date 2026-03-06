'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';

interface Telemetry {
  ts: string;
  system_status: 'normal' | 'charging' | 'discharging' | 'fault';
  solar_w: number;
  load_w: number;
  grid_w: number;
  battery_soc_pct: number;
  battery_v: number;
  battery_a: number;
  battery_temp_c: number;
  battery_soh_pct: number;
  ttg_hours: number | null;
  daily_solar_kwh: number;
  daily_load_kwh: number;
  daily_grid_import_kwh: number;
  daily_grid_export_kwh: number;
  self_consumption_pct: number | null;
  savings_today_usd: number | null;
}

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

export default function AccuSolarDashboard() {
  const [activeTab, setActiveTab] = useState<string>('demo-data');
  const [activeSubTab, setActiveSubTab] = useState<string>('summary');
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
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

  // Fetch telemetry
  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch('/api/telemetry?source=demo');
        if (res.ok) {
          setTelemetry(await res.json());
        }
      } catch (err) {
        console.error('Telemetry fetch failed:', err);
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch weather
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Default location: use Open-Meteo for demo
        const res = await fetch(
          '/api/weather?lat=37.7749&lon=-122.4194' // San Francisco
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
  }, []);

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

  if (!telemetry) {
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
          {['demo-data', 'victron-local', 'ble', 'sun-view', 'battery', 'solar', 'grid', 'reports', 'controls'].map(
            (tab) => (
              <button
                key={tab}
                className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                onClick={() => {
                  setActiveTab(tab);
                  setActiveSubTab('summary');
                }}
              >
                {tab === 'demo-data' && 'DEMO DATA'}
                {tab === 'victron-local' && 'VICTRON LOCAL'}
                {tab === 'ble' && 'BLE'}
                {tab === 'sun-view' && 'SUN VIEW'}
                {tab === 'battery' && 'BATTERY'}
                {tab === 'solar' && 'SOLAR'}
                {tab === 'grid' && 'GRID'}
                {tab === 'reports' && 'REPORTS'}
                {tab === 'controls' && 'CONTROLS'}
              </button>
            )
          )}
        </div>

        <div style={{ fontSize: '12px', color: '#a78bfa', marginBottom: '12px' }}>
          No hardware yet? Use{' '}
          <span style={{ color: '#7dd3fc', fontWeight: '600' }}>Demo Data</span>. Victron Local =
          Venus OS on your LAN. BLE = connect a compatible battery in Controls.
        </div>

        {/* SUN VIEW TAB */}
        {activeTab === 'sun-view' && (
          <div className={styles.grid}>
            <div className={styles.panel}>
              <div className={styles.panelTitleRow}>
                <div className={styles.panelTitle}>SUN VIEW</div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#34d399',
                  }}
                >
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }}></div>
                  CHARGING
                </div>
              </div>

              <div className={styles.flowCanvas}>
                {/* PV */}
                <div style={{ marginBottom: '20px' }}>
                  <div className={styles.node}>
                    <div className={styles.nodeTitle}>SUN / PV</div>
                    <div className={styles.nodeValue}>
                      {(telemetry.solar_w / 1000).toFixed(2)} kW
                    </div>
                    <div className={styles.nodeSub}>
                      Forecast driver: irradiance + clouds • idle
                    </div>
                  </div>
                </div>

                {/* Controller */}
                <div style={{ marginBottom: '20px' }}>
                  <div className={styles.node}>
                    <div className={styles.nodeTitle}>CONTROLLER</div>
                    <div className={styles.nodeValue}>{telemetry.battery_a.toFixed(1)} A</div>
                    <div className={styles.nodeSub}>Battery: {telemetry.battery_v.toFixed(1)} V</div>
                  </div>
                </div>

                {/* Battery */}
                <div style={{ marginBottom: '20px' }}>
                  <div className={styles.node}>
                    <div className={styles.nodeTitle}>BATTERY</div>
                    <div className={styles.nodeValue}>{telemetry.battery_soc_pct.toFixed(1)}%</div>
                    <div className={styles.nodeSub}>
                      TTG: — • Temp: {tempDisplay}
                    </div>
                  </div>
                </div>

                {/* Home / Grid */}
                <div>
                  <div className={styles.node}>
                    <div className={styles.nodeTitle}>HOME / GRID</div>
                    <div className={styles.nodeValue}>
                      {(telemetry.load_w / 1000).toFixed(2)} kW
                    </div>
                    <div className={styles.nodeSub}>Grid: {telemetry.grid_w} W ( +import / -export )</div>
                  </div>
                </div>
              </div>

              <div className={styles.summary} style={{ marginTop: '20px' }}>
                <strong>Daily PV:</strong> {telemetry.daily_solar_kwh.toFixed(2)} kWh
                <br />
                <strong>Daily Load:</strong> {telemetry.daily_load_kwh.toFixed(2)} kWh
                <br />
                <strong>Self-Consumption:</strong>{' '}
                {telemetry.self_consumption_pct != null ? `${telemetry.self_consumption_pct.toFixed(1)}%` : '—'}
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelTitleRow}>
                <div className={styles.panelTitle}>FORECAST + OPTIMIZATION</div>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399' }}></div>
              </div>

              <div className={styles.kpiGrid}>
                <div className={styles.kpi}>
                  <div className={styles.kpiLabel}>Solar today</div>
                  <div className={styles.kpiValue}>—</div>
                </div>
                <div className={styles.kpi}>
                  <div className={styles.kpiLabel}>Cloud cover</div>
                  <div className={styles.kpiValue}>—</div>
                </div>
                <div className={styles.kpi}>
                  <div className={styles.kpiLabel}>UV max</div>
                  <div className={styles.kpiValue}>—</div>
                </div>
                <div className={styles.kpi}>
                  <div className={styles.kpiLabel}>Space weather</div>
                  <div className={styles.kpiValue}>Kp 1.0</div>
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <div className={styles.panelTitle} style={{ marginBottom: '10px' }}>
                  Best charge windows (next)
                </div>
                <div style={{ color: '#a78bfa', fontSize: '13px' }}>
                  No strong windows detected yet (or load a location).
                </div>
              </div>

              <div style={{ marginTop: '12px', color: '#a78bfa', fontSize: '12px' }}>
                Computed from irradiance + cloud + precipitation probability.
              </div>
            </div>
          </div>
        )}

        {/* BATTERY TAB */}
        {activeTab === 'battery' && (
          <div className={styles.panel}>
            <div className={styles.panelTitleRow}>
              <div className={styles.panelTitle}>BATTERY DETAILS</div>
            </div>

            <div className={styles.microGrid}>
              <div className={styles.micro}>
                <div className={styles.microLabel}>Voltage</div>
                <div className={styles.microValue}>{telemetry.battery_v.toFixed(1)} V</div>
              </div>
              <div className={styles.micro}>
                <div className={styles.microLabel}>Current</div>
                <div className={styles.microValue}>{telemetry.battery_a.toFixed(1)} A</div>
              </div>
              <div className={styles.micro}>
                <div className={styles.microLabel}>Temp</div>
                <div className={styles.microValue}>{tempDisplay}</div>
              </div>
              <div className={styles.micro}>
                <div className={styles.microLabel}>SoH</div>
                <div className={styles.microValue}>{telemetry.battery_soh_pct.toFixed(1)}%</div>
              </div>
            </div>

            <div className={styles.statusBar} style={{ marginTop: '16px' }}>
              <span
                className={styles.statusBig}
                style={{
                  borderColor: getStatusColor(telemetry.system_status),
                  background: `${getStatusColor(telemetry.system_status)}20`,
                }}
              >
                <span
                  className={styles.statusIcon}
                  style={{ background: getStatusColor(telemetry.system_status) }}
                ></span>
                {telemetry.system_status.toUpperCase()}
              </span>
            </div>
          </div>
        )}

        {/* SOLAR TAB */}
        {activeTab === 'solar' && (
          <div className={styles.panel}>
            <div className={styles.panelTitleRow}>
              <div className={styles.panelTitle}>SOLAR PERFORMANCE</div>
            </div>

            <div className={styles.microGrid}>
              <div className={styles.micro}>
                <div className={styles.microLabel}>Daily Output</div>
                <div className={styles.microValue}>{telemetry.daily_solar_kwh.toFixed(2)}</div>
              </div>
              <div className={styles.micro}>
                <div className={styles.microLabel}>Import Today</div>
                <div className={styles.microValue}>{telemetry.daily_grid_import_kwh.toFixed(2)}</div>
              </div>
              <div className={styles.micro}>
                <div className={styles.microLabel}>Export Today</div>
                <div className={styles.microValue}>{telemetry.daily_grid_export_kwh.toFixed(2)}</div>
              </div>
              <div className={styles.micro}>
                <div className={styles.microLabel}>Self-Consumption</div>
                <div className={styles.microValue}>
                  {telemetry.self_consumption_pct != null ? `${telemetry.self_consumption_pct.toFixed(0)}%` : '—'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GRID TAB */}
        {activeTab === 'grid' && (
          <div className={styles.panel}>
            <div className={styles.panelTitleRow}>
              <div className={styles.panelTitle}>GRID INTERACTION</div>
            </div>

            <div className={styles.microGrid}>
              <div className={styles.micro}>
                <div className={styles.microLabel}>Current Flow</div>
                <div className={styles.microValue}>{telemetry.grid_w} W</div>
              </div>
              <div className={styles.micro}>
                <div className={styles.microLabel}>Daily Import</div>
                <div className={styles.microValue}>{telemetry.daily_grid_import_kwh.toFixed(2)} kWh</div>
              </div>
              <div className={styles.micro}>
                <div className={styles.microLabel}>Daily Export</div>
                <div className={styles.microValue}>{telemetry.daily_grid_export_kwh.toFixed(2)} kWh</div>
              </div>
              <div className={styles.micro}>
                <div className={styles.microLabel}>Mode</div>
                <div className={styles.microValue}>
                  {telemetry.grid_w > 0 ? 'Export' : telemetry.grid_w < 0 ? 'Import' : 'Neutral'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div className={styles.panel}>
            <div className={styles.panelTitleRow}>
              <div className={styles.panelTitle}>REPORTS + ANALYTICS</div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ color: '#a78bfa', fontSize: '12px', marginBottom: '8px' }}>
                No location selected
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#a78bfa', fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                Units
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className={`${styles.button} ${tempUnit === 'C' ? styles.tabActive : ''}`}
                  onClick={() => setTempUnit('C')}
                  style={{ flex: 1 }}
                >
                  °C
                </button>
                <button
                  className={`${styles.button} ${tempUnit === 'F' ? styles.tabActive : ''}`}
                  onClick={() => setTempUnit('F')}
                  style={{ flex: 1 }}
                >
                  °F
                </button>
              </div>
            </div>

            <div style={{ color: '#a78bfa', fontSize: '12px', lineHeight: '1.5' }}>
              <strong>Bluetooth / BLE (Experimental)</strong>
              <br />
              This uses Web Bluetooth. It works best on Chrome/Edge (desktop/Android). iOS Safari support is
              limited.
              <br />
              For Victron, local LAN integrations (Venus OS) are usually more reliable than BLE.
            </div>
          </div>
        )}

        {/* CONTROLS TAB */}
        {activeTab === 'controls' && (
          <div>
            <div className={styles.grid}>
              <div className={styles.panel}>
                <div className={styles.panelTitleRow}>
                  <div className={styles.panelTitle}>OPERATIONS CONSOLE</div>
                </div>

                <input
                  type="text"
                  className={styles.input}
                  placeholder="Search city / place (e.g., Tampa, FL)"
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  style={{ marginBottom: '10px' }}
                />
                <button className={styles.button}>Search</button>

                <div style={{ marginTop: '12px', color: '#a78bfa', fontSize: '12px' }}>
                  Tip: Start with a city name. Select a result to load weather and a solar outlook.
                </div>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelTitleRow}>
                  <div className={styles.panelTitle}>REPORTS + ANALYTICS</div>
                </div>
                No location selected
              </div>
            </div>

            <div className={styles.panel} style={{ marginTop: '14px' }}>
              <div className={styles.panelTitleRow}>
                <div className={styles.panelTitle}>BLUETOOTH / BLE (EXPERIMENTAL)</div>
              </div>

              <div style={{ color: '#a78bfa', fontSize: '12px', marginBottom: '12px', lineHeight: '1.5' }}>
                This uses Web Bluetooth. It works best on Chrome/Edge (desktop/Android). iOS Safari support is
                limited.
                <br />
                For Victron, local LAN integrations (Venus OS) are usually more reliable than BLE.
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', fontSize: '12px' }}>
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: '#dc352520',
                    color: '#fb7185',
                  }}
                >
                  Support: available
                </span>
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: '#6c757d20',
                    color: '#9ca3af',
                  }}
                >
                  Status: idle
                </span>
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: '#6c757d20',
                    color: '#9ca3af',
                  }}
                >
                  Devices: 0
                </span>
              </div>

              <select
                className={styles.input}
                value={selectedBle}
                onChange={(e) => setSelectedBle(e.target.value)}
                style={{ marginBottom: '10px' }}
              >
                <option value="">Select a battery ...</option>
              </select>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button className={styles.button} style={{ flex: 1 }}>
                  Connect BLE
                </button>
                <button className={styles.button} style={{ flex: 1, opacity: 0.6 }}>
                  Clear
                </button>
              </div>

              <div
                style={{
                  padding: '14px',
                  background: 'rgba(0, 0, 0, 0.22)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
              >
                <div className={styles.panelTitle} style={{ marginBottom: '8px' }}>
                  BATTERY BANK CONFIG
                </div>
                <div style={{ color: '#a78bfa', fontSize: '12px', marginBottom: '12px' }}>
                  Match your physical setup (e.g. 2 banks of 4 × 12V = 48V each).
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
                  <div className={styles.micro}>
                    <div className={styles.microLabel}>Banks</div>
                    <input
                      type="number"
                      value={batteryConfig.banks}
                      onChange={(e) =>
                        setBatteryConfig({ ...batteryConfig, banks: parseInt(e.target.value) || 1 })
                      }
                      className={styles.input}
                      style={{ marginTop: '6px', height: '32px', padding: '6px' }}
                    />
                  </div>
                  <div className={styles.micro}>
                    <div className={styles.microLabel}>Packs per bank</div>
                    <input
                      type="number"
                      value={batteryConfig.packsPerBank}
                      onChange={(e) =>
                        setBatteryConfig({ ...batteryConfig, packsPerBank: parseInt(e.target.value) || 1 })
                      }
                      className={styles.input}
                      style={{ marginTop: '6px', height: '32px', padding: '6px' }}
                    />
                  </div>
                  <div className={styles.micro}>
                    <div className={styles.microLabel}>Voltage per bank (V)</div>
                    <input
                      type="number"
                      value={batteryConfig.voltagePerBank}
                      onChange={(e) =>
                        setBatteryConfig({ ...batteryConfig, voltagePerBank: parseInt(e.target.value) || 12 })
                      }
                      className={styles.input}
                      style={{ marginTop: '6px', height: '32px', padding: '6px' }}
                    />
                  </div>
                </div>

                <div style={{ color: '#a78bfa', fontSize: '11px' }}>
                  Total packs: {batteryConfig.banks * batteryConfig.packsPerBank}. Per bank: {batteryConfig.packsPerBank} × {batteryConfig.voltagePerBank}V = {batteryConfig.packsPerBank * batteryConfig.voltagePerBank}V (or series to 48V)
                </div>
              </div>

              <div
                style={{
                  padding: '14px',
                  background: 'rgba(0, 0, 0, 0.22)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  marginTop: '12px',
                }}
              >
                <div className={styles.panelTitle} style={{ marginBottom: '8px' }}>
                  BMS DECODER (ECO-WORTHY A1/A2 + GENERIC)
                </div>
                <div style={{ color: '#a78bfa', fontSize: '12px' }}>
                  Eco-Worthy 12V packs often use 0xA1/0xA2 packets. Use that preset if you see those headers in Live packets. Otherwise use generic "Use guess" to lock in byte offsets.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DEMO DATA, VICTRON LOCAL, BLE TABS (PLACEHOLDER) */}
        {['demo-data', 'victron-local', 'ble'].includes(activeTab) && (
          <div className={styles.panel}>
            <div className={styles.panelTitleRow}>
              <div className={styles.panelTitle}>
                {activeTab === 'demo-data' && 'DEMO DATA'}
                {activeTab === 'victron-local' && 'VICTRON LOCAL'}
                {activeTab === 'ble' && 'BLUETOOTH'}
              </div>
            </div>
            <div style={{ color: '#a78bfa', fontSize: '13px' }}>
              Data streaming live from{' '}
              {activeTab === 'demo-data' && 'simulated telemetry'}
              {activeTab === 'victron-local' && 'Venus OS / Victron system'}
              {activeTab === 'ble' && 'BLE battery'}
              ...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
