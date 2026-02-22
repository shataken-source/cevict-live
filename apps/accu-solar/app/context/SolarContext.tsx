'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// ─── System Config (your hardware) ───────────────────────────────────────────
export const SYSTEM_CONFIG = {
  panelWatts: 300,
  panelCount: 8,
  panelWiring: '4S2P',           // 4 strings of 2 panels
  peakWatts: 2400,               // 8 × 300W
  batteryVoltage: 12,
  batteryAh: 280,
  batteryCount: 8,
  totalAh: 2240,                 // 8 × 280Ah
  totalKwh: 26.88,               // 2240Ah × 12V / 1000
  usableKwh: 21.5,               // ~80% DoD for LiFePO4
  controller: 'AmpinVT 150/80',
  maxChargeAmps: 80,
  maxInputVolts: 150,
};

// ─── AmpinVT ESPHome MQTT Topics ─────────────────────────────────────────────
export const AMPINVT_TOPICS = {
  solarPower:       'ampinvt/sensor/solar_power/state',
  panelVoltage:     'ampinvt/sensor/panel_voltage/state',
  panelCurrent:     'ampinvt/sensor/panel_current/state',
  batteryVoltage:   'ampinvt/sensor/battery_voltage/state',
  batteryCurrent:   'ampinvt/sensor/battery_current/state',
  batterySoc:       'ampinvt/sensor/battery_soc/state',
  todayProduction:  'ampinvt/sensor/today_production/state',
  chargingStatus:   'ampinvt/binary_sensor/charging_status/state',
  mpptStatus:       'ampinvt/binary_sensor/mppt_tracking_status/state',
  floatStatus:      'ampinvt/binary_sensor/float_charging_status/state',
  controllerTemp:   'ampinvt/sensor/controller_temperature/state',
  overheatStatus:   'ampinvt/binary_sensor/overheat_status/state',
};

// ─── Types ────────────────────────────────────────────────────────────────────
export type ChargingMode = 'MPPT' | 'Float' | 'Bulk' | 'Absorption' | 'Idle';
export type SystemHealth = 'Normal' | 'Warning' | 'Critical';
export type DataSource = 'demo' | 'ampinvt' | 'victron' | 'manual';

export interface SolarReading {
  // Production
  solarPowerW: number;
  panelVoltage: number;
  panelCurrent: number;
  todayKwh: number;
  // Battery
  batteryVoltage: number;
  batteryCurrent: number;
  batterySoc: number;
  batteryPowerW: number;
  // Load
  loadPowerW: number;
  // Controller
  controllerTemp: number;
  chargingMode: ChargingMode;
  mpptTracking: boolean;
  floatCharging: boolean;
  overheatWarning: boolean;
  // Derived
  systemHealth: SystemHealth;
  gridStatus: 'Exporting' | 'Importing' | 'Idle';
  netPowerW: number;
  // History
  todayConsumedKwh: number;
  todayExportedKwh: number;
  uptimeSeconds: number;
}

export interface SparkPoint { time: string; watts: number }

interface SolarContextValue {
  data: SolarReading;
  spark: SparkPoint[];
  isConnected: boolean;
  dataSource: DataSource;
  lastUpdated: Date;
  setDataSource: (s: DataSource) => void;
}

// ─── Demo data generator ──────────────────────────────────────────────────────
function makeDemoReading(prev?: SolarReading): SolarReading {
  const hour = new Date().getHours();
  // Solar follows a bell curve through the day
  const solarFactor = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
  const baseSolar = SYSTEM_CONFIG.peakWatts * solarFactor * (0.7 + Math.random() * 0.25);
  const solarPowerW = prev
    ? Math.max(0, prev.solarPowerW + (baseSolar - prev.solarPowerW) * 0.1 + (Math.random() * 60 - 30))
    : baseSolar;

  const loadPowerW = prev
    ? Math.max(100, prev.loadPowerW + (Math.random() * 100 - 50))
    : 450 + Math.random() * 200;

  const netPowerW = solarPowerW - loadPowerW;
  const batteryCurrent = netPowerW / (SYSTEM_CONFIG.batteryVoltage * 1.0);
  const batterySoc = prev
    ? Math.min(100, Math.max(5, prev.batterySoc + (batteryCurrent / SYSTEM_CONFIG.totalAh) * (5 / 3600) * 100))
    : 78 + Math.random() * 10;

  const batteryVoltage = 11.8 + (batterySoc / 100) * 2.4; // 11.8V–14.2V range
  const panelVoltage = solarPowerW > 10 ? 72 + Math.random() * 8 : 0; // 2S wiring ~72-80V
  const panelCurrent = panelVoltage > 0 ? solarPowerW / panelVoltage : 0;
  const controllerTemp = 25 + (solarPowerW / SYSTEM_CONFIG.peakWatts) * 30 + Math.random() * 3;

  let chargingMode: ChargingMode = 'Idle';
  if (solarPowerW > 50) {
    if (batterySoc < 80) chargingMode = 'Bulk';
    else if (batterySoc < 95) chargingMode = 'Absorption';
    else chargingMode = 'Float';
    if (solarPowerW > 200) chargingMode = 'MPPT';
  }

  const systemHealth: SystemHealth =
    controllerTemp > 65 || batterySoc < 10 ? 'Critical' :
    controllerTemp > 50 || batterySoc < 20 ? 'Warning' : 'Normal';

  return {
    solarPowerW: Math.round(solarPowerW),
    panelVoltage: Math.round(panelVoltage * 10) / 10,
    panelCurrent: Math.round(panelCurrent * 10) / 10,
    todayKwh: prev ? prev.todayKwh + solarPowerW / 1000 / 720 : 4.2 + Math.random() * 2,
    batteryVoltage: Math.round(batteryVoltage * 100) / 100,
    batteryCurrent: Math.round(batteryCurrent * 10) / 10,
    batterySoc: Math.round(batterySoc * 10) / 10,
    batteryPowerW: Math.round(netPowerW),
    loadPowerW: Math.round(loadPowerW),
    controllerTemp: Math.round(controllerTemp * 10) / 10,
    chargingMode,
    mpptTracking: chargingMode === 'MPPT',
    floatCharging: chargingMode === 'Float',
    overheatWarning: controllerTemp > 65,
    systemHealth,
    gridStatus: netPowerW > 50 ? 'Exporting' : netPowerW < -50 ? 'Importing' : 'Idle',
    netPowerW: Math.round(netPowerW),
    todayConsumedKwh: prev ? prev.todayConsumedKwh + loadPowerW / 1000 / 720 : 3.8 + Math.random(),
    todayExportedKwh: prev ? prev.todayExportedKwh + Math.max(0, netPowerW) / 1000 / 720 : 1.1,
    uptimeSeconds: prev ? prev.uptimeSeconds + 5 : 86400,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────
const SolarContext = createContext<SolarContextValue>({
  data: makeDemoReading(),
  spark: [],
  isConnected: false,
  dataSource: 'demo',
  lastUpdated: new Date(),
  setDataSource: () => {},
});

export function SolarProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SolarReading>(() => makeDemoReading());
  const [spark, setSpark] = useState<SparkPoint[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [dataSource, setDataSource] = useState<DataSource>('demo');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Boot: simulate connection delay
  useEffect(() => {
    const t = setTimeout(() => setIsConnected(true), 900);
    return () => clearTimeout(t);
  }, []);

  // Live updates every 5s
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => {
      setData(prev => {
        const next = makeDemoReading(prev);
        const now = new Date();
        const label = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setSpark(s => [...s.slice(-59), { time: label, watts: next.solarPowerW }]);
        setLastUpdated(now);
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [isConnected]);

  // Seed spark history on connect
  useEffect(() => {
    if (!isConnected) return;
    const now = new Date();
    const seed: SparkPoint[] = Array.from({ length: 30 }, (_, i) => {
      const t = new Date(now.getTime() - (29 - i) * 5000);
      const h = t.getHours();
      const factor = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI));
      return {
        time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        watts: Math.round(SYSTEM_CONFIG.peakWatts * factor * (0.6 + Math.random() * 0.3)),
      };
    });
    setSpark(seed);
  }, [isConnected]);

  return (
    <SolarContext.Provider value={{ data, spark, isConnected, dataSource, lastUpdated, setDataSource }}>
      {children}
    </SolarContext.Provider>
  );
}

export function useSolar() { return useContext(SolarContext); }
