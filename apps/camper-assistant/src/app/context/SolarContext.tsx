'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

export interface SolarData {
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

interface SolarContextValue {
  solarData: SolarData;
  isConnected: boolean;
  lastUpdated: Date;
  dataSource: string;
}

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

const SolarContext = createContext<SolarContextValue>({
  solarData: generateMockData(),
  isConnected: false,
  lastUpdated: new Date(),
  dataSource: 'demo',
});

export function SolarProvider({ children }: { children: ReactNode }) {
  const [solarData, setSolarData] = useState<SolarData>(generateMockData());
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsConnected(true);
      setSolarData(generateMockData());
      setLastUpdated(new Date());
    }, 800);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => {
      setSolarData(prev => {
        const prod = Math.max(0, prev.currentProduction + (Math.random() * 0.4 - 0.2));
        const soc = Math.min(100, Math.max(0, prev.batterySoc + (Math.random() * 2 - 1)));
        const load = Math.max(0.5, prev.loadPower + (Math.random() * 0.2 - 0.1));
        const net = prod - load;
        return {
          ...prev,
          currentProduction: prod,
          batterySoc: soc,
          loadPower: load,
          inverterTemp: prev.inverterTemp + (Math.random() * 0.4 - 0.2),
          todaySolar: prev.todaySolar + 0.001,
          gridPower: net < 0 ? Math.abs(net) : 0,
          gridStatus: net >= 0 ? 'Exporting' : 'Importing',
          systemHealth: soc < 15 ? 'Critical' : soc < 30 ? 'Warning' : 'Normal',
        };
      });
      setLastUpdated(new Date());
    }, 5000);
    return () => clearInterval(interval);
  }, [isConnected]);

  return (
    <SolarContext.Provider value={{ solarData, isConnected, lastUpdated, dataSource: 'demo' }}>
      {children}
    </SolarContext.Provider>
  );
}

export function useSolar() {
  return useContext(SolarContext);
}
