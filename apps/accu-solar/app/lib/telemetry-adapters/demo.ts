import type { AdapterContext, TelemetryAdapter } from "@/app/lib/datasources";
import type { Telemetry } from "@/app/lib/telemetry-types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export const demoAdapter: TelemetryAdapter = {
  type: "demo",
  async getTelemetry(ctx: AdapterContext): Promise<Telemetry> {
    const now = ctx.nowMs;
    const t = now / 1000;

    const solarBase = Math.max(0, Math.sin((t / 240) % (2 * Math.PI)));
    const solarW = Math.round(3500 * solarBase + 250 * Math.sin(t / 13));
    const loadW = Math.round(900 + 250 * Math.sin(t / 19) + 120 * Math.sin(t / 7));
    const batterySoc = clamp(55 + 20 * Math.sin(t / 360) + 5 * Math.sin(t / 60), 5, 100);

    const netW = solarW - loadW;
    const batteryA = clamp(netW / 52, -120, 120);
    const gridW = Math.round(-clamp(netW - batteryA * 52, -1800, 1800));

    const status: Telemetry["system_status"] =
      solarW < 50 && loadW > 200 ? "discharging" : netW > 150 ? "charging" : "normal";

    const battV = clamp(51.2 + 1.4 * (batterySoc / 100) + 0.2 * Math.sin(t / 25), 48, 58);
    const battTemp = clamp(27 + 3 * Math.sin(t / 70) + 1.2 * Math.sin(t / 17), 12, 48);

    // Generate realistic cell-level data for 16S LiFePO4 battery (51.2V nominal)
    const cellsPerPack = 16;
    const nominalCellV = 3.2; // LiFePO4 nominal
    const currentCellV = battV / cellsPerPack;
    const cellVoltageSpread = 0.08; // ±40mV max spread
    const batteryCells = Array.from({ length: cellsPerPack }, (_, i) => {
      // Cell 4 is an outlier (slightly lower voltage, needs balancing)
      const isOutlier = i === 3;
      const outlierOffset = isOutlier ? -0.025 : 0;
      // Small random variation per cell (±20mV typical)
      const randomVar = (Math.sin(t / 13 + i * 0.5) * 0.02);
      const voltage = clamp(currentCellV + randomVar + outlierOffset, 2.8, 3.65);

      return {
        id: i + 1,
        voltage: Math.round(voltage * 1000) / 1000, // 3 decimal places
        temp_c: Math.round((battTemp + (Math.sin(t / 25 + i * 0.3) * 2)) * 10) / 10,
        soc_pct: Math.round((voltage - 2.8) / (3.6 - 2.8) * 100),
        soh_pct: Math.round((96.5 - i * 0.2) * 10) / 10,
        balance_active: isOutlier || voltage > 3.45, // Balance high cells and the outlier
      };
    });

    const remainingKwh = (batterySoc / 100) * 10;
    const ttg =
      netW < -100 ? clamp((remainingKwh / (Math.abs(netW) / 1000)) * 0.9, 0, 96) : null;

    const dailySolarKwh = clamp(4.2 + 1.8 * solarBase, 0, 40);
    const dailyLoadKwh = clamp(6.1 + 0.6 * Math.sin(t / 180), 0, 80);

    const importKwh = clamp(1.2 + 0.4 * (solarBase < 0.1 ? 1 : 0), 0, 80);
    const exportKwh = clamp(0.8 + 0.5 * (solarBase > 0.6 ? 1 : 0), 0, 80);

    const selfConsumption =
      dailySolarKwh > 0 ? clamp((1 - exportKwh / dailySolarKwh) * 100, 0, 100) : null;

    return {
      ts: new Date(now).toISOString(),
      system_status: status,
      solar_w: Math.max(0, solarW),
      load_w: Math.max(0, loadW),
      grid_w: gridW,
      battery_soc_pct: Math.round(batterySoc * 10) / 10,
      battery_v: Math.round(battV * 10) / 10,
      battery_a: Math.round(batteryA * 10) / 10,
      battery_temp_c: Math.round(battTemp * 10) / 10,
      battery_soh_pct: 96.5,
      ttg_hours: ttg == null ? null : Math.round(ttg * 10) / 10,
      daily_solar_kwh: Math.round(dailySolarKwh * 100) / 100,
      daily_load_kwh: Math.round(dailyLoadKwh * 100) / 100,
      daily_grid_import_kwh: Math.round(importKwh * 100) / 100,
      daily_grid_export_kwh: Math.round(exportKwh * 100) / 100,
      self_consumption_pct: selfConsumption == null ? null : Math.round(selfConsumption * 10) / 10,
      savings_today_usd: null,
      // Cell-level data
      battery_cells: batteryCells,
      battery_pack_temp: Math.round((battTemp + 2) * 10) / 10, // Slightly warmer at pack level
    };
  },
};
