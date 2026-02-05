/**
 * Kalshi demo-only execution gate.
 *
 * Security invariant:
 * - This codebase must NEVER place orders against Kalshi production.
 * - We allow the Kalshi DEMO environment only.
 */
const DEMO_BASE_URL = "https://demo-api.kalshi.co/trade-api/v2";

export function getKalshiDemoBaseUrl(): string {
  return DEMO_BASE_URL;
}

export function assertKalshiDemoOnly(): void {
  // If someone tries to flip this to prod, hard-stop.
  if ((process.env.KALSHI_ENV || "").toLowerCase() === "production") {
    throw new Error(
      [
        "REFUSING TO RUN: KALSHI_ENV=production is not allowed in alpha-hunter.",
        "This repo is DEMO-SANDBOX ONLY for Kalshi.",
        "",
        "Fix (PowerShell, current session):",
        "  $env:KALSHI_ENV = 'demo'",
        "  npm run kalshi:sandbox",
        "",
        "Fix (persistent): set KALSHI_ENV=demo in your alpha-hunter .env/.env.local and re-run.",
      ].join("\n")
    );
  }

  // If user tries to override base URL to prod, hard-stop.
  const baseUrl = (process.env.KALSHI_BASE_URL || "").trim();
  if (baseUrl) {
    const normalized = baseUrl.replace(/\/+$/, "");
    const allowed = DEMO_BASE_URL.replace(/\/+$/, "");
    if (normalized !== allowed) {
      throw new Error(
        `REFUSING TO RUN: KALSHI_BASE_URL override is not permitted. Expected demo base URL ${allowed}.`
      );
    }
  }
}

export function assertKalshiRequestUrlIsDemo(requestUrl: string): void {
  const allowedOrigin = new URL(DEMO_BASE_URL).origin;
  const url = new URL(requestUrl);
  if (url.origin !== allowedOrigin) {
    throw new Error(
      `BLOCKED PRODUCTION TRADE: Kalshi request origin ${url.origin} is not demo (${allowedOrigin}).`
    );
  }
}

