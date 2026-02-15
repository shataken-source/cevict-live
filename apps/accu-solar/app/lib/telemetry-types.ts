export type Telemetry = {
  ts: string;
  system_status: "normal" | "charging" | "discharging" | "fault";
  solar_w: number;
  load_w: number;
  grid_w: number; // + import, - export
  battery_soc_pct: number;
  battery_v: number;
  battery_a: number; // + charge, - discharge
  battery_temp_c: number;
  battery_soh_pct: number;
  ttg_hours: number | null;
  daily_solar_kwh: number;
  daily_load_kwh: number;
  daily_grid_import_kwh: number;
  daily_grid_export_kwh: number;
  self_consumption_pct: number | null;
  savings_today_usd: number | null;
  // Cell-level data for BMS with individual cell monitoring (e.g., JK BMS, Daly BMS)
  battery_cells?: BatteryCell[];
  battery_pack_temp?: number; // Alternative temp sensor location
};

export interface BatteryCell {
  id: number; // Cell number (1-8, 1-16, etc.)
  voltage: number; // Volts (e.g., 3.2-3.6V for LiFePO4)
  temp_c?: number; // Optional per-cell temp
  soc_pct?: number; // Optional per-cell SoC estimate
  soh_pct?: number; // Optional per-cell SoH estimate
  balance_active?: boolean; // Is cell balancing active
}

export interface BatteryPackConfig {
  cellsPerPack: number; // e.g., 8, 16
  nominalVoltage: number; // e.g., 51.2V for 16S LiFePO4
  capacity_ah: number; // e.g., 200Ah
  chemistry: 'lifepo4' | 'lto' | 'ncm' | 'other';
}
