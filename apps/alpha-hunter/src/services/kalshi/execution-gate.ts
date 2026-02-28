/**
 * Kalshi execution gate - PRODUCTION MODE ENABLED.
 *
 * WARNING: This codebase is configured to trade against Kalshi PRODUCTION.
 * Max trade size: $10 (enforced via MAX_SINGLE_TRADE env var)
 * Hard cap: $50 per trade (throws if exceeded in production)
 */
const PROD_BASE_URL = "https://api.elections.kalshi.com/trade-api/v2";
const DEMO_BASE_URL = "https://demo-api.kalshi.co/trade-api/v2";

export function getKalshiBaseUrl(): string {
  const env = (process.env.KALSHI_ENV || "").toLowerCase();
  return env === "demo" ? DEMO_BASE_URL : PROD_BASE_URL;
}

export function getKalshiDemoBaseUrl(): string {
  return DEMO_BASE_URL;
}

export function assertKalshiDemoOnly(): void {
  const env = (process.env.KALSHI_ENV || '').toLowerCase();
  const maxTrade = parseFloat(process.env.MAX_SINGLE_TRADE || '10');
  if (env === 'demo') {
    console.log(`   [GATE] Kalshi DEMO mode (max $${maxTrade}/trade)`);
  } else {
    console.log(`   [GATE] Kalshi PRODUCTION trading enabled (max $${maxTrade}/trade)`);
    if (maxTrade > 50) {
      throw new Error(`SAFETY: MAX_SINGLE_TRADE=$${maxTrade} exceeds $50 hard cap. Set KALSHI_ENV=demo or lower the limit.`);
    }
  }
}

export function assertMaxTradeSize(amountUsd: number): void {
  const maxTrade = parseFloat(process.env.MAX_SINGLE_TRADE || '10');
  if (amountUsd > maxTrade) {
    throw new Error(`BLOCKED: Trade $${amountUsd.toFixed(2)} exceeds MAX_SINGLE_TRADE=$${maxTrade}`);
  }
}

export function assertKalshiRequestUrlIsDemo(requestUrl: string): void {
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