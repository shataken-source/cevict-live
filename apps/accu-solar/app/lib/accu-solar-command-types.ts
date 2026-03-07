/**
 * Shared types for the Accu Solar Command dashboard (app/page.tsx and related components).
 */

import type { Telemetry } from './telemetry-types';

export interface WeatherData {
  cloudCover: number;
  temperatureC: number;
  windSpeed: number;
  shortwave_radiation: number;
  irradiance?: number;
  humidity?: number;
  uvIndex?: number;
}

export interface BatteryBankConfig {
  banks: number;
  packsPerBank: number;
  voltagePerBank: number;
}

export interface BleDevice {
  id: string;
  name: string;
}

export interface GeocodeResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1: string;
  timezone: string;
}

export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AIChatPanelProps {
  telemetry: Telemetry | null;
  weather: WeatherData | null;
  selectedLocation: { lat: number; lon: number; name: string } | null;
}

export type DialogType = 'info' | 'error' | 'warning';

export interface DialogState {
  title: string;
  message: string;
  type: DialogType;
}
