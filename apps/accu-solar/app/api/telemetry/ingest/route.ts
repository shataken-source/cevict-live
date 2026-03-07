/**
 * Telemetry ingest: store one snapshot per site for history (Pro tier).
 * Requires Authorization: Bearer <token>. userId is derived server-side from auth only.
 * GET returns 405 with instructions (some clients poll by mistake).
 */

import { NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "../../../lib/supabase-server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      error: "Method Not Allowed",
      message: "Use POST with Authorization: Bearer <token> and body: { siteId, ...telemetry } to store telemetry.",
    },
    { status: 405 }
  );
}

type IngestBody = {
  siteId?: string;
  battery_soc_pct?: number;
  battery_v?: number;
  battery_a?: number;
  battery_temp_c?: number;
  solar_w?: number;
  load_w?: number;
  grid_w?: number;
  source?: "ble" | "victron" | "demo";
};

function isNum(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request as Request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized - valid authentication required" }, { status: 401 });
  }

  const userId = user.id;

  if (request.headers.get("content-type")?.includes("application/json") === false) {
    return NextResponse.json({ error: "Content-Type: application/json required" }, { status: 400 });
  }

  let body: IngestBody;
  try {
    body = (await request.json()) as IngestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const siteId = (body.siteId ?? "").trim();
  if (!siteId) {
    return NextResponse.json(
      { error: "Missing siteId in body" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServerClient();

  // Tier check: only Professional gets history
  const { data: sub } = await supabase
    .from("accu_solar_subscriptions")
    .select("tier")
    .eq("user_id", userId)
    .maybeSingle();

  const tier = sub?.tier ?? "basic";
  if (tier !== "professional") {
    return NextResponse.json(
      { ok: true, stored: false, reason: "Telemetry history requires Professional tier" },
      { status: 200 }
    );
  }

  // Verify site belongs to user (accu_solar_sites.user_id)
  const { data: site } = await supabase
    .from("accu_solar_sites")
    .select("id")
    .eq("id", siteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!site) {
    return NextResponse.json(
      { error: "Site not found or not owned by user" },
      { status: 404 }
    );
  }

  const ts = new Date().toISOString();
  const row = {
    site_id: siteId,
    ts,
    battery_soc_pct: isNum(body.battery_soc_pct) ? body.battery_soc_pct : null,
    battery_v: isNum(body.battery_v) ? body.battery_v : null,
    battery_a: isNum(body.battery_a) ? body.battery_a : null,
    battery_temp_c: isNum(body.battery_temp_c) ? body.battery_temp_c : null,
    solar_w: isNum(body.solar_w) ? body.solar_w : null,
    load_w: isNum(body.load_w) ? body.load_w : null,
    grid_w: isNum(body.grid_w) ? body.grid_w : null,
    source: body.source ?? "ble",
  };

  const { error } = await supabase.from("accu_solar_telemetry").insert(row);

  if (error) {
    return NextResponse.json(
      { error: "Failed to store telemetry", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, stored: true });
}
