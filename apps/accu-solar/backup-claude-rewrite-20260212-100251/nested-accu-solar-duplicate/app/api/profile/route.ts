import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/app/lib/supabase-server";

export const runtime = "nodejs";

type Profile = {
  id: string;
  user_id: string;
  name: string;
  pv_watts: number;
  battery_kwh: number;
  inverter_watts: number;
  efficiency: number;
  created_at: string;
  updated_at: string;
};

type UpsertBody = {
  userId?: string;
  name?: string;
  pvWatts?: number;
  batteryKwh?: number;
  inverterWatts?: number;
  efficiency?: number;
};

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = (searchParams.get("userId") ?? "").trim();
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("accu_solar_profiles")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ profiles: (data ?? []) as Profile[] }, { status: 200 });
}

export async function POST(request: Request) {
  let body: UpsertBody | undefined;
  try {
    body = (await request.json()) as UpsertBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const userId = (body.userId ?? "").trim();
  const name = (body.name ?? "").trim();
  if (!userId || !name) {
    return NextResponse.json({ error: "Missing userId or name" }, { status: 400 });
  }

  if (
    !isFiniteNumber(body.pvWatts) ||
    !isFiniteNumber(body.batteryKwh) ||
    !isFiniteNumber(body.inverterWatts) ||
    !isFiniteNumber(body.efficiency)
  ) {
    return NextResponse.json(
      { error: "Missing/invalid pvWatts, batteryKwh, inverterWatts, efficiency" },
      { status: 400 },
    );
  }

  const pvWatts = clamp(body.pvWatts, 0, 200000);
  const batteryKwh = clamp(body.batteryKwh, 0, 5000);
  const inverterWatts = clamp(body.inverterWatts, 0, 200000);
  const efficiency = clamp(body.efficiency, 0.3, 1);

  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("accu_solar_profiles")
    .upsert(
      {
        user_id: userId,
        name,
        pv_watts: pvWatts,
        battery_kwh: batteryKwh,
        inverter_watts: inverterWatts,
        efficiency,
      },
      { onConflict: "user_id,name" },
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ profile: data as Profile }, { status: 200 });
}
