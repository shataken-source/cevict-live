import type { AdapterContext, TelemetryAdapter } from "@/app/lib/datasources";
import type { Telemetry } from "@/app/lib/telemetry-types";

class BleNotConnectedError extends Error {
  constructor() {
    super(
      "BLE device not connected. Use the CONTROLS tab to pair a Bluetooth battery."
    );
    this.name = "BleNotConnectedError";
  }
}

export const bleAdapter: TelemetryAdapter = {
  type: "ble",
  async getTelemetry(ctx: AdapterContext): Promise<Telemetry> {
    throw new BleNotConnectedError();
  },
};
