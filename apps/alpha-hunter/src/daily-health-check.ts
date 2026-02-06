/**
 * Daily health check — Supabase + Kalshi connectivity.
 * Run as: npm run health | npx tsx src/daily-health-check.ts
 * When imported, call runHealthCheck() (no process.exit).
 */

import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";

const alphaRoot = path.resolve(__dirname, "..");
const envLocal = path.join(alphaRoot, ".env.local");
const env = path.join(alphaRoot, ".env");
if (fs.existsSync(envLocal)) dotenv.config({ path: envLocal, override: true });
else if (fs.existsSync(env)) dotenv.config({ path: env });
else dotenv.config();

export type HealthResult = {
  ok: boolean;
  supabase: "ok" | "skip" | "fail";
  kalshi: "ok" | "skip" | "fail";
  errors: string[];
};

export async function runHealthCheck(): Promise<HealthResult> {
  const errors: string[] = [];
  let supabase: HealthResult["supabase"] = "skip";
  let kalshi: HealthResult["kalshi"] = "skip";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (supabaseUrl && supabaseKey && !supabaseUrl.includes("placeholder")) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(supabaseUrl, supabaseKey);
      let err: any = null;
      const { error: e1 } = await client.from("bot_config").select("config_key").limit(1);
      if (e1) {
        const { error: e2 } = await client.from("bot_predictions").select("id").limit(1);
        err = e2;
      }
      if (err) {
        supabase = "fail";
        errors.push(`Supabase: ${err.message}`);
      } else {
        supabase = "ok";
      }
    } catch (e: any) {
      supabase = "fail";
      errors.push(`Supabase: ${e?.message || String(e)}`);
    }
  }

  const kalshiKey = process.env.KALSHI_API_KEY_ID;
  const kalshiEnv = (process.env.KALSHI_ENV || "").toLowerCase();
  if (kalshiKey && kalshiEnv !== "production") {
    try {
      const { KalshiTrader } = await import("./intelligence/kalshi-trader");
      const trader = new KalshiTrader();
      const balance = await trader.getBalance();
      kalshi = balance >= 0 ? "ok" : "fail";
      if (kalshi === "fail") errors.push("Kalshi: getBalance failed or negative");
    } catch (e: any) {
      kalshi = "fail";
      errors.push(`Kalshi: ${e?.message || String(e)}`);
    }
  }

  const ok = supabase !== "fail" && kalshi !== "fail";
  return { ok, supabase, kalshi, errors };
}

async function main(): Promise<void> {
  const result = await runHealthCheck();
  console.log("Health check:", result.ok ? "OK" : "FAIL");
  console.log("  Supabase:", result.supabase);
  console.log("  Kalshi:", result.kalshi);
  if (result.errors.length) result.errors.forEach((e) => console.error("  ", e));
  process.exit(result.ok ? 0 : 1);
}

const runAsCli = process.argv[1]?.includes("daily-health-check");
if (runAsCli) main();
