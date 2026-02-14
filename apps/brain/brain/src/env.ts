/**
 * Local env helpers so Brain runs without packages/core-logic.
 * Next.js injects process.env at build/runtime; no dotenv needed.
 */
export function getEnv(key: string, defaultValue = ""): string {
  const v = process.env[key];
  return v != null && v !== "" ? v : defaultValue;
}

export function getEnvNumber(key: string, defaultValue: number): number {
  const v = process.env[key];
  if (v == null || v === "") return defaultValue;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? defaultValue : n;
}

export function loadEnv(): NodeJS.ProcessEnv {
  return process.env;
}
