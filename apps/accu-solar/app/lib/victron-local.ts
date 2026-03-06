import type { AdapterContext, TelemetryAdapter } from "@/app/lib/datasources";
import type { Telemetry } from "@/app/lib/telemetry-types";

export type VictronLocalConfig = {
  host?: string; // e.g. 192.168.1.50 (Venus OS)
  method?: "mqtt" | "modbus" | "unknown";
};

export const victronLocalAdapter: TelemetryAdapter = {
  type: "victron_local",
  async getTelemetry(ctx: AdapterContext): Promise<Telemetry> {
    const now = ctx.nowMs;
    const config = ctx.datasource.config as VictronLocalConfig;

    // Stub: returns a safe placeholder until a concrete Victron local method is configured.
    // Once you confirm MQTT vs Modbus and the endpoint, we’ll map real values.
    void config;

    return {
      ts: new Date(now).toISOString(),
      system_status: "normal",
      solar_w: 0,
      load_w: 0,
      grid_w: 0,
      battery_soc_pct: 0,
      battery_v: 0,
      battery_a: 0,
      battery_temp_c: 0,
      battery_soh_pct: 0,
      ttg_hours: null,
      daily_solar_kwh: 0,
      daily_load_kwh: 0,
      daily_grid_import_kwh: 0,
      daily_grid_export_kwh: 0,
      self_consumption_pct: null,
      savings_today_usd: null,
      // Note: host/method intentionally not embedded into telemetry to keep schema stable.
      // Operator can verify config via datasource config endpoints/UI later.
    };
  },
};
