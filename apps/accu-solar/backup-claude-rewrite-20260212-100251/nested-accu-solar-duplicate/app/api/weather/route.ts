import { NextResponse } from "next/server";

export const runtime = "edge";

type CacheEntry = { expiresAtMs: number; value: unknown };
const cache = new Map<string, CacheEntry>();

function getCached(key: string): unknown | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAtMs) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCached(key: string, value: unknown, ttlMs: number) {
  cache.set(key, { value, expiresAtMs: Date.now() + ttlMs });
}

function parseNumber(value: string | null) {
  if (value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = parseNumber(searchParams.get("lat"));
  const longitude = parseNumber(searchParams.get("lon"));

  if (latitude == null || longitude == null) {
    return NextResponse.json(
      { error: "Missing/invalid required query params: lat, lon" },
      { status: 400 },
    );
  }

  const timezone = (searchParams.get("tz") ?? "auto").trim() || "auto";
  const cacheKey = `lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(
    4,
  )}&tz=${timezone}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true }, { status: 200 });
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("timezone", timezone);
  url.searchParams.set("current", "temperature_2m,wind_speed_10m,cloud_cover");
  url.searchParams.set(
    "hourly",
    [
      "temperature_2m",
      "precipitation_probability",
      "cloud_cover",
      "wind_speed_10m",
      "shortwave_radiation",
      "direct_radiation",
      "diffuse_radiation",
      "uv_index",
    ].join(","),
  );
  url.searchParams.set(
    "daily",
    [
      "sunrise",
      "sunset",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "wind_speed_10m_max",
      "uv_index_max",
      "shortwave_radiation_sum",
    ].join(","),
  );
  url.searchParams.set("forecast_days", "7");

  const res = await fetch(url.toString(), {
    headers: { accept: "application/json" },
    next: { revalidate: 60 * 10 },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `Weather provider error (${res.status})` },
      { status: 502 },
    );
  }

  const data = (await res.json()) as unknown;
  const payload = { data, cached: false, provider: "open-meteo" as const };
  setCached(cacheKey, payload, 60 * 1000);

  return NextResponse.json(payload, { status: 200 });
}
