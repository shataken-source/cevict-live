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
};
