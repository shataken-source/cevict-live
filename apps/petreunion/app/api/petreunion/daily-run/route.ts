import { NextRequest, NextResponse } from "next/server";

type DailyRunSummary = {
  pawboost?: any;
  pawboostSummary?: any;
  social?: any;
  socialSummary?: any;
  matcher?: any;
  matcherSummary?: any;
  errors: string[];
};

function isCronRequest(req: NextRequest) {
  // Vercel Cron sets this header. Not cryptographically secure, but prevents accidental/manual hits.
  const v = req.headers.get("x-vercel-cron");
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function isAdminRequest(req: NextRequest) {
  const expected = process.env.ADMIN_KEY;
  if (!expected) return false;
  const got = req.headers.get("x-admin-key") || "";
  return got && got === expected;
}

async function postJson(origin: string, path: string, body: any, timeoutMs: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${origin}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`${path} HTTP ${res.status}: ${data?.error || data?.message || "request failed"}`);
    }
    return data;
  } finally {
    clearTimeout(t);
  }
}

async function run(origin: string): Promise<DailyRunSummary> {
  const errors: string[] = [];
  const summary: DailyRunSummary = { errors };

  // Keep costs bounded for daily cron.
  try {
    const pawboostMode = process.env.VERCEL ? "live" : "rendered";
    if (process.env.VERCEL) {
      // PawBoost rendered scraping requires Chromium; Vercel serverless typically cannot run it.
      // We skip PawBoost on Vercel to avoid cron failures.
      throw new Error("pawboost skipped on vercel (rendered mode not supported)");
    }
    summary.pawboost = await postJson(
      origin,
      "/api/petreunion/scrape-pawboost",
      { state: "AL", radiusMiles: 50, maxPets: 50, mode: pawboostMode, saveToDatabase: true },
      120_000
    );
    summary.pawboostSummary = summary.pawboost?.summary ?? null;
  } catch (e: any) {
    errors.push(e?.message || "pawboost failed");
  }

  try {
    summary.social = await postJson(
      origin,
      "/api/petreunion/scrape-social-media",
      { platforms: ["instagram", "tiktok"], location: "AL", maxResults: 50, saveToDatabase: true },
      90_000
    );
    summary.socialSummary = summary.social?.summary ?? null;
  } catch (e: any) {
    errors.push(e?.message || "social failed");
  }

  try {
    summary.matcher = await postJson(origin, "/api/petreunion/run-matcher", {}, 90_000);
    summary.matcherSummary = summary.matcher?.summary ?? null;
  } catch (e: any) {
    errors.push(e?.message || "matcher failed");
  }

  return summary;
}

export async function GET(req: NextRequest) {
  try {
    if (!isCronRequest(req) && !isAdminRequest(req)) {
      return NextResponse.json(
        { success: false, error: "Forbidden (cron/admin only)" },
        { status: 403 }
      );
    }
    const origin = req.nextUrl.origin;
    const summary = await run(origin);
    return NextResponse.json({ success: true, summary });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "daily-run failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Allow manual triggering with ADMIN_KEY (since POST is easier to call from scripts)
  if (!isAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Forbidden (admin only)" }, { status: 403 });
  }
  const origin = req.nextUrl.origin;
  const summary = await run(origin);
  return NextResponse.json({ success: true, summary });
}

