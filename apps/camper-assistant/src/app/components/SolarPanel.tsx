'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useProfiles } from '../context/ProfileContext';
import {
  Sun,
  Zap,
  Battery,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Wifi,
  RefreshCw,
  Power
} from 'lucide-react';

// AmpinVT ESPHome MQTT Topics
const AMPINVT_TOPICS = {
  solarPower: 'ampinvt/sensor/solar_power/state',
  panelVoltage: 'ampinvt/sensor/panel_voltage/state',
  panelCurrent: 'ampinvt/sensor/panel_current/state',
  batteryVoltage: 'ampinvt/sensor/battery_voltage/state',
  batteryCurrent: 'ampinvt/sensor/battery_current/state',
  batterySoc: 'ampinvt/sensor/battery_soc/state',
  todayProduction: 'ampinvt/sensor/today_production/state',
  chargingStatus: 'ampinvt/binary_sensor/charging_status/state',
  mpptStatus: 'ampinvt/binary_sensor/mppt_tracking_status/state',
  floatStatus: 'ampinvt/binary_sensor/float_charging_status/state',
  controllerTemp: 'ampinvt/sensor/controller_temperature/state',
  overheatStatus: 'ampinvt/binary_sensor/overheat_status/state',
};

interface SolarData {
  currentProduction: number;
  todaySolar: number;
  todayConsumed: number;
  todayExported: number;
  batteryPower: number;
  batterySoc: number;
  gridPower: number;
  gridStatus: 'Importing' | 'Exporting' | 'Idle';
  loadPower: number;
  inverterTemp: number;
  systemHealth: 'Normal' | 'Warning' | 'Critical';
  // AmpinVT specific
  panelVoltage?: number;
  panelCurrent?: number;
  batteryVoltage?: number;
  batteryCurrent?: number;
  chargingMode?: string;
  mpptTracking?: boolean;
  floatCharging?: boolean;
  controllerTemp?: number;
  overheatWarning?: boolean;
}

type DataSource = 'demo' | 'ampinvt' | 'victron' | 'ble';

const generateMockData = (): SolarData => ({
  currentProduction: 3.394,
  todaySolar: 5.8,
  todayConsumed: 6.7,
  todayExported: 1.3,
  batteryPower: -2.4,
  batterySoc: 85,
  gridPower: 1.0,
  gridStatus: 'Importing',
  loadPower: 2.0,
  inverterTemp: 24.7,
  systemHealth: 'Normal',
  // AmpinVT mock data
  panelVoltage: 18.5,
  panelCurrent: 12.3,
  batteryVoltage: 13.2,
  batteryCurrent: 15.8,
  chargingMode: 'MPPT',
  mpptTracking: true,
  floatCharging: false,
  controllerTemp: 28.5,
  overheatWarning: false,
});

export default function SolarPanel() {
  const [dataSource, setDataSource] = useState<DataSource>('demo');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [solarData, setSolarData] = useState<SolarData>(generateMockData());
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch - only render time on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-connect on mount and when data source changes
  useEffect(() => {
    if (dataSource === 'demo') {
      setIsLoading(true);
      setTimeout(() => {
        setIsConnected(true);
        setSolarData(generateMockData());
        setLastUpdated(new Date());
        setIsLoading(false);
      }, 800);
    } else {
      setIsConnected(false);
    }
  }, [dataSource]);

  // Live data updates when connected
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      setSolarData(prev => ({
        ...prev,
        currentProduction: Math.max(0, prev.currentProduction + (Math.random() * 0.4 - 0.2)),
        batterySoc: Math.min(100, Math.max(0, prev.batterySoc + (Math.random() * 2 - 1))),
        inverterTemp: prev.inverterTemp + (Math.random() * 0.4 - 0.2),
        todaySolar: prev.todaySolar + (Math.random() * 0.01)
      }));
      setLastUpdated(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected]);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setSolarData(generateMockData());
      setLastUpdated(new Date());
      setIsLoading(false);
    }, 500);
  };

  // MQTT Connection for AmpinVT
  const mqttClientRef = useRef<any>(null);
  const { activeProfile } = useProfiles();

  useEffect(() => {
    if (dataSource !== 'ampinvt') return;

    const mqttBroker = activeProfile?.equipment?.mqttBroker || 'localhost';
    const mqttPort = activeProfile?.equipment?.mqttPort || 1883;

    // For now, simulate MQTT connection with polling
    // In production, use a real MQTT client like mqtt.js
    setIsLoading(true);

    const connectToMqtt = async () => {
      try {
        // Simulate connection delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsConnected(true);
        setIsLoading(false);

        // Simulate receiving data from MQTT topics
        const interval = setInterval(() => {
          setSolarData(prev => ({
            ...prev,
            currentProduction: 245 + Math.random() * 50 - 25,
            panelVoltage: 18.5 + (Math.random() * 2 - 1),
            panelCurrent: 12.3 + (Math.random() * 3 - 1.5),
            batteryVoltage: 13.2 + (Math.random() * 0.5 - 0.25),
            batteryCurrent: 15.8 + (Math.random() * 2 - 1),
            batterySoc: Math.min(100, Math.max(0, prev.batterySoc + (Math.random() * 2 - 1))),
            controllerTemp: 28 + Math.floor(Math.random() * 10 - 5),
            todaySolar: prev.todaySolar + (Math.random() * 0.01),
            chargingMode: Math.random() > 0.7 ? 'Float' : 'MPPT',
            mpptTracking: Math.random() > 0.3,
          }));
          setLastUpdated(new Date());
        }, 3000);

        return () => clearInterval(interval);
      } catch (err) {
        console.error('MQTT connection failed:', err);
        setIsConnected(false);
        setIsLoading(false);
      }
    };

    connectToMqtt();

    return () => {
      // Cleanup MQTT connection
      setIsConnected(false);
    };
  }, [dataSource, activeProfile]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Data Source Selection */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">⚡ Accu Solar Command</h2>
            <p className="text-sm text-slate-400">
              24/7 monitoring • forecasting • operator-grade telemetry
            </p>
          </div>

          {/* Data Source Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'demo', label: 'DEMO DATA', color: 'bg-amber-600' },
              { id: 'ampinvt', label: 'AMPINVT', color: 'bg-orange-600' },
              { id: 'victron', label: 'VICTRON LOCAL', color: 'bg-blue-600' },
              { id: 'ble', label: 'BLE', color: 'bg-purple-600' }
            ].map((source) => (
              <button
                key={source.id}
                onClick={() => setDataSource(source.id as DataSource)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${dataSource === source.id
                  ? `${source.color} text-white shadow-lg`
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
              >
                {source.label}
              </button>
            ))}
          </div>
        </div>

        {/* Connection Status */}
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-emerald-400">Telemetry: live</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-slate-500 rounded-full" />
                  <span className="text-slate-400">Offline</span>
                </>
              )}
            </div>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Provider: Open-Meteo</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Space Weather: Quiet (Kp 1.0)</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-500">SOURCE:</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${dataSource === 'demo' ? 'bg-amber-900 text-amber-400' : 'bg-blue-900 text-blue-400'
              }`}>
              {dataSource === 'demo' ? 'DEMO (simulated)' : dataSource.toUpperCase()}
            </span>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-4">
        {/* Left Column - System Overview */}
        <div className="space-y-6 min-w-0">
          {/* Hero Production Panel */}
          <div className="bg-slate-800/80 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">SYSTEM OVERVIEW</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${solarData.systemHealth === 'Normal'
                ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700/50'
                : 'bg-red-900/50 text-red-400 border border-red-700/50'
                }`}>
                {solarData.systemHealth === 'Normal' ? '✓ All Systems Normal' : '⚠ Check System'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Current Production */}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">Current Production</div>
                <div className="text-2xl font-bold text-emerald-400">
                  {isConnected ? solarData.currentProduction.toFixed(3) : '--'}
                  <span className="text-sm ml-1">kW</span>
                </div>
              </div>

              {/* Load */}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">Load</div>
                <div className="text-2xl font-bold text-amber-400">
                  {isConnected ? solarData.loadPower.toFixed(1) : '--'}
                  <span className="text-sm ml-1">kW</span>
                </div>
              </div>

              {/* Grid Status */}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">Grid</div>
                <div className={`text-xl font-bold leading-tight ${solarData.gridStatus === 'Exporting' ? 'text-emerald-400' :
                  solarData.gridStatus === 'Importing' ? 'text-red-400' : 'text-slate-400'
                  }`}>
                  {isConnected ? solarData.gridStatus : '--'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {isConnected && `${Math.abs(solarData.gridPower).toFixed(1)} kW`}
                </div>
              </div>
            </div>

            {/* Battery Status */}
            <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Battery className="w-5 h-5 text-blue-400" />
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wide">Battery</div>
                    <div className="text-lg font-bold text-blue-400">
                      {isConnected ? `${solarData.batteryPower > 0 ? '+' : ''}${solarData.batteryPower.toFixed(1)} kW` : '--'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-400">
                    {isConnected ? `${Math.round(solarData.batterySoc)}%` : '--'}
                  </div>
                  <div className="text-xs text-slate-500">SoC</div>
                </div>
              </div>
              {/* Battery Bar */}
              <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${isConnected ? solarData.batterySoc : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* AmpinVT Charge Controller Details */}
          {dataSource === 'ampinvt' && isConnected && (
            <div className="bg-slate-800/80 rounded-xl p-6 border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                CHARGE CONTROLLER DETAILS
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Panel Voltage */}
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">PANEL VOLTAGE</div>
                  <div className="text-2xl font-bold text-amber-400">
                    {solarData.panelVoltage?.toFixed(2) || '--'}V
                  </div>
                </div>
                {/* Panel Current */}
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">PANEL CURRENT</div>
                  <div className="text-2xl font-bold text-amber-400">
                    {solarData.panelCurrent?.toFixed(2) || '--'}A
                  </div>
                </div>
                {/* Battery Voltage */}
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">BATTERY VOLTAGE</div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {solarData.batteryVoltage?.toFixed(2) || '--'}V
                  </div>
                </div>
                {/* Battery Current */}
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">BATTERY CURRENT</div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {solarData.batteryCurrent?.toFixed(2) || '--'}A
                  </div>
                </div>
              </div>

              {/* Charging Status Row */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                {/* Charging Mode */}
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">CHARGING MODE</div>
                  <div className={`text-xl font-bold ${solarData.chargingMode === 'MPPT' ? 'text-purple-400' : 'text-blue-400'
                    }`}>
                    {solarData.chargingMode || '--'}
                  </div>
                </div>
                {/* MPPT Status */}
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">MPPT TRACKING</div>
                  <div className={`text-xl font-bold ${solarData.mpptTracking ? 'text-emerald-400' : 'text-slate-500'
                    }`}>
                    {solarData.mpptTracking ? 'Active' : 'Inactive'}
                  </div>
                </div>
                {/* Controller Temp */}
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">CONTROLLER TEMP</div>
                  <div className={`text-xl font-bold ${(solarData.controllerTemp || 0) > 45 ? 'text-red-400' : 'text-emerald-400'
                    }`}>
                    {solarData.controllerTemp?.toFixed(1) || '--'}°C
                  </div>
                </div>
              </div>

              {/* MQTT Broker Info */}
              {activeProfile?.equipment?.mqttBroker && (
                <div className="mt-4 p-3 bg-slate-900/30 rounded-lg">
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <Wifi className="w-3 h-3" />
                    MQTT: {activeProfile.equipment.mqttBroker}:{activeProfile.equipment.mqttPort || 1883}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="bg-slate-800/80 rounded-xl p-6 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">ENERGY TODAY</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-900/50 rounded-lg p-4 text-center border border-slate-700">
                <Sun className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                <div className="text-sm text-slate-400">SOLAR</div>
                <div className="text-xl font-bold text-emerald-400">
                  {isConnected ? solarData.todaySolar.toFixed(1) : '--'}
                </div>
                <div className="text-xs text-slate-500">kWh</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 text-center border border-slate-700">
                <Power className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                <div className="text-sm text-slate-400">CONSUMED</div>
                <div className="text-xl font-bold text-amber-400">
                  {isConnected ? solarData.todayConsumed.toFixed(1) : '--'}
                </div>
                <div className="text-xs text-slate-500">kWh</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 text-center border border-slate-700">
                <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                <div className="text-sm text-slate-400">EXPORTED</div>
                <div className="text-xl font-bold text-emerald-400">
                  {isConnected ? solarData.todayExported.toFixed(1) : '--'}
                </div>
                <div className="text-xs text-slate-500">kWh</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - System Health & Alerts */}
        <div className="space-y-6 min-w-0">
          {/* System Health */}
          <div className="bg-slate-800/80 rounded-xl p-6 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">SYSTEM HEALTH</h3>

            {/* Inverter Temp */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-400">INVERTER TEMP</span>
                <span className={`text-lg font-bold ${solarData.inverterTemp > 65 ? 'text-red-400' : 'text-emerald-400'
                  }`}>
                  {isConnected ? `${solarData.inverterTemp.toFixed(1)}°C` : '--'}
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${solarData.inverterTemp > 65 ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                  style={{ width: `${isConnected ? Math.min(100, (solarData.inverterTemp / 80) * 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Status Indicators */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-slate-300">Inverter Online</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-slate-300">Battery Healthy</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg">
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-slate-300">MQTT Connected</span>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-slate-800/80 rounded-xl p-6 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">🚨 ALERTS</h3>
            {solarData.inverterTemp > 65 ? (
              <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-300">High Inverter Temp</span>
              </div>
            ) : (
              <div className="p-3 bg-emerald-900/30 border border-emerald-700/50 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-300">All Systems Normal</span>
              </div>
            )}
          </div>

          {/* Last Updated */}
          <div className="text-center text-sm text-slate-500">
            Last updated: {mounted ? formatTime(lastUpdated) : '--:--:--'}
          </div>
        </div>
      </div>
    </div>
  );
}
