/**
 * BMS Bridge adapter: MQTT topics from eco_worthy_bridge.py (accusolar/battery/*).
 * Use when running scripts/eco_worthy_bridge.py with Mosquitto on localhost.
 * GET /api/telemetry?source=bms_bridge or ?source=bms_bridge&host=192.168.1.100
 */

import type { AdapterContext, TelemetryAdapter } from "@/app/lib/datasources";
import type { Telemetry, BatteryCell } from "@/app/lib/telemetry-types";

const TOPICS = {
  battery_voltage: "accusolar/battery/voltage",
  battery_current: "accusolar/battery/current",
  battery_soc: "accusolar/battery/soc",
  battery_power: "accusolar/battery/power",
  temperature: "accusolar/battery/temperature",
  cell_voltages: "accusolar/battery/cells",
  status: "accusolar/battery/status",
};

export type BmsBridgeConfig = { host?: string };

class BmsBridgeConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BmsBridgeConnectionError";
  }
}

async function fetchBmsBridgeViaMqtt(
  host: string,
  nowMs: number,
  timeout: number = 8000
): Promise<Telemetry> {
  if (typeof window !== "undefined") {
    throw new BmsBridgeConnectionError("BMS bridge adapter runs on server only");
  }

  let mqtt: any;
  try {
    mqtt = require("mqtt");
  } catch {
    throw new BmsBridgeConnectionError("MQTT not installed. Run: npm install mqtt");
  }

  return new Promise((resolve, reject) => {
    const brokerUrl = `mqtt://${host}:1883`;
    const data: Record<string, number | number[] | null> = {
      battery_v: null,
      battery_a: null,
      battery_soc_pct: null,
      battery_power: null,
      battery_temp_c: null,
      battery_cells: null,
    };
    let receivedAny = false;
    let client: any;

    const cleanup = () => {
      if (client) {
        try {
          client.end(true);
        } catch {}
      }
    };

    const timeoutHandle = setTimeout(() => {
      cleanup();
      reject(
        new BmsBridgeConnectionError(
          `BMS bridge timeout connecting to ${host}:1883. Is the Python bridge running? (scripts/eco_worthy_bridge.py)`
        )
      );
    }, timeout);

    try {
      client = mqtt.connect(brokerUrl, {
        clientId: "accu-solar-bms-" + Math.random().toString(16).slice(2),
        reconnectPeriod: 0,
        connectTimeout: timeout,
      });

      client.on("connect", () => {
        client.subscribe(
          [
            TOPICS.battery_voltage,
            TOPICS.battery_current,
            TOPICS.battery_soc,
            TOPICS.battery_power,
            TOPICS.temperature,
            TOPICS.cell_voltages,
            TOPICS.status,
          ],
          (err: any) => {
            if (err) reject(new BmsBridgeConnectionError(`MQTT subscribe error: ${err}`));
          }
        );
      });

      client.on("message", (topic: string, message: Buffer) => {
        receivedAny = true;
        const payload = message.toString();

        if (topic === TOPICS.battery_voltage) {
          const v = parseFloat(payload);
          if (!isNaN(v)) data.battery_v = v;
        } else if (topic === TOPICS.battery_current) {
          const v = parseFloat(payload);
          if (!isNaN(v)) data.battery_a = v;
        } else if (topic === TOPICS.battery_soc) {
          const v = parseFloat(payload);
          if (!isNaN(v)) data.battery_soc_pct = v;
        } else if (topic === TOPICS.battery_power) {
          const v = parseFloat(payload);
          if (!isNaN(v)) data.battery_power = v;
        } else if (topic === TOPICS.temperature) {
          const v = parseFloat(payload);
          if (!isNaN(v)) data.battery_temp_c = v;
        } else if (topic === TOPICS.cell_voltages) {
          try {
            const arr = JSON.parse(payload);
            if (Array.isArray(arr)) data.battery_cells = arr.map((x: number) => Number(x)).filter((n: number) => !isNaN(n));
          } catch {}
        } else if (topic === TOPICS.status) {
          try {
            const obj = JSON.parse(payload);
            if (typeof obj.voltage === "number") data.battery_v = obj.voltage;
            if (typeof obj.current === "number") data.battery_a = obj.current;
            if (typeof obj.soc === "number") data.battery_soc_pct = obj.soc;
            if (typeof obj.power === "number") data.battery_power = obj.power;
            if (typeof obj.temp === "number") data.battery_temp_c = obj.temp;
            if (Array.isArray(obj.cells)) data.battery_cells = obj.cells.map((x: number) => Number(x)).filter((n: number) => !isNaN(n));
          } catch {}
        }
      });

      client.on("error", (err: any) => {
        reject(new BmsBridgeConnectionError(`MQTT error: ${err.message}. Broker at ${host}:1883?`));
      });

      setTimeout(() => {
        cleanup();
        clearTimeout(timeoutHandle);
        if (!receivedAny) {
          reject(
            new BmsBridgeConnectionError(
              `No data from BMS bridge at ${host}:1883. Run: BMS_ADDRESS=AA:BB:CC:DD:EE:FF python scripts/eco_worthy_bridge.py`
            )
          );
          return;
        }
        const battery_a = data.battery_a ?? 0;
        const system_status: Telemetry["system_status"] =
          battery_a > 10 ? "charging" : battery_a < -10 ? "discharging" : "normal";
        const cells: BatteryCell[] | undefined = Array.isArray(data.battery_cells)
          ? data.battery_cells.map((voltage, i) => ({ id: i + 1, voltage }))
          : undefined;
        const telemetry: Telemetry = {
          ts: new Date(nowMs).toISOString(),
          system_status,
          solar_w: 0,
          load_w: Math.max(0, -(data.battery_power ?? 0)),
          grid_w: 0,
          battery_soc_pct: data.battery_soc_pct ?? 0,
          battery_v: data.battery_v ?? 0,
          battery_a: data.battery_a ?? 0,
          battery_temp_c: data.battery_temp_c ?? 0,
          battery_soh_pct: 100,
          ttg_hours: null,
          daily_solar_kwh: 0,
          daily_load_kwh: 0,
          daily_grid_import_kwh: 0,
          daily_grid_export_kwh: 0,
          self_consumption_pct: null,
          savings_today_usd: null,
          ...(cells && cells.length > 0 ? { battery_cells: cells } : {}),
        };
        resolve(telemetry);
      }, 2000);
    } catch (err: any) {
      clearTimeout(timeoutHandle);
      cleanup();
      reject(new BmsBridgeConnectionError(`BMS bridge: ${err.message}`));
    }
  });
}

export const bmsBridgeAdapter: TelemetryAdapter = {
  type: "bms_bridge",
  async getTelemetry(ctx: AdapterContext): Promise<Telemetry> {
    const config = (ctx.datasource.config || {}) as BmsBridgeConfig;
    const host = config.host || "localhost";
    try {
      return await fetchBmsBridgeViaMqtt(host, ctx.nowMs, 8000);
    } catch (err: any) {
      if (err.name === "BmsBridgeConnectionError") throw err;
      throw new BmsBridgeConnectionError(`BMS bridge: ${err.message}`);
    }
  },
};
