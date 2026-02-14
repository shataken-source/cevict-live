import type { AdapterContext, TelemetryAdapter } from "@/app/lib/datasources";
import type { Telemetry } from "@/app/lib/telemetry-types";

export type VictronLocalConfig = {
  host?: string;
  method?: "mqtt" | "modbus" | "unknown";
};

class VictronConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VictronConnectionError";
  }
}

// Connect to Victron Venus OS via MQTT and fetch telemetry.
// Topics: N/{systemid}/system/0/Dc/Battery/Voltage, Current, Soc, etc.
async function fetchVictronViaMAWT(
  host: string,
  nowMs: number,
  timeout: number = 5000
): Promise<Telemetry> {
  // Dynamic import only on server-side
  if (typeof window !== "undefined") {
    throw new VictronConnectionError(
      "Victron adapter can only run on server-side"
    );
  }

  let mqtt: any;
  try {
    mqtt = require("mqtt");
  } catch (e) {
    throw new VictronConnectionError(
      'MQTT library not installed. Run: npm install mqtt'
    );
  }

  return new Promise((resolve, reject) => {
    const brokerUrl = `mqtt://${host}:1883`;
    let client: any;
    const data: Record<string, number | null> = {};
    let receivedData = false;

    const cleanup = () => {
      if (client) {
        try {
          client.end(true);
        } catch (e) {
          // ignore
        }
      }
    };

    const timeoutHandle = setTimeout(() => {
      cleanup();
      reject(
        new VictronConnectionError(
          `MQTT connection timeout after ${timeout}ms to ${host}:1883. Is Venus OS running?`
        )
      );
    }, timeout);

    try {
      client = mqtt.connect(brokerUrl, {
        clientId: "accu-solar-" + Math.random().toString(16).slice(2),
        reconnectPeriod: 0,
        connectTimeout: timeout,
      });

      client.on("connect", () => {
        // Subscribe to main telemetry topics + daily energy totals
        const topics = [
          "N/+/system/0/Dc/Battery/Voltage",
          "N/+/system/0/Dc/Battery/Current",
          "N/+/system/0/Dc/Battery/Soc",
          "N/+/system/0/Dc/Battery/Temperature",
          "N/+/system/0/Dc/Battery/StateOfHealth",
          "N/+/system/0/Dc/Battery/TimeToGo",
          "N/+/pvinverter/+/Ac/Power",
          "N/+/solarcharger/+/Dc/Pv/Power",
          "N/+/solarcharger/+/History/Daily/0/Yield",
          "N/+/load/+/Ac/Power",
          "N/+/system/0/Ac/Grid/Power",
          "N/+/grid/+/Ac/Energy/Forward",
          "N/+/grid/+/Ac/Energy/Reverse",
          "N/+/system/0/Ac/Consumption/L1/Energy/Forward",
          "N/+/system/0/Ac/Consumption/L2/Energy/Forward",
          "N/+/system/0/Ac/Consumption/L3/Energy/Forward",
        ];

        client.subscribe(topics, (err: any) => {
          if (err) {
            reject(new VictronConnectionError(`MQTT subscribe error: ${err}`));
          }
        });
      });

      client.on("message", (topic: string, message: Buffer) => {
        receivedData = true;
        const payload = message.toString();
        let value: number;

        try {
          const json = JSON.parse(payload);
          value = json.value;
        } catch (e) {
          value = parseFloat(payload);
        }

        if (isNaN(value)) return;

        // Parse topic and extract data
        const parts = topic.split("/");

        if (topic.includes("Battery/Voltage")) {
          data.battery_v = value;
        } else if (topic.includes("Battery/Current")) {
          data.battery_a = value;
        } else if (topic.includes("Battery/Soc")) {
          data.battery_soc_pct = value;
        } else if (topic.includes("Battery/Temperature")) {
          data.battery_temp_c = value;
        } else if (topic.includes("Battery/StateOfHealth")) {
          data.battery_soh_pct = value;
        } else if (topic.includes("Battery/TimeToGo")) {
          data.ttg_hours = value > 0 ? value / 3600 : null; // Convert seconds to hours
        } else if (topic.includes("pvinverter") && topic.includes("Ac/Power")) {
          data.solar_w = (data.solar_w || 0) + value;
        } else if (
          topic.includes("solarcharger") &&
          topic.includes("Dc/Pv/Power")
        ) {
          data.solar_w = (data.solar_w || 0) + value;
        } else if (topic.includes("solarcharger") && topic.includes("History/Daily") && topic.includes("Yield")) {
          // Daily solar yield in kWh (accumulate from all chargers)
          data.daily_solar_kwh = (data.daily_solar_kwh || 0) + value;
        } else if (topic.includes("load") && topic.includes("Ac/Power")) {
          data.load_w = (data.load_w || 0) + value;
        } else if (topic.includes("Grid/Power")) {
          data.grid_w = value;
        } else if (topic.includes("grid") && topic.includes("Energy/Forward")) {
          // Daily grid import in kWh (accumulate from all phases)
          data.daily_grid_import_kwh = (data.daily_grid_import_kwh || 0) + value;
        } else if (topic.includes("grid") && topic.includes("Energy/Reverse")) {
          // Daily grid export in kWh (accumulate from all phases)
          data.daily_grid_export_kwh = (data.daily_grid_export_kwh || 0) + value;
        } else if (topic.includes("Consumption") && topic.includes("Energy/Forward")) {
          // Daily load consumption in kWh (accumulate from all phases)
          data.daily_load_kwh = (data.daily_load_kwh || 0) + value;
        }
      });

      client.on("error", (err: any) => {
        reject(
          new VictronConnectionError(
            `MQTT connection error: ${err.message}. Check Venus OS at ${host}:1883`
          )
        );
      });

      client.on("offline", () => {
        cleanup();
        if (!receivedData) {
          reject(
            new VictronConnectionError(
              `MQTT connection lost before receiving data from ${host}:1883`
            )
          );
        }
      });

      // Wait for initial data collection
      setTimeout(() => {
        cleanup();

        if (!receivedData) {
          reject(
            new VictronConnectionError(
              `Can't reach your Victron system at ${host}. Check that your device is powered on, connected to your network, and that MQTT is enabled in Venus OS settings.`,
            ),
          );
        }

        // Determine system status
        const solarW = data.solar_w || 0;
        const loadW = data.load_w || 0;
        const batteryA = data.battery_a || 0;
        const netW = solarW - loadW;

        const systemStatus: Telemetry["system_status"] =
          solarW < 50 && loadW > 200
            ? "discharging"
            : netW > 150
              ? "charging"
              : "normal";

        // Calculate self-consumption if we have both solar and export data
        const dailySolarKwh = data.daily_solar_kwh || 0;
        const dailyExportKwh = data.daily_grid_export_kwh || 0;
        const selfConsumptionPct = dailySolarKwh > 0
          ? Math.round(((dailySolarKwh - dailyExportKwh) / dailySolarKwh) * 1000) / 10
          : null;

        const telemetry: Telemetry = {
          ts: new Date(nowMs).toISOString(),
          system_status: systemStatus,
          solar_w: Math.max(0, data.solar_w || 0),
          load_w: Math.max(0, data.load_w || 0),
          grid_w: data.grid_w || 0,
          battery_soc_pct: data.battery_soc_pct ?? 0,
          battery_v: data.battery_v ?? 0,
          battery_a: data.battery_a ?? 0,
          battery_temp_c: data.battery_temp_c ?? 0,
          battery_soh_pct: data.battery_soh_pct ?? 100,
          ttg_hours: data.ttg_hours ?? null,
          daily_solar_kwh: Math.round(dailySolarKwh * 100) / 100,
          daily_load_kwh: Math.round((data.daily_load_kwh || 0) * 100) / 100,
          daily_grid_import_kwh: Math.round((data.daily_grid_import_kwh || 0) * 100) / 100,
          daily_grid_export_kwh: Math.round(dailyExportKwh * 100) / 100,
          self_consumption_pct: selfConsumptionPct,
          savings_today_usd: null,
        };

        resolve(telemetry);
      }, 1500); // Wait 1.5s for MQTT to publish messages
    } catch (err: any) {
      clearTimeout(timeoutHandle);
      cleanup();
      reject(
        new VictronConnectionError(
          `Failed to initialize MQTT client: ${err.message}`
        )
      );
    }
  });
}

export const victronLocalAdapter: TelemetryAdapter = {
  type: "victron_local",
  async getTelemetry(ctx: AdapterContext): Promise<Telemetry> {
    const config = ctx.datasource.config as VictronLocalConfig;
    const host = config.host || "192.168.1.50";

    try {
      return await fetchVictronViaMAWT(host, ctx.nowMs, 5000);
    } catch (err: any) {
      if (err instanceof VictronConnectionError) {
        throw err;
      }
      throw new VictronConnectionError(
        `Unexpected error connecting to ${host}: ${err.message}`
      );
    }
  },
};
