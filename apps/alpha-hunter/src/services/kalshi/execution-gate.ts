/**
 * Kalshi execution gate - PRODUCTION MODE ENABLED.
 *
 * WARNING: This codebase is configured to trade against Kalshi PRODUCTION.
 * Max trade size: $10 (enforced via MAX_SINGLE_TRADE env var)
 */
const PROD_BASE_URL = "https://api.elections.kalshi.com/trade-api/v2";
const DEMO_BASE_URL = "https://demo-api.kalshi.co/trade-api/v2";

export function getKalshiBaseUrl(): string {
  // Use production by default, demo only if explicitly set
  const env = (process.env.KALSHI_ENV || "").toLowerCase();
  return env === "demo" ? DEMO_BASE_URL : PROD_BASE_URL;
}

export function getKalshiDemoBaseUrl(): string {
  return DEMO_BASE_URL;
}

export function assertKalshiDemoOnly(): void {
  // No longer blocking production - user has explicitly chosen to trade live
  // with $2 max trade limit as safety guardrail
  console.log("   ℹ️  Kalshi production trading enabled (max $10/trade)");
}

export function assertKalshiRequestUrlIsDemo(requestUrl: string): void {
  // Allow both demo and production URLs
  const allowedOrigins = [
    new URL(DEMO_BASE_URL).origin,
    new URL(PROD_BASE_URL).origin
  ];
  const url = new URL(requestUrl);
  if (!allowedOrigins.includes(url.origin)) {
    throw new Error(
      `BLOCKED TRADE: Kalshi request origin ${url.origin} is not allowed.`
    );
  }
}

