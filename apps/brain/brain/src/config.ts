import { getEnv, getEnvNumber } from "../../../packages/core-logic/src/config";

const dispatchUrlDefault = "http://localhost:3000/api/brain/dispatch";
const healthDefaults: Record<string, string> = {
  progno: "http://localhost:3000/health/progno",
  calmcast: "http://localhost:3000/health/calmcast",
  petreunion: "http://localhost:3000/health/petreunion",
  shelter: "http://localhost:3000/health/shelter",
  core: "http://localhost:3000/health/core",
  forge: "http://localhost:3000/health/forge",
  jobs: "http://localhost:3000/health/jobs",
};

function parseHealthOverrides(raw?: string): Record<string, string> {
  if (!raw) return {};
  try {
    // Allow JSON object: {"service":"https://...","other":"https://..."}
    if (raw.trim().startsWith("{")) {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === "object") {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
          if (typeof k === "string" && typeof v === "string" && v.length > 0) {
            out[k] = v;
          }
        }
        return out;
      }
    }
    // Allow CSV: service=https://...,other=https://...
    const out: Record<string, string> = {};
    for (const pair of raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)) {
      const [k, v] = pair.split("=").map((p) => p.trim());
      if (k && v) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

const healthOverrides = parseHealthOverrides(getEnv("BRAIN_HEALTH_OVERRIDES" as any));

export const brainConfig = {
  dispatchUrl: getEnv("BRAIN_DISPATCH_URL" as any, dispatchUrlDefault) || dispatchUrlDefault,
  dispatchToken: getEnv("BRAIN_API_TOKEN" as any) || "",
  allowedTargets: (getEnv("BRAIN_ALLOWED_TARGETS" as any)?.split(",").map(t => t.trim()).filter(Boolean)) || [
    "agent:ops",
    "agent:devops",
    "agent:ai",
    "agent:progno",
    "agent:calmcast",
    "agent:petreunion",
    "agent:shelter",
    "agent:forge",
  ],
  rateLimitPerMinute: getEnvNumber("BRAIN_RATE_LIMIT_PER_MIN" as any, 60),
  maxConcurrent: getEnvNumber("BRAIN_MAX_CONCURRENT" as any, 5),
  dispatchTimeoutMs: getEnvNumber("BRAIN_DISPATCH_TIMEOUT_MS" as any, 15000),
  retries: 2,
  retryDelaysMs: [2000, 5000],
  healthChecks: { ...healthDefaults, ...healthOverrides },
  healthTimeoutMs: getEnvNumber("BRAIN_HEALTH_TIMEOUT_MS" as any, 5000),
  logWebhookUrl: getEnv("BRAIN_LOG_WEBHOOK_URL" as any) || "",
  logWebhookToken: getEnv("BRAIN_LOG_WEBHOOK_TOKEN" as any) || "",
};

export type BrainConfig = typeof brainConfig;


