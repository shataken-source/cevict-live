import type { Telemetry } from "@/app/lib/telemetry-types";

export type DatasourceType = "demo" | "victron_local" | "victron_vrm" | "ble";

export type DatasourceConfig = {
  id: string;
  user_id: string;
  name: string;
  type: DatasourceType;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AdapterContext = {
  datasource: DatasourceConfig;
  nowMs: number;
};

export type TelemetryAdapter = {
  type: DatasourceType;
  getTelemetry(ctx: AdapterContext): Promise<Telemetry>;
};
